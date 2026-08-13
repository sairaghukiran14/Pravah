'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertCircle, ChevronDown, Copy, Check } from 'lucide-react';
import type { NodeFailure } from '@/lib/api/nodeErrors';

export interface FailedNode {
  nodeId: string;
  /** The node's own label on the canvas, so the user can find it. */
  label: string;
  nodeType: string;
  failure: NodeFailure;
}

interface NodeErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Every node that failed in the run. Branches execute independently, so a
   * single run can produce several failures; the first is explained in full and
   * the rest are listed so nothing is hidden behind a dialog the user dismissed.
   */
  failures: FailedNode[];
}

export const NodeErrorDialog: React.FC<NodeErrorDialogProps> = ({
  isOpen,
  onClose,
  failures,
}) => {
  const [showTechnical, setShowTechnical] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const primary = failures[0];
  const others = failures.slice(1);

  // Collapse the disclosure between runs; leaving it open carries one failure's
  // reading position onto the next, unrelated failure.
  React.useEffect(() => {
    if (isOpen) {
      setShowTechnical(false);
      setCopied(false);
    }
  }, [isOpen, primary?.nodeId]);

  if (!primary) return null;

  const { failure } = primary;

  const copyTechnical = async () => {
    try {
      await navigator.clipboard.writeText(
        `${primary.label} (${primary.nodeType})\n${failure.code}\n${failure.technical}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the text is on screen and selectable.
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Node Failed">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{failure.title}</p>
            <p className="mt-0.5 text-xs font-normal text-gray-500">
              {primary.label}
              <span className="mx-1.5 text-gray-300">·</span>
              {primary.nodeType}
            </p>
          </div>
        </div>

        <p className="text-sm font-normal leading-relaxed text-gray-700">
          {failure.summary}
        </p>

        <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            {failure.isProviderIssue ? 'What you can do' : 'How to fix it'}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {failure.remediation.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm font-normal text-gray-700">
                <span aria-hidden="true" className="text-gray-400">
                  →
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {others.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
              {others.length} other {others.length === 1 ? 'node' : 'nodes'} also failed
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {others.map((other) => (
                <li key={other.nodeId} className="text-sm font-normal text-gray-700">
                  <span className="font-medium text-gray-900">{other.label}</span>
                  <span className="mx-1.5 text-gray-300">·</span>
                  {other.failure.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={() => setShowTechnical((v) => !v)}
            aria-expanded={showTechnical}
            className="flex items-center gap-1.5 rounded text-xs font-medium text-gray-500 transition-colors hover:text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 cursor-pointer"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${showTechnical ? 'rotate-180' : ''}`}
            />
            Technical detail
          </button>

          {showTechnical && (
            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-900 p-3">
              <div className="flex items-start justify-between gap-3">
                <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-gray-200">
                  {failure.technical}
                </code>
                <button
                  type="button"
                  onClick={copyTechnical}
                  aria-label="Copy technical detail"
                  className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 cursor-pointer"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <p className="mt-2 font-mono text-[10px] text-gray-500">{failure.code}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-100 pt-4">
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
