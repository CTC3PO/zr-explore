"use client";

import { useZoning } from "@/context/ZoningContext";
import { Map as MapIcon, Plus, BookOpen, Search, Grid } from "lucide-react";

export default function Header() {
  const { activeTab, setActiveTab, selectedBBL } = useZoning();

  const tabs = [
    { id: 'explorer', label: 'Explorer', icon: MapIcon },
    { id: 'builder', label: 'Builder', icon: Plus },
    { id: 'chat', label: 'AI Chat', icon: BookOpen },
    { id: 'matrix', label: 'Matrix', icon: Grid }
  ];

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl px-2 py-1.5 gap-1 min-w-[320px] md:min-w-[400px]">
      <div className="flex-1 flex items-center gap-2 px-3 mr-4 border-r border-slate-100">
        <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
          <Search size={16} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-blue-600 leading-none">ZR-EXPLORE</span>
          <span className="text-[9px] text-slate-400 font-medium">NYC ZONING AI</span>
        </div>
      </div>

      <nav className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <tab.icon size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
