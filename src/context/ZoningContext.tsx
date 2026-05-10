"use client";

import React, { createContext, useContext, useState } from "react";

interface ZoningContextType {
  selectedBBL: string | null;
  setSelectedBBL: (bbl: string | null) => void;
  lotData: any | null;
  setLotData: (data: any | null) => void;
}

const ZoningContext = createContext<ZoningContextType | undefined>(undefined);

export function ZoningProvider({ children }: { children: React.ReactNode }) {
  const [selectedBBL, setSelectedBBL] = useState<string | null>(null);
  const [lotData, setLotData] = useState<any | null>(null);

  return (
    <ZoningContext.Provider value={{ selectedBBL, setSelectedBBL, lotData, setLotData }}>
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
