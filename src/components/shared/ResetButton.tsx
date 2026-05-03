import { useState } from 'react';
import { useApp } from '@/context/AppContext';

export function ResetButton() {
  const { reset, resetDashboard } = useApp();
  const [confirming, setConfirming] = useState<'wipe' | 'resetDashboard' | null>(null);

  if (confirming === 'wipe') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-text-muted text-sm">Are you sure? All data will be wiped.</span>
        <button
          onClick={() => { reset(); setConfirming(null); }}
          className="px-3 py-1 bg-accent-red text-white text-sm rounded transition-all duration-150 hover:opacity-80"
        >
          Yes, wipe data
        </button>
        <button
          onClick={() => setConfirming(null)}
          className="px-3 py-1 bg-surface border border-border text-text-muted text-sm rounded transition-all duration-150 hover:border-text-muted"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (confirming === 'resetDashboard') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-text-muted text-sm">Reset all changes? Life events and overrides will be cleared.</span>
        <button
          onClick={() => { resetDashboard(); setConfirming(null); }}
          className="px-3 py-1 bg-accent-red text-white text-sm rounded transition-all duration-150 hover:opacity-80"
        >
          Yes, reset
        </button>
        <button
          onClick={() => setConfirming(null)}
          className="px-3 py-1 bg-surface border border-border text-text-muted text-sm rounded transition-all duration-150 hover:border-text-muted"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setConfirming('resetDashboard')}
        className="px-3 py-2 text-text-muted text-sm border border-border rounded transition-all duration-150 hover:border-accent-red hover:text-accent-red"
      >
        Reset changes
      </button>
      <button
        onClick={() => setConfirming('wipe')}
        className="px-3 py-2 text-text-muted text-sm border border-border rounded transition-all duration-150 hover:border-accent-red hover:text-accent-red"
      >
        Wipe data &amp; start over
      </button>
    </div>
  );
}
