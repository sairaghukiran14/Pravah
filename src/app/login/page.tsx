'use client';

import React, { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { ArrowRight, Mic, Languages, Volume2, Sparkles, HeartHandshake, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [isExistingUser, setIsExistingUser] = useState(false);
  const { data: session, status } = useSession();

  /* Auth hook */
  useEffect(() => {
    if (status === 'authenticated') {
      // @ts-expect-error - custom field
      if (session?.user?.onboardingCompleted) {
        router.push('/dashboard');
      } else {
        router.push('/onboarding');
      }
    } else if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hasaflow_user_onboarding');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.completedAt || parsed.completed) {
            setIsExistingUser(true);
          }
        } catch (e) {}
      }
    }
  }, [status, session, router]);

  const handleSignIn = () => {
    signIn('google', { callbackUrl: isExistingUser ? '/dashboard' : '/onboarding' });
  };

  const handleDirectContinue = () => {
    router.push(isExistingUser ? '/dashboard' : '/onboarding');
  };

  return (
    <div className="flex min-h-screen font-sans overflow-hidden bg-white">

      {/* ═══════ LEFT: Value Proposition (Light Theme, No Bold, Aligned) ═══════ */}
      <div className="hidden lg:flex lg:flex-col lg:w-[50%] p-16 bg-gray-50 border-r border-gray-100 justify-between relative overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-[0.4]" style={{
          backgroundImage: 'radial-gradient(#e5e7eb 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
        }} />
        
        {/* Soft colorful gradients for premium feel */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-pink-100 rounded-full blur-3xl opacity-60" />

        <div className="relative z-10">
          {/* Brand header */}
          <div className="flex items-center gap-2">
            <Link href="/" className="hover:opacity-85 transition-opacity">
              <span className="text-xl font-normal tracking-tight text-gray-900">hasaflow</span>
            </Link>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-normal">Indic AI</span>
          </div>
        </div>

        {/* Center aligned content */}
        <div className="relative z-10 max-w-lg my-auto space-y-12">
          <div className="space-y-4">
            <h2 className="text-4xl font-normal tracking-tight text-gray-950 leading-tight">
              Bridging the gap between languages and technology.
            </h2>
            <p className="text-base text-gray-600 font-normal leading-relaxed">
              Empowering developers and businesses to build visual, regional-language speech and translation pipelines in minutes.
            </p>
          </div>

          {/* Benefits Grid (Perfectly aligned list) */}
          <div className="space-y-6">
            
            {/* Benefit 1 */}
            <div className="flex gap-4 items-start">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                <Mic className="h-5 w-5" />
              </div>
              <div className="space-y-1 pt-0.5">
                <h4 className="text-gray-900 text-sm font-normal">Empower Local Voices</h4>
                <p className="text-xs text-gray-500 leading-relaxed font-normal">
                  Build voice interfaces for users in their native Indic languages (Hindi, Telugu, Tamil, and more).
                </p>
              </div>
            </div>

            {/* Benefit 2 */}
            <div className="flex gap-4 items-start">
              <div className="p-2.5 rounded-lg bg-pink-50 text-pink-600 shrink-0">
                <Languages className="h-5 w-5" />
              </div>
              <div className="space-y-1 pt-0.5">
                <h4 className="text-gray-900 text-sm font-normal">Instant Translation</h4>
                <p className="text-xs text-gray-500 leading-relaxed font-normal">
                  Seamlessly translate regional spoken dialects to bridge barriers in support, education, and healthcare.
                </p>
              </div>
            </div>

            {/* Benefit 3 */}
            <div className="flex gap-4 items-start">
              <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600 shrink-0">
                <Zap className="h-5 w-5" />
              </div>
              <div className="space-y-1 pt-0.5">
                <h4 className="text-gray-900 text-sm font-normal">No-Code Pipelines</h4>
                <p className="text-xs text-gray-500 leading-relaxed font-normal">
                  Design complex workflows with drag-and-drop ease. Wire up audio processors and test instantly.
                </p>
              </div>
            </div>

            {/* Benefit 4 */}
            <div className="flex gap-4 items-start">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1 pt-0.5">
                <h4 className="text-gray-900 text-sm font-normal">Sarvam AI Powered</h4>
                <p className="text-xs text-gray-500 leading-relaxed font-normal">
                  Utilize cutting-edge, state-of-the-art speech models optimized explicitly for the Indian subcontinent.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Trust Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-gray-400 border-t border-gray-200/60 pt-6">
          <span className="flex items-center gap-1.5 font-normal text-gray-500">
            <HeartHandshake className="h-4 w-4 text-pink-500" />
            Helping India connect visually
          </span>
          <span className="font-normal">Version 1.0</span>
        </div>
      </div>

      {/* ═══════ RIGHT: Login Form (No Bold, Aligned) ═══════ */}
      <div className="flex-1 flex items-center justify-center bg-white p-6 sm:p-16">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="lg:hidden mb-6">
              <Link href="/" className="hover:opacity-85 transition-opacity inline-block">
                <h1 className="text-3xl font-normal tracking-tight text-gray-900">hasaflow</h1>
              </Link>
              <p className="text-xs text-gray-500 mt-1 font-normal">Visual AI Pipeline Builder for Indic Speech & Language</p>
            </div>
            <div className="hidden lg:block">
              <h1 className="text-2xl font-normal tracking-tight text-gray-900">Welcome back</h1>
              <p className="text-sm text-gray-500 mt-1.5 font-normal">Sign in to build your AI pipelines</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleSignIn}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-normal py-3 px-4 rounded-xl border border-gray-300 shadow-sm hover:shadow-md transition-all duration-200 text-sm cursor-pointer"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Sign in with Google
            </button>

            <div className="relative py-3">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400 font-normal">or</span></div>
            </div>

            <button
              onClick={handleDirectContinue}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-normal py-3 px-4 rounded-xl transition-all duration-200 text-sm group cursor-pointer shadow-sm hover:shadow-md"
            >
              <span className="font-normal">{isExistingUser ? 'Go to Dashboard' : 'Continue to Setup Wizard'}</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-center gap-6 text-gray-400 text-[11px]">
              <div className="flex items-center gap-1.5 font-normal">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Sarvam AI Powered</span>
              </div>
              <div className="flex items-center gap-1.5 font-normal">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>10+ Indic Languages</span>
              </div>
            </div>
          </div>

          <p className="text-center text-[11px] text-gray-400 mt-8 font-normal">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>

    </div>
  );
}
