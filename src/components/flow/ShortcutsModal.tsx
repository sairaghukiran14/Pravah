'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  label: string;
  category: 'Canvas' | 'Editing' | 'Navigation';
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['⌘', 'K'], label: 'Open Command Palette (Quick Add Nodes)', category: 'Navigation' },
  { keys: ['⌘', '0'], label: 'Zoom to Fit Viewport', category: 'Canvas' },
  { keys: ['⌘', 'Z'], label: 'Undo previous canvas mutation', category: 'Editing' },
  { keys: ['⌘', '⇧', 'Z'], label: 'Redo previously undone change', category: 'Editing' },
  { keys: ['⌘', 'D'], label: 'Duplicate selected node', category: 'Editing' },
  { keys: ['⌘', 'C'], label: 'Copy selected node to clipboard', category: 'Editing' },
  { keys: ['⌘', 'V'], label: 'Paste node at canvas center', category: 'Editing' },
  { keys: ['Del', '⌫'], label: 'Delete selected node / edge', category: 'Editing' },
  { keys: ['?'], label: 'Open Keyboard Shortcuts helper', category: 'Navigation' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="lg">
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Supercharge your visual workflow speed with native keyboard shortcuts.
        </p>

        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50/50">
          {SHORTCUTS.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between px-3.5 py-2.5">
              <span className="text-xs font-medium text-gray-700">{item.label}</span>
              <div className="flex items-center gap-1">
                {item.keys.map((k, kIdx) => (
                  <kbd
                    key={kIdx}
                    className="inline-flex items-center justify-center min-w-[22px] px-1.5 py-0.5 text-[11px] font-mono font-semibold text-gray-600 bg-white border border-gray-300 rounded shadow-xs"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-gray-400 text-center pt-1">
          On Windows / Linux, use <kbd className="font-mono bg-gray-100 px-1 py-0.5 rounded border text-gray-600">Ctrl</kbd> instead of <kbd className="font-mono bg-gray-100 px-1 py-0.5 rounded border text-gray-600">⌘</kbd>.
        </div>
      </div>
    </Modal>
  );
};
