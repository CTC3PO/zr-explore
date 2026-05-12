"use client";

import { useEffect, useState } from "react";
import { useZoning } from "@/context/ZoningContext";
import { Info, Map as MapIcon, BookOpen, ChevronRight, Loader2, Plus, ArrowRight, Search } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import MassingPreview from "./MassingPreview";
import ScratchPad from "./ScratchPad";
import { GlossaryTooltip } from "./GlossaryTooltip";
import { UseGroupMatrix } from "./UseGroupMatrix";

export default function Sidebar() {
  const { 
    selectedBBL, setSelectedBBL, 
    lotData, setLotData, 
    activeTab, setActiveTab,
    floorsList, setFloorsList,
    mapMode, setMapMode 
  } = useZoning();
  
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [activeScratchFloor, setActiveScratchFloor] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [question, setQuestion] = useState("");
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

  useEffect(() => {
    if (!selectedBBL) {
      setLotData(null);
      return;
    }
    setActiveTab('explorer');

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/lookup?bbl=${selectedBBL}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setLotData(data);
        
        fetchAiSummary(data.zoningDistricts);
        
        if (data.metadata?.lotArea) {
          const suggestedArea = Math.round(data.metadata.lotArea * 0.6);
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
  }, [selectedBBL, setLotData]);

  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    "What are the density bonuses for FRESH and MIH?",
    "What are the height and setback rules?",
    "Can I build residential here?",
    "What is the maximum allowed FAR?"
  ]);

  const fetchAiSummary = async (districts: string[], q?: string) => {
    setChatLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: q, zoningDistricts: districts }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      let mainText = data.response;
      const followUpMatch = mainText.match(/\[FOLLOW_UPS:\s*(\[.*?\])\]/);
      
      if (followUpMatch) {
        try {
          const questions = JSON.parse(followUpMatch[1]);
          setSuggestedQuestions(questions);
          mainText = mainText.replace(followUpMatch[0], "").trim();
        } catch (e) {
          console.warn("Failed to parse follow-ups:", e);
        }
      }
      
      setAiSummary(mainText);
    } catch (error: any) {
      console.error("Chat error:", error);
      setAiSummary(`Consultant Error: ${error.message}. Please check your AI keys.`);
    } finally {
      setChatLoading(false);
    }
  };

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
    if (!selectedBBL) return;

    const fetchNeighborhood = async () => {
      try {
        // Fetch nearest subways and parks
        const subQuery = `
          WITH lot AS (SELECT the_geom FROM mappluto WHERE bbl = '${selectedBBL}' LIMIT 1)
          SELECT name, line, ST_Distance(the_geom::geography, (SELECT the_geom FROM lot)::geography) as dist 
          FROM subway_stations 
          ORDER BY dist LIMIT 3
        `;
        const parkQuery = `
          WITH lot AS (SELECT the_geom FROM mappluto WHERE bbl = '${selectedBBL}' LIMIT 1)
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
  }, [selectedBBL]);

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
      <div className="p-4 border-b border-slate-100 bg-white shadow-sm relative z-20">
        <div className="relative flex items-center gap-2">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (searchInput.length === 10 && !isNaN(Number(searchInput))) {
              setSelectedBBL(searchInput);
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
                      setSelectedBBL(bbl);
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
            {/* CHAT INPUT AT TOP */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 sticky top-0 z-20 space-y-3 shadow-sm">
              <div className="relative">
                <input 
                  type="text" 
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask any NYC zoning question..."
                  className="w-full text-xs border border-slate-200 rounded-xl pl-3 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm bg-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && question) fetchAiSummary(lotData?.zoningDistricts || [], question);
                  }}
                />
                <button 
                  onClick={() => fetchAiSummary(lotData?.zoningDistricts || [], question)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
                  disabled={chatLoading || !question}
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {suggestedQuestions.map(q => (
                  <button 
                    key={q}
                    onClick={() => { setQuestion(q); fetchAiSummary(lotData?.zoningDistricts || [], q); }}
                    className="flex-none bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm whitespace-nowrap"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* CHAT MESSAGES / RESULT */}
            <div className="flex-1 p-4 space-y-4">
              {!aiSummary && !chatLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 opacity-40">
                  <BookOpen size={48} className="text-blue-300" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-600">AI Zoning Consultant</p>
                    <p className="text-xs px-10">Ask about specific lots, generic rules, or development strategies.</p>
                  </div>
                </div>
              )}

              {chatLoading && (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                  </div>
                  <span className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Analysing Zoning Resolution...</span>
                </div>
              )}

              {aiSummary && !chatLoading && (
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm prose prose-xs prose-slate max-w-none prose-p:leading-relaxed prose-headings:mb-2 prose-headings:mt-4 prose-li:my-0.5 text-slate-700 animate-in slide-in-from-bottom-2 duration-300">
                  <ReactMarkdown>{aiSummary}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                <p className="text-sm text-slate-500 font-medium">Retrieving lot data...</p>
              </div>
            ) : !selectedBBL ? (
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
                      {lotData?.address || `Tax Lot ${selectedBBL}`}
                    </h2>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {lotData?.zoningDistricts?.map((d: string) => (
                        <span key={d} className="bg-slate-800 text-white px-2.5 py-1 rounded-md text-xs font-bold shadow-sm border border-slate-900">
                          {d}
                        </span>
                      ))}
                      {lotData?.specialDistricts?.length > 0 && (
                        <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md text-xs font-bold border border-amber-200 shadow-sm">
                          Special {lotData.specialDistricts[0]}
                        </span>
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
                          className="flex-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5"
                          onClick={() => {
                            setActiveTab('chat');
                            fetchAiSummary(lotData.zoningDistricts, "Please provide a quick executive summary of this lot's development potential and any key restrictions.");
                          }}
                        >
                          <BookOpen size={12} />
                          Quick Summarize
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
                              href={getBisLink(selectedBBL)} 
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
                            <p>DOB NOW manages UI state internally, preventing direct BBL links. Use the BIS link above for historical property profiles, or search BBL <span className="font-mono text-slate-600 bg-slate-200 px-1 rounded">{selectedBBL}</span> manually on DOB NOW.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-800 font-bold text-xs px-1">
                        <BookOpen size={14} className="text-blue-600" />
                        <span>Relevant Rules & Chapters</span>
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
                    <MassingPreview floors={floorsList} lotArea={lotData?.metadata?.lotArea || 2500} />
                    
                    <div className="space-y-6 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                      {/* Decorative background element */}
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
                      
                      <div className="flex justify-between items-center relative z-10">
                        <div className="space-y-0.5">
                          <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.15em] flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                            Building Simulation
                          </h3>
                          <p className="text-[10px] text-slate-400 font-medium">Configure floors to test bulk & FAR limits</p>
                        </div>
                        <button 
                          onClick={addFloor}
                          className="bg-white border border-slate-200 text-blue-600 p-2 rounded-xl transition-all shadow-sm hover:shadow-md hover:border-blue-200 active:scale-95"
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
                                  onClick={() => removeFloor(floor.id)}
                                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest px-1">Scenario Blueprints</p>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
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

                      <div className="pt-4 border-t border-slate-100/80 space-y-3 relative z-10">
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest px-1">Zoning Incentives</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => setApplyFresh(!applyFresh)}
                            className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${applyFresh ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-white border-slate-200 text-slate-400'}`}
                          >
                            <div className="flex flex-col items-start">
                              <span className="text-[10px] font-black tracking-tighter">FRESH</span>
                              <span className="text-[8px] opacity-60 font-bold uppercase">Food Store</span>
                            </div>
                            {applyFresh ? <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> : <div className="w-2 h-2 bg-slate-100 rounded-full border border-slate-200" />}
                          </button>
                          <button 
                            onClick={() => setApplyTransit(!applyTransit)}
                            className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${applyTransit ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-400'}`}
                          >
                            <div className="flex flex-col items-start">
                              <span className="text-[10px] font-black tracking-tighter">MIH</span>
                              <span className="text-[8px] opacity-60 font-bold uppercase">Incl. Housing</span>
                            </div>
                            {applyTransit ? <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" /> : <div className="w-2 h-2 bg-slate-100 rounded-full border border-slate-200" />}
                          </button>
                        </div>
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
                          </div>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Scenario / Max FAR</p>
                          <div className="flex flex-col items-end gap-0.5">
                            <div className="flex items-center justify-end gap-2">
                              <p className={`text-lg font-black tabular-nums ${parseFloat(calculatedFAR) > maxAllowedFAR ? 'text-red-600' : 'text-blue-600'}`}>
                                {calculatedFAR}
                              </p>
                              <span className="text-slate-300 font-bold">/</span>
                              <p className="text-sm font-bold text-slate-400 tabular-nums">
                                {maxAllowedFAR.toFixed(2)}
                              </p>
                            </div>
                            {totalCommArea > 0 && lotData?.metadata?.maxCommFAR && (
                              <p className="text-[8px] font-bold text-amber-500">
                                Comm limit: {(totalCommArea / lotData.metadata.lotArea).toFixed(2)} / {lotData.metadata.maxCommFAR}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
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
