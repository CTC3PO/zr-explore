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
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<"explorer" | "builder" | "chat">("explorer");

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
  const calculatedFAR = lotData?.metadata?.lotArea ? (totalBuildArea / lotData.metadata.lotArea).toFixed(2) : "0.00";

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
        
        if (data.metadata?.lotArea) {
          const suggestedArea = Math.round(data.metadata.lotArea * 0.6);
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
              className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono shadow-sm"
              maxLength={10}
            />
          </div>
        </form>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-100 bg-slate-50/50 p-1">
        {[
          { id: 'explorer', label: 'Explorer', icon: MapIcon },
          { id: 'builder', label: 'Builder', icon: Plus },
          { id: 'chat', label: 'AI Chat', icon: BookOpen }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-[10px] font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-blue-600 shadow-sm border border-slate-100' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={12} />
            {tab.label}
          </button>
        ))}
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
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header info - Always visible when lot is selected */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tax Lot Portfolio</span>
                <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-bold">
                  B{lotData?.taxData?.borough} L{lotData?.taxData?.block} B{lotData?.taxData?.lot}
                </span>
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-800 leading-tight">
                  {lotData?.address || `Tax Lot ${selectedBBL}`}
                </h2>
                <div className="flex gap-2">
                  {lotData?.zoningDistricts?.map((d: string) => (
                    <span key={d} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                      District {d}
                    </span>
                  ))}
                  {lotData?.specialDistricts?.length > 0 && (
                    <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-100">
                      Special {lotData.specialDistricts[0]}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* QUICK DASHBOARD */}
            <div className="grid grid-cols-3 gap-2 py-4 border-y border-slate-100">
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Built FAR</p>
                <p className="text-sm font-bold text-slate-700">{lotData?.metadata?.builtFAR}</p>
              </div>
              <div className="space-y-1 text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Max Res FAR</p>
                <p className="text-sm font-bold text-slate-700">{lotData?.metadata?.maxResidFAR || "N/A"}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Utilization</p>
                <p className={`text-sm font-bold ${parseFloat(lotData?.metadata?.builtFAR) > parseFloat(lotData?.metadata?.maxResidFAR) ? 'text-red-600' : 'text-emerald-600'}`}>
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
                    <span className="text-[10px] text-emerald-600">~{Math.round((lotData?.metadata?.lotArea || 0) * 1.5).toLocaleString()} sf available</span>
                  </div>
                  <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[40%]" />
                  </div>
                  <p className="text-[8px] text-emerald-600 italic font-medium">Underutilized: 60% of legal FAR remaining</p>
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
                <div className="space-y-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <MapIcon size={80} className="text-blue-900" />
                  </div>
                  
                  <div className="flex justify-between items-center relative z-10">
                    <h3 className="text-[10px] font-bold text-blue-700 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      Building Simulation
                    </h3>
                    <button 
                      onClick={addFloor}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded-md transition-colors shadow-sm"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 relative z-10 custom-scrollbar">
                    {floorsList.map((floor, index) => (
                      <div key={floor.id} className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100 group">
                        <span className="text-[10px] font-bold text-slate-400 w-6">F{index + 1}</span>
                        <input 
                          type="number"
                          value={floor.area}
                          onChange={(e) => updateFloorArea(floor.id, parseInt(e.target.value) || 0)}
                          className="flex-1 bg-transparent text-slate-800 text-xs font-bold border-none focus:ring-0 p-0"
                        />
                        <span className="text-[9px] text-slate-400 font-medium">sf</span>
                        <button 
                          onClick={() => removeFloor(floor.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-2 relative z-10">
                    <p className="text-[8px] text-slate-400 uppercase font-bold mb-1">Scenario Templates</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const area = Math.round((lotData?.metadata?.lotArea || 2000) * 0.8);
                          setFloorsList([{ id: 1, area }, { id: 2, area }, { id: 3, area }]);
                          setApplyFresh(false);
                          setApplyTransit(false);
                        }}
                        className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-2 py-1.5 rounded text-[9px] font-bold transition-all"
                      >
                        Townhouse
                      </button>
                      <button 
                        onClick={() => {
                          const area = Math.round((lotData?.metadata?.lotArea || 2000) * 0.6);
                          const newFloors = Array.from({length: 6}, (_, i) => ({ id: Date.now() + i, area }));
                          setFloorsList(newFloors);
                          setApplyTransit(true);
                        }}
                        className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-2 py-1.5 rounded text-[9px] font-bold transition-all"
                      >
                        Mid-Rise
                      </button>
                      <button 
                        onClick={() => {
                          const area = Math.round((lotData?.metadata?.lotArea || 2000) * 0.5);
                          const newFloors = Array.from({length: 12}, (_, i) => ({ id: Date.now() + i, area }));
                          setFloorsList(newFloors);
                          setApplyFresh(true);
                          setApplyTransit(true);
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded text-[9px] font-bold transition-all shadow-md"
                      >
                        MIH High-Rise
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-2 relative z-10">
                    <p className="text-[8px] text-slate-400 uppercase font-bold mb-1">Apply Strategic Bonuses</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setApplyFresh(!applyFresh)}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-all ${applyFresh ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500'}`}
                      >
                        <span className="text-[9px] font-bold">FRESH</span>
                        {applyFresh ? <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> : <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />}
                      </button>
                      <button 
                        onClick={() => setApplyTransit(!applyTransit)}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-all ${applyTransit ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}
                      >
                        <span className="text-[9px] font-bold">Transit</span>
                        {applyTransit ? <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> : <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 relative z-10">
                    <div className="space-y-0.5">
                      <p className="text-[8px] text-slate-400 uppercase font-bold">Scenario Area</p>
                      <p className="text-sm font-bold text-slate-800">
                        {(totalBuildArea + (applyFresh ? 20000 : 0)).toLocaleString()} <span className="text-[9px] font-normal text-slate-500">sf</span>
                      </p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <p className="text-[8px] text-slate-400 uppercase font-bold">Scenario FAR</p>
                      <p className={`text-sm font-bold ${parseFloat(calculatedFAR) > (applyTransit ? 12 : 10) ? 'text-red-600' : 'text-blue-600'}`}>
                        {calculatedFAR}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CHAT */}
            {activeTab === 'chat' && (
              <div className="space-y-4 animate-in fade-in duration-300 pb-10">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {[
                    { label: "Citizen", q: "How does development on this lot impact the local community and services?" },
                    { label: "Developer", q: "What are the density bonuses for FRESH and MIH?" },
                    { label: "Architect", q: "What are the height and setback rules for this district?" }
                  ].map(lens => (
                    <button 
                      key={lens.label}
                      onClick={() => { setQuestion(lens.q); fetchAiSummary(lotData.zoningDistricts, lens.q); }}
                      className="flex-none bg-white border border-slate-200 px-3 py-1 rounded-full text-[10px] font-bold text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
                    >
                      {lens.label} Lens
                    </button>
                  ))}
                </div>
                
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 min-h-[200px] relative shadow-sm">
                  {chatLoading ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-3 py-10">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></div>
                      </div>
                      <span className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter">Consulting Zoning Resolution...</span>
                    </div>
                  ) : aiSummary ? (
                    <div className="prose prose-xs prose-slate max-w-none text-[12px] whitespace-pre-wrap leading-relaxed">
                      {aiSummary}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-10 opacity-60">
                      <BookOpen size={24} className="text-blue-300" />
                      <p className="text-[11px] text-slate-400 italic">Select a lens above or ask a question below.</p>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <input 
                    type="text" 
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask about zoning rules..."
                    className="w-full text-xs border border-slate-200 rounded-xl pl-3 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && question) fetchAiSummary(lotData.zoningDistricts, question);
                    }}
                  />
                  <button 
                    onClick={() => fetchAiSummary(lotData.zoningDistricts, question)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700 disabled:bg-slate-300"
                    disabled={chatLoading || !question}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
        <span className="text-[9px] font-bold text-slate-400 uppercase">NYC Navigator v2.0</span>
        <div className="flex gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
          <span className="text-[9px] text-slate-400">Live Data</span>
        </div>
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
                  <a href="https://zr.planning.nyc.gov/article-i/chapter-1" target="_blank" className="text-[10px] text-blue-600 font-bold hover:underline">View ZR §</a>
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
    </div>
  );
}
