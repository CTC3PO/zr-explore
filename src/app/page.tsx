"use client";

import { useState, useEffect, useRef } from "react";
import Map from "@/components/Map";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import ScenarioOverlay from "@/components/ScenarioOverlay";
import { DiscoveryWizard } from "@/components/DiscoveryWizard";
import { Menu, X, ChevronUp, ChevronDown, HelpCircle } from "lucide-react";
import { useZoning } from "@/context/ZoningContext";

export default function Home() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(384);
  const [showWizard, setShowWizard] = useState(false);
  const isResizing = useRef(false);
  const { selectedBBLs } = useZoning();

  // Show the wizard on first visit only
  useEffect(() => {
    const hasSeenWizard = localStorage.getItem('zr-explore-wizard-seen');
    if (!hasSeenWizard) {
      setShowWizard(true);
      localStorage.setItem('zr-explore-wizard-seen', 'true');
    }
  }, []);

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

      {/* Discovery Wizard Overlay */}
      {showWizard && <DiscoveryWizard onClose={() => setShowWizard(false)} />}

      {/* Help Button — always accessible to re-open wizard */}
      <button
        onClick={() => setShowWizard(true)}
        title="Open Getting Started Guide"
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg shadow-blue-500/30 transition-all hover:scale-110 active:scale-95 no-print"
      >
        <HelpCircle size={20} />
      </button>

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
        <ScenarioOverlay />
        
        {/* Welcome overlay when no lot selected */}
        {selectedBBLs.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
            <div className="bg-white/92 backdrop-blur-md rounded-3xl border border-white/80 shadow-2xl text-center max-w-xs overflow-hidden">
              <div className="px-6 pt-6 pb-4">
                <div className="text-2xl mb-2">🗺️</div>
                <h2 className="text-base font-black text-slate-800 mb-1">Welcome to ZR-Explore</h2>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Click any lot on the map or search an address to begin.
                </p>
              </div>
              <div className="grid grid-cols-3 border-t border-slate-100">
                {[
                  { icon: "📍", label: "Zoning Data" },
                  { icon: "🏗️", label: "3D Builder" },
                  { icon: "🤖", label: "AI Consult" },
                ].map(f => (
                  <div key={f.label} className="py-3 flex flex-col items-center gap-0.5 border-r border-slate-100 last:border-r-0">
                    <span className="text-base">{f.icon}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wide">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
