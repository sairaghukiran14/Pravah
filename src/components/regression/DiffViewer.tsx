'use client';

import React from 'react';
import { DiffToken } from '@/lib/evals/regression';

interface DiffViewerProps {
  diff: DiffToken[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff }) => {
  if (diff.length === 0) {
    return <span className="text-gray-400 italic">No output text payload to compare</span>;
  }

  return (
    <div className="flex flex-wrap gap-1 text-xs leading-relaxed font-sans select-text">
      {diff.map((token, idx) => {
        if (token.type === 'hit') {
          return (
            <span key={idx} className="text-slate-800 bg-slate-50 px-1 py-0.5 rounded border border-slate-100/60">
              {token.value}
            </span>
          );
        } else if (token.type === 'added') {
          return (
            <span 
              key={idx} 
              className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold text-[11px]"
              title="Added in Candidate (v2)"
            >
              +{token.value}
            </span>
          );
        } else {
          return (
            <span 
              key={idx} 
              className="bg-rose-100 text-rose-800 border border-rose-200 line-through px-1.5 py-0.5 rounded text-[11px] decoration-rose-400/80"
              title="Removed from Baseline (v1)"
            >
              {token.value}
            </span>
          );
        }
      })}
    </div>
  );
};
