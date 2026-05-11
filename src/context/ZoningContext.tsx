"use client";

import React, { createContext, useContext, useState } from "react";

interface Floor {
  id: number;
  area: number;
  use: 'residential' | 'commercial';
}

interface ZoningContextType {
  selectedBBL: string | null;
  setSelectedBBL: (bbl: string | null) => void;
  lotData: any | null;
  setLotData: (data: any | null) => void;
  activeTab: "explorer" | "builder" | "chat";
  setActiveTab: (tab: "explorer" | "builder" | "chat") => void;
  floorsList: Floor[];
  setFloorsList: (floors: Floor[]) => void;
  mapMode: "2D" | "3D";
  setMapMode: (mode: "2D" | "3D") => void;
}

const ZoningContext = createContext<ZoningContextType | undefined>(undefined);

export function ZoningProvider({ children }: { children: React.ReactNode }) {
  const [selectedBBL, setSelectedBBL] = useState<string | null>(null);
  const [lotData, setLotData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"explorer" | "builder" | "chat">("explorer");
  const [mapMode, setMapMode] = useState<"2D" | "3D">("2D");
  const [floorsList, setFloorsList] = useState<Floor[]>([
    { id: 1, area: 2000, use: 'residential' },
    { id: 2, area: 2000, use: 'residential' }
  ]);

  return (
    <ZoningContext.Provider value={{ 
      selectedBBL, 
      setSelectedBBL, 
      lotData, 
      setLotData, 
      activeTab, 
      setActiveTab,
      floorsList,
      setFloorsList,
      mapMode,
      setMapMode
    }}>
      {children}
    </ZoningContext.Provider>
  );
}

export function useZoning() {
  const context = useContext(ZoningContext);
  if (context === undefined) {
    throw new Error("useZoning must be used within a ZoningProvider");
  }
  return context;
}
