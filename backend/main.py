import os
import json
import requests
import datetime
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Any
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

# Load environment variables
load_dotenv()

# --- 1. MongoDB Connection ---
MONGO_URI = os.getenv("MONGO_URI")
try:
    client = MongoClient(MONGO_URI)
    client.admin.command('ping')
    print("✅ Success: MongoDB Connected Successfully to ThinkBot AI!")
    db = client["ThinkBot_DB"]
    collection = db["chat_history"]
except Exception as e:
    print(f"❌ Error: MongoDB Connection Failed! Details: {e}")

# Google Gemini API Key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# --- 2. FastAPI App Setup ---
app = FastAPI(title="ThinkBot AI")

# CORS Setup - React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "active", "message": "Backend is running"}

@app.get("/deepseekai/history")
async def get_history():
    try:
        chat_docs = list(collection.find().sort("timestamp", 1).limit(150))
        for doc in chat_docs:
            doc["_id"] = str(doc["_id"])
            if "timestamp" in doc and isinstance(doc["timestamp"], datetime.datetime):
                doc["timestamp"] = doc["timestamp"].isoformat()
        return chat_docs
    except Exception as e:
        return []

def get_safe_query(target_id):
    queries = [{"chatId": str(target_id)}, {"id": str(target_id)}]
    if target_id and len(str(target_id)) == 24:
        try:
            queries.append({"_id": ObjectId(target_id)})
        except:
            pass
    return {"$or": queries}

# =========================================================
# 3. SIDEBAR ROUTES
# =========================================================
@app.get("/user/logout")
@app.post("/user/logout")
async def logout_user():
    return {"success": True}

@app.put("/deepseekai/rename")
@app.put("/deepseekai/rename/{chat_id}")
async def rename_chat(request: Request, chat_id: Optional[str] = None):
    try:
        body = await request.json()
        target_id = chat_id or body.get("chatId") or body.get("id") or body.get("_id")
        new_title = body.get("title") or body.get("newTitle", "New Chat")
        
        if target_id:
            collection.update_many(get_safe_query(target_id), {"$set": {"title": new_title}})
        return {"success": True, "chatId": target_id, "title": new_title}
    except Exception as e:
        return {"success": False}

@app.put("/deepseekai/pin")
@app.put("/deepseekai/pin/{chat_id}")
async def pin_chat(request: Request, chat_id: Optional[str] = None):
    try:
        body = await request.json()
        target_id = chat_id or body.get("chatId") or body.get("id") or body.get("_id")
        is_pinned = body.get("isPinned", True) 
        
        if target_id:
            collection.update_many(get_safe_query(target_id), {"$set": {"isPinned": is_pinned}})
        return {"success": True}
    except Exception as e:
        return {"success": False}

@app.delete("/deepseekai/history")
@app.delete("/deepseekai/history/{chat_id}")
async def delete_chat(request: Request, chat_id: Optional[str] = None):
    try:
        body = await request.json()
        target_id = chat_id or body.get("chatId") or body.get("id") or body.get("_id")
        
        if target_id:
            collection.delete_many(get_safe_query(target_id)) 
        return {"success": True, "message": "Chat deleted"}
    except Exception as e:
        return {"success": False}

# =========================================================
# 4. AI Chat Route (🔥 URL BRACKET FIX)
# =========================================================
@app.post("/deepseekai/promt")
async def chat_endpoint(request: Request):
    try:
        body = await request.json()
        content = body.get("content", "")
        chat_id = body.get("chatId", "")
        edit_msg_id = body.get("editMessageId", None)

        if edit_msg_id:
            try:
                old_msg = collection.find_one({"_id": ObjectId(edit_msg_id)})
                if old_msg:
                    collection.delete_many({
                        "chatId": chat_id,
                        "timestamp": {"$gte": old_msg["timestamp"]}
                    })
            except Exception as e:
                pass

        try:
            collection.insert_one({
                "role": "user",
                "content": content,
                "chatId": chat_id,
                "timestamp": datetime.datetime.utcnow()
            })
        except Exception as e:
            pass

        headers = {"Content-Type": "application/json"}
        
        system_instruction = """
        You are ThinkBot AI, an expert software engineer and smart academic assistant.
        Strictly follow these 4 rules:
        1. DETAIL & EXAMPLES (MANDATORY): Always provide highly detailed and comprehensive answers. Whenever the user asks a programming, coding, or technical question (like "what is java?"), YOU MUST provide code examples formatted properly in Markdown (e.g., ```java ... ```). Do not give short answers. Explain the concepts thoroughly with bullet points.
        2. MOOD: Always start with a mood tag: [MOOD: happy], [MOOD: sad], or [MOOD: neutral].
        3. FLASHCARDS: Format study cards, key definitions, or important points EXACTLY like this: [CARD: Question | Answer].
        4. TIMER: If the user asks for focus mode, pomodoro, or a timer, format it EXACTLY like this: [TIMER: number_of_minutes].
        """
        
        prompt_text = f"SYSTEM INSTRUCTIONS:\n{system_instruction}\n\nUSER QUERY: {content}\n\nIMPORTANT: You MUST answer in detail, use bullet points, and include at least one Markdown code block (like ```java ... ```) for technical questions."
        
        data = {"contents": [{"parts": [{"text": prompt_text}]}]}
        
        models_to_try = [
            "gemini-2.5-flash",
            "gemini-3-flash-preview",
            "gemini-2.0-flash"
        ]

        ai_reply = None
        error_message = ""

        for model in models_to_try:
            # 🚀 यह URL अब बिल्कुल साफ है (कोई ब्रैकेट्स नहीं)
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
            
            response = requests.post(url, headers=headers, json=data)
            response_data = response.json()

            if "candidates" in response_data and len(response_data["candidates"]) > 0:
                ai_reply = response_data['candidates'][0]['content']['parts'][0]['text']
                print(f"✅ Success with Google Gemini model: {model}")
                break
            else:
                error_message = response_data.get("error", {}).get("message", "Unknown API Error")
                print(f"⚠️ Model {model} failed. Trying next...")

        if not ai_reply:
            ai_reply = f"❌ Gemini API Error: All models failed. Last Error: {error_message}"

        try:
            collection.insert_one({
                "role": "assistant",
                "content": ai_reply,
                "chatId": chat_id,
                "timestamp": datetime.datetime.utcnow()
            })
        except Exception as e:
            pass

        return {
            "success": True,
            "reply": ai_reply,
            "chatId": chat_id
        }
        
    except Exception as e:
        print(f"Server Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/user/google-login")
async def google_login(data: dict):
    return {
        "success": True,
        "token": "thinkbot_token",
        "user": {"_id": "user123", "firstName": "User"}
    }