/**
 * massingLogic.ts
 *
 * NYC Zoning Resolution-based massing computation.
 * References: ZR §23-60 through §23-70 (Height & Setback), §23-145 (FAR),
 *             §23-662 / §23-664 (Specific district height limits)
 *
 * Architectural constants:
 *  - Standard slab depth:  55 ft (one stack of apartments, ~27 ft per side + corridor)
 *  - Window-to-window min: 60 ft between facing apartment windows (habitability + fire code)
 *  - Courtyard minimum:    60 ft (same as window-to-window)
 *
 * Lot width → building shape heuristics:
 *  < 80 ft   → SLAB  (single bar, no room for courtyard)
 *  80–140 ft → L     (one bar + partial wing on one side)
 *  140–200 ft → U    (two bars flanking a 60 ft courtyard: 55 + 60 + 55 = 170 ft min)
 *  > 200 ft  → O     (full perimeter with central courtyard, connected at both ends)
 */

import * as turf from "@turf/turf";

export type MassingShape = "SLAB" | "L" | "U" | "O";

export interface DistrictSetbackRule {
  baseHeightNarrow: number; // ft — base before setback on narrow streets (<75ft)
  baseHeightWide: number;   // ft — base before setback on wide streets (≥75ft)
  setbackFt: number;        // ft — required horizontal setback above base
  maxHeightFt: number | null; // ft — max building height (null = no height limit)
  sepSlope: number;         // Sky Exposure Plane slope ratio (rise:run = X:1)
}

