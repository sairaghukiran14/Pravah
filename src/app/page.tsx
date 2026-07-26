'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Mic,
  Languages,
  Volume2,
  Play,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Pause,
  RotateCcw,
} from 'lucide-react';

const PLAYGROUND_PRESETS = [
  {
    id: 'support',
    tabName: '💬 Support',
    input: "नमस्ते! मेरा पेमेंट कट गया है लेकिन सब्स्क्रिप्शन अभी तक चालू नहीं हुआ।",
    sourceLang: "hi-IN",
    sourceLabel: "Hindi",
    targetLang: "en-IN",
    targetLabel: "English",
    output: "Hello! My payment was deducted, but the subscription has not been activated yet."
  },
  {
    id: 'health',
    tabName: '🏥 Health',
    input: "Please drink plenty of warm water and take rest. If the fever continues, call us.",
    sourceLang: "en-IN",
    sourceLabel: "English",
    targetLang: "te-IN",
    targetLabel: "Telugu",
    output: "దయచేసి పుష్కలంగా గోరువెచ్చని నీరు త్రాగండి మరియు విశ్రాంతి తీసుకోండి. జ్వరం కొనసాగితే, మాకు కాల్ చేయండి."
  },
  {
    id: 'travel',
    tabName: '✈️ Travel',
    input: "ఇక్కడికి దగ్గరలో మంచి సంప్రదాయ భోజన హోటల్స్ ఏమైనా ఉన్నాయా?",
    sourceLang: "te-IN",
    sourceLabel: "Telugu",
    targetLang: "ta-IN",
    targetLabel: "Tamil",
    output: "அருகிலுள்ள ஏதேனும் நல்ல பாரம்பரிய உணவு விடுதிகள் உள்ளனவா?"
  },
  {
    id: 'ecommerce',
    tabName: '🛍️ E-Commerce',
    input: "আমি আমার অর্ডার বাতিল করতে চাই, রিফান্ড কখন পাব?",
    sourceLang: "bn-IN",
    sourceLabel: "Bengali",
    targetLang: "hi-IN",
    targetLabel: "Hindi",
    output: "मैं अपना ऑर्डर रद्द करना चाहता हूं, मुझे रिफান্ড कब मिलेगा?"
  }
];

const TARGET_LANGUAGES = [
  { label: 'English', code: 'en-IN' },
  { label: 'Hindi', code: 'hi-IN' },
  { label: 'Telugu', code: 'te-IN' },
  { label: 'Tamil', code: 'ta-IN' },
  { label: 'Bengali', code: 'bn-IN' },
];

