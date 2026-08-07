'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Code2,
  Briefcase,
  Cpu,
  Layers,
  Mic,
  Languages,
  Volume2,
  Bot,
  Sparkles,
  UserCheck,
  Target,
  Globe2,
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<number>(1);

  // User Questionnaire Selections State
  const [selectedRole, setSelectedRole] = useState<string>('developer');
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([
    'voice_assistant',
    'translation',
  ]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([
    'hi-IN',
    'te-IN',
  ]);
  const [expectedScale, setExpectedScale] = useState<string>('starter');

  const tabs = [
    { id: 1, label: '1. Profile & Role', icon: <UserCheck className="h-4 w-4" /> },
    { id: 2, label: '2. Use Cases & Goals', icon: <Target className="h-4 w-4" /> },
    { id: 3, label: '3. Languages & Scale', icon: <Globe2 className="h-4 w-4" /> },
  ];

  const toggleUseCase = (id: string) => {
    setSelectedUseCases((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleLanguage = (code: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(code)
        ? prev.filter((item) => item !== code)
        : [...prev, code]
    );
  };

  const { update } = useSession();
  const [isSaving, setIsSaving] = useState(false);

  const handleFinish = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Save onboarding preferences to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'hasaflow_user_onboarding',
          JSON.stringify({
            role: selectedRole,
            useCases: selectedUseCases,
            languages: selectedLanguages,
            scale: expectedScale,
            completedAt: new Date().toISOString(),
          })
        );
      }

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: selectedRole,
          useCases: selectedUseCases,
          languages: selectedLanguages,
          scale: expectedScale,
        }),
      });

      if (res.ok) {
        // Force NextAuth session refresh before navigating
        await update();
        // Navigate directly to Dashboard!
        router.push('/dashboard');
      } else {
        console.error('Failed to complete onboarding');
        setIsSaving(false);
      }
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans">
      {/* Header Bar */}
      <header className="border-b border-gray-200 bg-white py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="hover:opacity-85 transition-opacity">
            <span className="text-xl font-normal tracking-tight text-gray-900">
              hasaflow
            </span>
          </Link>
          <span className="text-xs text-gray-500 font-medium">
            First-Time User Setup Wizard
          </span>
        </div>
      </header>

      {/* Main Questionnaire Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Interactive Tab Movements Navigation Bar */}
          <div className="border-b border-gray-200 bg-gray-50 p-1.5 rounded-2xl flex items-center justify-between gap-1 shadow-2xs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-normal transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80 ring-1 ring-gray-900/5'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">Tab {tab.id}</span>
                </button>
              );
            })}
          </div>

          {/* Visual Step Progress Bar */}
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-gray-900 transition-all duration-300 rounded-full"
              style={{ width: `${(activeTab / 3) * 100}%` }}
            />
          </div>

          {/* TAB 1: ROLE & WORK PROFILE */}
          {activeTab === 1 && (
            <div className="space-y-6 animate-fadeIn pt-2">
              <div className="space-y-1.5">
                <span className="text-[11px] font-normal text-gray-400 uppercase tracking-wider">
                  QUESTION 1 OF 3
                </span>
                <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-gray-900">
                  What is your primary role?
                </h1>
                <p className="text-sm text-gray-500">
                  Help us personalize your HasaFlow node editor canvas and default templates.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    id: 'developer',
                    title: 'AI / Software Engineer',
                    desc: 'Building production voice AI, speech pipelines, or LLM integrations.',
                    icon: <Code2 className="h-5 w-5 text-gray-900" />,
                  },
                  {
                    id: 'product',
                    title: 'Product Manager / Founder',
                    desc: 'Designing Indic multi-lingual user experiences & features.',
                    icon: <Briefcase className="h-5 w-5 text-gray-900" />,
                  },
                  {
                    id: 'researcher',
                    title: 'Data Scientist / Researcher',
                    desc: 'Benchmarking speech recognition & translation accuracy.',
                    icon: <Cpu className="h-5 w-5 text-gray-900" />,
                  },
                  {
                    id: 'architect',
                    title: 'Enterprise Architect',
                    desc: 'Deploying high-throughput Indic speech infrastructure.',
                    icon: <Layers className="h-5 w-5 text-gray-900" />,
                  },
                ].map((item) => {
                  const isSelected = selectedRole === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedRole(item.id)}
                      className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-start gap-4 ${
                        isSelected
                          ? 'border-gray-900 bg-gray-50 shadow-xs ring-1 ring-gray-900'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="p-2.5 rounded-xl bg-white border border-gray-200 shadow-2xs shrink-0">
                        {item.icon}
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-normal text-gray-900 flex items-center justify-between">
                          <span>{item.title}</span>
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-gray-900" />
                          )}
                        </h3>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CORE USE CASE & GOALS */}
          {activeTab === 2 && (
            <div className="space-y-6 animate-fadeIn pt-2">
              <div className="space-y-1.5">
                <span className="text-[11px] font-normal text-gray-400 uppercase tracking-wider">
                  QUESTION 2 OF 3
                </span>
                <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-gray-900">
                  What are you planning to build with HasaFlow?
                </h1>
                <p className="text-sm text-gray-500">
                  Select all use cases that apply to your project scope.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: 'voice_assistant',
                    title: 'Multilingual Voice Assistants & Bots',
                    desc: 'Real-time speech-to-text to speech-to-text conversational flow.',
                    icon: <Bot className="h-5 w-5 text-emerald-600" />,
                    iconBg: 'bg-emerald-50',
                  },
                  {
                    id: 'translation',
                    title: 'Real-time Audio & Document Translation',
                    desc: 'Cross-Indic translation between Hindi, Telugu, Tamil, Marathi, etc.',
                    icon: <Languages className="h-5 w-5 text-blue-600" />,
                    iconBg: 'bg-blue-50',
                  },
                  {
                    id: 'tts_narration',
                    title: 'Voice Narration & Audio Synthesis',
                    desc: 'Generating natural neural audio in Indic languages using Bulbul models.',
                    icon: <Volume2 className="h-5 w-5 text-orange-600" />,
                    iconBg: 'bg-orange-50',
                  },
                  {
                    id: 'custom_flow',
                    title: 'Custom Multi-Node AI Workflows',
                    desc: 'Chaining custom nodes with Neon PostgreSQL audit history.',
                    icon: <Sparkles className="h-5 w-5 text-purple-600" />,
                    iconBg: 'bg-purple-50',
                  },
                ].map((item) => {
                  const isSelected = selectedUseCases.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleUseCase(item.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-gray-900 bg-gray-50 shadow-xs ring-1 ring-gray-900'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`p-2.5 rounded-xl ${item.iconBg}`}>
                          {item.icon}
                        </div>
                        <div>
                          <h3 className="text-sm font-normal text-gray-900">
                            {item.title}
                          </h3>
                          <p className="text-xs text-gray-500">{item.desc}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 accent-gray-900 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: INDIC LANGUAGES & SCALE */}
          {activeTab === 3 && (
            <div className="space-y-6 animate-fadeIn pt-2">
              <div className="space-y-1.5">
                <span className="text-[11px] font-normal text-gray-400 uppercase tracking-wider">
                  QUESTION 3 OF 3
                </span>
                <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-gray-900">
                  Target Indic Languages & Volume
                </h1>
                <p className="text-sm text-gray-500">
                  Pick your target languages and expected monthly pipeline volume.
                </p>
              </div>

              {/* Language Selector Pills */}
              <div className="space-y-3">
                <label className="block text-xs font-normal uppercase tracking-wider text-gray-700">
                  Select Target Languages
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { code: 'en-US', script: 'English', name: 'English' },
                    { code: 'hi-IN', script: 'हिंदी', name: 'Hindi' },
                    { code: 'te-IN', script: 'తెలుగు', name: 'Telugu' },
                    { code: 'ta-IN', script: 'தமிழ்', name: 'Tamil' },
                    { code: 'bn-IN', script: 'বাংলা', name: 'Bengali' },
                    { code: 'mr-IN', script: 'मराठी', name: 'Marathi' },
                    { code: 'gu-IN', script: 'ગુજરાતી', name: 'Gujarati' },
                    { code: 'kn-IN', script: 'ಕನ್ನಡ', name: 'Kannada' },
                    { code: 'ml-IN', script: 'മലയാളം', name: 'Malayalam' },
                    { code: 'pa-IN', script: 'ਪੰਜਾਬੀ', name: 'Punjabi' },
                  ].map((lang) => {
                    const isSelected = selectedLanguages.includes(lang.code);
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => toggleLanguage(lang.code)}
                        className={`px-4 py-2 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-gray-900 bg-gray-900 text-white shadow-xs'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <span className="font-normal mr-1">{lang.script}</span> ({lang.name})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scale Selector */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-normal uppercase tracking-wider text-gray-700">
                  Expected Monthly Pipeline Runs
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'starter', label: '< 10k runs/mo', badge: 'Developer' },
                    { id: 'growth', label: '10k - 100k runs/mo', badge: 'Growth' },
                    { id: 'enterprise', label: '100k+ runs/mo', badge: 'Enterprise' },
                  ].map((item) => {
                    const isSelected = expectedScale === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setExpectedScale(item.id)}
                        className={`p-3.5 rounded-xl border text-center cursor-pointer transition-all ${
                          isSelected
                            ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <span className="text-xs font-normal text-gray-900 block">{item.label}</span>
                        <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">{item.badge}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Movements Navigation Footer */}
        <div className="pt-8 border-t border-gray-200 flex items-center justify-between mt-10">
          {activeTab > 1 ? (
            <button
              onClick={() => setActiveTab((prev) => prev - 1)}
              className="inline-flex items-center gap-1.5 text-xs font-normal text-gray-600 hover:text-gray-900 transition-colors py-2 px-3 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Previous Tab
            </button>
          ) : (
            <div />
          )}

          {activeTab < 3 ? (
            <button
              onClick={() => setActiveTab((prev) => prev + 1)}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-normal text-xs py-2.5 px-6 transition-all shadow-xs cursor-pointer"
            >
              <span>Next Tab</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-normal text-xs py-2.5 px-6 transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-70"
            >
              <span>{isSaving ? 'Completing Setup...' : 'Complete Setup & Go to Dashboard'}</span>
              {!isSaving && <ArrowRight className="h-4 w-4" />}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
