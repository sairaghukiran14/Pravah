'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50/40 flex flex-col items-center justify-center gap-3 text-gray-500 font-sans relative overflow-hidden">
      {/* Background blurs */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-100/30 rounded-full blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-pink-100/20 rounded-full blur-3xl opacity-60 pointer-events-none" />

      <div className="flex flex-col items-center z-10">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900 mb-2" />
        <span className="text-sm font-semibold text-gray-800">Loading HasaFlow Studio...</span>
        <span className="text-xs text-gray-400 mt-1">Preparing your workspace</span>
      </div>
    </div>
  );
}
