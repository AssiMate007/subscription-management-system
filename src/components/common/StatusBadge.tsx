import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = status.toLowerCase();

  let dotColor = 'bg-slate-400';
  let textColor = 'text-slate-700';

  if (norm === 'active' || norm === 'paid') {
    dotColor = 'bg-emerald-500';
    textColor = 'text-emerald-700';
  } else if (norm === 'confirmed') {
    dotColor = 'bg-sky-500';
    textColor = 'text-sky-700';
  } else if (norm === 'quotation') {
    dotColor = 'bg-indigo-500';
    textColor = 'text-indigo-700';
  } else if (norm === 'draft' || norm === 'scheduled') {
    dotColor = 'bg-amber-500';
    textColor = 'text-amber-700';
  } else if (norm === 'overdue' || norm === 'exhausted') {
    dotColor = 'bg-rose-500';
    textColor = 'text-rose-700';
  } else if (norm === 'closed' || norm === 'cancelled' || norm === 'expired' || norm === 'disabled') {
    dotColor = 'bg-slate-400';
    textColor = 'text-slate-500';
  }

  const textSize = size === 'sm' ? 'text-xs' : 'text-xs font-medium';

  return (
    <div className={`inline-flex items-center gap-1.5 ${textColor} ${textSize}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} aria-hidden="true" />
      <span>{status}</span>
    </div>
  );
};
