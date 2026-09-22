import os
import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# FastAPI का इनबिल्ट सिक्योरिटी फीचर जो Headers से अपने आप 'Bearer' टोकन निकालता है
security = HTTPBearer()

async def user_middleware(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    
    try:
        # .env फाइल से JWT_SECRET निकालकर टोकन को डिकोड करना
        secret_key = os.getenv("JWT_SECRET")
        decoded = jwt.decode(token, secret_key, algorithms=["HS256"])
        
        print(decoded) # टेस्टिंग के लिए (Node.js वाले console.log की तरह)
        
        # यह decoded id रिटर्न करेगा, जिसे हम अपने Routes में इस्तेमाल करेंगे
        return decoded.get("id")
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")