export default function LandingPage() {
  // Live Playground State
  const [loopIndex, setLoopIndex] = useState(0);
  const [selectedPresetId, setSelectedPresetId] = useState('support');
  const [inputText, setInputText] = useState(PLAYGROUND_PRESETS[0].input);
  const [sourceLangCode, setSourceLangCode] = useState(PLAYGROUND_PRESETS[0].sourceLang);
  const [sourceLangLabel, setSourceLangLabel] = useState(PLAYGROUND_PRESETS[0].sourceLabel);
  const [targetLangCode, setTargetLangCode] = useState(PLAYGROUND_PRESETS[0].targetLang);
  const [targetLangLabel, setTargetLangLabel] = useState(PLAYGROUND_PRESETS[0].targetLabel);
  const [isManualMode, setIsManualMode] = useState(false);
  const [isPlayinggroundRunning, setIsPlaygroundRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [playgroundResult, setPlaygroundResult] = useState<string | null>(null);
  const [isDemoPaused, setIsDemoPaused] = useState(false);
  const [isTransitioningOut, setIsTransitioningOut] = useState(false);
  const [speechPlaying, setSpeechPlaying] = useState(false);

  // Auto-sync states from loop index when in autoplay loop mode
  useEffect(() => {
    if (!isManualMode) {
      const preset = PLAYGROUND_PRESETS[loopIndex];
      setSelectedPresetId(preset.id);
      setInputText(preset.input);
      setSourceLangCode(preset.sourceLang);
      setSourceLangLabel(preset.sourceLabel);
      setTargetLangCode(preset.targetLang);
      setTargetLangLabel(preset.targetLabel);
    }
  }, [loopIndex, isManualMode]);

  // Autoplay loop runner
  useEffect(() => {
    if (isManualMode || isDemoPaused) {
      setIsTransitioningOut(false);
      return;
    }

    let timer: NodeJS.Timeout;
    let fadeOutTimer: NodeJS.Timeout;

    const preset = PLAYGROUND_PRESETS[loopIndex];

    if (activeStep === 0) {
      timer = setTimeout(() => {
        setIsPlaygroundRunning(true);
        setPlaygroundResult(null);
        setActiveStep(1);
      }, 1500);
    } else if (activeStep === 1) {
      timer = setTimeout(() => {
        setActiveStep(2);
      }, 1500);
    } else if (activeStep === 2) {
      timer = setTimeout(() => {
        setActiveStep(3);
      }, 1500);
    } else if (activeStep === 3) {
      timer = setTimeout(() => {
        setPlaygroundResult(preset.output);
        setIsPlaygroundRunning(false);
        setActiveStep(4);
      }, 1000);
    } else if (activeStep === 4) {
      fadeOutTimer = setTimeout(() => {
        setIsTransitioningOut(true);
      }, 3500);

      timer = setTimeout(() => {
        setLoopIndex((prev) => (prev + 1) % PLAYGROUND_PRESETS.length);
        setPlaygroundResult(null);
        setIsTransitioningOut(false);
        setActiveStep(0);
      }, 4000);
    }

    return () => {
      clearTimeout(timer);
      clearTimeout(fadeOutTimer);
    };
  }, [activeStep, isManualMode, isDemoPaused, loopIndex]);

  // Manual sandbox execution logic
  const runManualPipeline = () => {
    if (isPlayinggroundRunning) return;
    
    // Stop any active Web Speech synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeechPlaying(false);
    }

    setIsPlaygroundRunning(true);
    setPlaygroundResult(null);
    setActiveStep(1);

    // Chain execution timeouts to simulate active pipeline nodes
    setTimeout(() => {
      setActiveStep(2);
      setTimeout(() => {
        setActiveStep(3);
        setTimeout(() => {
          // Check if custom text matches any preset input exactly
          const matchingPreset = PLAYGROUND_PRESETS.find(
            (p) => p.input.trim().toLowerCase() === inputText.trim().toLowerCase() && p.targetLang === targetLangCode
          );
          
          let outputText = '';
          if (matchingPreset) {
            outputText = matchingPreset.output;
          } else {
            // Provide context-aware mock translation
            if (targetLangCode === 'en-IN') {
              outputText = `Hello! [Simulated translation of: "${inputText.substring(0, 35)}..."]`;
            } else if (targetLangCode === 'hi-IN') {
              outputText = `नमस्ते! [कृत्रिम अनुवाद: "${inputText.substring(0, 35)}..."]`;
            } else if (targetLangCode === 'te-IN') {
              outputText = `హలో! [అనుకరణ అనువాదం: "${inputText.substring(0, 35)}..."]`;
            } else if (targetLangCode === 'ta-IN') {
              outputText = `வணக்கம்! [உருவகப்படுத்தப்பட்ட மொழிபெயர்ப்பு: "${inputText.substring(0, 35)}..."]`;
            } else if (targetLangCode === 'bn-IN') {
              outputText = `হ্যালো! [অনুকরণীয় অনুবাদ: "${inputText.substring(0, 35)}..."]`;
            } else {
              outputText = `Output: [Simulated Indic flow of: "${inputText.substring(0, 35)}..."]`;
            }
          }
          
          setPlaygroundResult(outputText);
          setIsPlaygroundRunning(false);
          setActiveStep(4);
        }, 1200);
      }, 1500);
    }, 1500);
  };

  // Browser-native speech synthesising client side
  const speakResult = () => {
    if (!playgroundResult) return;
    
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert("Browser Text-to-Speech is not supported on this browser.");
      return;
    }

    if (speechPlaying) {
      window.speechSynthesis.cancel();
      setSpeechPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(playgroundResult);
    utterance.lang = targetLangCode;
    
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang.startsWith(targetLangCode.substring(0, 2)));
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => setSpeechPlaying(true);
    utterance.onend = () => setSpeechPlaying(false);
    utterance.onerror = () => setSpeechPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-gray-900 selection:text-white font-sans">
      {/* FLOATING BLUR NAVBAR */}
      <header className="sticky top-4 z-50 mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between rounded-[34px] border border-gray-200/80 bg-white/80 px-6 py-3.5 shadow-sm backdrop-blur-xl">
          {/* Brand Logo (No logo icon beside text, no SARVAM AI STUDIO text) */}
          <Link href="/" className="flex items-center group">
            <span className="text-xl font-bold tracking-tight text-gray-900">
              hasaflow
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium uppercase tracking-wider text-gray-600">
            <a href="#platform" className="hover:text-gray-900 transition-colors">
              Platform
            </a>
            <a href="#playground" className="hover:text-gray-900 transition-colors">
              Playground
            </a>
            <a href="#sovereign" className="hover:text-gray-900 transition-colors">
              Sovereign AI
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50 transition-colors shadow-xs"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-5 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
            >
              <span>Launch Studio</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden">
        {/* Soft Radial Gradient Background Motif */}
        <div
          className="absolute top-1/2 left-1/2 -z-10 h-[450px] w-[700px] -translate-x-1/2 -translate-y-1/2 opacity-40 blur-[100px] pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse, #A5BBFC 0%, #D5E2FF 40%, transparent 70%)',
          }}
        />

        <div className="mx-auto max-w-4xl px-4 text-center space-y-6">
          {/* Sovereign Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-4 py-1.5 text-xs font-semibold text-blue-900">
            <span>India's Sovereign AI Pipeline Platform</span>
          </div>

          {/* Main Display Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-gray-900 leading-[1.08]">
            Visual AI Pipelines for all from India
          </h1>

          {/* Subtitle */}
          <p className="mx-auto max-w-2xl text-base sm:text-xl text-gray-600 leading-relaxed font-normal">
            Built on sovereign compute. Powered by frontier-class models.{' '}
            <br className="hidden sm:inline" />
            Delivering population-scale speech and translation workflows across 22 Indian languages.
          </p>

          {/* Hero Action Buttons */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-7 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-gray-800 transition-all hover:scale-[1.02]"
            >
              <span>Build Pipeline Free</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#playground"
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-7 py-3.5 text-sm font-semibold text-gray-800 shadow-xs hover:bg-gray-50 transition-all"
            >
              <Play className="h-4 w-4 text-gray-600 fill-current" />
              <span>Try Live Playground</span>
            </a>
          </div>

          {/* Indic Language & AI Capability Showcase Strip */}
          <div className="pt-16 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[2px] text-gray-400">
              POWERING VOICE & TRANSLATION ACROSS 22+ INDIC LANGUAGES
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-3xl mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-gray-50 border border-gray-200 text-gray-800 hover:border-gray-300 hover:bg-white transition-all shadow-xs">
                <span className="font-bold text-emerald-600">हिंदी</span> (Hindi)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-gray-50 border border-gray-200 text-gray-800 hover:border-gray-300 hover:bg-white transition-all shadow-xs">
                <span className="font-bold text-blue-600">తెలుగు</span> (Telugu)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-gray-50 border border-gray-200 text-gray-800 hover:border-gray-300 hover:bg-white transition-all shadow-xs">
                <span className="font-bold text-purple-600">தமிழ்</span> (Tamil)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-gray-50 border border-gray-200 text-gray-800 hover:border-gray-300 hover:bg-white transition-all shadow-xs">
                <span className="font-bold text-amber-600">বাংলা</span> (Bengali)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-gray-50 border border-gray-200 text-gray-800 hover:border-gray-300 hover:bg-white transition-all shadow-xs">
                <span className="font-bold text-rose-600">मराठी</span> (Marathi)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-gray-50 border border-gray-200 text-gray-800 hover:border-gray-300 hover:bg-white transition-all shadow-xs">
                <span className="font-bold text-indigo-600">ગુજરાતી</span> (Gujarati)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-gray-50 border border-gray-200 text-gray-800 hover:border-gray-300 hover:bg-white transition-all shadow-xs">
                <span className="font-bold text-cyan-600">ಕನ್ನಡ</span> (Kannada)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-gray-50 border border-gray-200 text-gray-800 hover:border-gray-300 hover:bg-white transition-all shadow-xs">
                <span className="font-bold text-orange-600">മലയാളം</span> (Malayalam)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-gray-50 border border-gray-200 text-gray-800 hover:border-gray-300 hover:bg-white transition-all shadow-xs">
                <span className="font-bold text-teal-600">ਪੰਜਾਬੀ</span> (Punjabi)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-gray-100 border border-gray-200 text-gray-700 font-semibold shadow-xs">
                +13 Sovereign Languages
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* VISUAL PIPELINE STUDIO SHOWCASE */}
      <section id="platform" className="py-16 bg-gray-50/60 border-y border-gray-200">
        <div className="mx-auto max-w-6xl px-4 space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Visual Node Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Drag, Drop & Execute Multi-Node AI Graphs
            </h2>
            <p className="text-sm text-gray-600">
              Chain Speech-to-Text, Translation, and Text-to-Speech with real-time execution monitoring.
            </p>
          </div>

          {/* Interactive Flow Diagram Graphic */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm overflow-hidden relative">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="text-xs font-mono text-gray-400 ml-2">hasaflow-canvas-preview.flow</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Real-time SSE Live
                </span>
              </div>
            </div>

            {/* Simulated Canvas Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              <div className="hidden md:block absolute top-1/2 left-[30%] right-[30%] h-0.5 bg-gradient-to-r from-emerald-300 via-blue-300 to-orange-300 -translate-y-1/2 z-0" />

              {/* Node 1: STT */}
              <div className="relative z-10 rounded-xl border border-gray-200 bg-white p-4 shadow-xs hover:shadow-md transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-50">
                      <Mic className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-xs font-bold text-gray-900">1. Speech-to-Text</span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">Completed</span>
                </div>
                <div className="text-xs space-y-1 text-gray-500 bg-gray-50 p-2.5 rounded-lg font-mono">
                  <p><span className="text-gray-400">Model:</span> saaras:v3</p>
                  <p><span className="text-gray-400">Audio:</span> Hindi_sample.wav</p>
                </div>
                <div className="p-2 rounded bg-emerald-50/60 border border-emerald-100 text-[11px] font-mono text-emerald-800">
                  "नमस्ते! प्रवाह में आपका स्वागत है।"
                </div>
              </div>

              {/* Node 2: Translate */}
              <div className="relative z-10 rounded-xl border border-blue-300 bg-white p-4 shadow-sm hover:shadow-md transition-all space-y-3 ring-2 ring-blue-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <Languages className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-xs font-bold text-gray-900">2. Indic Translate</span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Processing
                  </span>
                </div>
                <div className="text-xs space-y-1 text-gray-500 bg-gray-50 p-2.5 rounded-lg font-mono">
                  <p><span className="text-gray-400">Source:</span> hi-IN (Hindi)</p>
                  <p><span className="text-gray-400">Target:</span> en-IN (English)</p>
                </div>
                <div className="p-2 rounded bg-blue-50/60 border border-blue-100 text-[11px] font-mono text-blue-800">
                  "Hello! Welcome to HasaFlow."
                </div>
              </div>

              {/* Node 3: TTS */}
              <div className="relative z-10 rounded-xl border border-gray-200 bg-white p-4 shadow-xs hover:shadow-md transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-orange-50">
                      <Volume2 className="h-4 w-4 text-orange-600" />
                    </div>
                    <span className="text-xs font-bold text-gray-900">3. Text-to-Speech</span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">Pending</span>
                </div>
                <div className="text-xs space-y-1 text-gray-500 bg-gray-50 p-2.5 rounded-lg font-mono">
                  <p><span className="text-gray-400">Speaker:</span> Meera (Female)</p>
                  <p><span className="text-gray-400">Pace:</span> 1.0x natural</p>
                </div>
                <div className="p-2 rounded bg-orange-50/60 border border-orange-100 text-[11px] font-mono text-orange-800">
                  Synthesizing audio stream...
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI POWERED NODES SUITE */}
      <section id="nodes" className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-4 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Frontier Indic AI Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Pre-built Native Nodes for Every Indic Use Case
            </h2>
            <p className="text-sm text-gray-600">
              Leverage sovereign speech recognition, translation, and neural speech synthesis models.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Saaras STT */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4 hover:border-emerald-300 hover:shadow-md transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Mic className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Speech-to-Text (Saaras)</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                State-of-the-art speech recognition across 22 Indian languages. Handles noisy backgrounds, accents, and code-mixed Indian English.
              </p>
              <ul className="space-y-2 text-xs text-gray-700 pt-2 border-t border-gray-100">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Verbatim & Transcribe modes</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Automatic language identification</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Code-mixed Hinglish & Teluglish</li>
              </ul>
            </div>

            {/* Translate */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4 hover:border-blue-300 hover:shadow-md transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Languages className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Indic Translation Engine</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Context-aware translation fine-tuned for Indian idioms, formal documentation, and modern colloquial speech patterns.
              </p>
              <ul className="space-y-2 text-xs text-gray-700 pt-2 border-t border-gray-100">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-500" /> Formal & Colloquial styles</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-500" /> Cross-Indic translation matrix</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-500" /> Preserves names & technical terms</li>
              </ul>
            </div>

            {/* Bulbul TTS */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4 hover:border-orange-300 hover:shadow-md transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <Volume2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Text-to-Speech (Bulbul)</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Ultra-realistic neural voice synthesis with natural intonation, expressive cadence, and customizable speaker pace controls.
              </p>
              <ul className="space-y-2 text-xs text-gray-700 pt-2 border-t border-gray-100">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-500" /> Voices: Meera, Pavithra, Arvind, etc.</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-500" /> Dynamic pace control (0.5x - 2.0x)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-orange-500" /> High audio clarity (WAV / MP3)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE INTERACTIVE PLAYGROUND WIDGET */}
      <section id="playground" className="py-20 bg-gray-50 border-t border-gray-200">
        <div className="mx-auto max-w-4xl px-4 space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-600">
              Interactive Test Bench
            </span>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
              Test HasaFlow Pipeline Live Right Now
            </h2>
            <p className="text-sm text-gray-600">
              Try out preset use cases, customize source text and target languages, and run simulated pipelines with audio playback.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-md space-y-6">
            
            {/* Sandbox Mode / Auto-Loop Toggle Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-100 gap-3">
              <div className="flex items-center gap-2">
                <span className={`flex h-2 w-2 rounded-full ${isManualMode ? 'bg-purple-500 animate-pulse' : 'bg-emerald-500 animate-ping'}`} />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {isManualMode ? "🎮 Sandbox Mode (Autoplay Paused)" : "🔄 Autoplay Mode (Interactive)"}
                </span>
              </div>
              {isManualMode && (
                <button
                  onClick={() => {
                    setIsManualMode(false);
                    setLoopIndex(0);
                    setActiveStep(0);
                    setPlaygroundResult(null);
                    if (typeof window !== 'undefined' && window.speechSynthesis) {
                      window.speechSynthesis.cancel();
                      setSpeechPlaying(false);
                    }
                  }}
                  className="text-xs font-bold text-purple-600 hover:text-purple-700 cursor-pointer flex items-center gap-1 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-full transition-colors"
                >
                  <RotateCcw className="h-3 w-3" /> Restore Autoplay Loop
                </button>
              )}
            </div>

            {/* Presets Selection Tabs */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Select Workflow Use Case
              </label>
              <div className="flex flex-wrap gap-2">
                {PLAYGROUND_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setIsManualMode(true);
                      setSelectedPresetId(preset.id);
                      setInputText(preset.input);
                      setSourceLangCode(preset.sourceLang);
                      setSourceLangLabel(preset.sourceLabel);
                      setTargetLangCode(preset.targetLang);
                      setTargetLangLabel(preset.targetLabel);
                      setPlaygroundResult(null);
                      setActiveStep(0);
                      if (typeof window !== 'undefined' && window.speechSynthesis) {
                        window.speechSynthesis.cancel();
                        setSpeechPlaying(false);
                      }
                    }}
                    className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border cursor-pointer transition-all ${
                      isManualMode && selectedPresetId === preset.id
                        ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {preset.tabName}
                  </button>
                ))}
              </div>
            </div>

            {/* Top Row: Left Column (Inputs) & Right Column (Output) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Left Column: Inputs & Controls */}
              <div className="space-y-6 w-full">
                <div className={`space-y-2 transition-all duration-500 ease-in-out ${
                  isTransitioningOut
                    ? 'opacity-0 -translate-y-2'
                    : 'opacity-100 translate-y-0'
                }`}>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Source Input Text ({sourceLangLabel})
                  </label>
                  <textarea
                    rows={4}
                    value={inputText}
                    onChange={(e) => {
                      setIsManualMode(true);
                      setInputText(e.target.value);
                      if (activeStep !== 0) {
                        setActiveStep(0);
                        setPlaygroundResult(null);
                      }
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-white p-3.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 shadow-xs resize-none"
                    placeholder="Type or paste custom text here to translate..."
                  />
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-500 ease-in-out ${
                  isTransitioningOut
                    ? 'opacity-0 -translate-y-2'
                    : 'opacity-100 translate-y-0'
                }`}>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                      Target Language
                    </label>
                    <select
                      value={targetLangCode}
                      onChange={(e) => {
                        setIsManualMode(true);
                        const selectedCode = e.target.value;
                        const match = TARGET_LANGUAGES.find((t) => t.code === selectedCode);
                        if (match) {
                          setTargetLangCode(selectedCode);
                          setTargetLangLabel(match.label);
                          setPlaygroundResult(null);
                          setActiveStep(0);
                        }
                      }}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 shadow-xs cursor-pointer min-h-[38px]"
                    >
                      {TARGET_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.label} ({lang.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    {isManualMode ? (
                      <button
                        onClick={runManualPipeline}
                        disabled={isPlayinggroundRunning}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPlayinggroundRunning ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                            <span>Running Simulation...</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 fill-current text-white" />
                            <span>Run Pipeline</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsDemoPaused(!isDemoPaused)}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2.5 px-4 text-sm transition-all shadow-sm cursor-pointer"
                      >
                        {isDemoPaused ? (
                          <>
                            <Play className="h-4 w-4 fill-current text-white" />
                            <span>Resume Autoplay</span>
                          </>
                        ) : (
                          <>
                            <Pause className="h-4 w-4 text-white" />
                            <span>Pause Autoplay</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Live Output Box (Always Visible) */}
              <div className={`space-y-2 w-full transition-all duration-500 ease-in-out ${
                isTransitioningOut
                  ? 'opacity-0 translate-y-2'
                  : 'opacity-100 translate-y-0'
              }`}>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Live Output Result ({targetLangLabel})
                </label>
                
                {playgroundResult ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm space-y-3 min-h-[148px] flex flex-col justify-between animate-slide-up">
                    <div className="flex items-start gap-2.5">
                      <button
                        onClick={speakResult}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all ${
                          speechPlaying
                            ? 'bg-emerald-600 border-emerald-600 text-white animate-pulse'
                            : 'bg-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200'
                        } mt-0.5 cursor-pointer`}
                        title={speechPlaying ? "Stop Listening" : "Listen to Translated Audio"}
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                      <div className="flex-grow space-y-1.5">
                        <p className="font-medium text-emerald-950 leading-relaxed pt-0.5">
                          {playgroundResult}
                        </p>
                        {/* If the input was custom (not a preset), display the conversion notice */}
                        {isManualMode && !PLAYGROUND_PRESETS.some(
                          (p) => p.input.trim().toLowerCase() === inputText.trim().toLowerCase() && p.targetLang === targetLangCode
                        ) && (
                          <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-2 font-medium leading-relaxed">
                            💡 <strong>Simulated Translation.</strong> To test custom inputs on live population-scale Sarvam AI models, sign up for a free developer account!
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-emerald-100">
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                        TTS Generation Complete
                      </div>
                      <button 
                        onClick={speakResult}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                      >
                        {speechPlaying ? "Pause Voice 🔇" : "Listen to Voice 🔊"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-sm min-h-[148px] flex flex-col justify-between items-center text-center text-gray-400">
                    <div className="flex-grow flex flex-col items-center justify-center space-y-2">
                      {isPlayinggroundRunning ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                          <p className="text-xs font-semibold text-gray-600">
                            {activeStep === 1 && "Capturing Speech Audio (STT)..."}
                            {activeStep === 2 && "Translating to Target Language..."}
                            {activeStep === 3 && "Synthesizing Speech Output (TTS)..."}
                          </p>
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-5 w-5 text-gray-300 animate-pulse" />
                          <p className="text-xs">Click 'Run Pipeline' to execute flow</p>
                        </>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider pt-2 border-t border-gray-150 w-full">
                      Pipeline Status: {isPlayinggroundRunning ? "Running" : "Idle"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row: Visual Flow Node Graph Connections */}
            <div className={`pt-4 border-t border-gray-150 transition-all duration-500 ease-in-out ${
              isTransitioningOut
                ? 'opacity-0 translate-y-2'
                : 'opacity-100 translate-y-0'
            }`}>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block text-center select-none">
                  Live Visual Pipeline Execution Graph
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
                  {/* Node 1: Audio Source */}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    activeStep >= 1 ? 'bg-pink-50 border-pink-200 text-pink-700 shadow-xs' : 'bg-white border-gray-200 text-gray-400'
                  }`}>
                    <Mic className="h-3.5 w-3.5" /> Input Audio
                  </div>
                  
                  <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                  
                  {/* Node 2: Sarvam STT */}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    activeStep >= 1 ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs' : 'bg-white border-gray-200 text-gray-400'
                  }`}>
                    {activeStep === 1 && <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />}
                    Sarvam STT
                  </div>
                  
                  <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                  
                  {/* Node 3: Sarvam Translate */}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    activeStep >= 2 ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs' : 'bg-white border-gray-200 text-gray-400'
                  }`}>
                    {activeStep === 2 && <Loader2 className="h-3 w-3 animate-spin text-blue-600" />}
                    Translate Node
                  </div>
                  
                  <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                  
                  {/* Node 4: Sarvam TTS */}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    activeStep >= 3 ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-xs' : 'bg-white border-gray-200 text-gray-400'
                  }`}>
                    {activeStep === 3 && <Loader2 className="h-3 w-3 animate-spin text-orange-600" />}
                    Sarvam TTS
                  </div>
                  
                  <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                  
                  {/* Node 5: Audio Output */}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    activeStep >= 4 ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs' : 'bg-white border-gray-200 text-gray-400'
                  }`}>
                    <Volume2 className="h-3.5 w-3.5" /> Output Voice
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOVEREIGN INFRASTRUCTURE & METRICS */}
      <section id="sovereign" className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-4 space-y-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-3xl font-extrabold text-gray-900">22+</span>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Indian Languages</p>
            </div>
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-3xl font-extrabold text-gray-900">99.9%</span>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Enterprise Uptime</p>
            </div>
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-3xl font-extrabold text-gray-900">10x</span>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lower Latency</p>
            </div>
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-3xl font-extrabold text-gray-900">Neon DB</span>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Postgres Audit Sync</p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL HIGH CONVERTING CTA BANNER */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-5xl px-4">
          <div className="rounded-3xl bg-gray-900 text-white p-8 sm:p-14 text-center space-y-6 relative overflow-hidden shadow-2xl">
            <div className="space-y-3 relative z-10">
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
                Start Building Indic AI Flows Today
              </h2>
              <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto font-normal">
                Join developers and enterprises building population-scale speech and translation pipelines with HasaFlow.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-4 relative z-10">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-gray-900 hover:bg-gray-100 transition-all hover:scale-[1.02] shadow-lg"
              >
                <span>Launch HasaFlow Studio</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-white py-12 text-xs text-gray-500">
        <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <span className="font-bold text-gray-900 text-sm">hasaflow</span>
            <span className="hidden sm:inline text-gray-300">•</span>
            <span className="text-gray-400 font-semibold tracking-wider uppercase text-[10px]">
              POWERED BY sarvam ai
            </span>
          </div>

          <div className="flex items-center gap-6 font-medium text-gray-600">
            <Link href="/dashboard" className="hover:text-gray-900 transition-colors">
              Studio Dashboard
            </Link>
            <a href="#platform" className="hover:text-gray-900 transition-colors">
              Platform
            </a>
            <a href="#nodes" className="hover:text-gray-900 transition-colors">
              AI Nodes
            </a>
            <a href="#playground" className="hover:text-gray-900 transition-colors">
              Playground
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
