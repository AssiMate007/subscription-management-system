import React from 'react';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../lib/auth';

interface Forbidden403Props {
  reason?: string;
  onGoBack?: () => void;
}

export const Forbidden403: React.FC<Forbidden403Props> = ({
  reason = 'You do not have authorization to view or modify this record.',
  onGoBack,
}) => {
  const { user } = useAuth();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-5 shadow-xs">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <span className="text-xs font-semibold tracking-wider uppercase text-rose-600">403 Forbidden</span>
      <h2 className="mt-2 text-2xl font-bold text-slate-900">Access Restricted</h2>
      <p className="mt-2 text-sm text-slate-600 max-w-md leading-relaxed">
        {reason}
      </p>
      <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 max-w-md">
        Current logged-in identity: <strong className="text-slate-800">{user?.name}</strong> ({user?.role})
      </div>
      {onGoBack && (
        <button
          onClick={onGoBack}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
      )}
    </div>
  );
};
