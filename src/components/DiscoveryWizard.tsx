"use client";

import React, { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, MapPin, Layers, Bot, Building2, Sparkles } from "lucide-react";

interface DiscoveryWizardProps {
  onClose?: () => void;
}

const steps = [
  {
    id: "welcome",
    emoji: "🗺️",
    gradient: "from-blue-600 via-blue-500 to-indigo-600",
    accentBg: "bg-blue-50",
    accentText: "text-blue-700",
    accentBorder: "border-blue-200",
    icon: <MapPin className="w-7 h-7" />,
    tag: "Welcome",
    title: "NYC Zoning, Decoded.",
    subtitle: "ZR-Explore turns 4,000 pages of NYC Zoning Resolution into an interactive map, 3D simulator, and AI consultant — all in one place.",
    bullets: [
      "Click any lot → instant zoning data",
      "AI answers with real ZR citations",
      "3D building envelope in seconds",
    ],
  },
  {
    id: "explore",
    emoji: "📍",
    gradient: "from-violet-600 via-purple-500 to-fuchsia-600",
    accentBg: "bg-violet-50",
    accentText: "text-violet-700",
    accentBorder: "border-violet-200",
    icon: <Layers className="w-7 h-7" />,
    tag: "Explorer Tab",
    title: "Select a Lot. See Everything.",
    subtitle: "Click any tax lot on the map — or search by address — to instantly pull zoning district, FAR limits, overlays, and permit history.",
    bullets: [
      "Hover terms for glossary definitions",
      "Links to ZR chapters & DOB records",
      "Shift+click to assemble multiple lots",
    ],
  },
  {
    id: "builder",
    emoji: "🏗️",
    gradient: "from-rose-500 via-red-500 to-orange-500",
    accentBg: "bg-rose-50",
    accentText: "text-rose-700",
    accentBorder: "border-rose-200",
    icon: <Building2 className="w-7 h-7" />,
    tag: "Builder Tab",
    title: "Design a Building. Live.",
    subtitle: "Stack floors, choose uses (Residential / Commercial / CF), and watch the 3D model update in real time — with FAR compliance checked automatically.",
    bullets: [
      "Setback rules applied per ZR §23-662",
      "Shape guidance: Slab / L / U / O",
      "Pro-Forma Lite: cost, value & ROI",
    ],
  },
  {
    id: "chat",
    emoji: "🤖",
    gradient: "from-emerald-500 via-teal-500 to-cyan-600",
    accentBg: "bg-emerald-50",
    accentText: "text-emerald-700",
    accentBorder: "border-emerald-200",
    icon: <Bot className="w-7 h-7" />,
    tag: "AI Chat Tab",
    title: "Ask ZR-Scout Anything.",
    subtitle: "Our AI consultant is trained on the actual Zoning Resolution and responds in the context of your selected lot — with ZR section citations, not generic answers.",
    bullets: [
      "Switch persona: Developer / Architect / Citizen",
      "Ask about bonuses, MIH, FRESH, setbacks",
      "Follow-up chips to keep digging deeper",
    ],
  },
];

export const DiscoveryWizard: React.FC<DiscoveryWizardProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [animDir, setAnimDir] = useState<"left" | "right">("right");
  const [visible, setVisible] = useState(true);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleClose = () => {
    setVisible(false);
    onClose?.();
  };

  const goNext = () => {
    if (isLast) { handleClose(); return; }
    setAnimDir("right");
    setCurrentStep(s => s + 1);
  };

  const goPrev = () => {
    if (currentStep === 0) return;
    setAnimDir("left");
    setCurrentStep(s => s - 1);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient hero band */}
        <div className={`bg-gradient-to-br ${step.gradient} px-6 pt-7 pb-10 relative overflow-hidden`}>
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/10 rounded-full" />

          {/* Top row: step dots + close */}
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`rounded-full transition-all duration-300 ${
                    idx === currentStep
                      ? "w-6 h-2 bg-white"
                      : "w-2 h-2 bg-white/40 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleClose}
              className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Emoji + tag */}
          <div className="relative z-10 flex items-center gap-2 mb-3">
            <span className="text-3xl leading-none">{step.emoji}</span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 bg-white/15 px-2 py-0.5 rounded-full">
              {step.tag}
            </span>
          </div>

          {/* Title */}
          <h2 className="relative z-10 text-2xl font-black text-white leading-tight">
            {step.title}
          </h2>
        </div>

        {/* Card body lifts above gradient */}
        <div className="-mt-6 bg-white rounded-t-3xl px-6 pt-5 pb-2 relative z-10">
          {/* Subtitle */}
          <p className="text-sm text-slate-500 leading-relaxed mb-4">
            {step.subtitle}
          </p>

          {/* Bullet list */}
          <ul className="space-y-2.5 mb-5">
            {step.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <div className={`flex-none mt-0.5 w-4 h-4 rounded-full flex items-center justify-center ${step.accentBg} border ${step.accentBorder}`}>
                  <Sparkles className={`w-2.5 h-2.5 ${step.accentText}`} />
                </div>
                <span className="text-[12px] font-semibold text-slate-600 leading-tight">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 bg-white flex items-center justify-between">
          <button
            onClick={handleClose}
            className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={goPrev}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={goNext}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[12px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm bg-gradient-to-r ${step.gradient}`}
            >
              {isLast ? "Let's Go →" : "Next"}
              {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscoveryWizard;
