'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export const Footer: React.FC = () => {
  const pathname = usePathname();

  // Hide footer on full-screen visual editor to prevent canvas clipping
  const isVisualEditor = pathname?.startsWith('/pipeline/') && !pathname.endsWith('/history');
  if (isVisualEditor) return null;

  return (
    <footer className="fixed bottom-0 left-0 w-full border-t border-gray-200/50 bg-white/70 backdrop-blur-xs py-2.5 text-center text-xs text-gray-400 select-none z-30">
      <div className="mx-auto max-w-7xl px-4 flex items-center justify-center gap-1 font-normal">
        <span>powered by</span>
        <span className="font-medium text-gray-700 tracking-tight lowercase">sarvam ai</span>
      </div>
    </footer>
  );
};
