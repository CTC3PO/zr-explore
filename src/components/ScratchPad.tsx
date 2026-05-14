"use client";

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useZoning } from '@/context/ZoningContext';
import * as turf from '@turf/turf';
import { X, RotateCcw, Check, MousePointer2, Info } from 'lucide-react';

export default function ScratchPad({ floorId, onClose }: { floorId: number, onClose: () => void }) {
  const { lotGeometry, floorGeometries, setFloorGeometries, floorsList, setFloorsList } = useZoning();
  const svgRef = useRef<SVGSVGElement>(null);

  const [points, setPoints] = useState<{ x: number, y: number }[]>([]);
  const [cursorPt, setCursorPt] = useState<{ x: number, y: number } | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Calculate bounding box and coordinate mappings
  const mapping = useMemo(() => {
    if (!lotGeometry) return null;
    const box = turf.bbox(lotGeometry);
    const [minLng, minLat, maxLng, maxLat] = box;
    const lngPad = (maxLng - minLng) * 0.12;
    const latPad = (maxLat - minLat) * 0.12;
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

  const lotSvgPath = useMemo(() => {
    if (!lotGeometry || !mapping) return '';
    const processRing = (ring: any[]) =>
      ring.map((coord, i) => {
        const { x, y } = geoToSvg(coord[0], coord[1]);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ') + ' Z';
    if (lotGeometry.type === 'Polygon') return lotGeometry.coordinates.map(processRing).join(' ');
    if (lotGeometry.type === 'MultiPolygon') return lotGeometry.coordinates.map((poly: any) => poly.map(processRing).join(' ')).join(' ');
    return '';
  }, [lotGeometry, mapping]);

  const floorSvgPath = useMemo(() => {
    const floorGeom = floorGeometries[floorId];
    if (!floorGeom || !mapping) return '';
    const processRing = (ring: any[]) =>
      ring.map((coord, i) => {
        const { x, y } = geoToSvg(coord[0], coord[1]);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ') + ' Z';
    if (floorGeom.type === 'Polygon') return floorGeom.coordinates.map(processRing).join(' ');
    if (floorGeom.type === 'MultiPolygon') return floorGeom.coordinates.map((poly: any) => poly.map(processRing).join(' ')).join(' ');
    return '';
  }, [floorGeometries, floorId, mapping]);

  const getSvgPoint = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const CTM = svg.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return {
      x: (e.clientX - CTM.e) / CTM.a,
      y: (e.clientY - CTM.f) / CTM.d
    };
  };

  const handleSvgClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const pt = getSvgPoint(e);
    if (points.length > 2) {
      const firstPt = points[0];
      const dist = Math.sqrt(Math.pow(pt.x - firstPt.x, 2) + Math.pow(pt.y - firstPt.y, 2));
      if (dist < 4) { finalizePolygon(); return; }
    }
    setPoints(prev => [...prev, pt]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (points.length === 0) return;
    setCursorPt(getSvgPoint(e));
  };

  const finalizePolygon = () => {
    if (points.length < 3) return;
    const geoCoords = [...points, points[0]].map(p => {
      const geo = svgToGeo(p.x, p.y);
      return [geo.lng, geo.lat];
    });
    const drawnPolygon = turf.polygon([geoCoords]);
    try {
      const intersection = turf.intersect(turf.featureCollection([turf.feature(lotGeometry), drawnPolygon]));
      if (intersection?.geometry) {
        setFloorGeometries({ ...floorGeometries, [floorId]: intersection.geometry });
        const newArea = turf.area(intersection);
        setFloorsList(floorsList.map(f => f.id === floorId ? { ...f, area: Math.round(newArea * 10.7639) } : f));
        setIsFinalized(true);
      }
    } catch (e) { console.error('Intersection failed', e); }
    setPoints([]);
    setCursorPt(null);
  };

  const resetFloor = () => {
    const newGeoms = { ...floorGeometries };
    delete newGeoms[floorId];
    setFloorGeometries(newGeoms);
    setPoints([]);
    setCursorPt(null);
    setIsFinalized(false);
  };

  const activePathStr = useMemo(() => {
    if (points.length === 0) return '';
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return cursorPt ? `${path} L ${cursorPt.x} ${cursorPt.y}` : path;
  }, [points, cursorPt]);

  const floorIdx = floorsList.findIndex(f => f.id === floorId);
  const currentArea = floorsList.find(f => f.id === floorId)?.area ?? 0;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Panel */}
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <MousePointer2 size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">Draw Floor Footprint</p>
              <p className="text-[10px] text-slate-400 font-medium">
                Floor {floorIdx + 1} · {currentArea.toLocaleString()} sf
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {points.length > 2 && (
              <button
                onClick={finalizePolygon}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-sm shadow-blue-500/30 transition-all"
              >
                <Check size={12} /> Complete Shape
              </button>
            )}
            <button
              onClick={resetFloor}
              title="Reset drawing"
              className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <RotateCcw size={15} />
            </button>
            <button
              onClick={onClose}
              title="Close (Esc)"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Instruction bar */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 border-b border-amber-100">
          <Info size={12} className="text-amber-500 flex-none" />
          <p className="text-[10px] text-amber-700 font-medium leading-tight">
            {isFinalized
              ? '✅ Footprint saved! Draw again or close to apply to the 3D map.'
              : points.length === 0
                ? 'Click inside the lot (grey shape) to place corners. Build any polygon footprint.'
                : points.length < 3
                  ? `${points.length} point${points.length > 1 ? 's' : ''} placed — add at least 1 more to close the shape.`
                  : 'Keep clicking to add corners, or click the first red dot / "Complete Shape" to finish.'}
          </p>
        </div>

        {/* Drawing Canvas */}
        <div className="flex-1 p-4 bg-slate-100 overflow-hidden">
          <svg
            ref={svgRef}
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full bg-white rounded-2xl border border-slate-200 shadow-inner cursor-crosshair"
            style={{ minHeight: '360px' }}
            onClick={handleSvgClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setCursorPt(null)}
          >
            {/* Grid */}
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f1f5f9" strokeWidth="0.3" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />

            {/* Lot boundary */}
            <path d={lotSvgPath} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />

            {/* Saved floor geometry */}
            {floorSvgPath && (
              <path d={floorSvgPath} fill="#3b82f6" fillOpacity="0.4" stroke="#2563eb" strokeWidth="1" />
            )}

            {/* Active drawing line */}
            {activePathStr && (
              <path
                d={activePathStr}
                fill={points.length >= 3 ? '#eab308' : 'none'}
                fillOpacity="0.1"
                stroke="#eab308"
                strokeWidth="1.2"
                strokeDasharray={cursorPt ? '2 1' : '0'}
              />
            )}

            {/* Vertex dots */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={i === 0 && points.length > 2 ? 3.5 : 1.8}
                fill={i === 0 && points.length > 2 ? '#ef4444' : '#eab308'}
                stroke="white"
                strokeWidth="0.5"
                className={i === 0 && points.length > 2 ? 'cursor-pointer' : 'pointer-events-none'}
              />
            ))}
          </svg>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-slate-300 border border-slate-400" /> Lot Boundary
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-blue-400/60 border border-blue-500" /> Floor Footprint
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-yellow-300 border border-yellow-400" /> Drawing
            </span>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-colors"
          >
            Done & Close
          </button>
        </div>
      </div>
    </div>
  );
}
