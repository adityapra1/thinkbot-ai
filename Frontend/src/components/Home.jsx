import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Prompt from "./Prompt"; // 🔴 Updated from Promt to Prompt
import { Menu, PanelLeft } from "lucide-react";

function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    // STRICT VIEWPORT LOCK: h-screen, w-screen, overflow-hidden
    <div className="flex h-screen w-screen bg-[#1e1e1e] text-white overflow-hidden">
      
      {/* Sidebar Container */}
      <div
        className={`fixed md:relative top-0 left-0 h-full bg-[#232327] transition-all duration-300 ease-in-out z-40
        ${isSidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full overflow-hidden"}`}
      >
        <div className="w-64 h-full bg-[#232327]">
          <Sidebar onClose={() => setIsSidebarOpen(false)} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* Desktop floating open button */}
        <div className="hidden md:block absolute top-4 left-4 z-10">
          {!isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="menu-btn p-2 text-gray-400 hover:text-white transition-colors rounded-md"
              aria-label="Open Sidebar"
            >
              <PanelLeft className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* ==========================================
            MOBILE HEADER (UPDATED WITH LOGO & BRANDING)
            ========================================== */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-700/80 bg-[#1e1e24] flex-shrink-0 shadow-sm z-20">
          <div className="flex items-center gap-2.5">
            {/* New SVG Logo added here for mobile view */}
            <img 
              src="/logo.svg" 
              alt="ThinkBot Logo" 
              className="h-7 w-7 drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]"
            />
            <div className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 tracking-wide">
              ThinkBot AI
            </div>
          </div>
          
          <button 
            className="menu-btn p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors" 
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Message area - locked to remaining height */}
        <div className="flex-1 flex w-full h-full overflow-hidden items-center justify-center">
          <Prompt /> {/* 🔴 Render the correctly named component */}
        </div>
      </div>

      {/* Overlay on mobile when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default Home;