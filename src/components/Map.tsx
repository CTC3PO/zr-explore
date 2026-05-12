"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useZoning } from "@/context/ZoningContext";

export default function Map() {
  const { 
    selectedBBL, setSelectedBBL, 
    lotData,
    lotGeometry, setLotGeometry,
    floorsList, setFloorsList,
    mapMode, setMapMode 
  } = useZoning();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [lng, setLng] = useState(-73.985); 
  const [lat, setLat] = useState(40.7484);
  const [zoom, setZoom] = useState(14);

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

      // Add 3D Buildings context layer (Optional NYC footprints if available)
      // For now, focus on the selected lot extrusion
      
      // Add NYC Zoning Districts Layer
      map.current?.addSource('zoning-districts', {
        type: 'raster',
        tiles: [
          'https://tiles.arcgis.com/tiles/yG5s3afENB5iO9Jp/arcgis/rest/services/ZoningDistrict/MapServer/export?bbox={bbox-epsg-3857}&size=256,256&format=png32&transparent=true&f=image'
        ],
        tileSize: 256
      });

      map.current?.addLayer({
        id: 'zoning-districts-layer',
        type: 'raster',
        source: 'zoning-districts',
        paint: { 'raster-opacity': 0.4 }
      });

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
          setSelectedBBL(data.rows[0].bbl);
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

    return () => {
      map.current?.remove();
    };
  }, []);

  // Generate Stacked 3D Building Extrusion
  useEffect(() => {
    if (!map.current || !lotGeometry) return;

    const features = floorsList.map((floor, index) => {
      const baseHeight = index * 3.5; // 3.5m per floor
      const height = (index + 1) * 3.5;
      let color = '#facc15'; // residential (yellow-400)
      if (floor.use === 'commercial') color = '#ef4444'; // red-500
      if (floor.use === 'community_facility') color = '#3b82f6'; // blue-500
      
      return {
        type: "Feature",
        geometry: lotGeometry,
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
  }, [floorsList, lotGeometry, lotData]);

  // Handle 2D/3D Mode
  useEffect(() => {
    if (!map.current) return;
    if (mapMode === "3D") {
      map.current.easeTo({ pitch: 55, bearing: -15, duration: 1000 });
      if (map.current.getLayer('proposed-building')) {
        map.current.setLayoutProperty('proposed-building', 'visibility', 'visible');
      }
      if (map.current.getLayer('building-envelope')) {
        map.current.setLayoutProperty('building-envelope', 'visibility', 'visible');
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
  }, [mapMode]);

  useEffect(() => {
    if (!map.current || !selectedBBL) return;

    const updateHighlight = async () => {
      try {
        const query = `SELECT ST_AsGeoJSON(the_geom) as geom FROM mappluto WHERE bbl = '${selectedBBL}' LIMIT 1`;
        const response = await fetch(`https://planninglabs.carto.com/api/v2/sql?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.rows && data.rows.length > 0) {
          const geojson = JSON.parse(data.rows[0].geom);
          setLotGeometry(geojson); // Store geometry for 3D extrusion

          const source = map.current?.getSource("selected-lot") as maplibregl.GeoJSONSource;
          if (source) {
            source.setData({
              type: "FeatureCollection",
              features: [{ type: "Feature", geometry: geojson, properties: {} }]
            });
            
            const coordinates = geojson.type === "Polygon" ? geojson.coordinates[0][0] : geojson.coordinates[0][0][0];
            map.current?.flyTo({ center: coordinates, zoom: 17 });
          }
        }
      } catch (error) {
        console.error("Error updating highlight:", error);
      }
    };
    updateHighlight();
  }, [selectedBBL]);

  return (
    <div className="h-full w-full relative bg-slate-100 overflow-hidden">
      <div ref={mapContainer} className="absolute inset-0" style={{ height: '100%', width: '100%' }} />
      
      {/* MAP CONTROLS */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10">
        <button 
          onClick={() => setMapMode(mapMode === '2D' ? '3D' : '2D')}
          className="bg-white/95 backdrop-blur px-4 py-2 rounded-xl shadow-xl text-[10px] font-black text-blue-600 border border-slate-200 hover:bg-white transition-all active:scale-95 uppercase tracking-widest flex items-center gap-2"
        >
          <div className={`w-2 h-2 rounded-full ${mapMode === '3D' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-300'}`} />
          {mapMode} Mode
        </button>
      </div>

      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full shadow-lg text-[10px] font-bold text-slate-600 z-10 border border-slate-200 pointer-events-none">
        Click map to consult a lot
      </div>
    </div>
  );
}
