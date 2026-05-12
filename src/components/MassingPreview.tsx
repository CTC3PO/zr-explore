"use client";

import React from "react";
import { Floor } from "@/context/ZoningContext";

interface MassingPreviewProps {
  floors: Floor[];
  lotArea: number;
}

export default function MassingPreview({ floors, lotArea }: MassingPreviewProps) {
  if (!floors || floors.length === 0 || !lotArea) return null;

  // Calculate scaling
  const maxArea = Math.max(...floors.map(f => f.area), lotArea);
  const baseScale = 160 / Math.sqrt(lotArea); // Fit into ~160px width
  
  // For a 2D silhouette, we'll stack them
  const getWidth = (area: number) => Math.sqrt(area) * baseScale;

  return (
    <div className="w-full bg-slate-900/5 rounded-2xl p-6 flex flex-col items-center justify-end h-72 relative overflow-hidden border border-slate-100 shadow-inner group transition-all">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>
      
      {/* Floor Stack */}
      <div className="relative z-10 flex flex-col-reverse items-center w-full">
        {floors.map((floor, i) => {
          // Setback logic: Reduce width slightly after floor 6
          const setbackFactor = i > 6 ? 1 - (Math.min(0.4, (i - 6) * 0.05)) : 1;
          const width = getWidth(floor.area) * setbackFactor;
          
          const useColors: Record<string, string> = {
            commercial: 'bg-red-500 border-red-400',
            community_facility: 'bg-blue-500 border-blue-400',
            residential: 'bg-yellow-400 border-yellow-300'
          };
          
          return (
            <div 
              key={floor.id}
              className={`transition-all duration-500 ease-out border-t shadow-sm ${useColors[floor.use] || useColors.residential}`}
              style={{ 
                width: `${width}px`, 
                height: i < 1 ? '18px' : '14px', // Ground floor slightly taller
                marginBottom: '1px',
                opacity: 1 - (i * 0.02),
                borderRadius: i === floors.length - 1 ? '2px 2px 0 0' : '0'
              }}
            >
              {/* Window patterns for detail */}
              <div className="w-full h-full opacity-10 flex justify-around items-center px-1">
                {Array.from({length: Math.floor(width/20)}).map((_, win) => (
                  <div key={win} className="w-1 h-2 bg-white rounded-sm" />
                ))}
              </div>
            </div>
          );
        })}
        
        {/* Ground Plane */}
        <div 
          className="bg-slate-300 h-1 rounded-full mt-1 shadow-sm transition-all"
          style={{ width: `${Math.sqrt(lotArea) * baseScale + 40}px` }}
        />
      </div>

      {/* Stats Overlay */}
      <div className="absolute top-4 left-4 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Building Bulk Profile</span>
        </div>
        <div className="flex gap-3">
          <span className="text-[10px] text-slate-400 font-bold">
            {floors.filter(f => (f.use as string) === 'residential').length} Res / {floors.filter(f => (f.use as string) === 'commercial').length} Comm / {floors.filter(f => (f.use as string) === 'community_facility').length} CF
          </span>
          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter">
            {floors.length > 7 ? 'Setback Applied' : ''}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 bg-white/50 backdrop-blur-sm p-2 rounded-lg border border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-400 rounded-sm"></div>
          <span className="text-[8px] font-bold text-slate-500 uppercase">Residential</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-sm"></div>
          <span className="text-[8px] font-bold text-slate-500 uppercase">Commercial</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-sm"></div>
          <span className="text-[8px] font-bold text-slate-500 uppercase">Comm. Facility</span>
        </div>
      </div>
    </div>
  );
}
