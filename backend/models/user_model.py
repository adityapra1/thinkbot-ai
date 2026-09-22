from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserModel(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str
    otp: Optional[str] = None
    isVerified: bool = False
    resetOtp: Optional[str] = None
    resetOtpExpire: Optional[datetime] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)