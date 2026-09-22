import os
import jwt
import bcrypt
import random
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from main import db
# from utils.send_email import send_otp  # जब हम ईमेल फाइल बनाएंगे तब इसे एक्टिवेट करेंगे

router = APIRouter()
user_collection = db["users"]

# === Pydantic Models (डेटा का ढांचा) ===
class SignupRequest(BaseModel):
    firstName: str
    lastName: str = ""
    email: str
    password: str

class VerifyOtpRequest(BaseModel):
    email: str
    otp: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    newPassword: str

class GoogleTokenRequest(BaseModel):
    token: str

# === 1. SIGNUP FUNCTION ===
@router.post("/signup")
async def signup(data: SignupRequest):
    if user_collection.find_one({"email": data.email}):
        raise HTTPException(status_code=401, detail="User already exists")

    hashed_password = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt())
    generated_otp = str(random.randint(100000, 999999))

    new_user = {
        "firstName": data.firstName,
        "lastName": data.lastName,
        "email": data.email,
        "password": hashed_password,
        "otp": generated_otp,
        "isVerified": False
    }
    user_collection.insert_one(new_user)
    
    # await send_otp(data.email, generated_otp) # OTP भेजने का कोड
    
    return {"message": "OTP sent to your email. Please verify to continue."}

# === 2. VERIFY OTP FUNCTION ===
@router.post("/verify-otp")
async def verify_otp(data: VerifyOtpRequest, response: Response):
    user = user_collection.find_one({"email": data.email})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("otp") != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    user_collection.update_one({"email": data.email}, {"$set": {"isVerified": True, "otp": None}})

    token = jwt.encode(
        {"id": str(user["_id"]), "exp": datetime.utcnow() + timedelta(days=1)},
        os.getenv("JWT_SECRET"), algorithm="HS256"
    )
    
    response.set_cookie(key="jwt", value=token, httponly=True)
    return {"message": "Email verified successfully! You are now logged in.", "token": token}

# === 3. LOGIN FUNCTION ===
@router.post("/login")
async def login(data: LoginRequest, response: Response):
    user = user_collection.find_one({"email": data.email})
    
    if not user or not bcrypt.checkpw(data.password.encode('utf-8'), user["password"]):
        raise HTTPException(status_code=403, detail="Invalid Credentials")
    
    if not user.get("isVerified"):
        raise HTTPException(status_code=403, detail="Please verify your email first using OTP.")

    token = jwt.encode(
        {"id": str(user["_id"]), "exp": datetime.utcnow() + timedelta(days=1)},
        os.getenv("JWT_SECRET"), algorithm="HS256"
    )
    
    response.set_cookie(key="jwt", value=token, httponly=True)
    return {"message": "User login succeeded", "token": token}

# === 4. LOGOUT FUNCTION ===
@router.get("/logout")
async def logout(response: Response):
    response.delete_cookie("jwt")
    return {"message": "Logout succeeded"}

# === 5. FORGOT PASSWORD ===
@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    user = user_collection.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found with this email.")
    
    otp = str(random.randint(100000, 999999))
    expire_time = datetime.utcnow() + timedelta(minutes=15)
    
    user_collection.update_one(
        {"email": data.email}, 
        {"$set": {"resetOtp": otp, "resetOtpExpire": expire_time}}
    )
    # await send_otp(data.email, otp)
    
    return {"message": "OTP sent to your email successfully!"}

# === 6. RESET PASSWORD ===
@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    user = user_collection.find_one({
        "email": data.email, 
        "resetOtp": data.otp,
        "resetOtpExpire": {"$gt": datetime.utcnow()}
    })

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP!")
    
    hashed_password = bcrypt.hashpw(data.newPassword.encode('utf-8'), bcrypt.gensalt())
    
    user_collection.update_one(
        {"email": data.email},
        {"$set": {"password": hashed_password, "resetOtp": None, "resetOtpExpire": None}}
    )
    
    return {"message": "Password reset successfully! You can now login."}

# === 7. GOOGLE LOGIN ===
@router.post("/google-login")
async def google_login(data: GoogleTokenRequest, response: Response):
    try:
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        idinfo = id_token.verify_oauth2_token(data.token, google_requests.Request(), client_id)
        email = idinfo['email']
        
        if not idinfo.get('email_verified'):
            raise HTTPException(status_code=403, detail="Google email is not verified.")
        
        user = user_collection.find_one({"email": email})
        
        if not user:
            random_password = str(random.random())
            hashed_password = bcrypt.hashpw(random_password.encode('utf-8'), bcrypt.gensalt())
            
            new_user = {
                "firstName": idinfo.get('given_name', ''),
                "lastName": idinfo.get('family_name', ''),
                "email": email,
                "password": hashed_password,
                "otp": None,
                "isVerified": True
            }
            user_collection.insert_one(new_user)
            user = new_user

        token = jwt.encode(
            {"id": str(user.get("_id")), "exp": datetime.utcnow() + timedelta(days=1)},
            os.getenv("JWT_SECRET"), algorithm="HS256"
        )
        
        response.set_cookie(key="jwt", value=token, httponly=True)
        return {"message": "Google Login Succeeded", "token": token}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Google Token")