"use client";

import React from "react";
import { useZoning } from "@/context/ZoningContext";

export default function ScenarioOverlay() {
  const { 
    lotData, 
    floorsList,
    selectedBBLs,
    activeTab
  } = useZoning();

  if (selectedBBLs.length === 0 || !lotData || activeTab !== 'builder') return null;

  const lotArea = lotData?.metadata?.lotArea || 0;
  const totalSF = floorsList.reduce((sum, f) => sum + f.area, 0);
  const calculatedFAR = lotArea > 0 ? totalSF / lotArea : 0;
  
  // Calculate max allowed including bonuses
  const baseFAR = parseFloat(lotData?.metadata?.maxResidFAR) || 0;
  const mihBonus = baseFAR >= 10 ? 2.0 : baseFAR >= 6 ? 1.18 : baseFAR * 0.2;
  const maxAllowedFAR = baseFAR + mihBonus; // Simplified for the overlay

  const isOver = calculatedFAR > maxAllowedFAR;

  return (
    <div className="absolute top-4 right-4 z-20 pointer-events-none animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="bg-white/80 backdrop-blur-md border border-white/40 shadow-xl rounded-2xl p-4 min-w-[180px] pointer-events-auto">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex justify-between items-center gap-4">
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Live Metrics</h4>
            {isOver ? (
              <span className="text-[8px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full border border-red-200">OVER LIMIT</span>
            ) : (
              <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-200">COMPLIANT</span>
            )}
          </div>

          {/* FAR Stat */}
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[9px] font-bold text-slate-400 uppercase">Calculated FAR</span>
              <span className={`text-lg font-black tabular-nums ${isOver ? 'text-red-600' : 'text-blue-600'}`}>
                {calculatedFAR.toFixed(2)}
              </span>
            </div>
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-700 ${isOver ? 'bg-red-500' : 'bg-blue-500'}`} 
                style={{ width: `${Math.min(100, (calculatedFAR / maxAllowedFAR) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[8px] font-bold text-slate-400 uppercase">Limit</span>
              <span className="text-[9px] font-bold text-slate-500 tabular-nums">{maxAllowedFAR.toFixed(2)}</span>
            </div>
          </div>

          {/* Area Stat */}
          <div className="pt-2 border-t border-slate-100/50 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-slate-400 uppercase">Total SF</span>
              <span className="text-sm font-black text-slate-800 tabular-nums">{totalSF.toLocaleString()}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[8px] font-bold text-slate-400 uppercase">Floors</span>
              <span className="text-sm font-black text-slate-800 tabular-nums">{floorsList.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
