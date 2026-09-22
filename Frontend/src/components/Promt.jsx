import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { ArrowUp, Copy, Check, Download, Maximize2, Minimize2, X, Pencil, ChevronDown, ChevronUp, Clock, Volume2, VolumeX } from "lucide-react"; 
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLocation, useNavigate } from "react-router-dom"; 

import { BACKEND_URL } from "../utils/utils"; 

// ==========================================
// 3D INTERACTIVE FLASHCARD 
// ==========================================
const Flashcard = ({ front, back }) => {
  const [flipped, setFlipped] = useState(false);
  return (
    <div onClick={() => setFlipped(!flipped)} className="cursor-pointer w-full md:w-64 h-40 perspective-1000 my-3 flex-shrink-0">
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${flipped ? 'rotate-y-180' : ''}`}>
        <div className="absolute w-full h-full bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center p-4 backface-hidden shadow-lg border border-blue-400">
          <p className="font-bold text-white text-center">{front}</p>
          <span className="absolute bottom-2 right-3 text-[10px] text-blue-200">Click to flip</span>
        </div>
        <div className="absolute w-full h-full bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center p-4 backface-hidden rotate-y-180 shadow-lg border border-green-400">
          <p className="text-white text-center text-sm">{back}</p>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 1. AI Code Box Component 
// ==========================================
const CodeBlock = ({ node, inline, className, children, ...props }) => {
  const [isCopied, setIsCopied] = useState(false);
  
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "code";
  const codeString = String(children).replace(/\n$/, "");

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([codeString], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    let extension = "txt";
    if (language === "javascript" || language === "js") extension = "js";
    else if (language === "python" || language === "py") extension = "py";
    else if (language === "html") extension = "html";
    else if (language === "css") extension = "css";
    else if (language === "csharp" || language === "cs") extension = "cs";
    
    link.download = `thinkbot-code.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!inline && match) {
    return (
      <div className="my-4 rounded-xl overflow-hidden border border-gray-700 bg-[#1e1e1e]">
        <div className="flex items-center justify-between px-4 py-2 bg-[#2a2a2f] text-gray-400 text-xs font-mono">
          <span className="uppercase">{language}</span>
          <div className="flex items-center gap-3">
            <button onClick={handleCopy} className="hover:text-white transition-colors flex items-center gap-1" title="Copy code">
              {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button onClick={handleDownload} className="hover:text-white transition-colors flex items-center gap-1" title="Download code">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-4 overflow-x-auto text-sm font-mono text-gray-300">
          <code className={className} {...props}>
            {children}
          </code>
        </div>
      </div>
    );
  }

  return (
    <code className="bg-gray-800 text-pink-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
      {children}
    </code>
  );
};

// ==========================================
// 2. USER MESSAGE BLOCK 
// ==========================================
const UserMessageBlock = ({ content, index, onUpdate, isLoading }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [isEditing, editValue]);

  const words = content.trim().split(/\s+/);
  const isLong = words.length > 50;
  
  const displayContent = (!isExpanded && isLong && !isEditing) 
    ? words.slice(0, 50).join(" ") + "..." 
    : content;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (isEditing) {
    const isTextChanged = editValue.trim() !== content.trim();
    const isValid = editValue.trim().length > 0;
    const canUpdate = isTextChanged && isValid;

    return (
      <div className="w-full max-w-[90%] md:max-w-[85%] bg-[#1e1e22] text-gray-100 rounded-3xl p-5 self-start shadow-md flex flex-col border border-gray-700 transition-all">
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="bg-transparent w-full text-white placeholder-gray-500 text-[15px] outline-none resize-none msg-scroll min-h-[60px]"
          style={{ color: "white", WebkitTextFillColor: "white" }}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
        
        <div className="flex justify-end items-center mt-4 gap-2">
          <button onClick={() => setEditValue("")} className="text-gray-400 hover:text-red-400 hover:bg-gray-800/60 px-4 py-2 rounded-full text-sm font-medium transition-colors">Clear</button>
          <button onClick={() => { setIsEditing(false); setEditValue(content); }} className="text-gray-300 hover:text-white hover:bg-gray-800/60 px-4 py-2 rounded-full text-sm font-medium transition-colors">Cancel</button>
          <button 
            onClick={() => { if (canUpdate) { onUpdate(index, editValue); setIsEditing(false); } }}
            disabled={!canUpdate}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center justify-center ${canUpdate ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.6)] animate-pulse' : 'bg-[#2a2a2f] text-gray-500 cursor-not-allowed'}`}
          >
            Update
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative max-w-[85%] md:max-w-[75%] bg-[#2a2a2f] text-gray-100 rounded-3xl px-5 py-3.5 text-[15px] self-start shadow-sm flex flex-col transition-all">
      <div className="whitespace-pre-wrap leading-relaxed">{displayContent}</div>
      <div className="flex justify-end items-center mt-2 gap-1.5 -mb-1 -mr-1">
        {isLong && (
          <button onClick={() => setIsExpanded(!isExpanded)} className="text-gray-400 hover:text-white hover:bg-[#35353b] px-2 py-1 rounded-full transition-colors flex items-center gap-1 text-xs font-medium">
            {isExpanded ? "Collapse text" : "Expand text"}
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
        {!isLoading && (
          <div className={`flex items-center gap-1 transition-opacity ${isLong ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            <button onClick={handleCopy} className="text-gray-400 hover:text-white hover:bg-[#35353b] p-1.5 rounded-full transition-colors" title="Copy">
              {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
            <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-white hover:bg-[#35353b] p-1.5 rounded-full transition-colors" title="Edit message">
              <Pencil size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 3. MAIN PROMPT COMPONENT
// ==========================================
function Promt() {
  let user = null;
  try {
    const storedUser = localStorage.getItem("user");
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      user = JSON.parse(storedUser);
    }
  } catch (error) {
    console.error("Error reading user from localStorage:", error);
  }

  const [inputValue, setInputValue] = useState("");
  const [logoError, setLogoError] = useState(false);
  const [promt, setPromt] = useState([]); 
  const [currentSession, setCurrentSession] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [limitError, setLimitError] = useState(""); 
  const [isExpanded, setIsExpanded] = useState(false);
  const [chatTheme, setChatTheme] = useState("bg-[#121212]"); 
  const [activeTimer, setActiveTimer] = useState(null); 
  const [isSpeaking, setIsSpeaking] = useState(false);

  const promtEndRef = useRef();
  const inputRef = useRef(null); 
  const chatContainerRef = useRef(null); 
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const chatQuery = searchParams.get("chat"); 

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const { data } = await axios.get(`${BACKEND_URL}/deepseekai/history`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setPromt(data);
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  };

  useEffect(() => {
    fetchHistory();
    window.addEventListener("chatUpdated", fetchHistory);
    return () => window.removeEventListener("chatUpdated", fetchHistory);
  }, []);

  useEffect(() => {
    if (!chatQuery) {
      setCurrentSession([]); 
      setLimitError(""); 
      inputRef.current?.focus(); 
    }
  }, [chatQuery]);

  let messagesToShow = [];
  if (chatQuery) {
    messagesToShow = promt.filter(p => p.chatId === chatQuery || p._id === chatQuery);
  } else {
    messagesToShow = currentSession;
  }

  useEffect(() => {
    promtEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesToShow, loading]);

  useEffect(() => {
    let interval = null;
    if (activeTimer !== null && activeTimer > 0) {
      interval = setInterval(() => setActiveTimer(t => t - 1), 1000);
    } else if (activeTimer === 0) {
      alert("⏰ Time is up! ThinkBot says: Task Completed!");
      setActiveTimer(null);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const handleSpeak = (text) => {
    if (!window.speechSynthesis) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN"; 
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => { if (window.speechSynthesis) window.speechSynthesis.cancel(); };
  }, []);

  useEffect(() => {
    const lastMsg = messagesToShow[messagesToShow.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      const text = lastMsg.content;
      if (text.toLowerCase().includes('[mood: happy]')) setChatTheme("bg-[#1a1025]"); // Elegant dark theme update
      else if (text.toLowerCase().includes('[mood: sad]')) setChatTheme("bg-[#0d1624]");
      else if (text.toLowerCase().includes('[mood: neutral]')) setChatTheme("bg-[#121212]");
      
      const timerMatch = text.match(/\[TIMER:\s*(\d+)\]/i);
      if (timerMatch) setActiveTimer(parseInt(timerMatch[1]) * 60);
    }
  }, [messagesToShow]);

  const renderAssistantMessage = (rawText) => {
    const cards = [];
    const cardRegex = /\[CARD:\s*(.*?)\s*\Vert{}\s*(.*?)\]/gi;
    let match;
    while ((match = cardRegex.exec(rawText)) !== null) {
      cards.push({ q: match[1], a: match[2] });
    }
    
    let cleanText = rawText
      .replace(/\[MOOD:[^\]]+\]/gi, '')
      .replace(/\[TIMER:[^\]]+\]/gi, '')
      .replace(/\[CARD:[^\]]+\]/gi, '')
      .trim();

    return (
      <div className="w-full group">
        <div className="w-full text-white px-2 py-3 text-[15px] leading-relaxed break-words">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>
            {cleanText}
          </ReactMarkdown>
        </div>
        
        {cards.length > 0 && (
          <div className="flex flex-wrap gap-4 mt-2 px-2">
            {cards.map((c, i) => <Flashcard key={i} front={c.q} back={c.a} />)}
          </div>
        )}

        <div className="flex justify-start gap-2 px-2 pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => handleSpeak(cleanText)} className="text-gray-400 hover:text-white bg-[#2a2a2f] hover:bg-[#35353b] p-1.5 rounded-md transition-colors flex items-center gap-1 text-xs">
                {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />} {isSpeaking ? "Stop" : "Listen"}
            </button>
            <button onClick={() => navigator.clipboard.writeText(cleanText)} className="text-gray-400 hover:text-white bg-[#2a2a2f] hover:bg-[#35353b] p-1.5 rounded-md transition-colors flex items-center gap-1 text-xs">
                <Copy size={14} /> Copy
            </button>
        </div>
      </div>
    );
  };

  const handleUpdateMessage = async (msgIndex, newText) => {
    // Keep exact same backend logic
    const trimmed = newText.trim();
    if (!trimmed) return;
    setLimitError(""); setLoading(true);
    let activeChatId = chatQuery;
    if (!activeChatId) { activeChatId = `chat_${Date.now()}`; navigate(`/?chat=${activeChatId}`, { replace: true }); }
    const newUserMsg = { role: "user", content: trimmed, chatId: activeChatId };
    let targetMessageId = null;
    if (chatQuery) {
      const currentChatMessages = promt.filter(p => p.chatId === activeChatId || p._id === activeChatId);
      targetMessageId = currentChatMessages[msgIndex]?._id; 
      const otherChatMessages = promt.filter(p => p.chatId !== activeChatId && p._id !== activeChatId);
      const updatedChatMessages = currentChatMessages.slice(0, msgIndex);
      setPromt([...otherChatMessages, ...updatedChatMessages, newUserMsg]);
    } else {
      targetMessageId = currentSession[msgIndex]?._id; 
      const updatedSession = currentSession.slice(0, msgIndex);
      setCurrentSession([...updatedSession, newUserMsg]);
    }
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      const { data } = await axios.post(`${BACKEND_URL}/deepseekai/promt`, { content: trimmed, chatId: activeChatId, editMessageId: targetMessageId }, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      const newAiMsg = { role: "assistant", content: data.reply, chatId: activeChatId };
      if (chatQuery) setPromt((prev) => [...prev, newAiMsg]);
      else setCurrentSession((prev) => [...prev, newAiMsg]);
      window.dispatchEvent(new Event("chatUpdated"));
    } catch (error) {
      window.dispatchEvent(new Event("chatUpdated"));
      if (error.response && error.response.status === 403) setLimitError(error.response.data.message); 
      else {
         const errorMessage = error.response?.status === 429 ? "❌ **Server is currently busy!**\nModel is overloaded right now. Please wait a moment." : "❌ Something went wrong. Please try again.";
         const errorMsg = { role: "assistant", content: errorMessage, chatId: activeChatId };
         if (chatQuery) setPromt((prev) => [...prev, errorMsg]);
         else setCurrentSession((prev) => [...prev, errorMsg]);
      }
    } finally { setLoading(false); }
  };

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setLimitError(""); setInputValue(""); setLoading(true); setIsExpanded(false); 
    if (inputRef.current) inputRef.current.style.height = "auto"; 
    let activeChatId = chatQuery;
    if (!activeChatId) { activeChatId = `chat_${Date.now()}`; navigate(`/?chat=${activeChatId}`, { replace: true }); }
    const newUserMsg = { role: "user", content: trimmed, chatId: activeChatId };
    setPromt((prev) => [...prev, newUserMsg]);
    setCurrentSession((prev) => [...prev, newUserMsg]);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      const { data } = await axios.post(`${BACKEND_URL}/deepseekai/promt`, { content: trimmed, chatId: activeChatId }, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      const newAiMsg = { role: "assistant", content: data.reply, chatId: activeChatId };
      setPromt((prev) => [...prev, newAiMsg]);
      setCurrentSession((prev) => [...prev, newAiMsg]);
      window.dispatchEvent(new Event("chatUpdated"));
    } catch (error) {
      window.dispatchEvent(new Event("chatUpdated"));
      if (error.response && error.response.status === 403) {
         setLimitError(error.response.data.message); 
         setPromt((prev) => prev.filter(msg => msg !== newUserMsg));
         setCurrentSession((prev) => prev.filter(msg => msg !== newUserMsg));
      } else {
         const errorMessage = error.response?.status === 429 ? "❌ **Server is currently busy!**\nModel is overloaded right now. Please wait a moment." : "❌ Something went wrong. Please try again.";
         const errorMsg = { role: "assistant", content: errorMessage, chatId: activeChatId };
         setPromt((prev) => [...prev, errorMsg]);
         setCurrentSession((prev) => [...prev, errorMsg]);
      }
    } finally { setLoading(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInput = (e) => {
    setInputValue(e.target.value);
    if (!isExpanded) { e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`; }
  };

  const handleClearText = () => {
    setInputValue("");
    if (inputRef.current) { inputRef.current.style.height = "auto"; inputRef.current.focus(); }
  };

  return (
    <>
      <style>{`
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background-color: #4b5563; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background-color: #6b7280; }
        
        .msg-scroll::-webkit-scrollbar { width: 4px; }
        .msg-scroll::-webkit-scrollbar-thumb { background-color: #52525b; border-radius: 4px; }

        .perspective-1000 { perspective: 1000px; }
        .transform-style-preserve-3d { transform-style: preserve-3d; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .backface-hidden { backface-visibility: hidden; }

        /* ==========================================
           NEW ANIMATION CSS (GLOW & GRADIENTS)
           ========================================== */
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-bg-flow {
          background-size: 200% 200%;
          animation: gradient-flow 3s ease infinite;
        }
        .ai-glow-border {
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
        }

        @keyframes gemini-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40% { transform: translateY(-3px); opacity: 1; }
        }
        .gemini-dot {
          width: 5px; height: 5px; background-color: #9ca3af; border-radius: 50%;
          animation: gemini-bounce 1.4s infinite ease-in-out both;
        }
        .gemini-dot:nth-child(1) { animation-delay: -0.32s; }
        .gemini-dot:nth-child(2) { animation-delay: -0.16s; }
        .gemini-dot:nth-child(3) { animation-delay: 0s; }
      `}</style>

      <div className={`flex flex-col h-full items-center justify-between flex-1 w-full px-4 pb-4 md:pb-8 transition-colors duration-1000 ${chatTheme}`}>
        
        {/* NEW ANIMATED TIMER BANNER (Replaced Red Box) */}
        {activeTimer !== null && (
          <div className="w-full max-w-4xl mt-4">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 backdrop-blur-md text-white px-5 py-3 rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(99,102,241,0.5)] animate-bg-flow border border-indigo-400">
              <Clock size={18} className="animate-spin-slow" />
              <span className="font-mono font-bold text-lg tracking-wide">
                Focus Timer: {Math.floor(activeTimer / 60)}:{('0' + (activeTimer % 60)).slice(-2)}
              </span>
              <button onClick={() => setActiveTimer(null)} className="ml-4 bg-white/20 p-1.5 rounded-full hover:bg-white hover:text-indigo-800 transition-colors"><X size={14}/></button>
            </div>
          </div>
        )}

        {messagesToShow.length === 0 && !loading && (
          <div className="mt-8 md:mt-12 text-center flex flex-col items-center flex-shrink-0">
            <div className="flex items-center justify-center gap-3 mb-6">
              {!logoError ? (
                <img src="http://localhost:5174/logo.png" alt="ThinkBot Logo" className="h-6 md:h-8" onError={(e) => { setLogoError(true); e.target.style.display = 'none'; }} />
              ) : (
                <div className="h-8 w-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">TB</div>
              )}
              <h1 className="text-2xl md:text-3xl font-semibold text-white">
                Good Morning {user?.firstName ? user.firstName : "ThinkBot"}
              </h1>
            </div>
          </div>
        )}

        <div ref={chatContainerRef} tabIndex={0} className="w-full max-w-4xl flex-1 overflow-y-auto mt-6 mb-4 space-y-4 px-2 pr-4 outline-none">
          {messagesToShow.map((msg, index) => (
            <div key={index} className={`w-full flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" ? renderAssistantMessage(msg.content) : <UserMessageBlock content={msg.content} index={index} onUpdate={handleUpdateMessage} isLoading={loading}/>}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start w-full">
              <div className="px-4 py-3 flex items-center gap-1.5">
                 <div className="gemini-dot"></div><div className="gemini-dot"></div><div className="gemini-dot"></div>
              </div>
            </div>
          )}
          <div ref={promtEndRef} />
        </div>

        <div className="w-full max-w-4xl relative flex-shrink-0">
          
          {/* NEW ANIMATED ERROR BANNER (Replaced Red Box) */}
          {limitError && (
            <div className="w-full text-center mb-4 animate-bounce">
              <span className="text-white bg-gradient-to-r from-pink-600 to-red-500 px-5 py-2 rounded-xl text-sm shadow-[0_0_15px_rgba(236,72,153,0.5)] font-medium tracking-wide">
                {limitError}
              </span>
            </div>
          )}

          {/* ==========================================
              NEW ANIMATED INPUT CONTAINER 
              ========================================== */}
          <div className={`relative p-[2px] rounded-3xl transition-all duration-500 flex flex-col ${isExpanded ? 'h-[50vh]' : ''} 
            ${loading ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-bg-flow ai-glow-border' : 'bg-gray-700/50 hover:bg-gray-600/60 border border-gray-600/50'}`}>
            
            <div className={`relative bg-[#1e1e24] rounded-3xl px-4 md:px-5 pt-3 pb-12 w-full h-full flex flex-col`}>
              <textarea
                ref={inputRef} 
                placeholder="Message ThinkBot..."
                value={inputValue}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                disabled={!!limitError}
                className={`bg-transparent w-full text-white placeholder-gray-400 text-base outline-none resize-none msg-scroll ${isExpanded ? 'flex-1 h-full' : 'h-[24px] max-h-[200px]'}`}
                style={{ minHeight: isExpanded ? '100%' : '24px', color: "white", WebkitTextFillColor: "white" }}
                autoComplete="off" autoCorrect="off" spellCheck="false"
              />
              
              <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsExpanded(!isExpanded)} className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-700/50" title={isExpanded ? "Collapse text" : "Expand text"}>
                    {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                  {inputValue.length > 0 && (
                    <button onClick={handleClearText} className="text-gray-400 hover:text-pink-400 transition-colors p-1.5 rounded-lg hover:bg-gray-700/50" title="Clear message">
                      <X size={18} />
                    </button>
                  )}
                </div>

                {/* NEW ANIMATED SEND BUTTON */}
                <button 
                  onClick={handleSend} 
                  disabled={loading || !!limitError || !inputValue.trim()} 
                  className={`w-9 h-9 rounded-full transition-all duration-300 flex items-center justify-center flex-shrink-0 shadow-sm
                    ${loading 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse text-white shadow-[0_0_15px_rgba(168,85,247,0.6)]' 
                      : inputValue.trim() 
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' 
                        : 'bg-[#4a4a4a] text-gray-400'
                    }`}
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </>
  );
}

export default Promt;