'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Navbar } from '@/components/layout/Navbar';
import { 
  BookOpen, Search, Menu, X, ArrowRight,
  Workflow, History, Sparkles, Plus, MousePointer, 
  Settings, Activity, CreditCard, Info, 
  AlertCircle, Copy, Check,
  User, HelpCircle, CheckSquare, FolderGit2
} from 'lucide-react';

interface DocSection {
  id: string;
  category: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export default function PublicDocsPage() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('welcome');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync scroll positioning with sidebar highlighting
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('.doc-section');
      let currentSection = 'welcome';
      
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 160 && rect.bottom >= 160) {
          currentSection = section.id;
        }
      });
      
      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // height of fixed header + buffer
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setActiveSection(id);
      setMobileMenuOpen(false);
    }
  };

  const sections: DocSection[] = useMemo(() => [
    {
      id: 'welcome',
      category: 'Getting Started',
      title: 'Welcome to Pravah',
      icon: <HelpCircle className="h-4 w-4" />,
      content: (
        <div className="space-y-6">
          <p className="text-slate-600 leading-relaxed text-sm">
            <strong>Pravah</strong> is a visual multi-node Indic speech and language pipeline studio. Powered by Sarvam AI APIs and backed by high-performance Neon PostgreSQL storage, Pravah enables developers, product managers, and researchers to design, chain, execute, and audit speech recognition, machine translation, script transliteration, and voice synthesis workflows.
          </p>

          <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 text-xs text-slate-700 flex gap-3">
            <Info className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-indigo-950">Why Pravah?</span> Visualizing voice pipelines makes it easy to debug multi-language applications, test routing rules, and preview syntheses without writing complex backend orchestration code.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="p-5 border border-slate-200/80 rounded-xl bg-white space-y-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              <h4 className="font-semibold text-slate-900 text-sm">AI Pipeline Builder</h4>
              <p className="text-xs text-slate-500">
                Explain your desired translation or speech workflow in natural language (voice or text), and Pravah AI will instantly wire the nodes together.
              </p>
            </div>
            <div className="p-5 border border-slate-200/80 rounded-xl bg-white space-y-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              <h4 className="font-semibold text-slate-900 text-sm">Real-time SSE Monitor</h4>
              <p className="text-xs text-slate-500">
                Watch execution tokens flow from node to node live in the visual canvas. Spot processing bottlenecks or failures instantly.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'onboarding',
      category: 'Getting Started',
      title: 'Onboarding Questionnaire',
      icon: <CheckSquare className="h-4 w-4" />,
      content: (
        <div className="space-y-6">
          <p className="text-slate-600 leading-relaxed text-sm">
            Upon signing up, Pravah walks you through a 3-step onboarding process to customize your workspace dashboard. This information helps seed relevant templates and allocate trial credits.
          </p>

          <div className="relative border-l border-indigo-100 pl-6 ml-3 space-y-8">
            <div className="relative">
              <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">1</span>
              <h4 className="font-semibold text-slate-900 text-sm">Profile & Role</h4>
              <p className="text-xs text-slate-500 mt-1">
                Select your functional background (AI/Software Engineer, Product Manager, Researcher, Enterprise Architect). This determines your startup template defaults.
              </p>
            </div>

            <div className="relative">
              <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">2</span>
              <h4 className="font-semibold text-slate-900 text-sm">Use Cases & Goals</h4>
              <p className="text-xs text-slate-500 mt-1">
                Pick your specific pipeline objectives (Voice Assistants, Audio/Document Translation, Text-to-Speech narration, Custom AI logic).
              </p>
            </div>

            <div className="relative">
              <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">3</span>
              <h4 className="font-semibold text-slate-900 text-sm">Languages & Scale</h4>
              <p className="text-xs text-slate-500 mt-1">
                Select primary target Indic languages (e.g. Hindi, Telugu, Tamil) and indicate expected operational scale (Starter, Growth, Enterprise).
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/40 text-xs text-slate-700 flex gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-rose-950">Important Note:</span> Completing onboarding automatically awards your account a free **₹20 credit balance** to begin testing pipelines.
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'projects',
      category: 'Workspace Projects',
      title: 'Managing Projects',
      icon: <FolderGit2 className="h-4 w-4" />,
      content: (
        <div className="space-y-6">
          <p className="text-slate-600 leading-relaxed text-sm">
            Projects act as isolated sandbox workspaces containing related pipelines, local R2 assets, and transaction audits.
          </p>

          <h4 className="font-semibold text-slate-900 text-sm">To Create a Project:</h4>
          <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-600">
            <li>Navigate to the <strong>Projects</strong> tab from the main navigation header.</li>
            <li>Click the <strong>New Project</strong> button on the top right.</li>
            <li>Provide a descriptive <strong>Project Name</strong> and optional description.</li>
            <li>Click <strong>Create Workspace</strong>. Your project card will appear in the grid.</li>
          </ol>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Example: Seeding Templates</span>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-medium">Automatic</span>
            </div>
            <div className="p-4 text-xs text-slate-600 space-y-2">
              <p>
                Every project is automatically seeded with custom quick-access templates from the <strong>Library Project</strong> if available, allowing you to instantly boot up common patterns like:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-[11px] text-slate-500">
                <li>🏥 Patient Voice Translation (Hinglish/Tenglish to English)</li>
                <li>📰 Multilingual Document OCR & Summary</li>
                <li>🎙️ Indic Conversation Podcast Generator</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'pipeline-creation',
      category: 'Pipeline Construction',
      title: 'Creating Pipelines',
      icon: <Workflow className="h-4 w-4" />,
      content: (
        <div className="space-y-6">
          <p className="text-slate-600 leading-relaxed text-sm">
            Pravah offers two distinct ways to create data pipelines inside your project workspaces: **AI-Powered Generation** and **Manual Canvas Building**.
          </p>

          <h3 className="text-base font-semibold text-slate-900 mt-4 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" /> Option A: Pravah AI Pipeline Builder
          </h3>
          <p className="text-slate-600 text-xs">
            Generate an entire connected pipeline using natural language. The AI understands speech contexts and Indic translation schemas, arranging nodes dynamically.
          </p>

          <div className="space-y-3">
            <h4 className="font-semibold text-slate-800 text-xs">AI Builder Features:</h4>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
              <li><strong>Voice Prompts:</strong> Click the microphone icon to record your pipeline requirements directly. Supports speech recognition in English, Hindi, Telugu, Tamil, and Malayalam.</li>
              <li><strong>Audio Upload:</strong> Upload an audio file (.wav, .mp3) outlining what you want to build.</li>
              <li><strong>Visual Preview:</strong> View a schematic layout showing the generated nodes and connection edges before saving the pipeline to your project.</li>
            </ul>
          </div>

          <div className="bg-slate-900 text-slate-100 font-mono text-xs rounded-xl p-4 relative">
            <div className="flex justify-between items-center text-slate-400 mb-2 border-b border-slate-800 pb-1.5 text-[10px]">
              <span>SAMPLE PROMPT TO PRAVAH AI</span>
              <button 
                onClick={() => handleCopy('Create a pipeline that takes a public URL, scrapes the content, summarizes it using an LLM in Hindi, and then synthesizes the Hindi summary to speech so I can listen to it.', 'prompt-docs')}
                className="hover:text-slate-200 transition-colors flex items-center gap-1"
              >
                {copiedId === 'prompt-docs' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copiedId === 'prompt-docs' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-slate-250 italic leading-relaxed text-xs">
              "Create a pipeline that takes a public URL, scrapes the content, summarizes it using an LLM in Hindi, and then synthesizes the Hindi summary to speech so I can listen to it."
            </p>
            <div className="mt-3 text-[11px] text-blue-300">
              ⚡ Generated Nodes: URL Input ➔ Scraper ➔ LLM (Summary) ➔ translate (to Hindi) ➔ TTS (Bulbul voice) ➔ Audio Output
            </div>
          </div>

          <h3 className="text-base font-semibold text-slate-900 mt-6 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Plus className="h-4 w-4 text-indigo-500" /> Option B: Manual Construction
          </h3>
          <p className="text-slate-600 text-xs">
            Set up pipelines manually by inputting a pipeline name, choosing a template (or choosing "Blank Pipeline"), and saving. You are immediately directed to the visual layout workspace where you can build step-by-step.
          </p>
        </div>
      )
    },
    {
      id: 'canvas-interaction',
      category: 'Visual Canvas (xyflow)',
      title: 'Grid Navigation & Node Placement',
      icon: <MousePointer className="h-4 w-4" />,
      content: (
        <div className="space-y-6">
          <p className="text-slate-600 leading-relaxed text-sm">
            The visual editor workspace is built using <strong>@xyflow/react</strong>. Interactions are highly fluid and responsive:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-slate-200/80 bg-white rounded-xl space-y-1.5">
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-mono text-[10px] rounded font-semibold uppercase">Add Node</span>
              <h5 className="font-semibold text-slate-800 text-xs mt-1">Toolbar Select</h5>
              <p className="text-[11px] text-slate-500">
                Click any node type from the bottom dock toolbar (Inputs, Processing, Outputs, Integrations) to drop it onto the grid canvas.
              </p>
            </div>

            <div className="p-4 border border-slate-200/80 bg-white rounded-xl space-y-1.5">
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-[10px] rounded font-semibold uppercase">Move Nodes</span>
              <h5 className="font-semibold text-slate-800 text-xs mt-1">Drag Canvas</h5>
              <p className="text-[11px] text-slate-500">
                Left-click and hold a node's title handle, then drag to reposition it. Canvas updates its coordinates in real time.
              </p>
            </div>

            <div className="p-4 border border-slate-200/80 bg-white rounded-xl space-y-1.5">
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-mono text-[10px] rounded font-semibold uppercase">Connect</span>
              <h5 className="font-semibold text-slate-800 text-xs mt-1">Node Handles</h5>
              <p className="text-[11px] text-slate-500">
                Drag from the circular **source handle** (right side of node) and drop onto a target **input handle** (left side) of a downstream node.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/40 text-xs text-slate-700 space-y-2">
            <h5 className="font-semibold text-amber-950 flex items-center gap-1.5 text-xs">
              <AlertCircle className="h-4 w-4 text-amber-600" /> Deleting Elements
            </h5>
            <p className="text-xs text-slate-600 leading-relaxed">
              To delete a node or connection line, click to select it (it will show a highlighted border). Press the **Backspace** or **Delete** key on your keyboard, or click the **Delete Icon** in the node's settings panel.
            </p>
          </div>

          <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl space-y-3">
            <h5 className="text-xs font-semibold text-slate-900 uppercase tracking-wider font-mono">Visual representation of connections:</h5>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
              <div className="px-3 py-2 border border-slate-300 rounded-lg bg-white shadow-2xs font-mono text-[11px]">
                <div className="text-[10px] text-pink-500 font-bold">INPUT</div>
                Audio Input
              </div>
              <div className="text-indigo-600 font-mono text-sm">────────►</div>
              <div className="px-3 py-2 border border-slate-300 rounded-lg bg-white shadow-2xs font-mono text-[11px]">
                <div className="text-[10px] text-indigo-500 font-bold">PROCESSING</div>
                Speech-to-Text
              </div>
              <div className="text-indigo-600 font-mono text-sm">────────►</div>
              <div className="px-3 py-2 border border-slate-300 rounded-lg bg-white shadow-2xs font-mono text-[11px]">
                <div className="text-[10px] text-emerald-500 font-bold">OUTPUT</div>
                Text Output
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'config-panel',
      category: 'Visual Canvas (xyflow)',
      title: 'Configuration Panel',
      icon: <Settings className="h-4 w-4" />,
      content: (
        <div className="space-y-6">
          <p className="text-slate-600 leading-relaxed text-sm">
            Clicking any node open its settings in the **Configuration Panel** on the right side of the visual editor screen. Here you can tweak specific model parameters and load test values.
          </p>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">Tweak Model Settings</h4>
              <p className="text-xs text-slate-500 mt-1">
                Configure target speaker voices (e.g. Aditya, Ritu, Pooja) for speech synthesis, select translation target/source language codes (e.g. Assamese, Gujarati), or define prompt weights for LLM models.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">Dynamic Prompt Interpolation</h4>
              <p className="text-xs text-slate-500 mt-1">
                Downstream reasoning models (LLM) can dynamically inject text outputs from upstream nodes using brackets notation.
              </p>
            </div>

            <div className="bg-slate-900 text-slate-100 font-mono text-xs rounded-xl p-4 relative">
              <div className="text-[10px] text-slate-400 mb-2 border-b border-slate-800 pb-1.5">
                VARIABLE TEMPLATING IN LLM CONFIG
              </div>
              <p className="text-slate-300 leading-relaxed">
                Translate the following text into English: <br />
                <span className="text-yellow-400 font-semibold">{"{{node_stt_584.output}}"}</span>
              </p>
              <div className="mt-3 text-[10px] text-slate-500 border-t border-slate-800 pt-1.5">
                💡 Tip: Find the Node ID at the top of the Configuration Panel.
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider">Interactive Sound Check</h4>
              <p className="text-xs text-slate-500 mt-1">
                In inputs and Text-to-Speech configurations, you can record trial voice prompts using your browser microphone directly within the panel, or play sample voice syntheses to review speaker speeds.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'execution',
      category: 'Execution & Monitoring',
      title: 'Execution Status Monitor',
      icon: <Activity className="h-4 w-4" />,
      content: (
        <div className="space-y-6">
          <p className="text-slate-600 leading-relaxed text-sm">
            Running a pipeline starts an SSE (Server-Sent Events) network stream that executes nodes concurrently based on dependency mapping.
          </p>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
            <h4 className="font-semibold text-slate-900 text-sm">Real-time Node Glow states:</h4>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-400 animate-pulse" />
                <span className="font-mono text-slate-700 font-semibold w-24">Pending:</span>
                <span className="text-slate-500">Wait state. Upstream dependencies are still running.</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-100" />
                <span className="font-mono text-slate-700 font-semibold w-24">Running:</span>
                <span className="text-slate-500">Actively processing API call (pulsing blue glow).</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                <span className="font-mono text-slate-700 font-semibold w-24">Completed:</span>
                <span className="text-slate-500">Success. Passes JSON response payload downstream.</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-red-100" />
                <span className="font-mono text-slate-700 font-semibold w-24">Failed:</span>
                <span className="text-slate-500">Encountered an exception. Aborts execution flow path.</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
            <p>
              <strong>Aborting Runs:</strong> While running, you can click the **Cancel** button on the bottom of the logs sidebar. This terminates the network stream, sends an abort request to active processes, and registers a warning log.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'credits',
      category: 'Execution & Monitoring',
      title: 'Credits & Billing Model',
      icon: <CreditCard className="h-4 w-4" />,
      content: (
        <div className="space-y-6">
          <p className="text-slate-600 leading-relaxed text-sm">
            Pravah operates on a pay-as-you-go developer model. The visual studio calculates cost estimations before each execution by inspecting node types.
          </p>

          <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden bg-white">
            <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[10px] text-slate-400 font-bold uppercase">
              <tr>
                <th className="px-4 py-3">Node Type</th>
                <th className="px-4 py-3">Cost per Execution</th>
                <th className="px-4 py-3">Service Model</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-600">
              <tr>
                <td className="px-4 py-3 font-semibold text-slate-900">Speech-to-Text (STT)</td>
                <td className="px-4 py-3">₹0.375</td>
                <td className="px-4 py-3 font-mono text-[11px]">Saaras:v3 AI</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-slate-900">Text-to-Speech (TTS)</td>
                <td className="px-4 py-3">₹0.050</td>
                <td className="px-4 py-3 font-mono text-[11px]">Bulbul:v3 AI</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-slate-900">Translate</td>
                <td className="px-4 py-3">₹0.050</td>
                <td className="px-4 py-3 font-mono text-[11px]">Indic Translation</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-slate-900">LLM & OCR Nodes</td>
                <td className="px-4 py-3">₹0.500</td>
                <td className="px-4 py-3 font-mono text-[11px]">Generative Hub</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold text-slate-900">Inputs & Outputs</td>
                <td className="px-4 py-3 text-emerald-600 font-semibold">Free (₹0.00)</td>
                <td className="px-4 py-3 font-mono text-[11px]">Local Assets / R2</td>
              </tr>
            </tbody>
          </table>

          <div className="p-4 rounded-xl border border-yellow-100 bg-yellow-50/40 text-xs text-slate-700 flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-yellow-950">Pre-Run Safeguard:</span> If your wallet credits drop below the current pipeline's estimated cost, Pravah triggers a Credit Warning Dialog, halting execution until topped up.
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'history',
      category: 'Audit & Logs History',
      title: 'Audit Trails & Execution History',
      icon: <History className="h-4 w-4" />,
      content: (
        <div className="space-y-6">
          <p className="text-slate-600 leading-relaxed text-sm">
            Every pipeline run logs execution metrics to the Neon PostgreSQL database, ensuring secure audit tracking.
          </p>

          <h4 className="font-semibold text-slate-900 text-sm">Accessing logs:</h4>
          <ol className="list-decimal pl-5 space-y-2 text-xs text-slate-600">
            <li>Click the **History** button in the visual editor toolbar header.</li>
            <li>You will see the **Pipeline Execution History** table.</li>
            <li>Click any run row to expand and inspect the run duration and exact node inputs/outputs.</li>
          </ol>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center text-[10px] font-mono text-slate-400 font-bold uppercase">
              <span>Sample Audit Log JSON Output</span>
            </div>
            <div className="p-4 text-xs font-mono bg-slate-950 text-slate-200 overflow-x-auto max-h-48 leading-relaxed">
              <pre>{`{
  "runId": "run_9f27d4c8",
  "status": "COMPLETED",
  "startedAt": "2026-08-17T17:42:00.000Z",
  "finishedAt": "2026-08-17T17:42:08.500Z",
  "nodeRuns": [
    {
      "nodeId": "node_stt_584",
      "status": "COMPLETED",
      "output": {
        "text": "हेलो, आप कैसे हैं?"
      }
    }
  ]
}`}</pre>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'profile',
      category: 'Account & Billing',
      title: 'Update Profile Details',
      icon: <User className="h-4 w-4" />,
      content: (
        <div className="space-y-6">
          <p className="text-slate-600 leading-relaxed text-sm">
            Configure your personal developer identity and track invoices under the **Profile Details** page.
          </p>

          <div className="space-y-3">
            <h4 className="font-semibold text-slate-800 text-xs">Profile Controls:</h4>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
              <li><strong>Name Update:</strong> Click the edit name inputs and type your name, then save.</li>
              <li><strong>Billing History:</strong> View Razorpay payment transaction timestamps.</li>
              <li><strong>Wallet Recharges:</strong> Add top-up values (₹100, ₹500, ₹1000) using the Razorpay gateway modal.</li>
            </ul>
          </div>
        </div>
      )
    }
  ], [copiedId]);

  // Search logic
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [searchQuery, sections]);

  // Group sections by category for navigation list
  const categories = useMemo(() => {
    const map: Record<string, DocSection[]> = {};
    sections.forEach((s) => {
      if (!map[s.category]) {
        map[s.category] = [];
      }
      map[s.category].push(s);
    });
    return map;
  }, [sections]);

  return (
    <div className="min-h-screen bg-slate-50/40 flex flex-col font-sans relative">
      {/* Background blurs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50/20 rounded-full blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-50/10 rounded-full blur-3xl opacity-60 pointer-events-none" />

      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8 relative z-10">
        
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 shrink-0 md:sticky md:top-20 md:h-[calc(100vh-120px)] flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white text-xs placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto border border-slate-200/80 rounded-xl bg-white p-3 space-y-4 shadow-2xs">
            {Object.entries(categories).map(([cat, catSections]) => {
              // Filter sections in sidebar based on search query
              const matchingSections = catSections.filter(s => 
                filteredSections.some(fs => fs.id === s.id)
              );
              
              if (matchingSections.length === 0) return null;

              return (
                <div key={cat} className="space-y-1">
                  <h3 className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    {cat}
                  </h3>
                  <div className="space-y-0.5 mt-1.5">
                    {matchingSections.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => scrollToSection(s.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-all ${
                          activeSection === s.id
                            ? 'bg-slate-100 text-slate-900 font-semibold'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                        }`}
                      >
                        {s.icon}
                        <span>{s.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 max-w-4xl space-y-12">
          {filteredSections.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
              <Search className="mx-auto h-8 w-8 text-slate-300 mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">No Documentation Found</h3>
              <p className="text-xs text-slate-400 mt-1">
                We couldn't find any topics matching "{searchQuery}". Try using different terms.
              </p>
            </div>
          ) : (
            filteredSections.map((s) => (
              <section
                key={s.id}
                id={s.id}
                className="doc-section scroll-mt-24 p-6 sm:p-8 border border-slate-200/80 rounded-2xl bg-white shadow-2xs hover:shadow-xs transition-all space-y-4"
              >
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="p-2 rounded-xl bg-slate-50 text-slate-700">
                    {s.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider font-mono">
                      {s.category}
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                      {s.title}
                    </h2>
                  </div>
                </div>

                <div className="pt-2">
                  {s.content}
                </div>
              </section>
            ))
          )}
        </main>
      </div>
    </div>
  );
}
