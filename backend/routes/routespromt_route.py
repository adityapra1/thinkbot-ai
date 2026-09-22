import os
import time
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from openai import AsyncOpenAI
from bson.objectid import ObjectId

# तुम्हारे बनाए हुए Middleware और Database को इम्पोर्ट करना
from middlewares.promt_middleware import user_middleware
from main import db

router = APIRouter()
promt_collection = db["promts"] # MongoDB का कलेक्शन

# OpenRouter Setup
client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
    default_headers={
        "HTTP-Referer": os.getenv("FRONTEND_URL", "http://localhost:5173"),
        "X-Title": "ThinkBot AI",
    }
)

# === Pydantic Models (डेटा वैलिडेशन के लिए) ===
class PromptRequest(BaseModel):
    content: str
    chatId: Optional[str] = None
    editMessageId: Optional[str] = None

class DeleteRequest(BaseModel):
    chatId: str

class RenameRequest(BaseModel):
    chatId: str
    newTitle: str

class PinRequest(BaseModel):
    chatId: str
    isPinned: bool

# === 1. Get Chat History ===
@router.get("/history")
async def get_chat_history(user_id: str = Depends(user_middleware)):
    try:
        # MongoDB से यूज़र की सारी चैट्स निकालना और समय के हिसाब से सॉर्ट करना
        history = list(promt_collection.find({"userId": user_id}).sort("createdAt", 1))
        
        # MongoDB के _id को स्ट्रिंग में बदलना ताकि React को एरर न आए
        for chat in history:
            chat["_id"] = str(chat["_id"])
            
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch chat history")

# === 2. Send Prompt & Get AI Reply (Edit Fix Included) ===
@router.post("/promt")
async def send_prompt(data: PromptRequest, user_id: str = Depends(user_middleware)):
    if not data.content or data.content.strip() == "":
        raise HTTPException(status_code=400, detail="Prompt content is required")

    active_chat_id = data.chatId if data.chatId else f"chat_{int(time.time() * 1000)}"

    try:
        message_count = promt_collection.count_documents({"userId": user_id, "chatId": active_chat_id})

        if message_count >= 50 and not data.editMessageId:
            raise HTTPException(
                status_code=403, 
                detail="This folder has reached its 50 message limit. Please start a new chat."
            )

        # 🔴 THE MAGIC FIX: Edit logic
        if data.editMessageId:
            target_msg = promt_collection.find_one({"_id": ObjectId(data.editMessageId)})
            if target_msg:
                promt_collection.delete_many({
                    "userId": user_id,
                    "chatId": active_chat_id,
                    "createdAt": {"$gte": target_msg["createdAt"]}
                })

        # Save NEW User Prompt
        user_message = {
            "userId": user_id,
            "chatId": active_chat_id,
            "role": "user",
            "content": data.content,
            "createdAt": time.time()
        }
        promt_collection.insert_one(user_message)

        # Call OpenRouter AI
        completion = await client.chat.completions.create(
            model="openrouter/free",
            messages=[{"role": "user", "content": data.content}],
            temperature=0.7,
            max_tokens=1000,
        )
        ai_content = completion.choices[0].message.content

        # Save AI Reply
        ai_message = {
            "userId": user_id,
            "chatId": active_chat_id,
            "role": "assistant",
            "content": ai_content,
            "createdAt": time.time()
        }
        promt_collection.insert_one(ai_message)

        return {"reply": ai_content, "chatId": active_chat_id}

    except Exception as e:
        print("Error in AI Request:", str(e))
        raise HTTPException(status_code=500, detail="Something went wrong with the AI response")

# === 3. Delete Chat History ===
@router.delete("/history")
async def delete_chat_history(data: DeleteRequest, user_id: str = Depends(user_middleware)):
    try:
        # MongoDB में $or का इस्तेमाल करके पुरानी और नई चैट्स डिलीट करना
        result = promt_collection.delete_many({
            "userId": user_id,
            "$or": [{"chatId": data.chatId}, {"_id": data.chatId}]
        })
        return {"message": f"Deleted {result.deleted_count} messages permanently."}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Server Error")

# === 4. Rename Chat ===
@router.put("/rename")
async def rename_chat_history(data: RenameRequest, user_id: str = Depends(user_middleware)):
    try:
        promt_collection.update_many(
            {"userId": user_id, "chatId": data.chatId, "role": "user"},
            {"$set": {"title": data.newTitle}}
        )
        return {"message": "Chat renamed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Server Error")

# === 5. Pin/Unpin Chat ===
@router.put("/pin")
async def pin_chat_history(data: PinRequest, user_id: str = Depends(user_middleware)):
    try:
        promt_collection.update_many(
            {"userId": user_id, "chatId": data.chatId, "role": "user"},
            {"$set": {"isPinned": data.isPinned}}
        )
        return {"message": "Chat pin status updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Server Error")