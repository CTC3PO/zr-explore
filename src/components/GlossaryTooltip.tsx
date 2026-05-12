"use client";

import React, { ReactNode } from "react";
import { glossary } from "@/data/glossary";

interface GlossaryTooltipProps {
  termId: string;
  children: ReactNode;
}

export const GlossaryTooltip: React.FC<GlossaryTooltipProps> = ({ termId, children }) => {
  const termData = glossary[termId.toLowerCase()];

  if (!termData) {
    return <>{children}</>;
  }

  return (
    <span className="group relative inline-block cursor-help border-b border-dashed border-gray-400 hover:border-blue-500 transition-colors">
      <span className="text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
        {children}
      </span>
      
      {/* Tooltip Content */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 w-64 opacity-0 transition-opacity group-hover:opacity-100 bg-white dark:bg-gray-800 text-sm shadow-xl rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <div className="font-semibold text-gray-900 dark:text-white mb-1">
          {termData.term}
        </div>
        <div className="text-gray-600 dark:text-gray-300 mb-2 leading-tight">
          {termData.definition}
        </div>
        {termData.link && (
          <a
            href={termData.link}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium inline-flex items-center"
          >
            Read more in ZR <span className="ml-1">→</span>
          </a>
        )}
        
        {/* Triangle Arrow */}
        <div className="absolute left-1/2 top-full -mt-px h-2 w-2 -translate-x-1/2 border-b border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rotate-45" />
      </div>
    </span>
  );
};
