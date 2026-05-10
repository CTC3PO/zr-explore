"use client";

import { useState } from "react";
import Map from "@/components/Map";
import Sidebar from "@/components/Sidebar";
import { Menu, X } from "lucide-react";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <main className="flex h-screen w-full overflow-hidden relative">
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white p-3 rounded-full shadow-2xl md:hidden hover:scale-110 transition-transform active:scale-95"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar - responsive behavior */}
      <div className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        fixed md:relative z-40 h-full transition-transform duration-300 ease-in-out
        md:translate-x-0
      `}>
        <Sidebar />
      </div>

      {/* Map - takes remaining space */}
      <div className="flex-1 h-full relative">
        <Map />
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </main>
  );
}
