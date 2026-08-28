'use client';

import React, { useEffect, useState } from 'react';
import { ComparisonSummary, ComparisonItemResult } from '@/lib/evals/regression';
import { DiffViewer } from './DiffViewer';
import { 
  TrendingUp, TrendingDown, ArrowRightLeft, Layers, Clock, 
  Coins, Filter, AlertTriangle, CheckCircle, ChevronRight, Activity,
  RefreshCw, CheckCircle2, XCircle, Search, Sparkles, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface RegressionViewProps {
  pipelineId: string;
}

export const RegressionView: React.FC<RegressionViewProps> = ({ pipelineId }) => {
  const [evalRuns, setEvalRuns] = useState<any[]>([]);
  const [baselineRunId, setBaselineRunId] = useState<string>('');
  const [candidateRunId, setCandidateRunId] = useState<string>('');
  
  const [summary, setSummary] = useState<ComparisonSummary | null>(null);
  const [results, setResults] = useState<ComparisonItemResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<ComparisonItemResult[]>([]);

  const [isLoadingRuns, setIsLoadingRuns] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | 'improved' | 'regressed' | 'unchanged'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedResult, setSelectedResult] = useState<ComparisonItemResult | null>(null);

  // Fetch past evaluation runs to compare
  const fetchEvalRuns = async () => {
    setIsLoadingRuns(true);
    setError(null);
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/evals`);
      if (res.ok) {
        const data = await res.json();
        setEvalRuns(data);
        if (data.length > 0) {
          setBaselineRunId(data[0].id);
          if (data.length > 1) {
            setCandidateRunId(data[1].id);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch eval runs:', err);
      setError('Failed to fetch evaluation history');
    } finally {
      setIsLoadingRuns(false);
    }
  };

  useEffect(() => {
    fetchEvalRuns();
  }, [pipelineId]);

  // Execute Comparison API
  const handleCompare = async () => {
    if (!baselineRunId || !candidateRunId) return;
    setIsComparing(true);
    setError(null);
    try {
      const res = await fetch('/api/evals/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baselineRunId, candidateRunId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setResults(data.results);
        setFilteredResults(data.results);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.message || 'Comparison failed');
      }
    } catch (err: any) {
      setError(err.message || 'Comparison request failed');
    } finally {
      setIsComparing(false);
    }
  };

  // Run comparison automatically when baseline/candidate are chosen
  useEffect(() => {
    if (baselineRunId && candidateRunId && baselineRunId !== candidateRunId) {
      handleCompare();
    }
  }, [baselineRunId, candidateRunId]);

  // Handle searching & filtering
  useEffect(() => {
    let filtered = results;
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.comparisonStatus === statusFilter);
    }
    if (searchQuery.trim()) {
      filtered = filtered.filter(item => 
        item.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        JSON.stringify(item.input).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredResults(filtered);
  }, [results, statusFilter, searchQuery]);

  const renderDeltaBadge = (val: number, higherIsBetter: boolean, unit: string = '') => {
    const isZero = val === 0;
    const isPositive = val > 0;
    const isGood = (isPositive && higherIsBetter) || (!isPositive && !higherIsBetter);
    const color = isZero ? 'text-gray-500 bg-gray-50' : isGood ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-rose-700 bg-rose-50 border border-rose-200';
    const arrow = isZero ? '' : isPositive ? '+' : '';

    return (
      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-semibold text-xs font-mono ${color}`}>
        {isPositive && isGood && <TrendingUp className="h-3 w-3" />}
        {!isPositive && !isZero && !isGood && <TrendingDown className="h-3 w-3" />}
        {arrow}{val}{unit}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Selectors card */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700">
          <ArrowRightLeft className="h-4 w-4 text-blue-500" />
          Select Evaluation Runs to Compare
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500">Baseline Run ($v1$)</label>
            <select
              value={baselineRunId}
              onChange={(e) => setBaselineRunId(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {evalRuns.map(run => (
                <option key={run.id} value={run.id}>
                  Run #{run.id.slice(-8)} (v{run.pipelineVersionId?.slice(-2) || '1'}) - {new Date(run.startedAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500">Candidate Run ($v2$)</label>
            <select
              value={candidateRunId}
              onChange={(e) => setCandidateRunId(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {evalRuns.map(run => (
                <option key={run.id} value={run.id}>
                  Run #{run.id.slice(-8)} (v{run.pipelineVersionId?.slice(-2) || '2'}) - {new Date(run.startedAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {baselineRunId === candidateRunId && baselineRunId && (
          <div className="text-xs text-amber-600 bg-amber-50/50 border border-amber-200 px-3 py-2 rounded-xl flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Baseline and Candidate must be different evaluation runs to perform comparison.
          </div>
        )}
      </div>

      {isLoadingRuns || isComparing ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
          <p className="text-xs text-gray-400 font-semibold">Running Regression Comparison Calculations...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl space-y-2">
          <AlertTriangle className="h-5 w-5 mx-auto text-rose-600" />
          <p className="text-xs font-semibold">{error}</p>
          <Button size="sm" onClick={fetchEvalRuns}>Retry</Button>
        </div>
      ) : summary ? (
        <div className="space-y-6">
          {/* Delta metrics banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Pass Rate Delta */}
            <div className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Δ Pass Rate
              </span>
              <div className="flex items-baseline justify-between mt-1.5">
                <span className="text-lg font-extrabold text-gray-900 font-mono">
                  {renderDeltaBadge(summary.deltaPassRate, true, '%')}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {summary.improvedCount} improved / {summary.regressedCount} regressed
                </span>
              </div>
            </div>

            {/* BLEU score Delta */}
            <div className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Δ BLEU Translation
              </span>
              <div className="flex items-baseline justify-between mt-1.5">
                <span className="text-lg font-extrabold text-gray-900 font-mono">
                  {renderDeltaBadge(summary.deltaBleu, true)}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">accuracy index</span>
              </div>
            </div>

            {/* Latency Delta */}
            <div className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Δ Avg Latency
              </span>
              <div className="flex items-baseline justify-between mt-1.5">
                <span className="text-lg font-extrabold text-gray-900 font-mono">
                  {renderDeltaBadge(summary.deltaLatency, false, 'ms')}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">mean response SLA</span>
              </div>
            </div>

            {/* Cost Delta */}
            <div className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Δ Credit Cost
              </span>
              <div className="flex items-baseline justify-between mt-1.5">
                <span className="text-lg font-extrabold text-gray-900 font-mono">
                  {renderDeltaBadge(summary.deltaCost, false, ' credits')}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">financial overhead</span>
              </div>
            </div>
          </div>

          {/* Filter & Table Area */}
          <div className="p-4 bg-white border border-gray-200/80 rounded-2xl shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <div className="flex items-center gap-1">
                  {(['all', 'improved', 'regressed', 'unchanged'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                        statusFilter === f
                          ? 'bg-gray-900 text-white shadow-2xs'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {f} ({
                        f === 'all' ? results.length :
                        f === 'improved' ? summary.improvedCount :
                        f === 'regressed' ? summary.regressedCount :
                        summary.unchangedCount
                      })
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search test items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Test Matrix */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5">Test Case ID</th>
                    <th className="py-2.5">Input Payload</th>
                    <th className="py-2.5">Baseline (v1)</th>
                    <th className="py-2.5">Candidate (v2)</th>
                    <th className="py-2.5">Latency Delta</th>
                    <th className="py-2.5">Cost Delta</th>
                    <th className="py-2.5 text-right">Regression Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {filteredResults.map(item => (
                    <tr
                      key={item.itemId}
                      onClick={() => setSelectedResult(item)}
                      className="hover:bg-slate-50/50 cursor-pointer group transition-colors"
                    >
                      <td className="py-3 font-semibold text-gray-800 font-sans">
                        {item.itemName || item.itemId.slice(-8)}
                      </td>
                      <td className="py-3 truncate max-w-xs text-gray-500 font-sans">
                        {JSON.stringify(item.input)}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.v1.status === 'passed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {item.v1.scores.bleu !== undefined ? `BLEU: ${item.v1.scores.bleu}` : item.v1.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.v2.status === 'passed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {item.v2.scores.bleu !== undefined ? `BLEU: ${item.v2.scores.bleu}` : item.v2.status}
                        </span>
                      </td>
                      <td className="py-3">
                        {item.deltaLatency > 0 ? `+${item.deltaLatency}ms` : `${item.deltaLatency}ms`}
                      </td>
                      <td className="py-3">
                        {item.deltaCost > 0 ? `+₹${item.deltaCost.toFixed(3)}` : `₹${item.deltaCost.toFixed(3)}`}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.comparisonStatus === 'improved' ? 'bg-emerald-100 text-emerald-800' :
                          item.comparisonStatus === 'regressed' ? 'bg-rose-100 text-rose-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {item.comparisonStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredResults.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400 italic font-sans">
                        No regression items match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white border border-gray-200 rounded-2xl shadow-xs">
          <BookOpen className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-gray-900">Select baseline vs candidate to perform regression analysis.</h4>
        </div>
      )}

      {/* Side-by-Side Inspector Dialog */}
      {selectedResult && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900">
                  Regression Item: {selectedResult.itemName || selectedResult.itemId.slice(-8)}
                </h4>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                  ID: {selectedResult.itemId}
                </p>
              </div>
              <button 
                onClick={() => setSelectedResult(null)}
                className="text-gray-400 hover:text-gray-900 text-sm font-bold bg-white border border-gray-200 rounded-lg p-1.5 transition-colors"
              >
                Close
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Input Payload */}
                <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Input Payload</span>
                  <pre className="text-xs text-gray-800 font-mono whitespace-pre-wrap">{JSON.stringify(selectedResult.input, null, 2)}</pre>
                </div>

                {/* Expected Output */}
                <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Ground-Truth Reference</span>
                  <pre className="text-xs text-gray-800 font-mono whitespace-pre-wrap">{JSON.stringify(selectedResult.expectedOutput, null, 2)}</pre>
                </div>
              </div>

              {/* Visual Diff Viewer */}
              <div className="p-4 bg-blue-50/20 border border-blue-200 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" /> Output Delta Word Diff ($v1 \to v2$)
                </span>
                <DiffViewer diff={selectedResult.diff} />
              </div>

              {/* Side-by-Side Payload Diffs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Baseline v1 */}
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="p-2.5 bg-slate-100/60 border-b border-gray-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">Baseline (v1)</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedResult.v1.status === 'passed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {selectedResult.v1.status}
                    </span>
                  </div>
                  <div className="p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="p-1.5 bg-slate-50 rounded">Latency: {selectedResult.v1.durationMs}ms</div>
                      <div className="p-1.5 bg-slate-50 rounded">Cost: ₹{selectedResult.v1.cost.toFixed(3)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Output Payload</span>
                      <pre className="text-xs bg-slate-900 text-slate-100 font-mono p-3 rounded-lg overflow-x-auto max-h-32">
                        {JSON.stringify(selectedResult.v1.actualOutput, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Candidate v2 */}
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="p-2.5 bg-slate-100/60 border-b border-gray-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">Candidate (v2)</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedResult.v2.status === 'passed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {selectedResult.v2.status}
                    </span>
                  </div>
                  <div className="p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="p-1.5 bg-slate-50 rounded">Latency: {selectedResult.v2.durationMs}ms</div>
                      <div className="p-1.5 bg-slate-50 rounded">Cost: ₹{selectedResult.v2.cost.toFixed(3)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Output Payload</span>
                      <pre className="text-xs bg-slate-900 text-slate-100 font-mono p-3 rounded-lg overflow-x-auto max-h-32">
                        {JSON.stringify(selectedResult.v2.actualOutput, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
