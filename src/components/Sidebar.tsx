"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useZoning } from "@/context/ZoningContext";
import { Info, Map as MapIcon, BookOpen, ChevronRight, Loader2, Plus, Search, Copy, X, Trash2, Bot, User } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import MassingPreview from "./MassingPreview";
import ScratchPad from "./ScratchPad";
import { GlossaryTooltip } from "./GlossaryTooltip";
import { UseGroupMatrix } from "./UseGroupMatrix";
import { translateArea, translateHeight } from "@/utils/communityTranslations";
import ScenarioComparison from "./ScenarioComparison";
import { computeMassingProfile } from "@/utils/massingLogic";

export default function Sidebar() {
  const { 
    selectedBBLs, setSelectedBBLs, 
    lotData, setLotData, 
    activeTab, setActiveTab,
    floorsList, setFloorsList,
    floorGeometries, setFloorGeometries,
    mapMode, setMapMode,
    isWideStreet, setIsWideStreet
  } = useZoning();
  
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [activeScratchFloor, setActiveScratchFloor] = useState<number | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [searchInput, setSearchInput] = useState("");
  const [question, setQuestion] = useState("");
  const [persona, setPersona] = useState<"developer" | "citizen" | "architect">("developer");
  const [applyFresh, setApplyFresh] = useState(false);
  const [applyTransit, setApplyTransit] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const addFloor = () => {
    const lastFloor = floorsList.length > 0 ? floorsList[floorsList.length - 1] : { area: 1000, use: 'residential' as const };
    setFloorsList([...floorsList, { id: Date.now(), area: lastFloor.area, use: lastFloor.use }]);
  };

  const removeFloor = (id: number) => {
    setFloorsList(floorsList.filter(f => f.id !== id));
  };

  const duplicateFloor = (id: number) => {
    const floorToCopy = floorsList.find(f => f.id === id);
    if (!floorToCopy) return;
    
    const newId = Date.now();
    const newFloor = { ...floorToCopy, id: newId };
    
    // Insert immediately after the current floor
    const index = floorsList.findIndex(f => f.id === id);
    const newList = [...floorsList];
    newList.splice(index + 1, 0, newFloor);
    setFloorsList(newList);
    
    // Copy geometry if exists
    if (floorGeometries[id]) {
      setFloorGeometries({
        ...floorGeometries,
        [newId]: floorGeometries[id]
      });
    }
  };

  const updateFloorArea = (id: number, area: number) => {
    setFloorsList(floorsList.map(f => f.id === id ? { ...f, area } : f));
  };

  const updateFloorUse = (id: number, use: 'residential' | 'commercial' | 'community_facility') => {
    setFloorsList(floorsList.map(f => f.id === id ? { ...f, use } : f));
  };

  const totalBuildArea = floorsList.reduce((sum, f) => sum + f.area, 0);
  const totalResidArea = floorsList.filter(f => f.use === 'residential').reduce((sum, f) => sum + f.area, 0);
  const totalCommArea = floorsList.filter(f => f.use === 'commercial').reduce((sum, f) => sum + f.area, 0);
  const totalCFArea = floorsList.filter(f => f.use === 'community_facility').reduce((sum, f) => sum + f.area, 0);
  
  const calculatedFAR = lotData?.metadata?.lotArea ? (totalBuildArea / lotData.metadata.lotArea).toFixed(2) : "0.00";

  useEffect(() => {
    setShowDetails(false);
  }, [activeTab]);

  // Compute massing profile for shape badge + MassingPreview
  const massingProfile = useMemo(() => {
    if (!lotData) return null;
    const lotFrontFt = parseFloat(lotData.metadata?.lotFront) || Math.sqrt(parseFloat(lotData.metadata?.lotArea) || 2500);
    const lotDepthFt = parseFloat(lotData.metadata?.lotDepth) || lotFrontFt;
    return computeMassingProfile({
      zoningDistrict: lotData.zoningDistricts?.[0] || 'R6',
      lotFrontFt,
      lotDepthFt,
      isWideStreet,
    });
  }, [lotData, isWideStreet]);

  useEffect(() => {
    if (selectedBBLs.length === 0) {
      setLotData(null);
      return;
    }
    
    // Only reset tab if it's the first selection
    if (selectedBBLs.length === 1) setActiveTab('explorer');

    const fetchData = async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          selectedBBLs.map(bbl => fetch(`/api/lookup?bbl=${bbl}`).then(res => res.json()))
        );

        const errors = results.filter(r => r.error);
        if (errors.length > 0 && selectedBBLs.length === 1) throw new Error(errors[0].error);

        // Aggregate Data
        const aggregated = {
          address: selectedBBLs.length > 1 ? `Assemblage: ${selectedBBLs.length} Lots` : results[0].address,
          bbl: selectedBBLs.length > 1 ? "MULTIPLE" : results[0].bbl,
          zoningDistricts: Array.from(new Set(results.flatMap(r => r.zoningDistricts))),
          specialDistricts: Array.from(new Set(results.flatMap(r => r.specialDistricts || []))),
          metadata: {
            lotArea: results.reduce((sum, r) => sum + (r.metadata?.lotArea || 0), 0),
            builtFAR: (results.reduce((sum, r) => sum + (parseFloat(r.metadata?.builtFAR) || 0), 0) / results.length).toFixed(2),
            maxResidFAR: results[0].metadata?.maxResidFAR, // Assume first lot's rules for MVP
            maxCommFAR: results[0].metadata?.maxCommFAR,
            floors: results.reduce((sum, r) => sum + (parseInt(r.metadata?.floors) || 0), 0)
          },
          taxData: results[0].taxData,
          subLots: results
        };

        setLotData(aggregated);
        fetchAiSummary(aggregated.zoningDistricts);
        
        if (aggregated.metadata?.lotArea && selectedBBLs.length === 1) {
          const suggestedArea = Math.round(aggregated.metadata.lotArea * 0.6);
          setFloorsList([
            { id: 1, area: suggestedArea, use: 'residential' },
            { id: 2, area: suggestedArea, use: 'residential' }
          ]);
        }
      } catch (error: any) {
        console.error("Fetch error:", error);
        alert(error.message || "Failed to fetch lot data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedBBLs, setLotData]);

  // Generate context-aware questions based on the zoning district
  const getSmartQuestions = (districts: string[]): string[] => {
    const d = (districts[0] || '').toUpperCase();
    const isManufacturing = d.startsWith('M');
    const isCommercial = d.startsWith('C');
    const isHighDensity = /R[89]|R10|C6|C5/.test(d);
    const isMidDensity = /R[67]|C[34]/.test(d);

    if (isManufacturing) return [
      'What uses are allowed in this M district?',
      'Can this lot be rezoned for residential?',
      'What is the minimum lot size for manufacturing here?',
      'Are there any community facility allowances?',
    ];
    if (isCommercial) return [
      'What residential uses are permitted on the ground floor?',
      'What is the commercial FAR limit here?',
      'Can I convert this to mixed-use?',
      'What signage and retail rules apply?',
    ];
    if (isHighDensity) return [
      'What is the exact height limit and setback rule?',
      'How many units can I build at max FAR?',
      'Does MIH apply here and what bonus FAR does it unlock?',
      'What is the Sky Exposure Plane for this district?',
    ];
    if (isMidDensity) return [
      'What is the maximum FAR and how many floors does that translate to?',
      'Can I build a mixed-use building here?',
      'Does FRESH food store bonus apply?',
      'What is the required street wall height?',
    ];
    // Low-density residential default
    return [
      'What is the max FAR and what does it allow?',
      'What are the height and setback rules?',
      'Can I add an ADU or accessory dwelling here?',
      'Are there any affordable housing bonuses available?',
    ];
  };

  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(
    getSmartQuestions([])
  );

  // Regenerate smart questions when lot changes
  useEffect(() => {
    if (lotData?.zoningDistricts?.length) {
      setSuggestedQuestions(getSmartQuestions(lotData.zoningDistricts));
    }
  }, [lotData?.zoningDistricts?.[0]]);

  // Auto-scroll to bottom of chat on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const fetchAiSummary = async (districts: string[], q?: string) => {
    const userText = q?.trim();
    if (!userText) return;

    // Push user message immediately
    const newUserMsg = { role: 'user' as const, text: userText };
    setChatMessages(prev => [...prev, newUserMsg]);
    setQuestion("");
    setChatLoading(true);

    try {
      const personaContext = {
        developer: "Focus on buildable area, FAR bonuses, density, and investment feasibility. Always state ROI-relevant numbers.",
        citizen: "Focus on community impact, height in relatable terms, affordable housing, and quality of life. Avoid jargon — translate everything.",
        architect: "Focus on technical ZR citations, massing constraints, setbacks, sky exposure plane, and bulk regulations."
      };

      // Send the full conversation history (excluding the user message we just added)
      const historyToSend = chatMessages.map(m => ({ role: m.role, text: m.text }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userText, 
          zoningDistricts: districts,
          context: personaContext[persona],
          lotContext: lotData,          // ← full lot data for lot-specific answers
          history: historyToSend,       // ← prior conversation for multi-turn context
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      let mainText = data.response;
      const followUpMatch = mainText.match(/\[FOLLOW_UPS:\s*(\[.*?\])\]/s);
      
      if (followUpMatch) {
        try {
          const questions = JSON.parse(followUpMatch[1]);
          if (Array.isArray(questions) && questions.length > 0) {
            setSuggestedQuestions(questions.slice(0, 4));
          }
          mainText = mainText.replace(followUpMatch[0], "").trim();
        } catch (e) {
          console.warn("Failed to parse follow-ups:", e);
        }
      }
      
      setChatMessages(prev => [...prev, { role: 'ai', text: mainText }]);
    } catch (error: any) {
      console.error("Chat error:", error);
      setChatMessages(prev => [...prev, { role: 'ai', text: `⚠️ ${error.message}. Please check your API keys in .env.local.` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text).catch(() => {});

  const getMaxFarWithBonuses = () => {
    if (!lotData?.metadata?.maxResidFAR) return 0;
    let base = parseFloat(lotData.metadata.maxResidFAR);
    
    // MIH Bonus (Approximate based on NYC ZR)
    // R10/C5/C6-4 -> 12.0, R9 -> 8.0, R8 -> 7.2, etc.
    let bonus = 0;
    if (applyTransit) { // Using applyTransit as MIH toggle
      if (base >= 10) bonus = 2.0;
      else if (base >= 7.5) bonus = 0.48;
      else if (base >= 6.0) bonus = 1.18;
      else bonus = base * 0.2; // Generic 20% bonus
    }
    
    // FRESH Bonus (up to 2.0 FAR)
    const freshBonus = applyFresh ? Math.min(2.0, base * 0.2) : 0;
    
    return base + bonus + freshBonus;
  };

  const maxAllowedFAR = getMaxFarWithBonuses();

  const [suggestions, setSuggestions] = useState<any[]>([]);

  const [neighborhoodData, setNeighborhoodData] = useState<{ subways: any[], parks: any[] }>({ subways: [], parks: [] });

  useEffect(() => {
    if (selectedBBLs.length === 0) return;

    const fetchNeighborhood = async () => {
      try {
        // Use first BBL for neighborhood context
        const primaryBBL = selectedBBLs[0];
        const subQuery = `
          WITH lot AS (SELECT the_geom FROM mappluto WHERE bbl = '${primaryBBL}' LIMIT 1)
          SELECT name, line, ST_Distance(the_geom::geography, (SELECT the_geom FROM lot)::geography) as dist 
          FROM subway_stations 
          ORDER BY dist LIMIT 3
        `;
        const parkQuery = `
          WITH lot AS (SELECT the_geom FROM mappluto WHERE bbl = '${primaryBBL}' LIMIT 1)
          SELECT signname as name, ST_Distance(the_geom::geography, (SELECT the_geom FROM lot)::geography) as dist 
          FROM hydra_parks_properties 
          ORDER BY dist LIMIT 1
        `;

        const [subRes, parkRes] = await Promise.all([
          fetch(`https://planninglabs.carto.com/api/v2/sql?q=${encodeURIComponent(subQuery)}`),
          fetch(`https://planninglabs.carto.com/api/v2/sql?q=${encodeURIComponent(parkQuery)}`)
        ]);

        const [subData, parkData] = await Promise.all([subRes.json(), parkRes.json()]);
        setNeighborhoodData({ subways: subData.rows || [], parks: parkData.rows || [] });
      } catch (err) {
        console.error("Error fetching neighborhood data:", err);
      }
    };
    fetchNeighborhood();
  }, [selectedBBLs]);

  const getZoningLink = (districts: string[]) => {
    if (!districts || districts.length === 0) return "https://zr.planning.nyc.gov/";
    const d = districts[0].toUpperCase();
    if (d.startsWith('R')) return "https://zr.planning.nyc.gov/article-ii/chapter-3";
    if (d.startsWith('C')) return "https://zr.planning.nyc.gov/article-iii/chapter-2";
    if (d.startsWith('M')) return "https://zr.planning.nyc.gov/article-iv/chapter-2";
    return "https://zr.planning.nyc.gov/";
  };

  const getBisLink = (bbl: string) => {
    if (!bbl || bbl.length !== 10) return "https://a810-bisweb.nyc.gov/bisweb/bispi00.jsp";
    const boro = bbl.substring(0, 1);
    const block = parseInt(bbl.substring(1, 6), 10);
    const lot = parseInt(bbl.substring(6, 10), 10);
    return `https://a810-bisweb.nyc.gov/bisweb/PropertyProfileOverviewServlet?boro=${boro}&block=${block}&lot=${lot}`;
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* SEARCH SECTION */}
      <div className="p-4 border-b border-slate-100 bg-white shadow-sm relative z-20 no-print">
        <div className="relative flex items-center gap-2">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (searchInput.length === 10 && !isNaN(Number(searchInput))) {
              setSelectedBBLs([searchInput]);
              setSuggestions([]);
            }
          }} className="w-full">
            <input 
              type="text" 
              value={searchInput}
              onChange={async (e) => {
                const val = e.target.value;
                setSearchInput(val);
                if (val.length > 2) {
                  const res = await fetch(`https://geosearch.planninglabs.nyc/v2/autocomplete?text=${val}`);
                  const data = await res.json();
                  setSuggestions(data.features || []);
                } else {
                  setSuggestions([]);
                }
              }}
              placeholder="Search address or enter 10-digit BBL..."
              className="w-full text-xs border border-slate-200 rounded-xl pl-9 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </form>
          
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  key={s.properties.id}
                  onClick={() => {
                    const bbl = s.properties.addendum?.pad?.bbl || s.properties.pad_bbl || s.properties.bbl || s.properties.id;
                    if (bbl) {
                      setSelectedBBLs([bbl]);
                      setSearchInput(s.properties.label);
                    }
                    setSuggestions([]);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-none flex flex-col gap-0.5"
                >
                  <span className="text-xs font-bold text-slate-700">{s.properties.label}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-tighter">
                    {s.properties.addendum?.pad?.bbl || s.properties.pad_bbl || s.properties.bbl ? `BBL: ${s.properties.addendum?.pad?.bbl || s.properties.pad_bbl || s.properties.bbl}` : "Select to view details"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {activeTab === 'chat' ? (
          <div className="h-full flex flex-col animate-in fade-in duration-300">
            {/* CHAT HEADER */}
            <div className="p-3 bg-white border-b border-slate-100 sticky top-0 z-20 shadow-sm no-print">
              <div className="flex items-center justify-between gap-2">
                {/* Persona Switcher */}
                <div className="flex gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                  {(['developer', 'citizen', 'architect'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPersona(p)}
                      className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter transition-all ${
                        persona === p ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {/* Clear chat */}
                {chatMessages.length > 0 && (
                  <button
                    onClick={() => setChatMessages([])}
                    title="Clear conversation"
                    className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={11} />
                    Clear
                  </button>
                )}
              </div>

              {/* ── LOT SUMMARY STRIP ── only when lot is loaded */}
              {lotData && selectedBBLs.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 pt-2 scrollbar-hide animate-in fade-in duration-500">
                  {/* BBL */}
                  {selectedBBLs[0] && (
                    <div className="flex-none flex items-center gap-1 bg-slate-800 text-white px-2 py-1 rounded-full text-[9px] font-bold whitespace-nowrap">
                      <span className="opacity-60">📍</span>
                      <span>{selectedBBLs.length > 1 ? `${selectedBBLs.length} lots` : `BBL ${selectedBBLs[0].replace(/^(\d)(\d{5})(\d{4})$/, '$1-$2-$3')}`}</span>
                    </div>
                  )}
                  {/* Zoning District(s) */}
                  {lotData.zoningDistricts?.slice(0, 2).map((d: string) => (
                    <div key={d} className="flex-none flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded-full text-[9px] font-black whitespace-nowrap">
                      {d}
                    </div>
                  ))}
                  {/* Built FAR */}
                  {lotData.metadata?.builtFAR && (
                    <div className="flex-none flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded-full text-[9px] font-bold whitespace-nowrap">
                      <span className="opacity-50">FAR</span>
                      <span>{parseFloat(lotData.metadata.builtFAR).toFixed(2)}</span>
                    </div>
                  )}
                  {/* Max Residential FAR */}
                  {lotData.metadata?.maxResidFAR && (
                    <div className="flex-none flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full text-[9px] font-bold whitespace-nowrap">
                      <span className="opacity-60">Max</span>
                      <span>{parseFloat(lotData.metadata.maxResidFAR).toFixed(1)}</span>
                    </div>
                  )}
                  {/* Lot Area */}
                  {lotData.metadata?.lotArea && (
                    <div className="flex-none flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 px-2 py-1 rounded-full text-[9px] font-bold whitespace-nowrap">
                      <span className="opacity-50">📐</span>
                      <span>{parseInt(lotData.metadata.lotArea).toLocaleString()} sf</span>
                    </div>
                  )}
                  {/* Year Built */}
                  {lotData.metadata?.yearBuilt && lotData.metadata.yearBuilt !== '0' && (
                    <div className="flex-none flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-full text-[9px] font-bold whitespace-nowrap">
                      <span className="opacity-60">🏗</span>
                      <span>Built {lotData.metadata.yearBuilt}</span>
                    </div>
                  )}
                  {/* Stories */}
                  {lotData.metadata?.numFloors && lotData.metadata.numFloors !== '0' && (
                    <div className="flex-none flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 px-2 py-1 rounded-full text-[9px] font-bold whitespace-nowrap">
                      <span>{lotData.metadata.numFloors}F existing</span>
                    </div>
                  )}
                </div>
              )}

              {/* Suggested questions */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 pt-1.5 scrollbar-hide">
                {suggestedQuestions.map(q => (
                  <button
                    key={q}
                    onClick={() => fetchAiSummary(lotData?.zoningDistricts || [], q)}
                    className="flex-none bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full text-[9px] font-bold text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all whitespace-nowrap"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* CONVERSATION THREAD */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Empty state */}
              {chatMessages.length === 0 && !chatLoading && (
                <div className="flex flex-col items-center py-6 text-center space-y-4">
                  {selectedBBLs.length === 0 ? (
                    /* No lot selected */
                    <>
                      <div className="p-4 bg-blue-50 rounded-full border border-blue-100">
                        <Bot size={28} className="text-blue-400" />
                      </div>
                      <div className="space-y-1 px-4">
                        <p className="text-xs font-bold text-slate-600">ZR-Scout is waiting</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          Select a lot on the map to unlock lot-specific answers, citations, and feasibility advice.
                        </p>
                      </div>
                    </>
                  ) : (
                    /* Lot loaded — show district + smart question cards */
                    <>
                      <div className="flex items-center gap-2">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-md shadow-blue-500/20">
                          <Bot size={22} className="text-white" />
                        </div>
                        <div className="text-left">
                          <p className="text-[11px] font-black text-slate-700">ZR-Scout is ready</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {lotData?.zoningDistricts?.slice(0, 2).map((d: string) => (
                              <span key={d} className="text-[9px] font-black text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">{d}</span>
                            ))}
                            <span className="text-[9px] text-slate-400">· {persona} mode</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 px-4 leading-relaxed">
                        I know this lot's exact rules. Try one of these or ask anything:
                      </p>

                      {/* Smart question cards */}
                      <div className="w-full space-y-1.5 px-1">
                        {suggestedQuestions.map((q, i) => (
                          <button
                            key={i}
                            onClick={() => fetchAiSummary(lotData?.zoningDistricts || [], q)}
                            className="w-full text-left px-3 py-2.5 rounded-xl border border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50 transition-all group shadow-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-blue-500 font-black opacity-60 group-hover:opacity-100">→</span>
                              <span className="text-[10px] font-semibold text-slate-600 group-hover:text-blue-700 leading-tight">{q}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Message bubbles */}
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`flex-none w-6 h-6 rounded-full flex items-center justify-center mt-0.5 shadow-sm ${
                    msg.role === 'user' ? 'bg-slate-700' : 'bg-blue-600'
                  }`}>
                    {msg.role === 'user'
                      ? <User size={11} className="text-white" />
                      : <Bot size={11} className="text-white" />}
                  </div>

                  {/* Bubble */}
                  <div className={`relative group max-w-[85%] ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  } flex flex-col gap-1`}>
                    <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-slate-800 text-white rounded-tr-sm'
                        : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-sm prose prose-xs prose-slate max-w-none prose-p:leading-relaxed prose-headings:mb-1 prose-headings:mt-3 prose-li:my-0.5'
                    }`}>
                      {msg.role === 'ai'
                        ? <ReactMarkdown>{msg.text}</ReactMarkdown>
                        : <span>{msg.text}</span>}
                    </div>
                    {/* Copy button — AI only */}
                    {msg.role === 'ai' && (
                      <button
                        onClick={() => copyToClipboard(msg.text)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity self-start flex items-center gap-1 text-[9px] text-slate-400 hover:text-blue-500 px-1"
                      >
                        <Copy size={10} /> Copy
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Inline typing indicator */}
              {chatLoading && (
                <div className="flex gap-2.5 flex-row">
                  <div className="flex-none w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center mt-0.5 shadow-sm">
                    <Bot size={11} className="text-white" />
                  </div>
                  <div className="px-3.5 py-3 bg-white border border-slate-100 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* INPUT BAR */}
            <div className="p-3 border-t border-slate-100 bg-white no-print">
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={selectedBBLs.length === 0 ? "Select a lot first, then ask..." : "Ask anything about this lot..."}
                  className="flex-1 text-xs border border-slate-200 rounded-xl pl-3 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm bg-slate-50 disabled:opacity-50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && question.trim() && !chatLoading) {
                      fetchAiSummary(lotData?.zoningDistricts || [], question);
                    }
                  }}
                />
                <button
                  onClick={() => fetchAiSummary(lotData?.zoningDistricts || [], question)}
                  disabled={chatLoading || !question.trim()}
                  className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors shadow-sm"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                <p className="text-sm text-slate-500 font-medium">Retrieving lot data...</p>
              </div>
            ) : selectedBBLs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-slate-400 py-20">
                <div className="p-6 bg-slate-50 rounded-full border border-slate-100 shadow-inner">
                  <BookOpen size={48} className="text-slate-300" />
                </div>
                <div className="space-y-1 px-8">
                  <p className="text-sm font-semibold text-slate-600">Start Your Exploration</p>
                  <p className="text-xs leading-relaxed">Select a lot on the map or enter a BBL to begin a professional zoning analysis.</p>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-6">
                {/* Printable Report Header */}
                <div className="report-header">
                  <h1>Zoning Feasibility Report</h1>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                    Generated: {new Date().toLocaleDateString()}
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Included Lots (Assemblage)</p>
                    <p className="text-[10px] font-mono text-slate-600 mt-1">
                      {selectedBBLs.join(' | ')}
                    </p>
                  </div>
                </div>

                {/* Header info - Always visible when lot is selected */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tax Lot Portfolio</span>
                    <GlossaryTooltip termId="bbl">
                      <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200 font-bold shadow-sm cursor-help">
                        B{lotData?.taxData?.borough} L{lotData?.taxData?.block} B{lotData?.taxData?.lot}
                      </span>
                    </GlossaryTooltip>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                      {lotData?.address}
                    </h2>
                    
                    {/* Assemblage Lot List (Manage Selection) */}
                    {selectedBBLs.length > 1 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 no-print">
                        <GlossaryTooltip termId="assemblage">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest cursor-help mr-1">Assemblage</span>
                        </GlossaryTooltip>
                        {selectedBBLs.map(bbl => (
                          <div key={bbl} className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">
                            <span className="text-[9px] font-bold text-slate-500">{bbl}</span>
                            <button 
                              onClick={() => setSelectedBBLs(selectedBBLs.filter(id => id !== bbl))}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      {lotData?.zoningDistricts?.map((d: string) => (
                        <span key={d} className="bg-slate-800 text-white px-2.5 py-1 rounded-md text-xs font-bold shadow-sm border border-slate-900">
                          {d}
                        </span>
                      ))}
                      {lotData?.specialDistricts?.length > 0 && (
                        <GlossaryTooltip termId="special_district">
                          <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md text-xs font-bold border border-amber-200 shadow-sm cursor-help">
                            Special {lotData.specialDistricts[0]}
                          </span>
                        </GlossaryTooltip>
                      )}
                    </div>
                  </div>
                </div>

                {/* QUICK DASHBOARD */}
                <div className="grid grid-cols-3 gap-3 py-5 border-y border-slate-200">
                  <div className="space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <GlossaryTooltip termId="far">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider inline-flex">Built FAR</p>
                    </GlossaryTooltip>
                    <p className="text-base font-black text-slate-800">{lotData?.metadata?.builtFAR}</p>
                  </div>
                  <div className="space-y-1 bg-blue-50/50 p-2 rounded-lg border border-blue-100/50 text-center">
                    <GlossaryTooltip termId="far">
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-wider inline-flex">Max Res FAR</p>
                    </GlossaryTooltip>
                    <div className="flex flex-col items-center">
                      <p className="text-base font-black text-blue-700">{lotData?.metadata?.maxResidFAR || "N/A"}</p>
                      {lotData?.metadata?.maxResidFAR && (
                        <p className="text-[8px] text-blue-500 font-bold tracking-tighter">({(parseFloat(lotData.metadata.maxResidFAR) * 1.2).toFixed(2)} w/ MIH)</p>
                      )}
                    </div>
                  </div>
                  <div className={`space-y-1 p-2 rounded-lg border text-right ${parseFloat(lotData?.metadata?.builtFAR) > parseFloat(lotData?.metadata?.maxResidFAR) ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                    <p className={`text-[9px] font-black uppercase tracking-wider ${parseFloat(lotData?.metadata?.builtFAR) > parseFloat(lotData?.metadata?.maxResidFAR) ? 'text-red-500' : 'text-emerald-600'}`}>Utilization</p>
                    <p className={`text-base font-black ${parseFloat(lotData?.metadata?.builtFAR) > parseFloat(lotData?.metadata?.maxResidFAR) ? 'text-red-700' : 'text-emerald-700'}`}>
                      {lotData?.metadata?.maxResidFAR ? Math.round((parseFloat(lotData.metadata.builtFAR) / parseFloat(lotData.metadata.maxResidFAR)) * 100) : 0}%
                    </p>
                  </div>
                </div>

                {/* TAB: EXPLORER */}
                {activeTab === 'explorer' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                          <BookOpen size={14} className="text-blue-600" />
                          <span>Physical Attributes</span>
                        </div>
                      </div>
                      
                      {lotData?.metadata && (
                        <div className="grid grid-cols-2 gap-3 py-3 border-t border-slate-50">
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Existing Floors</p>
                            <p className="text-sm font-bold text-slate-700">{lotData.metadata.floors}</p>
                          </div>
                          <div className="space-y-0.5 text-right">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Lot Area</p>
                            <p className="text-sm font-bold text-slate-700">{lotData.metadata.lotArea?.toLocaleString()} <span className="text-[10px] font-normal">sf</span></p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button 
                          className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5"
                          onClick={() => setShowDetails(true)}
                        >
                          <Info size={12} />
                          See More Details
                        </button>
                        <button 
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm no-print"
                          onClick={() => window.print()}
                        >
                          <ChevronRight size={12} className="rotate-90" />
                          Export Report
                        </button>
                      </div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl space-y-2">
                      <p className="text-[9px] font-bold text-emerald-700 uppercase">Development Potential</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-emerald-800">High</span>
                        <span className="text-[10px] text-emerald-600">~{Math.round((lotData?.metadata?.lotArea || 0) * (maxAllowedFAR - parseFloat(lotData?.metadata?.builtFAR || "0"))).toLocaleString()} sf available</span>
                      </div>
                      <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[40%]" />
                      </div>
                      <p className="text-[8px] text-emerald-600 italic font-medium">Based on current Zoning Resolution (Art. II, Ch. 3)</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-800 font-bold text-xs px-1">
                        <MapIcon size={14} className="text-emerald-500" />
                        <span>Neighborhood Context</span>
                      </div>
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                        <div className="space-y-2">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Nearest Transit</p>
                          <div className="space-y-1.5">
                            {neighborhoodData.subways.map((s, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-700">{s.name}</span>
                                  <span className="text-[8px] text-blue-600 font-bold uppercase tracking-tighter">{s.line} Line</span>
                                </div>
                                <span className="text-[9px] font-mono text-slate-400">{(s.dist * 3.28084).toFixed(0)} ft</span>
                              </div>
                            ))}
                            {neighborhoodData.subways.length === 0 && <p className="text-[9px] text-slate-400 italic">No subway stations found nearby.</p>}
                          </div>
                        </div>

                        {neighborhoodData.parks.length > 0 && (
                          <div className="space-y-2 border-t border-slate-200 pt-3">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Open Space</p>
                            <div className="flex items-center justify-between bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                              <span className="text-[10px] font-bold text-emerald-800">{neighborhoodData.parks[0].name}</span>
                              <span className="text-[9px] font-mono text-emerald-600">{(neighborhoodData.parks[0].dist * 3.28084).toFixed(0)} ft</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-800 font-bold text-xs px-1">
                        <Loader2 size={14} className="text-amber-500" />
                        <span>Construction & Permits</span>
                      </div>
                      <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm space-y-3">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Property Profile (BIS)</p>
                            <a 
                              href={getBisLink(selectedBBLs[0])} 
                              target="_blank" 
                              className="text-[9px] bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 font-bold hover:bg-blue-100 transition-colors"
                            >
                              OPEN BIS ↗
                            </a>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">DOB NOW Portal</p>
                            <a 
                              href="https://a810-dobnow.nyc.gov/PublicPortal/index.html" 
                              target="_blank" 
                              className="text-[9px] bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-100 font-bold hover:bg-amber-100 transition-colors"
                            >
                              OPEN DOB NOW ↗
                            </a>
                          </div>
                        </div>
                        <div className="space-y-2 pt-2">
                          <div className="flex flex-col text-[9px] text-slate-400 italic leading-relaxed bg-slate-50 p-2 rounded-lg">
                            <p className="mb-1 text-slate-500 font-bold">Status: Using External Portals</p>
                            <p>DOB NOW manages UI state internally, preventing direct BBL links. Use the BIS link above for historical property profiles, or search BBL <span className="font-mono text-slate-600 bg-slate-200 px-1 rounded">{selectedBBLs[0]}</span> manually on DOB NOW.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-800 font-bold text-xs px-1">
                        <BookOpen size={14} className="text-blue-600" />
                        <GlossaryTooltip termId="zoning_district">
                          <span className="cursor-help">Relevant Rules & Chapters</span>
                        </GlossaryTooltip>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {lotData?.zoningDistricts?.some((d: string) => d.startsWith('R')) && (
                          <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600">
                            <span>Residence District Regulations</span>
                            <span className="text-slate-400">Art. II, Ch. 3</span>
                          </div>
                        )}
                        {(lotData?.zoningDistricts?.some((d: string) => d.startsWith('C'))) && (
                          <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600">
                            <span>Commercial District Rules</span>
                            <span className="text-slate-400">Art. III, Ch. 2</span>
                          </div>
                        )}
                        {lotData?.zoningDistricts?.some((d: string) => d.startsWith('M')) && (
                          <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600">
                            <span>Manufacturing District Rules</span>
                            <span className="text-slate-400">Art. IV, Ch. 2</span>
                          </div>
                        )}
                        {lotData?.specialDistricts?.length > 0 && (
                          <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-100 rounded-lg text-[10px] font-bold text-blue-700">
                            <span>Special District {lotData.specialDistricts[0]}</span>
                            <span className="text-blue-400">Art. X-XII</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: BUILDER */}
                {activeTab === 'builder' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <MassingPreview floors={floorsList} lotArea={lotData?.metadata?.lotArea || 2500} massingProfile={massingProfile} />

                    {/* Scenario Comparison */}
                    <ScenarioComparison
                      lotArea={lotData?.metadata?.lotArea || 0}
                      maxResidFAR={parseFloat(lotData?.metadata?.maxResidFAR) || 0}
                      maxCommFAR={parseFloat(lotData?.metadata?.maxCommFAR) || 0}
                      currentFloors={floorsList}
                      zoningDistrict={lotData?.zoningDistricts?.[0] || ""}
                    />
                    
                    <div className="space-y-6 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                      {/* Decorative background element */}
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
                      
                      <div className="flex justify-between items-center relative z-10">
                        <div className="space-y-0.5">
                          <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.15em] flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                            Building Simulation
                          </h3>
                          <p className="text-[10px] text-slate-400 font-medium no-print">Configure floors to test bulk & FAR limits</p>
                        </div>
                        <button 
                          onClick={addFloor}
                          className="bg-white border border-slate-200 text-blue-600 p-2 rounded-xl transition-all shadow-sm hover:shadow-md hover:border-blue-200 active:scale-95 no-print"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                                         <div className="space-y-2 max-h-72 overflow-y-auto pr-1 relative z-10 custom-scrollbar scroll-smooth">
                        {floorsList.map((floor, index) => (
                          <div key={floor.id} className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-100 group transition-all hover:border-blue-200 hover:shadow-sm">
                              <div className="flex flex-col items-center justify-center w-7 h-7 bg-slate-50 rounded-lg border border-slate-100 group-hover:bg-blue-50 transition-colors">
                                <span className="text-[9px] font-black text-slate-400 group-hover:text-blue-500">{index + 1}</span>
                              </div>
                              
                              <div className="flex-1 flex items-center gap-2">
                                <input 
                                  type="number"
                                  value={floor.area}
                                  onChange={(e) => updateFloorArea(floor.id, parseInt(e.target.value) || 0)}
                                  className="w-16 bg-transparent text-xs font-bold text-slate-700 border-none focus:ring-0 p-0"
                                />
                                <span className="text-[10px] text-slate-400 font-medium">sqft</span>
                              </div>

                              <div className="flex gap-1.5 items-center">
                                <button 
                                  onClick={() => setActiveScratchFloor(activeScratchFloor === floor.id ? null : floor.id)}
                                  className={`text-[9px] font-bold px-2 py-1 rounded transition-colors ${activeScratchFloor === floor.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                >
                                  SKETCH
                                </button>
                                <select 
                                  value={floor.use}
                                  onChange={(e) => updateFloorUse(floor.id, e.target.value as any)}
                                  className="text-[9px] bg-slate-50 border-slate-200 text-slate-600 rounded-lg py-1 px-2 font-bold cursor-pointer hover:bg-slate-100 transition-colors"
                                >
                                  <option value="residential">Residential</option>
                                  <option value="commercial">Commercial</option>
                                  <option value="community_facility">Community</option>
                                </select>
                                <button 
                                  onClick={() => duplicateFloor(floor.id)}
                                  className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Duplicate Floor"
                                >
                                  <Copy size={12} />
                                </button>
                                <button 
                                  onClick={() => removeFloor(floor.id)}
                                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remove Floor"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                </button>
                              </div>
                            </div>
                            {activeScratchFloor === floor.id && (
                              <ScratchPad floorId={floor.id} onClose={() => setActiveScratchFloor(null)} />
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-slate-100/80 space-y-3 relative z-10">
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest px-1 no-print">Scenario Blueprints</p>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide no-print">
                          {(lotData?.zoningDistricts?.some((d: string) => d.startsWith('R') || d.startsWith('C'))) && (
                            <>
                              <button 
                                onClick={() => {
                                  const area = Math.round((lotData?.metadata?.lotArea || 2000) * 0.8);
                                  setFloorsList([{ id: 1, area, use: 'residential' }, { id: 2, area, use: 'residential' }, { id: 3, area, use: 'residential' }]);
                                  setApplyFresh(false);
                                  setApplyTransit(false);
                                }}
                                className="flex-none bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-bold transition-all shadow-sm whitespace-nowrap"
                              >
                                Residential Townhouse
                              </button>
                              <button 
                                onClick={() => {
                                  const area = Math.round((lotData?.metadata?.lotArea || 2000) * 0.5);
                                  const newFloors = Array.from({length: 12}, (_, i) => ({ 
                                    id: Date.now() + i, 
                                    area, 
                                    use: i === 0 ? 'commercial' : 'residential' as any 
                                  }));
                                  setFloorsList(newFloors);
                                  setApplyFresh(true);
                                  setApplyTransit(true);
                                }}
                                className="flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[10px] font-bold transition-all shadow-lg shadow-blue-500/20 whitespace-nowrap"
                              >
                                Mixed MIH (1F C + 11F R)
                              </button>
                            </>
                          )}
                          {(lotData?.zoningDistricts?.some((d: string) => d.startsWith('C') || d.startsWith('M'))) && (
                            <button 
                              onClick={() => {
                                const area = Math.round((lotData?.metadata?.lotArea || 2000) * 0.9);
                                const newFloors = Array.from({length: 8}, (_, i) => ({ id: Date.now() + i, area, use: 'commercial' as any }));
                                setFloorsList(newFloors);
                                setApplyTransit(false);
                              }}
                              className="flex-none bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold transition-all shadow-lg shadow-amber-500/20 whitespace-nowrap"
                            >
                              Commercial Office
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100/80 space-y-3 relative z-10 no-print">
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest px-1">Zoning Incentives</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => setApplyFresh(!applyFresh)}
                            className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${applyFresh ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-white border-slate-200 text-slate-400'}`}
                          >
                            <div className="flex flex-col items-start">
                              <GlossaryTooltip termId="fresh">
                                <span className="text-[10px] font-black tracking-tighter cursor-help">FRESH</span>
                              </GlossaryTooltip>
                              <span className="text-[8px] opacity-60 font-bold uppercase">Food Store</span>
                            </div>
                            {applyFresh ? <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> : <div className="w-2 h-2 bg-slate-100 rounded-full border border-slate-200" />}
                          </button>
                          <button 
                            onClick={() => setApplyTransit(!applyTransit)}
                            className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${applyTransit ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-400'}`}
                          >
                            <div className="flex flex-col items-start">
                              <GlossaryTooltip termId="mih">
                                <span className="text-[10px] font-black tracking-tighter cursor-help">MIH</span>
                              </GlossaryTooltip>
                              <span className="text-[8px] opacity-60 font-bold uppercase">Incl. Housing</span>
                            </div>
                            {applyTransit ? <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> : <div className="w-2 h-2 bg-slate-100 rounded-full border border-slate-200" />}
                          </button>
                        </div>

                        {/* Wide Street toggle + Shape badge */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsWideStreet(!isWideStreet)}
                            className={`flex-1 flex items-center justify-between p-3 rounded-xl border transition-all ${isWideStreet ? 'bg-violet-50 border-violet-200 text-violet-700 shadow-sm' : 'bg-white border-slate-200 text-slate-400'}`}
                          >
                            <div className="flex flex-col items-start">
                              <span className="text-[10px] font-black tracking-tighter">Wide Street</span>
                              <span className="text-[8px] opacity-60 font-bold uppercase">≥75 ft</span>
                            </div>
                            {isWideStreet ? <div className="w-2 h-2 bg-violet-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.5)]" /> : <div className="w-2 h-2 bg-slate-100 rounded-full border border-slate-200" />}
                          </button>

                          {massingProfile && (
                            <div
                              title={massingProfile.shapeDescription}
                              className="flex flex-col items-center justify-center p-3 rounded-xl border border-indigo-100 bg-indigo-50 min-w-[64px] cursor-help"
                            >
                              <span className="text-[14px] font-black text-indigo-700 tracking-tighter leading-none">
                                {massingProfile.massingShape}
                              </span>
                              <span className="text-[7px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">shape</span>
                            </div>
                          )}
                        </div>

                        {massingProfile && (
                          <p className="text-[8px] text-slate-400 italic px-1 leading-snug">
                            Setback kicks in at {massingProfile.baseFloors}F ({massingProfile.baseHeightFt}ft) · {massingProfile.setbackFt}ft step-back required
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-6 pt-5 border-t border-slate-100 relative z-10">
                        <div className="space-y-1">
                          <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Est. Build Area</p>
                          <div className="space-y-0.5">
                            <p className="text-lg font-black text-slate-800 tabular-nums leading-tight">
                              {(totalBuildArea).toLocaleString()} <span className="text-[10px] font-bold text-slate-400 ml-0.5">SF</span>
                            </p>
                            <div className="flex gap-2 text-[8px] font-bold uppercase">
                              {totalResidArea > 0 && <span className="text-yellow-600">{totalResidArea.toLocaleString()} R</span>}
                              {totalCommArea > 0 && <span className="text-red-600">{totalCommArea.toLocaleString()} C</span>}
                              {totalCFArea > 0 && <span className="text-blue-600">{totalCFArea.toLocaleString()} CF</span>}
                            </div>
                            <div className="pt-1">
                              <p className="text-[9px] font-bold text-blue-600/80 italic leading-snug">
                                {translateArea(totalBuildArea)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Est. Total Height</p>
                          <div className="space-y-0.5">
                            <p className="text-lg font-black text-slate-800 tabular-nums leading-tight">
                              {Math.round(floorsList.length * 11.5).toLocaleString()} <span className="text-[10px] font-bold text-slate-400 ml-0.5">FT</span>
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                              {floorsList.length} FLOORS
                            </p>
                            <div className="pt-1">
                              <p className="text-[9px] font-bold text-blue-600/80 italic leading-snug">
                                {translateHeight(floorsList.length * 11.5)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-5 border-t border-slate-100 flex justify-between items-center relative z-10">
                        <div className="space-y-1">
                          <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Scenario / Max FAR</p>
                          <div className="flex items-center gap-2">
                            <p className={`text-lg font-black tabular-nums ${parseFloat(calculatedFAR) > maxAllowedFAR ? 'text-red-600' : 'text-blue-600'}`}>
                              {calculatedFAR}
                            </p>
                            <span className="text-slate-300 font-bold">/</span>
                            <p className="text-sm font-bold text-slate-400 tabular-nums">
                              {maxAllowedFAR.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        {totalCommArea > 0 && lotData?.metadata?.maxCommFAR && (
                          <div className="text-right">
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Comm Limit</p>
                            <p className="text-[10px] font-bold text-amber-500">
                              {(totalCommArea / lotData.metadata.lotArea).toFixed(2)} / {lotData.metadata.maxCommFAR}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* ── PRO-FORMA LITE ── */}
                      {totalBuildArea > 0 && lotData?.metadata?.lotArea && (
                        <div className="pt-4 border-t border-slate-100/80 space-y-3 relative z-10">
                          <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest px-1">
                            💰 Pro-Forma Lite <span className="font-normal normal-case text-slate-300">(rough estimate)</span>
                          </p>
                          {(() => {
                            const resCostPerSF = 350;   // NYC avg residential hard cost $/sf
                            const commCostPerSF = 420;  // Commercial
                            const cfCostPerSF = 300;    // Community facility
                            const totalDevCost =
                              totalResidArea * resCostPerSF +
                              totalCommArea * commCostPerSF +
                              totalCFArea * cfCostPerSF;

                            // Valuation via cap rate
                            const resRentPerSF = 42;    // $/sf/yr NYC avg rent
                            const commRentPerSF = 55;
                            const capRate = 0.045;
                            const noi = (totalResidArea * resRentPerSF + totalCommArea * commRentPerSF) * 0.7;
                            const estValue = noi / capRate;
                            const roi = totalDevCost > 0 ? ((estValue - totalDevCost) / totalDevCost) * 100 : 0;

                            return (
                              <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm space-y-0.5">
                                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Est. Dev Cost</p>
                                  <p className="text-xs font-black text-slate-800 tabular-nums">
                                    ${(totalDevCost / 1_000_000).toFixed(1)}M
                                  </p>
                                </div>
                                <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm space-y-0.5">
                                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Est. Value</p>
                                  <p className="text-xs font-black text-emerald-700 tabular-nums">
                                    ${(estValue / 1_000_000).toFixed(1)}M
                                  </p>
                                </div>
                                <div className={`p-2.5 rounded-xl border shadow-sm space-y-0.5 ${roi >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                                  <p className={`text-[8px] font-bold uppercase tracking-wide ${roi >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>ROI</p>
                                  <p className={`text-xs font-black tabular-nums ${roi >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                    {roi >= 0 ? '+' : ''}{roi.toFixed(0)}%
                                  </p>
                                </div>
                              </div>
                            );
                          })()}
                          <p className="text-[7px] text-slate-300 italic px-1">
                            Based on NYC avg construction costs & 4.5% cap rate. Excludes land, soft costs &amp; financing.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-100 bg-white flex justify-between items-center px-4">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Live System Status</span>
        </div>
        <span className="text-[9px] text-slate-300 font-medium italic">Data via NYC Planning Labs</span>
      </div>

      {/* Details Overlay */}
      {showDetails && lotData && (
        <div className="absolute inset-0 bg-white z-30 flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800">Complete Lot Profile</h2>
            <button 
              onClick={() => setShowDetails(false)}
              className="text-slate-400 hover:text-slate-600 text-xl font-bold"
            >
              ×
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Tax & Identification</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">BBL</p>
                  <p className="text-xs font-mono font-bold text-slate-700">{lotData.bbl}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Borough/Block/Lot</p>
                  <p className="text-xs font-bold text-slate-700">{lotData.taxData?.borough}/{lotData.taxData?.block}/{lotData.taxData?.lot}</p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Zoning Framework</h3>
              <div className="space-y-2">
                <div className="p-4 border border-slate-100 rounded-xl bg-white shadow-sm flex justify-between items-center">
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Zoning Districts</p>
                    <p className="text-sm font-bold text-slate-800">{lotData.zoningDistricts.join(", ")}</p>
                  </div>
                  <a href={getZoningLink(lotData.zoningDistricts)} target="_blank" className="text-[10px] text-blue-600 font-bold hover:underline">View ZR §</a>
                </div>

                {lotData.overlays?.length > 0 && (
                  <div className="p-4 border border-slate-100 rounded-xl bg-white shadow-sm flex justify-between items-center">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Commercial Overlays</p>
                      <p className="text-sm font-bold text-slate-800">{lotData.overlays.join(", ")}</p>
                    </div>
                    <a href="https://zr.planning.nyc.gov/article-iii/chapter-2" target="_blank" className="text-[10px] text-blue-600 font-bold hover:underline">View ZR §</a>
                  </div>
                )}

                {lotData.specialDistricts?.length > 0 && (
                  <div className="p-4 border border-slate-100 rounded-xl bg-white shadow-sm flex justify-between items-center">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Special Districts</p>
                      <p className="text-sm font-bold text-slate-800">{lotData.specialDistricts.join(", ")}</p>
                    </div>
                    <a href="https://zr.planning.nyc.gov/article-viii" target="_blank" className="text-[10px] text-blue-600 font-bold hover:underline">View ZR §</a>
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Floor Area & FAR</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white border border-slate-100 rounded-lg">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Max Residential FAR</p>
                  <p className="text-xs font-bold text-slate-700">{lotData.metadata.maxResidFAR || "0.00"}</p>
                </div>
                <div className="p-3 bg-white border border-slate-100 rounded-lg">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Built FAR (Existing)</p>
                  <p className="text-xs font-bold text-slate-700">{lotData.metadata.builtFAR}</p>
                </div>
                <div className="p-3 bg-white border border-slate-100 rounded-lg">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Max Commercial FAR</p>
                  <p className="text-xs font-bold text-slate-700">{lotData.metadata.maxCommFAR || "0.00"}</p>
                </div>
                <div className="p-3 bg-white border border-slate-100 rounded-lg">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Max Comm. Facility FAR</p>
                  <p className="text-xs font-bold text-slate-700">{lotData.metadata.maxFacilFAR || "0.00"}</p>
                </div>
              </div>
            </section>

            <section className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
              <h3 className="text-[10px] font-bold text-blue-700 uppercase tracking-widest flex items-center gap-2">
                <Info size={12} />
                Consultant Note
              </h3>
              <p className="text-[11px] text-blue-800 leading-relaxed italic">
                This lot qualifies for potential density bonuses under the <strong>MIH (Mandatory Inclusionary Housing)</strong> program and the <strong>FRESH</strong> food store initiative. 
                <a href="https://zr.planning.nyc.gov/article-ii/chapter-3" target="_blank" className="ml-1 text-blue-600 font-bold hover:underline underline-offset-2">View Bonus Details →</a>
              </p>
            </section>
          </div>
        </div>
      )}

      {/* TAB: MATRIX */}
      {activeTab === 'matrix' && (
        <div className="h-full w-full animate-in fade-in duration-300">
          <UseGroupMatrix />
        </div>
      )}
    </div>
  );
}
