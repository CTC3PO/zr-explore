"use client";

import React from "react";
import { Floor } from "@/context/ZoningContext";
import { MassingProfile } from "@/utils/massingLogic";

interface MassingPreviewProps {
  floors: Floor[];
  lotArea: number;
  massingProfile?: MassingProfile | null;
}

const SHAPE_COLORS: Record<string, string> = {
  SLAB: "bg-indigo-400",
  L:    "bg-violet-500",
  U:    "bg-purple-600",
  O:    "bg-fuchsia-600",
};

export default function MassingPreview({ floors, lotArea, massingProfile }: MassingPreviewProps) {
  if (!floors || floors.length === 0 || !lotArea) return null;

  const baseScale = 160 / Math.sqrt(lotArea);
  const getWidth = (area: number) => Math.sqrt(area) * baseScale;

  // Setback threshold from profile, or fallback to floor 6
  const baseFloors = massingProfile?.baseFloors ?? 6;
  const setbackFt = massingProfile?.setbackFt ?? 8;
  // Convert setback to a scale factor for the 2D silhouette
  // Assume average lot width = sqrt(lotArea), convert setback to fraction
  const avgLotWidthFt = Math.sqrt(lotArea / 10.764); // sqft → sqm → sqrtm → ft
  const setbackFraction = setbackFt / Math.max(avgLotWidthFt, 1);

  const useColors: Record<string, string> = {
    commercial: "bg-red-500",
    community_facility: "bg-blue-500",
    residential: "bg-yellow-400",
  };

  return (
    <div className="w-full bg-slate-900/5 rounded-2xl p-6 flex flex-col items-center justify-end h-72 relative overflow-hidden border border-slate-100 shadow-inner group transition-all">
      {/* Background dot grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)", backgroundSize: "12px 12px" }}
      />

      {/* Floor Stack */}
      <div className="relative z-10 flex flex-col-reverse items-center w-full">
        {floors.map((floor, i) => {
          const isAboveBase = i >= baseFloors;
          // Apply setback: step in by setbackFraction on each side above base
          const stepbacks = isAboveBase ? Math.min(0.5, setbackFraction * 2 * (i - baseFloors + 1)) : 0;
          const rawWidth = getWidth(floor.area);
          const width = Math.max(20, rawWidth * (1 - stepbacks));

          return (
            <div
              key={floor.id}
              className="relative transition-all duration-500 ease-out"
              style={{ width: `${width}px`, height: i < 1 ? "20px" : "15px" }}
            >
              {/* Floor fill */}
              <div
                className={`w-full h-full ${useColors[floor.use] || useColors.residential}`}
                style={{ opacity: 1 - i * 0.012 }}
              />
              {/* Window dots */}
              <div className="absolute inset-0 flex justify-around items-center px-1 pointer-events-none">
                {Array.from({ length: Math.max(0, Math.floor(width / 22)) }).map((_, win) => (
                  <div key={win} className="w-0.5 h-1.5 bg-white/25 rounded-full" />
                ))}
              </div>
              {/* White floor separator line */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-white/55 pointer-events-none" />
              {/* Setback indicator dashes on the first setback floor */}
              {i === baseFloors && setbackFt > 0 && (
                <div className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-orange-400/80 pointer-events-none" title={`Setback starts here (${setbackFt}ft)`} />
              )}
              {/* Floor label every 5 floors */}
              {(i + 1) % 5 === 0 && (
                <div className="absolute right-full mr-1.5 top-1/2 -translate-y-1/2 text-[7px] font-black text-slate-400 tabular-nums whitespace-nowrap">
                  {i + 1}F
                </div>
              )}
            </div>
          );
        })}

        {/* Ground plane */}
        <div
          className="bg-slate-300 h-1 rounded-full mt-1 shadow-sm transition-all"
          style={{ width: `${Math.sqrt(lotArea) * baseScale + 40}px` }}
        />
      </div>

      {/* Stats Overlay */}
      <div className="absolute top-4 left-4 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Building Bulk Profile</span>
        </div>
        <div className="flex gap-3">
          <span className="text-[10px] text-slate-400 font-bold">
            {floors.filter(f => f.use === "residential").length} Res /&nbsp;
            {floors.filter(f => f.use === "commercial").length} Comm /&nbsp;
            {floors.filter(f => f.use === "community_facility").length} CF
          </span>
        </div>
        {/* Setback note */}
        {massingProfile && floors.length > baseFloors && (
          <span className="text-[9px] text-orange-500 font-bold flex items-center gap-1">
            <span className="inline-block w-2 h-0.5 bg-orange-400 rounded" />
            {setbackFt}ft setback above fl.{baseFloors}
          </span>
        )}
      </div>

      {/* Shape badge */}
      {massingProfile && (
        <div className="absolute top-4 right-4">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${SHAPE_COLORS[massingProfile.massingShape]}/10 border border-current`}
               style={{ borderColor: "rgba(99,102,241,0.3)" }}>
            <span className="text-[10px] font-black text-indigo-600 tracking-widest">
              {massingProfile.massingShape}
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 bg-white/60 backdrop-blur-sm p-2 rounded-lg border border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-400 rounded-sm" />
          <span className="text-[8px] font-bold text-slate-500 uppercase">Residential</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-sm" />
          <span className="text-[8px] font-bold text-slate-500 uppercase">Commercial</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-sm" />
          <span className="text-[8px] font-bold text-slate-500 uppercase">Comm. Facility</span>
        </div>
        {massingProfile && floors.length > baseFloors && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-0.5 bg-orange-400 rounded-sm" />
            <span className="text-[8px] font-bold text-orange-500 uppercase">Setback</span>
          </div>
        )}
      </div>
    </div>
  );
}
