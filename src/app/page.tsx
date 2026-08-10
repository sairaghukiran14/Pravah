'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Mic,
  Languages,
  Zap,
  Sparkles,
  Headphones,
  Stethoscope,
  GraduationCap,
  Landmark,
  ShoppingCart,
  Radio,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ShieldCheck,
  Globe2,
  Cpu,
  Layers,
  Heart,
  Menu,
  X,
  IndianRupee,
  Terminal,
  Volume2,
  CreditCard,
  Clock,
  Sparkle,
  Check,
} from 'lucide-react';

/* ─── USE CASES DATA ─── */
const USE_CASES = [
  {
    id: 'support',
    category: 'Customer Support',
    icon: <Headphones className="h-5 w-5 text-blue-600" />,
    iconBg: 'bg-blue-50 border-blue-100',
    title: 'Multilingual Call Center Automation',
    desc: 'Automatically transcribe incoming customer support calls in regional dialects (Hindi, Telugu, Tamil), translate query logs to English for agent CRMs, and generate automated voice responses in the customer\'s native tongue.',
    flow: ['Voice Call (Hindi)', 'Saaras STT', 'Indic Translate', 'Bulbul TTS (Hindi Voice)'],
    impact: 'Reduces call center agent handling time by 65%',
  },
  {
    id: 'healthcare',
    category: 'Healthcare',
    icon: <Stethoscope className="h-5 w-5 text-emerald-600" />,
    iconBg: 'bg-emerald-50 border-emerald-100',
    title: 'Vernacular Telemedicine Consultations',
    desc: 'Empower doctors in urban centers to treat rural patients seamlessly. Patient voice symptoms in Marathi or Bengali are transcribed and translated instantly to English medical notes for the doctor.',
    flow: ['Patient Audio', 'Saaras STT', 'Medical Translation', 'Text Report'],
    impact: 'Enables healthcare access across 22+ Indic languages',
  },
  {
    id: 'education',
    category: 'EdTech & Learning',
    icon: <GraduationCap className="h-5 w-5 text-purple-600" />,
    iconBg: 'bg-purple-50 border-purple-100',
    title: 'Vernacular Lecture & Audiobook Generator',
    desc: 'Convert English or Hindi educational lectures into translated audiobooks in Kannada, Malayalam, or Gujarati. Automatically generate multi-language subtitles and natural voice narration for students.',
    flow: ['English Lecture', 'Text-to-Text Translate', 'Bulbul TTS', 'Regional Audio Book'],
    impact: 'Expands educational reach to 100M+ regional students',
  },
  {
    id: 'government',
    category: 'Government Services',
    icon: <Landmark className="h-5 w-5 text-amber-600" />,
    iconBg: 'bg-amber-50 border-amber-100',
    title: 'Voice-Based Citizen Grievance Portal',
    desc: 'Allow citizens to submit public grievances and RTI requests by simply speaking into their phones in any Indian language. The system transcribes, categorizes, and routes the ticket automatically.',
    flow: ['Citizen Voice Note', 'Language ID + STT', 'Categorization', 'Official Ticket'],
    impact: '10x higher citizen engagement for rural populations',
  },
  {
    id: 'ecommerce',
    category: 'E-Commerce',
    icon: <ShoppingCart className="h-5 w-5 text-rose-600" />,
    iconBg: 'bg-rose-50 border-rose-100',
    title: 'Regional Voice Search & Product Localization',
    desc: 'Capture the next 500M Indian online shoppers with voice search. Customers speak product queries in Hinglish or Teluglish, which are translated and matched against product catalogs in real time.',
    flow: ['Voice Search Query', 'Hinglish STT', 'Catalog Translate', 'Search Results'],
    impact: 'Boosts e-commerce conversion in Tier-2/Tier-3 cities by 40%',
  },
  {
    id: 'media',
    category: 'Media & Dubbing',
    icon: <Radio className="h-5 w-5 text-indigo-600" />,
    iconBg: 'bg-indigo-50 border-indigo-100',
    title: 'Automated Broadcast Dubbing & Localization',
    desc: 'Localize news broadcasts, podcasts, and digital video content across 10+ Indian languages simultaneously with high-fidelity neural voice synthesis matching natural cadence.',
    flow: ['Master Audio', 'Speech-to-Text', 'Multi-Lang Translate', 'Bulbul Voice Dubs'],
    impact: 'Cuts media localization costs from days to minutes',
  },
];

