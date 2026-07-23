'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderGit2, LogOut, User, Wallet } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

export const Navbar: React.FC = () => {
  const { data: session, status } = useSession();
  const [credits, setCredits] = useState<number | null>(null);

  const userName = session?.user?.name || session?.user?.email || 'Active User';
  const userImage = session?.user?.image;
  const userInitial = (userName?.[0] || 'U').toUpperCase();

  useEffect(() => {
    const fetchCredits = () => {
      if (status === 'authenticated') {
        fetch('/api/user/profile')
          .then((res) => {
            if (res.ok) return res.json();
          })
          .then((data) => {
            if (data && typeof data.credits === 'number') {
              setCredits(data.credits);
            }
          })
          .catch((err) => console.warn('Failed to load navbar credits:', err));
      }
    };

    fetchCredits();

    window.addEventListener('credits-updated', fetchCredits);
    return () => {
      window.removeEventListener('credits-updated', fetchCredits);
    };
  }, [status]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center group">
            <span className="text-base font-bold text-gray-900 group-hover:text-gray-700 transition-colors leading-none tracking-tight">
              hasaflow
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-gray-500">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <FolderGit2 className="h-4 w-4" />
              <span>Projects</span>
            </Link>
          </nav>
        </div>

        {/* Profile Section (No Sign In button on dashboard header) */}
        <div className="flex items-center gap-3">
          {status === 'loading' ? (
            <div className="flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1.5 bg-gray-50 animate-pulse">
              <div className="h-6 w-6 rounded-full bg-gray-200" />
              <div className="h-3 w-20 bg-gray-200 rounded" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Credit Wallet Badge */}
              {credits !== null && (
                <Link
                  href="/profile"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-all font-medium text-[10px] text-gray-600 cursor-pointer"
                >
                  <Wallet className="h-3.5 w-3.5 text-gray-400" />
                  <span>₹{credits.toFixed(2)}</span>
                </Link>
              )}

              {/* Profile Card */}
              <div className="flex items-center gap-2.5 border border-gray-200 rounded-full px-3 py-1.5 bg-white shadow-2xs">
                <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  {userImage ? (
                    <img
                      src={userImage}
                      alt={userName}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-white text-xs font-bold">
                      {userInitial}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-gray-800 hidden sm:inline">
                    {userName}
                  </span>
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  title="Sign Out"
                  className="text-gray-400 hover:text-red-500 transition-colors p-0.5 ml-1 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
