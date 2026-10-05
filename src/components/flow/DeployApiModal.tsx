'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Terminal,
  Code2,
  Copy,
  Check,
  Key,
  Plus,
  ExternalLink,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { usePipelineStore } from '@/store/pipelineStore';

interface DeployApiModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipelineId: string;
}

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
}

export const DeployApiModal: React.FC<DeployApiModalProps> = ({
  isOpen,
  onClose,
  pipelineId,
}) => {
  const pipelineName = usePipelineStore((s) => s.pipelineName);
  const nodes = usePipelineStore((s) => s.nodes);

  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('pf_live_YOUR_API_KEY');
  const [activeTab, setActiveTab] = useState<'curl' | 'python' | 'ts'>('curl');
  const [copied, setCopied] = useState(false);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedPlainKey, setGeneratedPlainKey] = useState<string | null>(null);
  const [quickKeyError, setQuickKeyError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/user/api-keys')
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.keys?.length > 0) {
            setKeys(data.keys);
            // Default placeholder or key prefix
            setSelectedKey(data.keys[0].keyPrefix.replace('...', 'YOUR_SECRET_KEY'));
          }
        })
        .catch((err) => console.warn('Failed to load keys for modal:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Derive initial input payload based on input nodes in pipeline
  const hasAudioIn = nodes.some((n) => n.type === 'audio_input' || n.type === 'stt');
  const hasDocIn = nodes.some((n) => n.type === 'document_input' || n.type === 'ocr');
  
  const sampleInputs: Record<string, any> = {};
  if (hasAudioIn) {
    sampleInputs.audio_url = 'https://example.com/sample_hindi_voice.wav';
    sampleInputs.text = 'नमस्ते! भारत की कृत्रिम बुद्धिमत्ता सर्वम एआई।';
  } else if (hasDocIn) {
    sampleInputs.document_url = 'https://example.com/sample_invoice.pdf';
  } else {
    sampleInputs.text = 'नमस्ते! भारत की कृत्रिम बुद्धिमत्ता सर्वम एआई।';
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pravah.app';
  const endpointUrl = `${origin}/api/pipelines/${pipelineId}/run?stream=false`;
  const displayKey = generatedPlainKey || selectedKey;

  const handleQuickCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newKeyName.trim();
    if (!trimmed) {
      setQuickKeyError('Key name is required');
      return;
    }
    if (trimmed.length < 3) {
      setQuickKeyError('Key name must be at least 3 characters');
      return;
    }

    try {
      setIsCreatingKey(true);
      setQuickKeyError(null);
      const res = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, expiry: '30d' }),
      });
      const data = await res.json();
      if (res.ok && data.key) {
        setGeneratedPlainKey(data.key);
        setSelectedKey(data.key);
        setNewKeyName('');
      } else {
        setQuickKeyError(data.error || 'Failed to generate key');
      }
    } catch (err) {
      console.error('Quick key create error:', err);
      setQuickKeyError('Failed to generate key');
    } finally {
      setIsCreatingKey(false);
    }
  };

  const getCodeSnippet = () => {
    const jsonBody = JSON.stringify({ inputs: sampleInputs }, null, 2);

    if (activeTab === 'curl') {
      return `curl -X POST "${endpointUrl}" \\
  -H "Authorization: Bearer ${displayKey}" \\
  -H "Content-Type: application/json" \\
  -d '${jsonBody}'`;
    }

    if (activeTab === 'python') {
      return `import requests

url = "${endpointUrl}"
headers = {
    "Authorization": "Bearer ${displayKey}",
    "Content-Type": "application/json"
}
payload = ${JSON.stringify({ inputs: sampleInputs }, null, 4)}

response = requests.post(url, json=payload, headers=headers)
data = response.json()

print("Status:", data.get("status"))
print("Outputs:", data.get("outputs"))
print("Cost:", data.get("totalCost"))`;
    }

    if (activeTab === 'ts') {
      return `const response = await fetch("${endpointUrl}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${displayKey}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(${JSON.stringify({ inputs: sampleInputs }, null, 4)}),
});

const data = await response.json();
console.log("Run ID:", data.runId);
console.log("Pipeline Output:", data.outputs);`;
    }

    return '';
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCodeSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl text-slate-100 flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Deploy Pipeline as API</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Instant Endpoint
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                {pipelineName} ({pipelineId})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* API Key Bar */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-blue-400" />
              <span className="text-xs font-semibold text-slate-300">API Key:</span>
              {generatedPlainKey ? (
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  {generatedPlainKey} (Newly Generated)
                </span>
              ) : keys.length > 0 ? (
                <select
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500"
                >
                  {keys.map((k) => (
                    <option key={k.id} value={k.keyPrefix.replace('...', 'YOUR_SECRET_KEY')}>
                      {k.name} ({k.keyPrefix})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-amber-400">No active keys</span>
              )}
            </div>

            {/* Quick Create Key Button */}
            {!generatedPlainKey && (
              <div className="flex flex-col items-end gap-1">
                <form onSubmit={handleQuickCreateKey} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="New key name"
                    value={newKeyName}
                    onChange={(e) => {
                      setNewKeyName(e.target.value);
                      if (quickKeyError) setQuickKeyError(null);
                    }}
                    className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 w-28 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingKey || !newKeyName.trim()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer transition-all"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Generate</span>
                  </button>
                </form>
                {quickKeyError && (
                  <span className="text-[10px] text-rose-400 font-semibold">{quickKeyError}</span>
                )}
              </div>
            )}
          </div>

          {/* Language Tabs & Copy Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('curl')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'curl' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                cURL
              </button>
              <button
                onClick={() => setActiveTab('python')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'python' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Python
              </button>
              <button
                onClick={() => setActiveTab('ts')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'ts' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                TypeScript / Node
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Code Block */}
          <div className="relative">
            <pre className="p-4 bg-slate-950 rounded-xl text-xs font-mono text-blue-200 border border-slate-800 overflow-x-auto selection:bg-blue-900 selection:text-white leading-relaxed">
              {getCodeSnippet()}
            </pre>
          </div>

          {/* Parameter Note */}
          <div className="text-[11px] text-slate-400 space-y-1">
            <p className="flex items-center gap-1 text-slate-300 font-semibold">
              <Zap className="h-3.5 w-3.5 text-amber-400" /> Execution Modes:
            </p>
            <p>
              • <strong>Synchronous JSON</strong>: Use <code className="text-blue-300">?stream=false</code> to wait for execution and receive the final outputs directly in the JSON response.
            </p>
            <p>
              • <strong>Real-Time SSE Streaming</strong>: Omit <code className="text-blue-300">?stream=false</code> or pass <code className="text-blue-300">Accept: text/event-stream</code> to stream live node-by-node execution events.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <Link
            href="/dashboard/api"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
          >
            <span>Open Developer Analytics & Logs</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