export default function LandingPage() {
  const [activeUseCase, setActiveUseCase] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [selectedTopup, setSelectedTopup] = useState(50);

  // Interactive Flow Demo Controls
  const runDemoFlow = () => {
    if (isDemoRunning) return;
    setIsDemoRunning(true);
    setDemoStep(1);
    setTimeout(() => {
      setDemoStep(2);
      setTimeout(() => {
        setDemoStep(3);
        setTimeout(() => {
          setDemoStep(4);
          setIsDemoRunning(false);
        }, 1200);
      }, 1200);
    }, 1200);
  };

  const resetDemoFlow = () => {
    setDemoStep(0);
    setIsDemoRunning(false);
  };

  return (
    <div className="min-h-screen bg-[#fafcff] text-slate-900 selection:bg-slate-900 selection:text-white font-sans overflow-x-hidden relative">

      {/* Subtle background gradient motif matching reference image */}
      <div
        className="absolute top-0 left-0 right-0 h-[650px] pointer-events-none -z-10 opacity-70"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 20% -10%, rgba(224, 236, 255, 0.75) 0%, rgba(255, 235, 245, 0.4) 50%, transparent 100%)',
        }}
      />

      {/* ━━━ HEADER / NAVIGATION ━━━ */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/70 border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">

            {/* Brand Logo & Indic AI Badge (Matching reference image) */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Link href="/" className="flex items-center gap-1.5 sm:gap-2 group shrink-0">
                <img src="/logo.png" alt="pravah logo" className="h-5 w-5 sm:h-5.5 sm:w-5.5 object-contain" />
                <span className="text-lg sm:text-xl font-normal tracking-tight text-slate-900 group-hover:text-slate-700 transition-colors leading-none">
                  pravah
                </span>
              </Link>
              <span className="inline-flex items-center px-2 sm:px-2.5 h-5 sm:h-5.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs whitespace-nowrap shrink-0">
                Indic AI
              </span>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
              <a href="#features" className="hover:text-slate-900 transition-colors">Capabilities</a>
              <a href="#demo" className="hover:text-slate-900 transition-colors">Live Demo</a>
              <a href="#use-cases" className="hover:text-slate-900 transition-colors">Use Cases</a>
              <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing & Credits</a>
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Link
                href="/login"
                className="hidden sm:inline-flex text-sm font-medium text-slate-700 hover:text-slate-900 px-3.5 py-2 transition-colors whitespace-nowrap"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-normal text-white hover:bg-slate-800 transition-all shadow-xs hover:shadow-md whitespace-nowrap shrink-0"
              >
                <span>Launch Studio</span>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Link>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 shrink-0"
                aria-label="Toggle Navigation"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-100 bg-white space-y-3 animate-fade-in">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg">Capabilities</a>
              <a href="#demo" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg">Live Demo</a>
              <a href="#use-cases" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg">Use Cases</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg">Pricing & Credits</a>
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <Link href="/login" className="px-3 py-2 text-sm font-medium text-slate-700">Sign in</Link>
                <Link href="/login" className="flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-normal text-white">
                  <span>Launch Studio</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ━━━ REDESIGNED HERO SECTION (Center Aligned Layout) ━━━ */}
      <section className="pt-14 pb-16 md:pt-22 md:pb-24 text-center">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-10">

          {/* Main Display Headline & Subtitle (Center Aligned) */}
          <div className="space-y-4 max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1 text-xs font-medium text-blue-700 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>India's Visual AI Pipeline Platform</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-normal tracking-tight text-slate-900 leading-[1.15]">
              Bridging the gap between languages and technology.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
              Empowering developers and businesses to build visual, regional-language speech and translation pipelines in minutes.
            </p>
          </div>

          {/* Action Buttons (Center Aligned) */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-1">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-7 py-3.5 text-sm font-normal text-white hover:bg-slate-800 shadow-md hover:shadow-lg transition-all hover:scale-[1.01]"
            >
              <span>Build Pipeline Free</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-normal text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Play className="h-3.5 w-3.5 text-slate-500 fill-current" />
              <span>See Live Execution Demo</span>
            </a>
          </div>

          {/* 4 Feature Items Grid (Center Container, Text-Left Inner Cards for readability) */}
          <div id="features" className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl mx-auto text-left">

            {/* 1. Empower Local Voices */}
            <div className="flex items-start gap-4 p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-blue-200 hover:shadow-xs transition-all">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Mic className="h-5.5 w-5.5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-normal text-slate-900">Empower Local Voices</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Build voice interfaces for users in their native Indic languages (Hindi, Telugu, Tamil, and more).
                </p>
              </div>
            </div>

            {/* 2. Instant Translation */}
            <div className="flex items-start gap-4 p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-pink-200 hover:shadow-xs transition-all">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
                <Languages className="h-5.5 w-5.5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-normal text-slate-900">Instant Translation</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Seamlessly translate regional spoken dialects to bridge barriers in support, education, and healthcare.
                </p>
              </div>
            </div>

            {/* 3. No-Code Pipelines */}
            <div className="flex items-start gap-4 p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-purple-200 hover:shadow-xs transition-all">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Zap className="h-5.5 w-5.5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-normal text-slate-900">No-Code Pipelines</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Design complex workflows with drag-and-drop ease. Wire up audio processors and test instantly.
                </p>
              </div>
            </div>

            {/* 4. Sarvam AI Powered */}
            <div className="flex items-start gap-4 p-4.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-emerald-200 hover:shadow-xs transition-all">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Sparkles className="h-5.5 w-5.5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-normal text-slate-900">Sarvam AI Powered</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Utilize cutting-edge, state-of-the-art speech models optimized explicitly for the Indian subcontinent.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ━━━ LIVE INTERACTIVE PIPELINE DEMO ━━━ */}
      <section id="demo" className="py-16 bg-slate-50/70 border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-normal uppercase tracking-wider text-blue-600">
              Interactive Execution Engine
            </span>
            <h2 className="text-2xl sm:text-4xl font-normal text-slate-900 tracking-tight">
              Watch Multi-Node AI Pipelines Execute Live
            </h2>
            <p className="text-sm text-slate-600">
              Pravah chains speech recognition, machine translation, and speech synthesis into a single stream.
            </p>
          </div>

          {/* Interactive Flow Canvas Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-md space-y-6">

            {/* Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="text-xs font-mono text-slate-400 ml-2">indic_telemedicine_workflow.flow</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={runDemoFlow}
                  disabled={isDemoRunning}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-normal text-white hover:bg-slate-800 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>{isDemoRunning ? 'Executing Stream...' : 'Run Pipeline Demo'}</span>
                </button>
                <button
                  onClick={resetDemoFlow}
                  disabled={isDemoRunning || demoStep === 0}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Reset Demo"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Visual Node Graph Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              <div className="hidden md:block absolute top-1/2 left-[30%] right-[30%] h-0.5 bg-gradient-to-r from-blue-300 via-purple-300 to-emerald-300 -translate-y-1/2 z-0" />

              {/* Node 1: Saaras Speech to Text */}
              <div className={`relative z-10 rounded-xl border p-4 transition-all space-y-3 bg-white ${demoStep === 1
                ? 'border-blue-400 ring-2 ring-blue-500/20 shadow-md'
                : demoStep > 1
                  ? 'border-emerald-300 bg-emerald-50/20'
                  : 'border-slate-200 shadow-2xs'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <Mic className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-normal text-slate-900">1. Speech-to-Text</span>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${demoStep === 1
                    ? 'bg-blue-100 text-blue-700 animate-pulse'
                    : demoStep > 1
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                    }`}>
                    {demoStep === 1 ? 'Transcribing...' : demoStep > 1 ? 'Completed' : 'Idle'}
                  </span>
                </div>
                <div className="text-xs space-y-1 text-slate-500 bg-slate-50 p-2.5 rounded-lg font-mono">
                  <p><span className="text-slate-400">Input:</span> Patient_Audio_Hindi.wav</p>
                  <p><span className="text-slate-400">Model:</span> saaras:v3</p>
                </div>
                <div className="p-2 rounded bg-blue-50/60 border border-blue-100 text-[11px] font-mono text-blue-900">
                  {demoStep >= 1 ? '"डॉक्टर साहब, दो दिन से तेज बुखार और सिरदर्द है।"' : 'Waiting for audio stream...'}
                </div>
              </div>

              {/* Node 2: Indic Translation */}
              <div className={`relative z-10 rounded-xl border p-4 transition-all space-y-3 bg-white ${demoStep === 2
                ? 'border-purple-400 ring-2 ring-purple-500/20 shadow-md'
                : demoStep > 2
                  ? 'border-emerald-300 bg-emerald-50/20'
                  : 'border-slate-200 shadow-2xs'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                      <Languages className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-normal text-slate-900">2. Indic Translate</span>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${demoStep === 2
                    ? 'bg-purple-100 text-purple-700 animate-pulse'
                    : demoStep > 2
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                    }`}>
                    {demoStep === 2 ? 'Translating...' : demoStep > 2 ? 'Completed' : 'Pending'}
                  </span>
                </div>
                <div className="text-xs space-y-1 text-slate-500 bg-slate-50 p-2.5 rounded-lg font-mono">
                  <p><span className="text-slate-400">Source:</span> hi-IN (Hindi)</p>
                  <p><span className="text-slate-400">Target:</span> en-IN (English)</p>
                </div>
                <div className="p-2 rounded bg-purple-50/60 border border-purple-100 text-[11px] font-mono text-purple-900">
                  {demoStep >= 2 ? '"Doctor, I have high fever and headache for two days."' : 'Waiting for text input...'}
                </div>
              </div>

              {/* Node 3: Bulbul Text-to-Speech */}
              <div className={`relative z-10 rounded-xl border p-4 transition-all space-y-3 bg-white ${demoStep === 3
                ? 'border-amber-400 ring-2 ring-amber-500/20 shadow-md'
                : demoStep > 3
                  ? 'border-emerald-300 bg-emerald-50/20'
                  : 'border-slate-200 shadow-2xs'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                      <Volume2 className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-normal text-slate-900">3. Bulbul TTS</span>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${demoStep === 3
                    ? 'bg-amber-100 text-amber-700 animate-pulse'
                    : demoStep > 3
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                    }`}>
                    {demoStep === 3 ? 'Synthesizing Voice...' : demoStep > 3 ? 'Completed' : 'Pending'}
                  </span>
                </div>
                <div className="text-xs space-y-1 text-slate-500 bg-slate-50 p-2.5 rounded-lg font-mono">
                  <p><span className="text-slate-400">Speaker:</span> Meera (Female)</p>
                  <p><span className="text-slate-400">Format:</span> WAV Audio Stream</p>
                </div>
                <div className="p-2 rounded bg-amber-50/60 border border-amber-100 text-[11px] font-mono text-amber-900 flex items-center justify-between">
                  <span>{demoStep >= 3 ? 'Output_Consultation_Audio.wav' : 'Synthesizing output...'}</span>
                  {demoStep >= 3 && <Volume2 className="h-3.5 w-3.5 text-amber-600 animate-pulse" />}
                </div>
              </div>
            </div>

            {/* Execution Log Feed */}
            <div className="pt-2">
              <div className="bg-slate-900 rounded-xl p-3.5 text-xs font-mono text-slate-300 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1 mb-2">
                  <span>SYSTEM EXECUTION LOG</span>
                  <span>SSE Live Stream</span>
                </div>
                <p className="text-slate-400">[00:01] 🚀 Pipeline execution initialized. Target: Telemedicine Flow</p>
                {demoStep >= 1 && <p className="text-blue-400">[00:02] 🎙️ Speech-To-Text (Saaras:v3): Transcribed 41 characters in 180ms</p>}
                {demoStep >= 2 && <p className="text-purple-400">[00:03] 🔠 Indic Translate (hi-IN → en-IN): Translated with 99.4% confidence score</p>}
                {demoStep >= 3 && <p className="text-amber-400">[00:04] 🔊 Text-To-Speech (Bulbul:v3): Generated 24kHz audio buffer</p>}
                {demoStep >= 4 && <p className="text-emerald-400">[00:05] 🎉 Execution finished successfully! Total latency: 420ms</p>}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ━━━ COMPREHENSIVE USE CASES SECTION (Explaining how this app is useful) ━━━ */}
      <section id="use-cases" className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">

          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-normal uppercase tracking-wider text-purple-600">
              Real-World Applications
            </span>
            <h2 className="text-3xl sm:text-4xl font-normal text-slate-900 tracking-tight">
              Solving Population-Scale Language Challenges
            </h2>
            <p className="text-sm text-slate-600">
              Discover how developers, startups, and enterprises leverage Pravah visual pipelines across key industries in Bharat.
            </p>
          </div>

          {/* Use Case Tabs & Detail Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* Left Column: Selector List */}
            <div className="lg:col-span-5 space-y-2">
              {USE_CASES.map((uc, index) => (
                <button
                  key={uc.id}
                  onClick={() => setActiveUseCase(index)}
                  className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${activeUseCase === index
                    ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${activeUseCase === index ? 'bg-slate-800' : uc.iconBg}`}>
                    {uc.icon}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-normal uppercase tracking-wider ${activeUseCase === index ? 'text-slate-400' : 'text-slate-400'}`}>
                        {uc.category}
                      </span>
                    </div>
                    <h3 className={`text-sm font-normal ${activeUseCase === index ? 'text-white' : 'text-slate-900'}`}>
                      {uc.title}
                    </h3>
                  </div>
                </button>
              ))}
            </div>

            {/* Right Column: Detailed View Box */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 sm:p-8 space-y-6 shadow-sm min-h-[420px] flex flex-col justify-between">

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-normal bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap shrink-0">
                      {USE_CASES[activeUseCase].category} Solution
                    </span>
                    <span className="text-xs font-mono text-slate-400 whitespace-nowrap shrink-0">Pipeline Blueprint</span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-normal text-slate-900 tracking-tight">
                    {USE_CASES[activeUseCase].title}
                  </h3>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    {USE_CASES[activeUseCase].desc}
                  </p>
                </div>

                {/* Pipeline Flow Visual Map */}
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <span className="text-xs font-normal uppercase tracking-wider text-slate-500 block">
                    Visual Node Execution Pipeline
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {USE_CASES[activeUseCase].flow.map((step, idx) => (
                      <React.Fragment key={idx}>
                        <span className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 shadow-2xs">
                          {step}
                        </span>
                        {idx < USE_CASES[activeUseCase].flow.length - 1 && (
                          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Impact Metric Banner */}
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <span className="text-xs font-normal text-emerald-900">Verified ROI Metric</span>
                  <span className="text-xs font-normal text-emerald-700">{USE_CASES[activeUseCase].impact}</span>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ━━━ SIMPLE 3-STEP PROCESS ━━━ */}
      <section className="py-20 bg-slate-50/70 border-t border-slate-200">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-normal uppercase tracking-wider text-slate-500">
              Simple 3-Step Process
            </span>
            <h2 className="text-3xl font-normal text-slate-900 tracking-tight">
              From Canvas Concept to Live Execution
            </h2>
            <p className="text-sm text-slate-600">
              No complex server setups or API integration boilerplate required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xs hover:shadow-md transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-sm font-normal">
                1
              </div>
              <h3 className="text-base font-normal text-slate-900">Drag & Drop Nodes</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pick Speech-to-Text, Indic Translate, or Text-to-Speech nodes. Position them on the visual canvas and connect ports.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xs hover:shadow-md transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 text-sm font-normal">
                2
              </div>
              <h3 className="text-base font-normal text-slate-900">Configure Parameters</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Select target Indic language codes (hi-IN, te-IN, ta-IN), preferred speaker voices (Meera, Arvind), and model versions.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xs hover:shadow-md transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 text-sm font-normal">
                3
              </div>
              <h3 className="text-base font-normal text-slate-900">Stream & Export</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hit Run. Track node execution statuses live with SSE streaming. Export synthesized audio or translated JSON payloads.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ REDESIGNED PAY-AS-YOU-GO PRICING & CREDITS SECTION ━━━ */}
      <section id="pricing" className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-14">

          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-normal uppercase tracking-wider text-emerald-600">
              Developer-First Transparent Billing
            </span>
            <h2 className="text-3xl sm:text-5xl font-normal text-slate-900 tracking-tight">
              Pay-As-You-Go with ₹20 Free Credits
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              No monthly lock-ins or recurring subscription fees. Sign up, get ₹20 free credits instantly, and top up starting at just ₹20.
            </p>
          </div>

          {/* Pricing Architecture & Top-Up Perspective Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

            {/* Left Card: Starter Pack with ₹20 Free Credits */}
            <div className="lg:col-span-5 rounded-3xl border border-slate-200 bg-slate-50/60 p-6 sm:p-8 space-y-6 flex flex-col justify-between shadow-xs">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-normal bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    Instant Bonus
                  </span>
                  <span className="text-xs font-normal text-slate-400 uppercase tracking-wider">Free Starter</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl sm:text-5xl font-normal text-slate-900">₹20</span>
                    <span className="text-sm font-normal text-slate-600">Free Bonus Credit</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Credited immediately to your wallet upon first signup. No credit card required.
                  </p>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-200/80">
                  <h4 className="text-xs font-normal text-slate-900 uppercase tracking-wider">What you get for free:</h4>
                  <ul className="space-y-2.5 text-xs text-slate-700">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>~200 minutes of Speech-to-Text or Translation</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Full access to all 22+ Indic AI language models</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Unlimited drag-and-drop pipeline canvas projects</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Real-time SSE execution logs & run history</span>
                    </li>
                  </ul>
                </div>
              </div>

              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-normal py-3.5 text-sm transition-all shadow-md mt-6"
              >
                <span>Claim Free ₹20 Credits</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Right Card: Flexible ₹50 Top-Up Wallet Packs */}
            <div className="lg:col-span-7 rounded-3xl border-2 border-blue-400 bg-white p-6 sm:p-8 space-y-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-normal uppercase tracking-widest px-4 py-1 rounded-bl-xl">
                Most Popular Model
              </div>

              <div className="space-y-5">
                <div className="space-y-1">
                  <span className="text-xs font-normal uppercase tracking-wider text-blue-600">Pay-As-You-Go Top-Ups</span>
                  <h3 className="text-2xl font-normal text-slate-900 tracking-tight">
                    Top Up Wallet Anytime Starting at ₹50
                  </h3>
                  <p className="text-xs text-slate-500">
                    Never worry about lost unspent monthly subscriptions. Buy credits when you need them.
                  </p>
                </div>

                {/* Interactive Top-up Selector Pack */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-normal text-slate-700 block">Select Top-Up Credit Pack:</span>
                  <div className="grid grid-cols-4 gap-2.5">
                    {[50, 100, 250, 500].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setSelectedTopup(amount)}
                        className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer ${selectedTopup === amount
                          ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/20 font-normal shadow-2xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium'
                          }`}
                      >
                        <span className="text-sm block font-normal">₹{amount}</span>
                        <span className="text-[10px] text-slate-500 block">Top Up</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Micro Execution Rates Breakdown */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <span className="text-xs font-normal text-slate-900 block border-b border-slate-200 pb-1.5">
                    Transparent Execution Unit Rates (Deducted from Wallet):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">Speech-to-Text</span>
                      <span className="font-normal text-slate-800">₹0.10 <span className="text-slate-400 font-normal">/ min</span></span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">Indic Translate</span>
                      <span className="font-normal text-slate-800">₹0.05 <span className="text-slate-400 font-normal">/ 1k chars</span></span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">Text-to-Speech</span>
                      <span className="font-normal text-slate-800">₹0.15 <span className="text-slate-400 font-normal">/ min</span></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Perspective Value Props Footer Bar */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span>Credits Never Expire</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  <span>Instant Razorpay Top-Up</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-purple-600" />
                  <span>Zero Unused Monthly Waste</span>
                </span>
              </div>

            </div>

          </div>

          {/* Perspective Comparison Grid */}
          <div className="p-6 sm:p-8 rounded-[2rem] bg-slate-50 border border-slate-200/60 text-slate-900 space-y-6 shadow-sm">
            <div className="text-center space-y-1">
              <h3 className="text-lg sm:text-xl font-normal tracking-tight text-slate-900">
                Why Pay-As-You-Go is Better for Developers & AI Teams
              </h3>
              <p className="text-xs text-slate-500">
                Compare rigid SaaS monthly tiers vs. Pravah's flexible credit model.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2 text-xs">
              <div className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-2xs hover:shadow-sm transition-all space-y-3">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 w-fit">
                  <IndianRupee className="h-4.5 w-4.5" />
                </div>
                <h4 className="font-normal text-slate-900 text-sm">No Unused Monthly Waste</h4>
                <p className="text-slate-500 leading-relaxed">
                  Traditional plans charge $49/mo regardless of whether you make 1 call or 10,000. With Pravah, you only pay when pipelines run.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-2xs hover:shadow-sm transition-all space-y-3">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 w-fit">
                  <Clock className="h-4.5 w-4.5" />
                </div>
                <h4 className="font-normal text-slate-900 text-sm">Credits Never Expire</h4>
                <p className="text-slate-500 leading-relaxed">
                  Your ₹20 bonus and top-up credits stay in your account forever. Build at your own pace without end-of-month expiration pressure.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-2xs hover:shadow-sm transition-all space-y-3">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600 w-fit">
                  <Zap className="h-4.5 w-4.5" />
                </div>
                <h4 className="font-normal text-slate-900 text-sm">Scale On-Demand</h4>
                <p className="text-slate-500 leading-relaxed">
                  Need to run 50,000 voice audio files tomorrow? Top up ₹500 instantly with Razorpay and scale without tier upgrade delays.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ━━━ HIGH-CONVERTING FINAL CTA BANNER ━━━ */}
      <section className="py-20 bg-white relative">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-[2.5rem] bg-slate-50 border border-slate-200/60 p-10 sm:p-16 text-center space-y-8 relative overflow-hidden shadow-sm">

            {/* Subtle Gradient Background for Premium Feel */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-60 pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-pink-100 rounded-full blur-3xl opacity-60 pointer-events-none" />

            <div className="space-y-4 relative z-10">
              <h2 className="text-3xl sm:text-5xl font-normal tracking-tight text-slate-900">
                Start Building Indic AI Flows Today
              </h2>
              <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto font-normal">
                Join developers and enterprises building population-scale speech and translation pipelines with Pravah.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-center gap-4 relative z-10">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-8 py-3.5 text-sm font-normal text-white hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:scale-[1.02]"
              >
                <span>Launch Pravah Studio</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ━━━ FOOTER (Matching exact footer branding & version tag from reference image) ━━━ */}


    </div>
  );
}
