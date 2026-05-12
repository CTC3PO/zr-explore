"use client";

import React, { useState, useRef, useMemo } from 'react';
import { useZoning } from '@/context/ZoningContext';
import * as turf from '@turf/turf';

export default function ScratchPad({ floorId, onClose }: { floorId: number, onClose: () => void }) {
  const { lotGeometry, floorGeometries, setFloorGeometries, floorsList, setFloorsList } = useZoning();
  const svgRef = useRef<SVGSVGElement>(null);

  const [points, setPoints] = useState<{ x: number, y: number }[]>([]);
  const [cursorPt, setCursorPt] = useState<{ x: number, y: number } | null>(null);

  // Calculate bounding box and coordinate mappings
  const mapping = useMemo(() => {
    if (!lotGeometry) return null;
    const box = turf.bbox(lotGeometry);
    const [minLng, minLat, maxLng, maxLat] = box;
    
    // Add 10% padding
    const lngPad = (maxLng - minLng) * 0.1;
    const latPad = (maxLat - minLat) * 0.1;
    
    return {
      minX: minLng - lngPad,
      maxX: maxLng + lngPad,
      minY: minLat - latPad,
      maxY: maxLat + latPad,
      width: (maxLng - minLng) + 2 * lngPad,
      height: (maxLat - minLat) + 2 * latPad
    };
  }, [lotGeometry]);

  const geoToSvg = (lng: number, lat: number) => {
    if (!mapping) return { x: 0, y: 0 };
    // SVG is 100x100 viewbox
    const x = ((lng - mapping.minX) / mapping.width) * 100;
    const y = 100 - (((lat - mapping.minY) / mapping.height) * 100);
    return { x, y };
  };

  const svgToGeo = (x: number, y: number) => {
    if (!mapping) return { lng: 0, lat: 0 };
    const lng = (x / 100) * mapping.width + mapping.minX;
    const lat = ((100 - y) / 100) * mapping.height + mapping.minY;
    return { lng, lat };
  };

  // Convert Lot geojson to SVG path string
  const lotSvgPath = useMemo(() => {
    if (!lotGeometry || !mapping) return "";
    
    let pathStr = "";
    const processRing = (ring: any[]) => {
      return ring.map((coord, i) => {
        const { x, y } = geoToSvg(coord[0], coord[1]);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ') + ' Z';
    };

    if (lotGeometry.type === 'Polygon') {
      pathStr = lotGeometry.coordinates.map(processRing).join(' ');
    } else if (lotGeometry.type === 'MultiPolygon') {
      pathStr = lotGeometry.coordinates.map((poly: any) => poly.map(processRing).join(' ')).join(' ');
    }
    return pathStr;
  }, [lotGeometry, mapping]);

  // Convert current drawn floor geojson (if any) to SVG path
  const floorSvgPath = useMemo(() => {
    const floorGeom = floorGeometries[floorId];
    if (!floorGeom || !mapping) return "";

    let pathStr = "";
    const processRing = (ring: any[]) => {
      return ring.map((coord, i) => {
        const { x, y } = geoToSvg(coord[0], coord[1]);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ') + ' Z';
    };

    if (floorGeom.type === 'Polygon') {
      pathStr = floorGeom.coordinates.map(processRing).join(' ');
    } else if (floorGeom.type === 'MultiPolygon') {
      pathStr = floorGeom.coordinates.map((poly: any) => poly.map(processRing).join(' ')).join(' ');
    }
    return pathStr;
  }, [floorGeometries, floorId, mapping]);

  const getSvgPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const CTM = svg.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - CTM.e) / CTM.a,
      y: (clientY - CTM.f) / CTM.d
    };
  };

  const handleSvgClick = (e: React.MouseEvent) => {
    const pt = getSvgPoint(e);
    
    // Check if we clicked near the first point to close the polygon
    if (points.length > 2) {
      const firstPt = points[0];
      const dist = Math.sqrt(Math.pow(pt.x - firstPt.x, 2) + Math.pow(pt.y - firstPt.y, 2));
      if (dist < 5) {
        finalizePolygon();
        return;
      }
    }
    
    setPoints([...points, pt]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (points.length === 0) return;
    setCursorPt(getSvgPoint(e));
  };

  const handleMouseLeave = () => {
    setCursorPt(null);
  };

  const finalizePolygon = () => {
    if (points.length < 3) return; // Need at least a triangle

    // Convert SVG points to GeoJSON Polygon (closing the loop)
    const geoCoords = [...points, points[0]].map(p => {
      const geo = svgToGeo(p.x, p.y);
      return [geo.lng, geo.lat];
    });

    const drawnPolygon = turf.polygon([geoCoords]);

    try {
      // Intersect drawn polygon with lot boundary to ensure it doesn't spill over
      const intersection = turf.intersect(turf.featureCollection([turf.feature(lotGeometry), drawnPolygon]));
      
      if (intersection && intersection.geometry) {
        setFloorGeometries({
          ...floorGeometries,
          [floorId]: intersection.geometry
        });
        
        // Update floor area
        const newArea = turf.area(intersection);
        setFloorsList(floorsList.map(f => 
          f.id === floorId ? { ...f, area: Math.round(newArea * 10.7639) } : f // convert sq m to sq ft
        ));
      }
    } catch (e) {
      console.error("Intersection failed", e);
    }
    
    // Reset active drawing state
    setPoints([]);
    setCursorPt(null);
  };

  const resetFloor = () => {
    const newGeoms = { ...floorGeometries };
    delete newGeoms[floorId];
    setFloorGeometries(newGeoms);
    setPoints([]);
    setCursorPt(null);
  };

  // Generate path for the active drawing
  const activePathStr = useMemo(() => {
    if (points.length === 0) return "";
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    if (cursorPt) {
      return `${path} L ${cursorPt.x} ${cursorPt.y}`;
    }
    return path;
  }, [points, cursorPt]);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col mt-2">
      <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
        <span className="text-[10px] font-bold text-slate-600 uppercase">Draw Footprint: Floor {floorId}</span>
        <div className="flex gap-2">
          {points.length > 2 && (
             <button onClick={finalizePolygon} className="text-[9px] bg-blue-500 text-white px-2 py-1 rounded font-bold hover:bg-blue-600 shadow-sm transition-colors">COMPLETE SHAPE</button>
          )}
          <button onClick={resetFloor} className="text-[9px] text-slate-500 hover:text-red-500 font-bold px-2 py-1 rounded">RESET</button>
          <button onClick={onClose} className="text-[9px] bg-slate-200 text-slate-700 px-2 py-1 rounded font-bold hover:bg-slate-300">DONE</button>
        </div>
      </div>
      
      <div className="p-4 flex flex-col items-center select-none bg-slate-100">
        <p className="text-[9px] text-slate-500 mb-2 italic">
          {points.length === 0 
            ? "Click points to trace a footprint inside the lot." 
            : "Click to add corners. Click the first point or 'Complete Shape' to finish."}
        </p>
        
        <svg 
          ref={svgRef}
          viewBox="0 0 100 100" 
          className="w-full h-48 bg-white border border-slate-300 rounded shadow-sm cursor-crosshair"
          onClick={handleSvgClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Base Lot Geometry */}
          <path d={lotSvgPath} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
          
          {/* Saved Floor Geometry */}
          {floorSvgPath && (
            <path d={floorSvgPath} fill="#3b82f6" fillOpacity="0.5" stroke="#2563eb" strokeWidth="1.5" />
          )}

          {/* Active Drawing Line */}
          {activePathStr && (
            <path 
              d={activePathStr} 
              fill="none" 
              stroke="#eab308" 
              strokeWidth="1.5" 
              strokeDasharray={cursorPt ? "2" : "0"} 
            />
          )}

          {/* Render Points (Vertices) */}
          {points.map((p, i) => (
             <circle 
               key={i} 
               cx={p.x} 
               cy={p.y} 
               r={i === 0 && points.length > 2 ? 3 : 1.5} 
               fill={i === 0 && points.length > 2 ? "#ef4444" : "#eab308"} 
               className={i === 0 && points.length > 2 ? "cursor-pointer" : "pointer-events-none"}
             />
          ))}
        </svg>
      </div>
    </div>
  );
}
