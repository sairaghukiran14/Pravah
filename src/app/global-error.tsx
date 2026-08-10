'use client';

import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root Layout Runtime Error:', error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50/40 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Background blurs */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-red-100/20 rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-amber-100/10 rounded-full blur-3xl opacity-60 pointer-events-none" />

        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col items-center text-center z-10">
          <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Critical system error!</h2>
          <p className="text-sm text-gray-500 mb-6">
            A critical system error occurred. The application root failed to load.
          </p>

          {error.message && (
            <div className="w-full text-left bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-600 mb-6 overflow-auto max-h-32 border border-gray-100">
              {error.message}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-normal border border-gray-300 rounded-xl bg-white hover:bg-gray-50 text-gray-700 transition-colors shadow-2xs cursor-pointer"
            >
              Reload Page
            </button>
            <button
              onClick={() => reset()}
              className="px-4 py-2 text-xs font-normal rounded-xl bg-gray-900 hover:bg-gray-800 text-white transition-colors shadow-sm cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
