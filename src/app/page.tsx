"use client";

import { useState } from "react";
import Map from "@/components/Map";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Menu, X, ChevronUp, ChevronDown } from "lucide-react";
import { useZoning } from "@/context/ZoningContext";

export default function Home() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { selectedBBL } = useZoning();

  return (
    <main className="flex flex-col md:flex-row h-screen w-full overflow-hidden relative bg-slate-50">
      <Header />

      {/* DESKTOP SIDEBAR / MOBILE BOTTOM PANEL */}
      <div className={`
        fixed bottom-0 left-0 right-0 z-40 transition-all duration-500 ease-in-out bg-white shadow-[0_-8px_30px_rgb(0,0,0,0.08)]
        md:relative md:translate-x-0 md:h-full md:w-96 md:shadow-none md:border-r md:border-slate-200
        ${isExpanded ? 'h-[90vh]' : 'h-[45vh]'} 
        ${!selectedBBL ? 'translate-y-full md:translate-y-0' : 'translate-y-0'}
        md:flex md:flex-col
      `}>
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
      </div>

      {/* MAP AREA */}
      <div className={`
        flex-1 relative transition-all duration-500
        ${selectedBBL ? 'h-[55vh] md:h-full' : 'h-full'}
      `}>
        <Map />
        
        {/* Welcome message when no lot selected */}
        {!selectedBBL && (
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