// ── District Rules Table ──────────────────────────────────────────────────────
// Sources: ZR §23-662, §23-664, §23-692, §23-694
const DISTRICT_RULES: Record<string, DistrictSetbackRule> = {
  // Residential
  R6:   { baseHeightNarrow: 25, baseHeightWide: 40,  setbackFt: 8,  maxHeightFt: 70,  sepSlope: 2.7 },
  R6A:  { baseHeightNarrow: 40, baseHeightWide: 60,  setbackFt: 8,  maxHeightFt: 70,  sepSlope: 2.7 },
  R6B:  { baseHeightNarrow: 30, baseHeightWide: 40,  setbackFt: 8,  maxHeightFt: 50,  sepSlope: 2.7 },
  R7:   { baseHeightNarrow: 35, baseHeightWide: 55,  setbackFt: 10, maxHeightFt: 80,  sepSlope: 3.7 },
  R7A:  { baseHeightNarrow: 40, baseHeightWide: 65,  setbackFt: 10, maxHeightFt: 80,  sepSlope: 3.7 },
  R7B:  { baseHeightNarrow: 40, baseHeightWide: 55,  setbackFt: 10, maxHeightFt: 75,  sepSlope: 3.7 },
  R7X:  { baseHeightNarrow: 60, baseHeightWide: 75,  setbackFt: 15, maxHeightFt: 125, sepSlope: 3.7 },
  R8:   { baseHeightNarrow: 60, baseHeightWide: 85,  setbackFt: 15, maxHeightFt: 120, sepSlope: 4.6 },
  R8A:  { baseHeightNarrow: 55, baseHeightWide: 75,  setbackFt: 15, maxHeightFt: 120, sepSlope: 4.6 },
  R8B:  { baseHeightNarrow: 40, baseHeightWide: 55,  setbackFt: 15, maxHeightFt: 75,  sepSlope: 4.6 },
  R8X:  { baseHeightNarrow: 85, baseHeightWide: 100, setbackFt: 15, maxHeightFt: null,sepSlope: 4.6 },
  R9:   { baseHeightNarrow: 85, baseHeightWide: 100, setbackFt: 15, maxHeightFt: 145, sepSlope: 5.6 },
  R9A:  { baseHeightNarrow: 60, baseHeightWide: 85,  setbackFt: 15, maxHeightFt: 135, sepSlope: 5.6 },
  R9X:  { baseHeightNarrow: 85, baseHeightWide: 100, setbackFt: 20, maxHeightFt: 145, sepSlope: 5.6 },
  R10:  { baseHeightNarrow: 85, baseHeightWide: 125, setbackFt: 20, maxHeightFt: null,sepSlope: 6.0 },
  R10A: { baseHeightNarrow: 60, baseHeightWide: 85,  setbackFt: 20, maxHeightFt: 210, sepSlope: 6.0 },
  R10H: { baseHeightNarrow: 60, baseHeightWide: 85,  setbackFt: 20, maxHeightFt: null,sepSlope: 6.0 },

  // Commercial (mapped to equivalent residential bulk)
  "C1":   { baseHeightNarrow: 25, baseHeightWide: 40,  setbackFt: 8,  maxHeightFt: 70,  sepSlope: 2.7 },
  "C2":   { baseHeightNarrow: 25, baseHeightWide: 40,  setbackFt: 8,  maxHeightFt: 70,  sepSlope: 2.7 },
  "C4-1": { baseHeightNarrow: 35, baseHeightWide: 55,  setbackFt: 10, maxHeightFt: 80,  sepSlope: 3.7 },
  "C4-2": { baseHeightNarrow: 35, baseHeightWide: 55,  setbackFt: 10, maxHeightFt: 80,  sepSlope: 3.7 },
  "C4-3": { baseHeightNarrow: 35, baseHeightWide: 55,  setbackFt: 10, maxHeightFt: 80,  sepSlope: 3.7 },
  "C4-4": { baseHeightNarrow: 60, baseHeightWide: 85,  setbackFt: 15, maxHeightFt: 120, sepSlope: 4.6 },
  "C4-5": { baseHeightNarrow: 85, baseHeightWide: 100, setbackFt: 15, maxHeightFt: 145, sepSlope: 5.6 },
  "C6-1": { baseHeightNarrow: 60, baseHeightWide: 85,  setbackFt: 15, maxHeightFt: 120, sepSlope: 4.6 },
  "C6-2": { baseHeightNarrow: 85, baseHeightWide: 100, setbackFt: 15, maxHeightFt: 145, sepSlope: 5.6 },
  "C6-3": { baseHeightNarrow: 85, baseHeightWide: 100, setbackFt: 15, maxHeightFt: 145, sepSlope: 5.6 },
  "C6-4": { baseHeightNarrow: 85, baseHeightWide: 125, setbackFt: 20, maxHeightFt: null,sepSlope: 6.0 },
  "C5":   { baseHeightNarrow: 85, baseHeightWide: 125, setbackFt: 20, maxHeightFt: null,sepSlope: 6.0 },

  // Manufacturing — no setback rules (controlled by FAR only)
  "M1": { baseHeightNarrow: 0, baseHeightWide: 0, setbackFt: 0, maxHeightFt: null, sepSlope: 0 },
  "M2": { baseHeightNarrow: 0, baseHeightWide: 0, setbackFt: 0, maxHeightFt: null, sepSlope: 0 },
  "M3": { baseHeightNarrow: 0, baseHeightWide: 0, setbackFt: 0, maxHeightFt: null, sepSlope: 0 },
};

// Architectural massing constants (ft)
const SLAB_DEPTH_FT = 55;       // Standard apartment slab depth
const COURTYARD_GAP_FT = 60;    // Minimum window-to-window / courtyard width
const FLOOR_HEIGHT_FT = 10;     // ~3.05m, typical NYC floor-to-floor

// ── Helper: resolve district code to rule ───────────────────────────────────
export function getDistrictRule(district: string): DistrictSetbackRule {
  // Try exact match first
  if (DISTRICT_RULES[district]) return DISTRICT_RULES[district];
  
  // Try prefix matching (e.g., "R7A" → "R7A", "C4-4A" → "C4-4")
  const keys = Object.keys(DISTRICT_RULES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (district.startsWith(key)) return DISTRICT_RULES[key];
  }
  
  // Default: generous mid-density rules (R6 equivalent)
  return DISTRICT_RULES["R6"];
}

// ── Main export: compute massing profile ────────────────────────────────────
export interface MassingProfile {
  rule: DistrictSetbackRule;
  isWideStreet: boolean;
  baseHeightFt: number;     // Floors below this height use full footprint
  baseFloors: number;       // Number of floors in the base
  setbackFt: number;        // Horizontal setback above base (ft)
  setbackM: number;         // Same in meters (for Turf buffer)
  maxHeightFt: number | null;
  massingShape: MassingShape;
  shapeDescription: string;
  lotFrontFt: number;
  lotDepthFt: number;
}

