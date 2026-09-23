import os
import datetime
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

# Load environment variables
load_dotenv()

# =========================================================
# 1. MONGODB CONNECTION
# =========================================================
MONGO_URI = os.getenv("MONGO_URI")
try:
    client = MongoClient(MONGO_URI)
    client.admin.command('ping')
    print("✅ Success: MongoDB Connected Successfully to ThinkBot AI!")
    db = client["ThinkBot_DB"]
    collection = db["chat_history"]
except Exception as e:
    print(f"❌ Error: MongoDB Connection Failed! Details: {e}")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# =========================================================
# 2. FASTAPI APP & CORS SETUP (यह लाइन मिसिंग थी!)
# =========================================================
app = FastAPI(title="ThinkBot AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://thinkbot-ai-liard.vercel.app", 
        "http://localhost:4000",
        "http://localhost:5173"
    ], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "active", "message": "Backend is running smoothly"}

# =========================================================
# 3. CHAT HISTORY ROUTES
# =========================================================
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
        print(f"⚠️ Error fetching history: {e}")
        return []

def get_safe_query(target_id):
    queries = [{"chatId": str(target_id)}, {"id": str(target_id)}]
    if target_id and len(str(target_id)) == 24:
        try:
            queries.append({"_id": ObjectId(target_id)})
        except Exception:
            pass
    return {"$or": queries}

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
        print(f"⚠️ Error renaming chat: {e}")
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
        print(f"⚠️ Error pinning chat: {e}")
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
        print(f"⚠️ Error deleting chat: {e}")
        return {"success": False}

@app.get("/user/logout")
@app.post("/user/logout")
async def logout_user():
    return {"success": True}

@app.post("/user/google-login")
async def google_login(data: dict):
    return {
        "success": True,
        "token": "thinkbot_token",
        "user": {"_id": "user123", "firstName": "User"}
    }

# =========================================================
# 4. MAIN AI CHAT GENERATION ROUTE (ASYNC OPTIMIZED)
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
                print(f"⚠️ Error during message edit deletion: {e}")

        try:
            collection.insert_one({
                "role": "user",
                "content": content,
                "chatId": chat_id,
                "timestamp": datetime.datetime.utcnow()
            })
        except Exception as e:
            print(f"⚠️ Failed to save user message to DB: {e}")

        system_instruction = """
        You are ThinkBot AI, an expert software engineer and smart academic assistant.
        Strictly follow these 4 core rules:
        1. DETAIL & EXAMPLES (MANDATORY): Always provide highly detailed and comprehensive answers. Whenever the user asks a programming, coding, or technical question (e.g., "what is Java?", "explain pointers"), YOU MUST provide practical code examples formatted properly in Markdown (e.g., ```java ... ```). Do not give short answers. Explain concepts thoroughly using bullet points.
        2. MOOD TAGGING: Always start your response with exactly ONE of these mood tags based on the user's sentiment: [MOOD: happy], [MOOD: sad], or [MOOD: neutral].
        3. FLASHCARDS: If summarizing key points or definitions, format them EXACTLY like this: [CARD: Question | Answer].
        4. FOCUS TIMER: If the user explicitly asks for a focus mode, study timer, or pomodoro, include this tag EXACTLY: [TIMER: number_of_minutes].
        """
        
        prompt_text = f"SYSTEM INSTRUCTIONS:\n{system_instruction}\n\nUSER QUERY: {content}\n\nIMPORTANT: You MUST answer in detail, use bullet points, and include at least one Markdown code block if the question is technical."
        
        payload = {"contents": [{"parts": [{"text": prompt_text}]}]}
        headers = {"Content-Type": "application/json"}
        
        models_to_try = [
            "gemini-2.5-flash",
            "gemini-3-flash-preview",
            "gemini-2.0-flash"
        ]

        ai_reply = None
        error_message = ""

        async with httpx.AsyncClient(timeout=30.0) as client:
            for model in models_to_try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
                
                try:
                    response = await client.post(url, headers=headers, json=payload)
                    response_data = response.json()

                    if "candidates" in response_data and len(response_data["candidates"]) > 0:
                        ai_reply = response_data['candidates'][0]['content']['parts'][0]['text']
                        print(f"✅ Success with Google Gemini model: {model}")
                        break
                    else:
                        error_message = response_data.get("error", {}).get("message", "Unknown API Error")
                        print(f"⚠️ Model {model} failed. Error: {error_message}. Trying next...")
                except Exception as req_err:
                    print(f"⚠️ Network error with model {model}: {req_err}")
                    error_message = str(req_err)

        if not ai_reply:
            ai_reply = f"❌ Gemini API Error: All models failed to respond. Last Error: {error_message}"

        try:
            collection.insert_one({
                "role": "assistant",
                "content": ai_reply,
                "chatId": chat_id,
                "timestamp": datetime.datetime.utcnow()
            })
        except Exception as e:
            print(f"⚠️ Failed to save assistant message to DB: {e}")

        return {
            "success": True,
            "reply": ai_reply,
            "chatId": chat_id
        }
        
    except Exception as e:
        print(f"❌ Critical Server Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error occurred while processing the request.")