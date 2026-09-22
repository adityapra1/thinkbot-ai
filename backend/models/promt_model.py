from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime


class PromtModel(BaseModel):
    userId: str
    chatId: str
    role: Literal["user", "assistant"]
    content: str
    title: str = ""
    isPinned: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)