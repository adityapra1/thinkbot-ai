import React, { useState, useEffect, useRef } from "react";
import { Search, PanelLeftClose, Plus, MoreHorizontal, LogOut, Pencil, Pin, Share, Trash2, PinOff, X, Check } from "lucide-react"; 
import { useAuth } from "../context/AuthProvider";
import { useNavigate } from "react-router-dom";
import axios from "axios"; 
import { BACKEND_URL } from "../utils/utils"; 
import { logoutUser } from "./logout"; 

function Sidebar({ onClose }) {
  let user = null;
  try {
    const storedUser = localStorage.getItem("user");
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      user = JSON.parse(storedUser);
    }
  } catch (error) {
    console.error("Local storage error:", error);
  }

  const [, setAuthUser] = useAuth();
  const navigate = useNavigate();
  
  // 🔴 1. पूरे साइडबार को ट्रैक करने के लिए Ref बनाया
  const sidebarRef = useRef(null);

  const [historyGroups, setHistoryGroups] = useState([]);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [activeMenu, setActiveMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState("down");
  
  const [deleteItem, setDeleteItem] = useState(null);
  const [shareItem, setShareItem] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  const [renamingItem, setRenamingItem] = useState(null);
  const [renameText, setRenameText] = useState("");
  const inputRef = useRef(null);

  const loadHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !user) return;

      const { data } = await axios.get(`${BACKEND_URL}/deepseekai/history`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      if (!Array.isArray(data)) return;

      const groupedChats = {};
      
      data.forEach((msg) => {
        if (msg.role === "user") {
          const folderId = msg.chatId || msg._id; 
          
          if (!groupedChats[folderId]) {
            groupedChats[folderId] = {
              chatId: folderId,
              title: msg.title || msg.content, 
              isPinned: msg.isPinned || false,
              originalContent: msg.content
            };
          }
        }
      });

      let realMessages = Object.values(groupedChats).reverse();
      realMessages.sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));

      setHistoryGroups(realMessages.length > 0 ? [{ title: "Recent Chats", items: realMessages }] : []);
    } catch (error) {
      console.error("Error loading sidebar history from DB:", error);
    }
  };

  useEffect(() => {
    loadHistory();
    window.addEventListener("chatUpdated", loadHistory);
    return () => window.removeEventListener("chatUpdated", loadHistory);
  }, []);

  // 🔴 2. बाहर क्लिक डिटेक्ट करने वाला अपग्रेडेड लॉजिक (menu-btn चेक के साथ)
  useEffect(() => {
    const handleClickOutside = (event) => {
      setActiveMenu(null);

      // 🔴 यहाँ हमने एक नया चेक जोड़ा है: 'menu-btn'
      const isMenuButton = event.target.closest('.menu-btn');

      // अगर क्लिक साइडबार के बाहर हुआ है, और वह 'मेन्यू बटन' भी नहीं है, तब ही बंद करो
      if (sidebarRef.current && !sidebarRef.current.contains(event.target) && !isMenuButton) {
        setShowLogoutMenu(false); 
        if (onClose) onClose();   
      } else {
        setShowLogoutMenu(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    if (renamingItem && inputRef.current) inputRef.current.focus();
  }, [renamingItem]);

  const handleHistoryClick = (chatId) => {
    navigate(`/?chat=${encodeURIComponent(chatId)}`);
    setShowSearchModal(false); 
  };

  const handleNewChat = () => { navigate("/"); };

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    const folderToDelete = deleteItem.chatId; 
    setDeleteItem(null); 
    setActiveMenu(null); 

    setHistoryGroups(prev => {
      const newItems = prev[0]?.items.filter(i => i.chatId !== folderToDelete) || [];
      return newItems.length > 0 ? [{ title: "Recent Chats", items: newItems }] : [];
    });

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("chat") === folderToDelete) {
      navigate("/");
      window.dispatchEvent(new Event("chatUpdated"));
    }

    try {
      await axios.delete(`${BACKEND_URL}/deepseekai/history`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        data: { chatId: folderToDelete }, 
        withCredentials: true
      });
    } catch (error) { console.error("MongoDB Delete Error:", error); }
  };

  const handleRenameClick = (item) => {
    setRenamingItem(item.chatId);
    setRenameText(item.title);
    setActiveMenu(null);
  };

  const handleRenameSubmit = async (item) => {
    if (renameText && renameText.trim() !== "" && renameText !== item.title) {
      try {
        await axios.put(`${BACKEND_URL}/"ThinkBot AI"./rename`, {
          chatId: item.chatId,
          newTitle: renameText
        }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, withCredentials: true });
        loadHistory();
      } catch (e) { console.error("Rename Error", e); }
    }
    setRenamingItem(null);
  };

  const handlePin = async (item) => {
    try {
      await axios.put(`${BACKEND_URL}/deepseekai/pin`, {
        chatId: item.chatId,
        isPinned: !item.isPinned
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, withCredentials: true });
      loadHistory();
    } catch (e) { console.error("Pin Error", e); }
    setActiveMenu(null);
  };

  const handleShareCopy = () => {
    if (!shareItem) return;
    const shareUrl = `${window.location.origin}/?chat=${encodeURIComponent(shareItem.chatId)}`;
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => { setIsCopied(false); setShareItem(null); }, 2000);
  };

  const handleLogoutClick = async () => {
    await logoutUser(setAuthUser, navigate);
  };

  return (
    <>
      <style>{`
        .sidebar-scroll { 
          overflow-y: auto; 
          overflow-x: hidden; 
          scrollbar-width: thin; 
          scrollbar-color: transparent transparent; 
          transition: scrollbar-color 0.3s ease; 
        }
        
        .sidebar-scroll:hover {
          scrollbar-color: #52525b transparent;
        }

        .sidebar-scroll::-webkit-scrollbar { 
          width: 6px; 
        }
        .sidebar-scroll::-webkit-scrollbar-track { 
          background: transparent; 
        }
        .sidebar-scroll::-webkit-scrollbar-thumb { 
          background-color: transparent; 
          border-radius: 10px; 
        }
        
        .sidebar-scroll:hover::-webkit-scrollbar-thumb { 
          background-color: #52525b; 
        }
      `}</style>

      {showSearchModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex justify-center items-start pt-16 px-4">
          <div className="bg-[#1e1e1e] w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-700 overflow-hidden relative z-[101]">
            <div className="flex items-center bg-[#2a2a2f] px-4 py-3">
              <Search className="w-5 h-5 text-gray-400 mr-3"/>
              <input type="text" autoFocus placeholder="Search chat content..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent w-full text-gray-200 outline-none placeholder-gray-500 text-lg" />
              <button onClick={() => setShowSearchModal(false)} className="text-gray-500 text-xs font-bold border border-gray-600 px-2 py-1 rounded hover:text-white">ESC</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto bg-[#1e1e1e]">
              {historyGroups.length > 0 && historyGroups[0].items.filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase())).map((item, index) => (
                  <button key={index} onClick={() => handleHistoryClick(item.chatId)} className="w-full text-left px-5 py-4 hover:bg-[#2a2a2f] text-gray-300 transition-colors flex items-center gap-3 border-b border-gray-800/50">
                    <Search className="w-4 h-4 text-gray-500"/> <span className="truncate text-sm">{item.title}</span>
                  </button>
                ))}
            </div>
          </div>
          <div className="absolute inset-0" onClick={() => setShowSearchModal(false)}></div>
        </div>
      )}

      {shareItem && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex justify-center items-center px-4">
          <div className="bg-[#1e1e1e] border border-gray-700 w-full max-w-[450px] rounded-xl p-6 shadow-2xl relative z-[201]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white text-lg font-semibold">Create public link</h2>
              <button onClick={() => setShareItem(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">Anyone with the link can view the conversation you have shared. Please check for sensitive or private content.</p>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={handleShareCopy} className={`px-5 py-2.5 rounded-lg text-white text-sm font-medium flex items-center gap-2 ${isCopied ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {isCopied ? <><Check className="w-4 h-4"/> Copied</> : 'Create and copy'}
              </button>
            </div>
          </div>
          <div className="absolute inset-0" onClick={() => setShareItem(null)}></div>
        </div>
      )}

      {deleteItem && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex justify-center items-center px-4">
          <div className="bg-[#1e1e1e] border border-gray-700 w-full max-w-[420px] rounded-xl p-6 shadow-2xl relative z-[201]">
            <h2 className="text-white text-xl font-semibold mb-2">This chat cannot be recovered.</h2>
            <p className="text-gray-400 text-sm mb-8">Share links from it will be disabled.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteItem(null)} className="px-5 py-2 rounded-lg text-gray-300 hover:bg-[#2a2a2f] text-sm font-medium">Cancel</button>
              <button onClick={handleDeleteConfirm} className="px-5 py-2 rounded-lg bg-[#e53e3e] hover:bg-[#dc2626] text-white text-sm font-medium">Delete chat</button>
            </div>
          </div>
          <div className="absolute inset-0" onClick={() => setDeleteItem(null)}></div>
        </div>
      )}

      {/* 🔴 3. यहाँ मेन कंटेनर में ref={sidebarRef} लगाया गया है */}
      <div ref={sidebarRef} className="h-full flex flex-col justify-between bg-[#1a1a1c] md:bg-[#1e1e1e] border-r border-gray-800">
        <div className="flex flex-col flex-1 overflow-hidden pt-3">
          <div className="flex justify-between items-center mb-6 px-3">
            <div className="flex items-center gap-2 text-blue-500">
               <div className="text-xl font-bold text-gray-200 tracking-wide">ThinkBot AI</div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-gray-800">
                <PanelLeftClose className="w-5 h-5"/>
              </button>
            </div>
          </div>

          <div className="px-3 mb-2">
            <button onClick={handleNewChat} className="w-full flex items-center justify-center gap-2 bg-[#2a2a2f] hover:bg-[#35353b] text-gray-200 px-4 py-2.5 rounded-full font-medium text-sm">
              <Plus className="w-4 h-4"/> New chat
            </button>
          </div>

          <div className="px-3 mb-4">
            <button onClick={() => setShowSearchModal(true)} className="w-full flex items-center gap-2 bg-[#1a1a1c] hover:bg-[#2a2a2f] border border-gray-700 text-gray-400 px-3 py-2 rounded-lg text-sm">
              <Search className="w-4 h-4"/> Search history...
            </button>
          </div>

          <div className="flex-1 sidebar-scroll pb-4 mt-2">
            {historyGroups.map((group, gIndex) => (
              <div key={gIndex} className="mb-5">
                <div className="text-[12px] text-gray-500 font-medium mb-1.5 px-4 uppercase tracking-wider">{group.title}</div>
                
                {group.items.map((item, iIndex) => {
                  const menuKey = `${gIndex}-${iIndex}`; 
                  const isRenaming = renamingItem === item.chatId;
                  
                  return (
                    <div key={iIndex} className="relative group flex items-center mb-0.5 px-2">
                      
                      {isRenaming ? (
                        <div className="w-full px-2 py-1.5 flex items-center bg-[#2a2a2f] rounded-lg border border-blue-500 shadow-sm z-10">
                          <input 
                            ref={inputRef} type="text" value={renameText}
                            onChange={(e) => setRenameText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit(item)}
                            onBlur={() => handleRenameSubmit(item)}
                            className="bg-transparent w-full text-white text-sm outline-none"
                          />
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleHistoryClick(item.chatId)} 
                          className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[#2a2a2f] text-[#d1d5db] text-sm truncate pr-10 flex items-center"
                        >
                          {item.isPinned && <Pin className="w-3 h-3 mr-2 text-blue-500 flex-shrink-0"/>}
                          <span className="truncate">{item.title}</span>
                        </button>
                      )}

                      {!isRenaming && (
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if(activeMenu === menuKey) setActiveMenu(null);
                            else {
                              const spaceBelow = window.innerHeight - e.clientY;
                              setMenuPosition(spaceBelow < 220 ? "up" : "down");
                              setActiveMenu(menuKey);
                            }
                          }}
                          className={`absolute right-3 p-1.5 rounded-md text-gray-400 hover:text-white transition-opacity ${activeMenu === menuKey ? 'opacity-100 bg-[#35353b]' : 'opacity-0 group-hover:opacity-100 hover:bg-[#35353b]'}`}
                        >
                          <MoreHorizontal className="w-4 h-4"/>
                        </button>
                      )}

                      {activeMenu === menuKey && (
                        <div 
                          className={`absolute right-8 w-[160px] bg-[#2f2f36] border border-gray-700/80 rounded-xl shadow-2xl z-[999] py-1.5 ${menuPosition === "up" ? "bottom-[80%] mb-1" : "top-[80%] mt-1"}`} 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button onClick={() => handleRenameClick(item)} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-[#3f3f46] flex items-center gap-3 transition-colors">
                            <Pencil className="w-4 h-4 text-gray-400"/> Rename
                          </button>
                          <button onClick={() => handlePin(item)} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-[#3f3f46] flex items-center gap-3 transition-colors">
                            {item.isPinned ? <PinOff className="w-4 h-4 text-gray-400"/> : <Pin className="w-4 h-4 text-gray-400"/>} {item.isPinned ? "Unpin" : "Pin"}
                          </button>
                          <button onClick={() => { setShareItem(item); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-[#3f3f46] flex items-center gap-3 transition-colors">
                            <Share className="w-4 h-4 text-gray-400"/> Share
                          </button>
                          
                          <div className="h-px bg-gray-700/80 my-1.5 mx-2"></div>
                          
                          <button onClick={() => { setDeleteItem(item); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-[#ef4444] hover:bg-[#3f3f46] flex items-center gap-3 transition-colors">
                            <Trash2 className="w-4 h-4 text-[#ef4444]"/> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* USER PROFILE SECTION */}
        <div className="p-3 flex-shrink-0 relative border-t border-gray-800">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowLogoutMenu(!showLogoutMenu); }} 
            className="w-full flex items-center justify-between hover:bg-[#2a2a2f] p-2 rounded-xl transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 flex-shrink-0 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                {user?.firstName ? user.firstName.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="flex flex-col overflow-hidden text-left">
                <span className="text-white text-sm font-medium truncate">
                  {user ? `Hello, ${user.firstName} ${user.lastName || ''}`.trim() : "My Profile"}
                </span>
                {user?.email && (
                  <span className="text-gray-400 text-[11px] truncate leading-tight mt-0.5">
                    {user.email}
                  </span>
                )}
              </div>
            </div>
            <MoreHorizontal className="w-5 h-5 text-gray-500 flex-shrink-0"/>
          </button>

          {showLogoutMenu && user && (
            <div className="absolute bottom-16 left-3 right-3 bg-[#2a2a2f] border border-gray-700 rounded-lg shadow-xl overflow-hidden z-[150]">
              <button onClick={handleLogoutClick} className="w-full flex items-center gap-3 text-red-400 text-sm px-4 py-3 hover:bg-[#35353b] transition-colors">
                <LogOut className="w-4 h-4"/> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Sidebar;