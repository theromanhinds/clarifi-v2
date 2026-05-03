import { useState } from 'react';
import { useApp } from '@/context/AppContext';

export function ResetButton() {
  const { reset } = useApp();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-text-muted text-sm">Are you sure? All data will be wiped.</span>
        <button
          onClick={() => { reset(); setConfirming(false); }}
          className="px-3 py-1 bg-accent-red text-white text-sm rounded transition-all duration-150 hover:opacity-80"
        >
          Yes, wipe data
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1 bg-surface border border-border text-text-muted text-sm rounded transition-all duration-150 hover:border-text-muted"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-3 py-2 text-text-muted text-sm border border-border rounded transition-all duration-150 hover:border-accent-red hover:text-accent-red"
    >
      Wipe data &amp; start over
    </button>
  );
}
