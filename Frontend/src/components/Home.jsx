import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Promt from "./Promt";
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
        {/* Added h-full and bg color directly to the inner wrapper to ensure it extends */}
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
              // 🔴 1. यहाँ Desktop वाले बटन में 'menu-btn' लगा दिया
              className="menu-btn p-2 text-gray-400 hover:text-white transition-colors rounded-md"
            >
              <PanelLeft className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Header for mobile */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-700 flex-shrink-0">
          <div className="text-xl font-bold">deepseek</div>
          {/* 🔴 2. यहाँ Mobile वाले बटन में 'menu-btn' लगा दिया */}
          <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="w-6 h-6 text-gray-300" />
          </button>
        </div>

        {/* Message area - locked to remaining height */}
        <div className="flex-1 flex w-full h-full overflow-hidden items-center justify-center">
          <Promt />
        </div>
      </div>

      {/* Overlay on mobile when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default Home;