export function computeMassingProfile(params: {
  zoningDistrict: string;
  lotFrontFt: number;   // lot width (street-facing)
  lotDepthFt: number;   // lot depth
  isWideStreet: boolean;
}): MassingProfile {
  const { zoningDistrict, lotFrontFt, lotDepthFt, isWideStreet } = params;
  const rule = getDistrictRule(zoningDistrict);

  const baseHeightFt = isWideStreet ? rule.baseHeightWide : rule.baseHeightNarrow;
  const baseFloors = Math.max(1, Math.round(baseHeightFt / FLOOR_HEIGHT_FT));
  const setbackM = rule.setbackFt * 0.3048;

  // ── Shape determination from lot width ─────────────────────────────────
  let massingShape: MassingShape = "SLAB";
  let shapeDescription = "";

  // Two bars (U/O) require: 2 slabs + 1 courtyard = 2×55 + 60 = 170 ft minimum
  const U_MIN_WIDTH = SLAB_DEPTH_FT * 2 + COURTYARD_GAP_FT; // 170 ft
  const L_MIN_WIDTH = SLAB_DEPTH_FT + COURTYARD_GAP_FT * 0.5; // 85 ft
  
  if (lotFrontFt >= U_MIN_WIDTH + 30 && lotDepthFt >= U_MIN_WIDTH + 30) {
    massingShape = "O";
    shapeDescription = `Perimeter block — two full bars around a ${COURTYARD_GAP_FT}ft central court`;
  } else if (lotFrontFt >= U_MIN_WIDTH || lotDepthFt >= U_MIN_WIDTH) {
    massingShape = "U";
    shapeDescription = `Two ${SLAB_DEPTH_FT}ft bars flanking a ${COURTYARD_GAP_FT}ft open courtyard`;
  } else if (lotFrontFt >= L_MIN_WIDTH || lotDepthFt >= L_MIN_WIDTH) {
    massingShape = "L";
    shapeDescription = `L-shape — one full bar with a ${SLAB_DEPTH_FT}ft perpendicular wing`;
  } else {
    massingShape = "SLAB";
    shapeDescription = `Single ${SLAB_DEPTH_FT}ft deep slab — lot too narrow for courtyard`;
  }

  return {
    rule,
    isWideStreet,
    baseHeightFt,
    baseFloors,
    setbackFt: rule.setbackFt,
    setbackM,
    maxHeightFt: rule.maxHeightFt,
    massingShape,
    shapeDescription,
    lotFrontFt,
    lotDepthFt,
  };
}

// ── Compute floor footprints with setback applied above base height ─────────
// Returns an array of GeoJSON geometries, one per floor
// Floors below baseFloors: use fullLotGeometry (or custom)
// Floors at/above baseFloors: use buffered-inward geometry (setback applied)
export function computeFloorFootprints(params: {
  floors: { id: number }[];
  lotGeometry: any;
  floorGeometries: Record<number, any>;
  profile: MassingProfile;
}): Record<number, any> {
  const { floors, lotGeometry, floorGeometries, profile } = params;
  const result: Record<number, any> = {};

  // Compute the setback geometry once (buffered inward)
  let setbackGeom: any = null;
  if (profile.setbackM > 0) {
    try {
      const buffered = turf.buffer(turf.feature(lotGeometry), -profile.setbackM, { units: "meters" });
      if (buffered && buffered.geometry) {
        setbackGeom = buffered.geometry;
      }
    } catch (e) {
      console.warn("Turf buffer failed for setback:", e);
    }
  }

  floors.forEach((floor, index) => {
    const customGeom = floorGeometries[floor.id];
    const isAboveBase = index >= profile.baseFloors;

    if (customGeom) {
      // Custom sketched footprint always wins
      result[floor.id] = customGeom;
    } else if (isAboveBase && setbackGeom) {
      // Above base: use setback footprint
      result[floor.id] = setbackGeom;
    } else {
      // Below base or no setback: use full lot footprint
      result[floor.id] = lotGeometry;
    }
  });

  return result;
}
