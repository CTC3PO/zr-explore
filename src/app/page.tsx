"use client";

import { useState, useEffect, useRef } from "react";
import Map from "@/components/Map";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Menu, X, ChevronUp, ChevronDown } from "lucide-react";
import { useZoning } from "@/context/ZoningContext";

export default function Home() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(384);
  const isResizing = useRef(false);
  const { selectedBBLs } = useZoning();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = e.clientX;
      if (newWidth > 320 && newWidth < 1000) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = 'default';
      // Disable text selection during drag
      document.body.style.userSelect = 'auto';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <main className="flex flex-col md:flex-row h-screen w-full overflow-hidden relative bg-slate-50">
      <Header />

      {/* DESKTOP SIDEBAR / MOBILE BOTTOM PANEL */}
      <div 
        style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
        className={`
          fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ease-in-out bg-white shadow-[0_-8px_30px_rgb(0,0,0,0.08)]
          md:relative md:translate-x-0 md:h-full md:shadow-none md:border-r md:border-slate-200
          w-full md:w-[var(--sidebar-width)]
          ${isExpanded ? 'h-[90vh]' : 'h-[45vh]'} 
          ${selectedBBLs.length === 0 ? 'translate-y-full md:translate-y-0' : 'translate-y-0'}
          md:flex md:flex-col
        `}
      >
        {/* Mobile Handle */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center py-2 md:hidden text-slate-300 hover:text-slate-400"
        >
          {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
        
        <div className="flex-1 overflow-hidden">
          <Sidebar />
        </div>

        {/* Desktop Drag Resizer */}
        <div 
          className="hidden md:block absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 z-50"
          onMouseDown={() => {
            isResizing.current = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
        />
      </div>

      {/* MAP AREA */}
      <div className={`
        flex-1 relative transition-all duration-500
        ${selectedBBLs.length > 0 ? 'h-[55vh] md:h-full' : 'h-full'}
      `}>
        <Map />
        
        {/* Welcome message when no lot selected */}
        {selectedBBLs.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
            <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-white shadow-2xl text-center max-w-sm">
              <h2 className="text-xl font-bold text-slate-800 mb-2">Welcome to ZR-Explore</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Search for an address or click directly on the map to begin your zoning discovery.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
