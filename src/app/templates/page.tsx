'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Sparkles,
  Zap,
  ArrowRight,
  Search,
  CheckCircle2,
  Terminal,
  Code2,
  Clock,
  IndianRupee,
  Layers,
  ExternalLink,
  MessageSquare,
  Stethoscope,
  Radio,
  Mic,
  FileText,
  PlayCircle,
  Smile,
  ShieldCheck,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { PIPELINE_TEMPLATES, PipelineTemplate } from '@/lib/templates';
import { Navbar } from '@/components/layout/Navbar';

export default function TemplatesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [activePreview, setActivePreview] = useState<PipelineTemplate | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All Templates' },
    { id: 'support', label: 'Customer Support' },
    { id: 'healthcare', label: 'Healthcare & Med' },
    { id: 'media', label: 'Media & Dubbing' },
    { id: 'audio', label: 'Speech & Audio' },
    { id: 'document', label: 'Document AI' },
    { id: 'podcast', label: 'Audio Studio' },
  ];

  const filteredTemplates = PIPELINE_TEMPLATES.filter((t) => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleCloneAndRun = async (template: PipelineTemplate) => {
    if (status === 'unauthenticated') {
      // Preserve template clone intent across authentication
      router.push(`/login?callbackUrl=/templates?clone=${template.id}`);
      return;
    }

    setCloningId(template.id);
    setCloneError(null);

    try {
      const res = await fetch(`/api/templates/${template.id}/clone`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to clone template');
      }

      // Redirect directly to the newly cloned canvas
      router.push(`/pipeline/${data.pipelineId}`);
    } catch (err: any) {
      console.error('Clone error:', err);
      setCloneError(err.message || 'Failed to clone template');
      setCloningId(null);
    }
  };

  const getTemplateIcon = (iconName: string) => {
    switch (iconName) {
      case 'MessageSquare':
        return <MessageSquare className="h-5 w-5 text-indigo-600" />;
      case 'Stethoscope':
        return <Stethoscope className="h-5 w-5 text-emerald-600" />;
      case 'Radio':
        return <Radio className="h-5 w-5 text-rose-600" />;
      case 'Mic':
        return <Mic className="h-5 w-5 text-blue-600" />;
      case 'FileText':
        return <FileText className="h-5 w-5 text-amber-600" />;
      case 'PlayCircle':
        return <PlayCircle className="h-5 w-5 text-purple-600" />;
      case 'Smile':
        return <Smile className="h-5 w-5 text-pink-600" />;
      default:
        return <Sparkles className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200/80 pt-12 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/50 via-slate-50/20 to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold mb-6 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
            <span>Curated Production Pipelines</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Indic AI Pipeline <span className="text-blue-600 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Template Gallery</span>
          </h1>

          <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg text-slate-600">
            Production-ready workflows powered by Sarvam AI. Clone any pipeline into your workspace with 1-click, test in the canvas, and deploy as a live REST API.
          </p>

          {/* Quick CTA banner */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Instant 1-Click Clone</span>
            </div>
            <span className="hidden sm:inline text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <Terminal className="h-4 w-4 text-blue-500" />
              <span>Deploy as REST & Webhooks</span>
            </div>
            <span className="hidden sm:inline text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-purple-500" />
              <span>22+ Scheduled Indian Languages</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex-1">
        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-8">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search templates, languages, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
            />
          </div>
        </div>

        {cloneError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center justify-between">
            <span>{cloneError}</span>
            <button onClick={() => setCloneError(null)} className="text-rose-500 hover:text-rose-700 font-bold">×</button>
          </div>
        )}

        {/* Template Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="group bg-white rounded-2xl border border-slate-200/80 hover:border-blue-400/80 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden"
            >
              <div className="p-6">
                {/* Header Badge & Category */}
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                    {getTemplateIcon(template.icon)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {template.badge && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        template.badge === 'Signature'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xs'
                          : template.badge === 'Popular'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200/60'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {template.badge}
                      </span>
                    )}
                    <span className="text-[11px] font-medium text-slate-400">
                      {template.categoryLabel}
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                  {template.name}
                </h3>
                <p className="mt-2 text-xs text-slate-500 line-clamp-3 leading-relaxed">
                  {template.description}
                </p>

                {/* Node Pipeline Flow Strip */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Layers className="h-3 w-3 text-slate-400" />
                    <span>{template.nodes.length} Nodes in Flow</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {template.nodes.map((n, idx) => (
                      <React.Fragment key={n.id}>
                        <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/60 text-[10px] font-mono text-slate-600">
                          {n.label}
                        </span>
                        {idx < template.nodes.length - 1 && (
                          <ChevronRight className="h-3 w-3 text-slate-300" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Languages Supported */}
                {template.languagesSupported?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {template.languagesSupported.slice(0, 3).map((lang, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
                        {lang}
                      </span>
                    ))}
                    {template.languagesSupported.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                        +{template.languagesSupported.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer with Metrics & Action */}
              <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">{template.estimatedCost}</span>
                  <span>•</span>
                  <span>~{template.estimatedLatency}</span>
                </div>

                <button
                  onClick={() => handleCloneAndRun(template)}
                  disabled={cloningId === template.id}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                >
                  {cloningId === template.id ? (
                    <>
                      <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Cloning...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5 fill-current" />
                      <span>Clone & Run</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <Search className="h-8 w-8 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-800">No templates found</h4>
            <p className="text-xs text-slate-500 mt-1">Try refining your search keyword or selected category.</p>
          </div>
        )}
      </main>
    </div>
  );
}
