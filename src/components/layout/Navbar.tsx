'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderGit2, LogOut, User, Wallet, HelpCircle, BookOpen, ArrowRight } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [credits, setCredits] = useState<number | null>(null);
  const [imageError, setImageError] = useState(false);

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
          <Link href="/" className="flex items-center gap-2 group">
            <img src="/logo.png" alt="pravah logo" className="h-5 w-5 object-contain rounded-[20%]" />
            <span className="text-base font-normal text-gray-900 group-hover:text-gray-700 transition-colors leading-none tracking-tight -mt-[5px]">
              pravah
            </span>
          </Link>
        </div>

        {/* Center Marketing Links (Only when unauthenticated) */}
        {status !== 'loading' && status !== 'authenticated' && (
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-500">
            <Link href="/#features" className="hover:text-slate-900 transition-colors">Capabilities</Link>
            <Link href="/#demo" className="hover:text-slate-900 transition-colors">Live Demo</Link>
            <Link href="/#use-cases" className="hover:text-slate-900 transition-colors">Use Cases</Link>
            <Link href="/#pricing" className="hover:text-slate-900 transition-colors">Pricing & Credits</Link>
            <Link href="/docs" className={`transition-colors ${pathname.startsWith('/docs') ? 'text-slate-900 font-bold' : 'hover:text-slate-900 text-slate-500'}`}>Docs</Link>
          </nav>
        )}

        {/* Profile Section (No Sign In button on dashboard header) */}
        <div className="flex items-center gap-3">
          {status === 'loading' ? (
            <div className="flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1.5 bg-gray-50 animate-pulse">
              <div className="h-6 w-6 rounded-full bg-gray-200" />
              <div className="h-3 w-20 bg-gray-200 rounded" />
            </div>
          ) : status === 'authenticated' ? (
            <div className="flex items-center gap-3">
              {/* Navigation segmented control on the right */}
              <nav className="flex items-center gap-1 bg-gray-50/80 border border-gray-200/60 p-0.5 rounded-xl text-xs font-semibold mr-1">
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg border transition-all duration-200 ease-in-out ${
                    pathname === '/dashboard' || pathname.startsWith('/dashboard/') || pathname.startsWith('/pipeline/') || pathname.startsWith('/project/')
                      ? 'bg-white text-gray-900 shadow-2xs border-gray-200/50'
                      : 'text-gray-500 hover:text-gray-950 border-transparent'
                  }`}
                >
                  <FolderGit2 className={`h-3.5 w-3.5 transition-colors duration-200 ${pathname === '/dashboard' || pathname.startsWith('/dashboard/') || pathname.startsWith('/pipeline/') || pathname.startsWith('/project/') ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span className="hidden sm:inline">Projects</span>
                </Link>
                <Link
                  href="/nodes"
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg border transition-all duration-200 ease-in-out ${
                    pathname === '/nodes'
                      ? 'bg-white text-gray-900 shadow-2xs border-gray-200/50'
                      : 'text-gray-500 hover:text-gray-950 border-transparent'
                  }`}
                >
                  <HelpCircle className={`h-3.5 w-3.5 transition-colors duration-200 ${pathname === '/nodes' ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span className="hidden sm:inline">Node Guide</span>
                </Link>
                <Link
                  href="/docs"
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg border transition-all duration-200 ease-in-out ${
                    pathname.startsWith('/docs')
                      ? 'bg-white text-gray-900 shadow-2xs border-gray-200/50'
                      : 'text-gray-500 hover:text-gray-950 border-transparent'
                  }`}
                >
                  <BookOpen className={`h-3.5 w-3.5 transition-colors duration-200 ${pathname.startsWith('/docs') ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span className="hidden sm:inline">Docs</span>
                </Link>
              </nav>

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
                  {userImage && !imageError ? (
                    <img
                      src={userImage}
                      alt={userName}
                      onError={() => setImageError(true)}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-white text-xs font-normal">
                      {userInitial}
                    </div>
                  )}
                  <span className="text-xs font-normal text-gray-800 hidden sm:inline">
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
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-955 transition-colors cursor-pointer">
                Sign in
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 transition-all shadow-2xs whitespace-nowrap"
              >
                <span>Launch Studio</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
