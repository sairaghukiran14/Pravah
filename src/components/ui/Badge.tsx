import React from 'react';
import { RunStatus } from '@/types/pipeline';

interface BadgeProps {
  status: RunStatus | string;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600 border-gray-200',
    running: 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse',
    completed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    failed: 'bg-red-50 text-red-600 border-red-200',
  };

  const labels: Record<string, string> = {
    pending: 'Pending',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
  };

  const dotColors: Record<string, string> = {
    pending: 'bg-gray-400',
    running: 'bg-blue-500',
    completed: 'bg-emerald-500',
    failed: 'bg-red-500',
  };

  const style = styles[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  const label = labels[status] || status;
  const dot = dotColors[status] || 'bg-gray-400';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
};
