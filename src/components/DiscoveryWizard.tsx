"use client";

import React, { useState } from "react";
import { X, Map, Search, MessageSquare, Box, ChevronRight, ChevronLeft } from "lucide-react";

export const DiscoveryWizard: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to ZR-Explore",
      description: "Your intelligent guide to NYC Zoning. We've simplified the 4,000-page Zoning Resolution into an interactive 3D map and an AI Consultant.",
      icon: <Map className="w-12 h-12 text-blue-500 mb-4" />,
    },
    {
      title: "Search by Location",
      description: "Start by clicking any lot on the map, or use the search bar to find a specific BBL (Borough, Block, Lot) or address.",
      icon: <Search className="w-12 h-12 text-purple-500 mb-4" />,
    },
    {
      title: "Simulate Buildings in 3D",
      description: "Use the 'Builder' tab to add floors and visualize maximum allowable envelopes. Toggle the 2D/3D map view to see neighborhood context.",
      icon: <Box className="w-12 h-12 text-pink-500 mb-4" />,
    },
    {
      title: "Ask the AI Consultant",
      description: "Need legal specifics? The 'Chat' tab features an AI trained on the exact zoning codes for your selected lot, complete with citations.",
      icon: <MessageSquare className="w-12 h-12 text-green-500 mb-4" />,
    }
  ];

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-gray-200 dark:border-gray-800">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex space-x-1">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? "w-6 bg-blue-600" : "w-2 bg-gray-200 dark:bg-gray-700"}`}
              />
            ))}
          </div>
          <button 
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center text-center">
          {steps[currentStep].icon}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {steps[currentStep].title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {steps[currentStep].description}
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center border-t border-gray-100 dark:border-gray-800">
          <button 
            onClick={() => setIsVisible(false)}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Skip Tour
          </button>
          
          <div className="flex space-x-2">
            <button 
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className={`p-2 rounded-lg flex items-center justify-center transition-colors ${currentStep === 0 ? "text-gray-300 dark:text-gray-600 cursor-not-allowed" : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <button 
              onClick={() => {
                if (currentStep === steps.length - 1) {
                  setIsVisible(false);
                } else {
                  setCurrentStep(Math.min(steps.length - 1, currentStep + 1));
                }
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition-colors font-medium text-sm shadow-sm"
            >
              {currentStep === steps.length - 1 ? "Get Started" : "Next"}
              {currentStep !== steps.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
};
