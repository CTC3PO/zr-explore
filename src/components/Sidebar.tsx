"use client";

import { useEffect, useState } from "react";
import { useZoning } from "@/context/ZoningContext";
import { Info, Map as MapIcon, BookOpen, ChevronRight, Loader2, Plus } from "lucide-react";

export default function Sidebar() {
  const { selectedBBL, setSelectedBBL, lotData, setLotData } = useZoning();
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [question, setQuestion] = useState("");
  const [applyFresh, setApplyFresh] = useState(false);
  const [applyTransit, setApplyTransit] = useState(false);
  // Building Explorer State
  const [floorsList, setFloorsList] = useState<{ id: number; area: number }[]>([
    { id: 1, area: 2000 },
    { id: 2, area: 2000 }
  ]);

  const addFloor = () => {
    const lastArea = floorsList.length > 0 ? floorsList[floorsList.length - 1].area : 1000;
    setFloorsList([...floorsList, { id: Date.now(), area: lastArea }]);
  };

  const removeFloor = (id: number) => {
    setFloorsList(floorsList.filter(f => f.id !== id));
  };

  const updateFloorArea = (id: number, area: number) => {
    setFloorsList(floorsList.map(f => f.id === id ? { ...f, area } : f));
  };

  const totalBuildArea = floorsList.reduce((sum, f) => sum + f.area, 0);
  const calculatedFAR = lotData?.metadata?.area ? (totalBuildArea / lotData.metadata.area).toFixed(2) : "0.00";

  useEffect(() => {
    if (!selectedBBL) {
      setLotData(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setAiSummary(null);
      try {
        const response = await fetch(`/api/lookup?bbl=${selectedBBL}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setLotData(data);
        
        fetchAiSummary(data.zoningDistricts);
        
        if (data.metadata?.area) {
          const suggestedArea = Math.round(data.metadata.area * 0.6);
          setFloorsList([
            { id: 1, area: suggestedArea },
            { id: 2, area: suggestedArea }
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

  const fetchAiSummary = async (districts: string[], q?: string) => {
    setChatLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: q, zoningDistricts: districts }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setAiSummary(data.response);
    } catch (error: any) {
      console.error("Chat error:", error);
      setAiSummary(`Consultant Error: ${error.message}. Please check your AI keys.`);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.length === 10) {
      setSelectedBBL(searchInput);
    } else {
      alert("Please enter a valid 10-digit BBL");
    }
  };

  return (
    <div className="w-96 h-full border-r border-slate-200 bg-white flex flex-col shadow-sm z-20">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-blue-800 flex items-center gap-2">
            <MapIcon size={20} />
            Zoning Navigator
          </h1>
          <p className="text-[10px] text-slate-500">NYC Planning Data & AI Consultant</p>
        </div>
        <div className="p-1 bg-blue-100 rounded text-blue-700">
          <Info size={16} />
        </div>
      </div>

      <div className="p-3 border-b border-slate-100 bg-white">
        <form onSubmit={handleSearch} className="space-y-2">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search BBL (10 digits)..."
              className="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              maxLength={10}
            />
            <button 
              type="submit"
              className="bg-slate-800 text-white px-3 py-1.5 rounded text-xs hover:bg-black transition-colors"
            >
              Go
            </button>
          </div>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
            <p className="text-sm text-slate-500 font-medium">Retrieving lot data...</p>
          </div>
        ) : !selectedBBL ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-slate-400 py-10">
            <div className="p-6 bg-slate-50 rounded-full border border-slate-100 shadow-inner">
              <BookOpen size={48} className="text-slate-300" />
            </div>
            <div className="space-y-1 px-8">
              <p className="text-sm font-semibold text-slate-600">Start Your Exploration</p>
              <p className="text-xs leading-relaxed">Select a lot on the map or enter a BBL to begin a professional zoning analysis.</p>
            </div>
            
            <div className="pt-6 w-full px-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Suggested Samples</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { b: '3021390016', l: 'Williamsburg Loft District', color: 'blue' },
                  { b: '1008350001', l: 'Midtown High-Rise', color: 'indigo' },
                  { b: '1000010001', l: 'Financial District Core', color: 'slate' }
                ].map(item => (
                  <button 
                    key={item.b}
                    onClick={() => { setSearchInput(item.b); setSelectedBBL(item.b); }}
                    className="text-left bg-white border border-slate-100 p-3 rounded-lg hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-[10px] font-mono font-bold text-blue-600">{item.b}</p>
                      <p className="text-xs font-semibold text-slate-700">{item.l}</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected Tax Lot</span>
                <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-bold">
                  {selectedBBL}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-800 leading-tight">
                {lotData?.address || `Tax Lot ${selectedBBL}`}
              </h2>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <BookOpen size={14} className="text-blue-600" />
                  <span>District Profile</span>
                </div>
                <div className="flex gap-1">
                  {lotData?.zoningDistricts?.map((d: string) => (
                    <span key={d} className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                      {d}
                    </span>
                  )) || "N/A"}
                </div>
              </div>
              
              {lotData?.metadata && (
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Existing Floors</p>
                    <p className="text-sm font-bold text-slate-700">{lotData.metadata.floors}</p>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Lot Area</p>
                    <p className="text-sm font-bold text-slate-700">{lotData.metadata.area.toLocaleString()} <span className="text-[10px] font-normal">sf</span></p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Insights / Discovery Dash */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl space-y-1">
                <p className="text-[9px] font-bold text-emerald-700 uppercase">Development Potenital</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-emerald-800">High</span>
                  <span className="text-[10px] text-emerald-600">~{Math.round((lotData?.metadata?.area || 0) * 1.5).toLocaleString()} sf</span>
                </div>
                <div className="w-full bg-emerald-200 h-1 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[40%]" />
                </div>
                <p className="text-[8px] text-emerald-600 italic">40% of legal FAR utilized</p>
              </div>

              <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl space-y-1">
                <p className="text-[9px] font-bold text-amber-700 uppercase">Special Triggers</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-amber-800">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    FRESH Zone
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-bold text-amber-800">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    Transit-Proximate
                  </div>
                </div>
                <p className="text-[8px] text-amber-600 mt-1">Qualifies for density bonuses</p>
              </div>
            </div>

            {/* Building Explorer Simulation */}
            <div className="space-y-4 bg-slate-900 p-4 rounded-xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <MapIcon size={80} className="text-white" />
              </div>
              
              <div className="flex justify-between items-center relative z-10">
                <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  Building Explorer
                </h3>
                <div className="flex gap-2">
                  <button 
                    onClick={addFloor}
                    className="bg-blue-600 hover:bg-blue-500 text-white p-1 rounded-md transition-colors shadow-lg"
                    title="Add Floor"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1 relative z-10 custom-scrollbar">
                {floorsList.map((floor, index) => (
                  <div key={floor.id} className="flex items-center gap-3 bg-slate-800/50 p-2 rounded-lg border border-slate-700 group">
                    <span className="text-[10px] font-bold text-slate-500 w-6">F{index + 1}</span>
                    <input 
                      type="number"
                      value={floor.area}
                      onChange={(e) => updateFloorArea(floor.id, parseInt(e.target.value) || 0)}
                      className="flex-1 bg-transparent text-white text-xs font-bold border-none focus:ring-0 p-0"
                    />
                    <span className="text-[9px] text-slate-500">sf</span>
                    <button 
                      onClick={() => removeFloor(floor.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <span className="text-lg">×</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Bonus Toggles */}
              <div className="pt-3 border-t border-slate-800 space-y-2 relative z-10">
                <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Apply Strategic Bonuses</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setApplyFresh(!applyFresh)}
                    className={`flex-1 flex items-center justify-between p-2 rounded-lg border transition-all ${applyFresh ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}
                  >
                    <span className="text-[9px] font-bold">FRESH Bonus</span>
                    {applyFresh ? <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> : <div className="w-1.5 h-1.5 bg-slate-600 rounded-full" />}
                  </button>
                  <button 
                    onClick={() => setApplyTransit(!applyTransit)}
                    className={`flex-1 flex items-center justify-between p-2 rounded-lg border transition-all ${applyTransit ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}
                  >
                    <span className="text-[9px] font-bold">Transit Zone</span>
                    {applyTransit ? <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> : <div className="w-1.5 h-1.5 bg-slate-600 rounded-full" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 relative z-10">
                <div className="space-y-0.5">
                  <p className="text-[8px] text-slate-500 uppercase font-bold">Total Scenario Area</p>
                  <p className="text-sm font-bold text-white">
                    {(totalBuildArea + (applyFresh ? 20000 : 0)).toLocaleString()} <span className="text-[9px] font-normal text-slate-400">sf</span>
                  </p>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="text-[8px] text-slate-500 uppercase font-bold">Scenario FAR</p>
                  <p className={`text-sm font-bold ${parseFloat(calculatedFAR) > (applyTransit ? 12 : 10) ? 'text-red-400' : 'text-blue-400'}`}>
                    {calculatedFAR}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pb-12">
              <div className="flex items-center gap-3">
                <div className="h-px bg-slate-200 flex-1"></div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consultant Lenses</h3>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>

              {/* Inquiry Lenses */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {[
                  { label: "Citizen", q: "I am a local resident. What is the impact of development on this lot for the community?" },
                  { label: "Developer", q: "What is the maximum feasible FAR and are there any density bonuses (FRESH/MIH)?" },
                  { label: "Architect", q: "What are the specific height, setback, and yard requirements for this district?" },
                  { label: "Lawyer", q: "Are there any discretionary actions or special permits required for a non-complying building?" }
                ].map(lens => (
                  <button 
                    key={lens.label}
                    onClick={() => { setQuestion(lens.q); }}
                    className="flex-none bg-white border border-slate-200 px-3 py-1.5 rounded-full text-[10px] font-bold text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm whitespace-nowrap"
                  >
                    As a {lens.label}
                  </button>
                ))}
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 min-h-[160px] relative shadow-sm transition-all hover:shadow-md">
                  {chatLoading ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-3 py-6">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                      </div>
                      <span className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter">Analyzing Zoning Resolution...</span>
                    </div>
                  ) : aiSummary ? (
                    <div className="prose prose-xs prose-slate max-w-none text-[12px] whitespace-pre-wrap leading-relaxed">
                      {aiSummary}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-6 opacity-60">
                      <BookOpen size={24} className="text-blue-300" />
                      <p className="text-[11px] text-slate-400 italic">Select a lens above or ask a custom question.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask the Consultant..."
                      className="w-full text-xs border border-slate-200 rounded-xl pl-3 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && question) fetchAiSummary(lotData.zoningDistricts, question);
                      }}
                    />
                    <button 
                      onClick={() => fetchAiSummary(lotData.zoningDistricts, question)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 shadow-lg"
                      disabled={chatLoading || !question}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  {/* Smart Resource Links */}
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Relevant Resources</p>
                    <div className="grid grid-cols-2 gap-2">
                      <a 
                        href={`https://www.nyc.gov/site/planning/zoning/access-zoning.page`} 
                        target="_blank" 
                        className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-all group"
                      >
                        <BookOpen size={12} className="text-slate-400 group-hover:text-blue-600" />
                        <span className="text-[10px] font-semibold text-slate-600">ZR Resolution</span>
                      </a>
                      <a 
                        href={`https://a810-dobnow.nyc.gov/publish/Index.html#!/`} 
                        target="_blank" 
                        className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-all group"
                      >
                        <Info size={12} className="text-slate-400 group-hover:text-blue-600" />
                        <span className="text-[10px] font-semibold text-slate-600">DOB Job Filings</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
        <span className="text-[9px] font-bold text-slate-400 uppercase">NYC Navigator v2.0</span>
        <div className="flex gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
          <span className="text-[9px] text-slate-400">Live Data</span>
        </div>
      </div>
    </div>
  );
}
