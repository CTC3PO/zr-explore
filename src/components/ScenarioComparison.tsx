"use client";

import React, { useState } from "react";
import { Floor } from "@/context/ZoningContext";
import MassingPreview from "./MassingPreview";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Scenario {
  label: string;
  tag: string;
  tagColor: string;
  floors: Floor[];
  farUsed: number;
  maxFar: number;
  totalSF: number;
  floors_count: number;
}

interface ScenarioComparisonProps {
  lotArea: number;
  maxResidFAR: number;
  maxCommFAR: number;
  currentFloors: Floor[];
  zoningDistrict: string;
  onApplyScenario?: (floors: Floor[]) => void;
}

function buildScenarioFloors(
  totalSF: number,
  floorArea: number,
  use: "residential" | "commercial" | "community_facility",
  groundUse?: "commercial" | "community_facility"
): Floor[] {
  const count = Math.max(1, Math.round(totalSF / floorArea));
  return Array.from({ length: count }, (_, i) => ({
    id: Date.now() + i,
    area: floorArea,
    use: i === 0 && groundUse ? groundUse : use,
  }));
}

export default function ScenarioComparison({
  lotArea,
  maxResidFAR,
  maxCommFAR,
  currentFloors,
  zoningDistrict,
  onApplyScenario,
}: ScenarioComparisonProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!lotArea || !maxResidFAR) return null;

  const floorPlate = Math.round(lotArea * 0.65);
  const mihBonus = maxResidFAR >= 10 ? 2.0 : maxResidFAR >= 6 ? 1.18 : maxResidFAR * 0.2;
  const maxWithMIH = maxResidFAR + mihBonus;

  // Current simulation (passed in)
  const currentSF = currentFloors.reduce((s, f) => s + f.area, 0);
  const currentFAR = lotArea > 0 ? currentSF / lotArea : 0;

  const scenarios: Scenario[] = [
    // Current
    {
      label: "Current Simulation",
      tag: "Now",
      tagColor: "bg-slate-100 text-slate-600 border-slate-200",
      floors: currentFloors,
      farUsed: parseFloat(currentFAR.toFixed(2)),
      maxFar: maxResidFAR,
      totalSF: currentSF,
      floors_count: currentFloors.length,
    },
    // As-of-right max residential
    {
      label: "Max As-of-Right",
      tag: `FAR ${maxResidFAR}`,
      tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      floors: buildScenarioFloors(maxResidFAR * lotArea, floorPlate, "residential"),
      farUsed: maxResidFAR,
      maxFar: maxResidFAR,
      totalSF: Math.round(maxResidFAR * lotArea),
      floors_count: Math.max(1, Math.round((maxResidFAR * lotArea) / floorPlate)),
    },
    // MIH bonus
    {
      label: "Max w/ MIH Bonus",
      tag: `FAR ${(maxResidFAR + mihBonus).toFixed(2)}`,
      tagColor: "bg-blue-50 text-blue-700 border-blue-200",
      floors: buildScenarioFloors(maxWithMIH * lotArea, Math.round(lotArea * 0.5), "residential", "community_facility"),
      farUsed: parseFloat(maxWithMIH.toFixed(2)),
      maxFar: maxWithMIH,
      totalSF: Math.round(maxWithMIH * lotArea),
      floors_count: Math.max(1, Math.round((maxWithMIH * lotArea) / Math.round(lotArea * 0.5))),
    },
    // Mixed-use commercial ground
    ...(zoningDistrict?.startsWith("C") || zoningDistrict?.startsWith("R")
      ? [
          {
            label: "Mixed-Use (1F Comm)",
            tag: "Commercial",
            tagColor: "bg-red-50 text-red-700 border-red-200",
            floors: buildScenarioFloors(maxResidFAR * lotArea, floorPlate, "residential", "commercial"),
            farUsed: maxResidFAR,
            maxFar: maxResidFAR,
            totalSF: Math.round(maxResidFAR * lotArea),
            floors_count: Math.max(1, Math.round((maxResidFAR * lotArea) / floorPlate)),
          },
        ]
      : []),
  ];

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
      {/* Toggle header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full shadow-[0_0_6px_rgba(37,99,235,0.5)]" />
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.15em]">
            Scenario Comparison & Blueprints
          </span>
        </div>
        {isOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>

      {isOpen && (
        <div className="border-t border-slate-100">
          <div className="overflow-x-auto custom-scrollbar">
            <div className="flex gap-0 min-w-max">
              {scenarios.map((sc, idx) => (
                <div
                  key={idx}
                  className="flex flex-col w-48 border-r border-slate-100 last:border-r-0"
                >
                  {/* Scenario header */}
                  <div className="px-3 pt-3 pb-2 bg-slate-50/30 space-y-1 border-b border-slate-50">
                    <div className="flex justify-between items-center">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${sc.tagColor}`}>
                        {sc.tag}
                      </span>
                      {sc.farUsed <= sc.maxFar ? (
                        <span className="text-[7px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">COMPLIANT</span>
                      ) : (
                        <span className="text-[7px] font-bold text-red-600 bg-red-50 px-1 rounded">OVER LIMIT</span>
                      )}
                    </div>
                    <p className="text-[9px] font-bold text-slate-600 leading-tight">{sc.label}</p>
                  </div>

                  {/* Massing visual */}
                  <div className="p-2 bg-white flex flex-col gap-2">
                    <div className="h-40 overflow-hidden rounded-xl border border-slate-50">
                      <MassingPreview floors={sc.floors} lotArea={lotArea} />
                    </div>
                    
                    {idx !== 0 && onApplyScenario && (
                      <button
                        onClick={() => onApplyScenario(sc.floors)}
                        className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-wider rounded-lg transition-all shadow-sm shadow-blue-500/20 active:scale-95"
                      >
                        Generate Scenario
                      </button>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="px-3 pb-3 pt-1 space-y-2 bg-white">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[8px] text-slate-400 uppercase font-bold">FAR Used</span>
                      <span className={`text-xs font-black tabular-nums ${sc.farUsed > sc.maxFar ? "text-red-600" : "text-emerald-600"}`}>
                        {sc.farUsed.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${sc.farUsed > sc.maxFar ? "bg-red-500" : "bg-emerald-500"}`}
                        style={{ width: `${Math.min(100, (sc.farUsed / sc.maxFar) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-[8px] text-slate-400 uppercase font-bold">Total SF</span>
                      <span className="text-[10px] font-bold text-slate-700 tabular-nums">
                        {sc.totalSF.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
