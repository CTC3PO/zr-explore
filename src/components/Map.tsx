"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import * as turf from "@turf/turf";
import { useZoning } from "@/context/ZoningContext";
import { computeMassingProfile, computeFloorFootprints } from "@/utils/massingLogic";

export default function Map() {
  const { 
    selectedBBLs, setSelectedBBLs, 
    lotData,
    lotGeometry, setLotGeometry,
    floorsList, setFloorsList,
    floorGeometries,
    mapMode, setMapMode,
    isWideStreet
  } = useZoning();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [lng, setLng] = useState(-73.985); 
  const [lat, setLat] = useState(40.7484);
  const [zoom, setZoom] = useState(14);
  const [showEnvelope, setShowEnvelope] = useState(true);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    console.log("Initializing MapLibre...");
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          "carto-tiles": {
            type: "raster",
            tiles: ["https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"],
            tileSize: 256,
            attribution: "&copy; CARTO",
          },
        },
        layers: [
          {
            id: "carto-layer",
            type: "raster",
            source: "carto-tiles",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [lng, lat],
      zoom: zoom,
    });

    map.current.on("load", () => {
      console.log("MapLibre loaded successfully");
      map.current?.resize();

      // Suppress MapLibre tile loading errors from crashing the Next.js overlay
      map.current?.on("error", (e) => {
        // Aggressively ignore AJAX and tile-related fetch errors
        if (e && e.error && (
          (typeof e.error.message === 'string' && e.error.message.includes('AJAX')) ||
          (e.error.status === 0) ||
          (e.message && e.message.includes('tile'))
        )) {
          return; 
        }
        // Log other errors but don't re-throw
        console.warn("MapLibre non-critical error:", e.error || e);
      });

      // Add 3D Buildings context layer (Optional NYC footprints if available)
      // For now, focus on the selected lot extrusion
      
      // Add Global Tax Lots (Vector)
      map.current?.addSource('tax-lots', {
        type: 'vector',
        tiles: ['https://tiles.arcgis.com/tiles/yG5s3afENB5iO9Jp/arcgis/rest/services/NYC_Zoning_and_Land_Use/VectorTileServer/tile/{z}/{y}/{x}.pbf']
      });

      map.current?.addLayer({
        id: 'tax-lots-hover',
        type: 'fill',
        source: 'tax-lots',
        'source-layer': 'TaxLot',
        paint: {
          'fill-color': '#2563eb',
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.1,
            0
          ]
        }
      });

      // Selected Lot Highlight
      map.current?.addSource('selected-lot', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.current?.addLayer({
        id: 'lot-highlight',
        type: 'fill',
        source: 'selected-lot',
        paint: {
          'fill-color': '#2563eb',
          'fill-opacity': 0.3,
          'fill-outline-color': '#1d4ed8'
        }
      });

      // PROPOSED 3D EXTRUSION LAYER
      map.current?.addSource('proposed-building-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.current?.addLayer({
        id: 'proposed-building',
        type: 'fill-extrusion',
        source: 'proposed-building-source',
        paint: {
          'fill-extrusion-color': ['get', 'color'],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'base_height'],
          'fill-extrusion-opacity': 0.95
        }
      });

      // ENVELOPE LAYER (THEORETICAL MAX)
      map.current?.addSource('building-envelope-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.current?.addLayer({
        id: 'building-envelope',
        type: 'fill-extrusion',
        source: 'building-envelope-source',
        paint: {
          'fill-extrusion-color': '#06b6d4',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-opacity': 0.15
        }
      });
    });

    let hoveredId: string | number | null = null;

    map.current.on('mousemove', 'tax-lots-hover', (e) => {
      if (e.features && e.features.length > 0) {
        map.current!.getCanvas().style.cursor = 'pointer';
        
        if (hoveredId !== null) {
          map.current!.setFeatureState(
            { source: 'tax-lots', sourceLayer: 'TaxLot', id: hoveredId },
            { hover: false }
          );
        }
        
        hoveredId = e.features[0].id || null;
        
        if (hoveredId !== null) {
          map.current!.setFeatureState(
            { source: 'tax-lots', sourceLayer: 'TaxLot', id: hoveredId },
            { hover: true }
          );
        }
      }
    });

    map.current.on('mouseleave', 'tax-lots-hover', () => {
      map.current!.getCanvas().style.cursor = '';
      if (hoveredId !== null) {
        map.current!.setFeatureState(
          { source: 'tax-lots', sourceLayer: 'TaxLot', id: hoveredId },
          { hover: false }
        );
      }
      hoveredId = null;
    });

    map.current.on("click", async (e) => {
      const { lng, lat } = e.lngLat;
      try {
        const query = `SELECT bbl FROM mappluto WHERE ST_Intersects(the_geom, ST_SetSRID(ST_Point(${lng}, ${lat}), 4326)) LIMIT 1`;
        const response = await fetch(`https://planninglabs.carto.com/api/v2/sql?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.rows && data.rows.length > 0) {
          const bbl = data.rows[0].bbl;
          const isMulti = e.originalEvent.shiftKey || e.originalEvent.metaKey;
          
          if (isMulti) {
            if (selectedBBLs.includes(bbl)) {
              setSelectedBBLs(selectedBBLs.filter(id => id !== bbl));
            } else {
              setSelectedBBLs([...selectedBBLs, bbl]);
            }
          } else {
            setSelectedBBLs([bbl]);
          }
        }
      } catch (error) {
        console.error("Error finding BBL:", error);
      }
    });

    map.current.on("error", (e) => {
      if (e.error?.message?.includes("Unable to parse the tile") || e.error?.message?.includes("Unimplemented type: 3")) {
        return;
      }
      console.error("MapLibre error:", e.error);
    });

    const resizeObserver = new ResizeObserver(() => {
      map.current?.resize();
    });
    
    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current);
    }

    return () => {
      resizeObserver.disconnect();
      map.current?.remove();
    };
  }, []);

  // Compute massing profile (memoized — only changes when lot/district changes)
  const massingProfile = useMemo(() => {
    if (!lotData || !lotGeometry) return null;
    const lotFrontFt = parseFloat(lotData.metadata?.lotFront) || Math.sqrt(parseFloat(lotData.metadata?.lotArea) || 2500);
    const lotDepthFt = parseFloat(lotData.metadata?.lotDepth) || lotFrontFt;
    const district = lotData.zoningDistricts?.[0] || 'R6';
    return computeMassingProfile({
      zoningDistrict: district,
      lotFrontFt,
      lotDepthFt,
      isWideStreet: isWideStreet ?? false,
    });
  }, [lotData, lotGeometry, isWideStreet]);

  // Generate Stacked 3D Building Extrusion
  useEffect(() => {
    if (!map.current || !lotGeometry) return;

    // Compute setback-aware footprints per floor
    const effectiveFootprints = massingProfile
      ? computeFloorFootprints({
          floors: floorsList,
          lotGeometry,
          floorGeometries,
          profile: massingProfile,
        })
      : {};

    const features = floorsList.map((floor, index) => {
      const baseHeight = index * 3.048; // 10ft per floor in meters
      const height = (index + 1) * 3.048;
      const colorMap: Record<string, string> = {
        residential: '#facc15',
        commercial: '#ef4444',
        community_facility: '#3b82f6'
      };
      const color = colorMap[floor.use] || colorMap.residential;
      const footprint = effectiveFootprints[floor.id] || floorGeometries[floor.id] || lotGeometry;
      
      return {
        type: "Feature",
        geometry: footprint,
        properties: {
          base_height: baseHeight,
          height: height,
          color: color
        }
      };
    });

    const source = map.current.getSource("proposed-building-source") as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: features as any
      });
    }

    // Generate Envelope
    const maxFAR = parseFloat(lotData?.metadata?.maxResidFAR || lotData?.metadata?.maxCommFAR || "0");
    if (maxFAR > 0) {
      // Approximate max height assuming ~60% lot coverage
      const envelopeHeight = (maxFAR / 0.6) * 3.5; 
      const envelopeFeature = {
        type: "Feature",
        geometry: lotGeometry,
        properties: { height: envelopeHeight }
      };
      
      const envSource = map.current.getSource("building-envelope-source") as maplibregl.GeoJSONSource;
      if (envSource) {
        envSource.setData({
          type: "FeatureCollection",
          features: [envelopeFeature as any]
        });
      }
    }
  }, [floorsList, lotGeometry, lotData, floorGeometries]);

  // Handle 2D/3D Mode
  useEffect(() => {
    if (!map.current) return;
    if (mapMode === '3D') {
      map.current.easeTo({ pitch: 55, bearing: -15, duration: 1000 });
      if (map.current.getLayer('proposed-building')) {
        map.current.setLayoutProperty('proposed-building', 'visibility', 'visible');
      }
      if (map.current.getLayer('building-envelope')) {
        map.current.setLayoutProperty('building-envelope', 'visibility', showEnvelope ? 'visible' : 'none');
      }
    } else {
      map.current.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
      if (map.current.getLayer('proposed-building')) {
        map.current.setLayoutProperty('proposed-building', 'visibility', 'none');
      }
      if (map.current.getLayer('building-envelope')) {
        map.current.setLayoutProperty('building-envelope', 'visibility', 'none');
      }
    }
  }, [mapMode, showEnvelope]);

  // Toggle envelope visibility independently
  useEffect(() => {
    if (!map.current || mapMode !== '3D') return;
    if (map.current.getLayer('building-envelope')) {
      map.current.setLayoutProperty('building-envelope', 'visibility', showEnvelope ? 'visible' : 'none');
    }
  }, [showEnvelope]);

  useEffect(() => {
    if (!map.current || selectedBBLs.length === 0) {
      if (map.current) {
        const source = map.current.getSource("selected-lot") as maplibregl.GeoJSONSource;
        if (source) source.setData({ type: "FeatureCollection", features: [] });
      }
      return;
    }

    const updateHighlight = async () => {
      try {
        const query = `SELECT ST_AsGeoJSON(the_geom) as geom FROM mappluto WHERE bbl IN (${selectedBBLs.map(id => `'${id}'`).join(',')})`;
        const response = await fetch(`https://planninglabs.carto.com/api/v2/sql?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.rows && data.rows.length > 0) {
          const geoms = data.rows.map((r: any) => JSON.parse(r.geom));
          
          // Union all lot geometries for the assemblage
          let combined: any = geoms[0];
          if (geoms.length > 1) {
            try {
              let unioned = turf.feature(geoms[0]);
              for (let i = 1; i < geoms.length; i++) {
                unioned = turf.union(turf.featureCollection([unioned, turf.feature(geoms[i])])) as any;
              }
              combined = unioned.geometry;
            } catch (err) {
              console.error("Union failed:", err);
            }
          }
          
          setLotGeometry(combined);

          const source = map.current?.getSource("selected-lot") as maplibregl.GeoJSONSource;
          if (source) {
            source.setData({
              type: "FeatureCollection",
              features: geoms.map((g: any) => ({ type: "Feature", geometry: g, properties: {} }))
            });
            
            // Fit map to bounds of all lots
            const collection = turf.featureCollection(geoms.map((g: any) => turf.feature(g)));
            const bbox = turf.bbox(collection);
            map.current?.fitBounds([bbox[0], bbox[1], bbox[2], bbox[3]], { padding: 50, duration: 1000 });
          }
        }
      } catch (error) {
        console.error("Error updating highlight:", error);
      }
    };
    updateHighlight();
  }, [selectedBBLs]);

  return (
    <div className="h-full w-full relative bg-slate-100 overflow-hidden">
      <div ref={mapContainer} className="absolute inset-0" style={{ height: '100%', width: '100%' }} />
      
      {/* MAP CONTROLS */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10 no-print">
        <button 
          onClick={() => setMapMode(mapMode === '2D' ? '3D' : '2D')}
          className="bg-white/95 backdrop-blur px-4 py-2 rounded-xl shadow-xl text-[10px] font-black text-blue-600 border border-slate-200 hover:bg-white transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2"
        >
          <div className={`w-2 h-2 rounded-full ${mapMode === '3D' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-300'}`} />
          {mapMode} Mode
        </button>
        {mapMode === '3D' && (
          <button
            onClick={() => setShowEnvelope(v => !v)}
            className={`backdrop-blur px-4 py-2 rounded-xl shadow-xl text-[10px] font-black border transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2 ${
              showEnvelope
                ? 'bg-cyan-50/95 text-cyan-700 border-cyan-200 hover:bg-cyan-100'
                : 'bg-white/95 text-slate-400 border-slate-200 hover:bg-white'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${showEnvelope ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'bg-slate-300'}`} />
            Envelope
          </button>
        )}
      </div>

      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full shadow-lg text-[10px] font-bold text-slate-600 z-10 border border-slate-200 pointer-events-none no-print">
        Click map to consult a lot
      </div>
    </div>
  );
}
