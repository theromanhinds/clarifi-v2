import { useEffect } from 'react';
import { RecurringExpense, Transaction } from '@/types';
import { useApp } from '@/context/AppContext';

interface RecurringDetailProps {
  recurring: RecurringExpense;
  transactions: Transaction[];
  onClose: () => void;
}

export function RecurringDetail({ recurring, transactions, onClose }: RecurringDetailProps) {
  const { dismissRecurring } = useApp();

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const matchingTxns = transactions
    .filter((t) => recurring.transactionIds.includes(t.id))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const handleRemove = () => {
    dismissRecurring(recurring.description);
    onClose();
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div className="w-full max-w-lg bg-surface border border-border rounded-t-2xl md:rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <h3 className="text-text-primary font-medium text-base leading-snug">{recurring.description}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-text-muted font-mono text-sm">
                ~${recurring.estimatedMonthlyAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo
              </span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  recurring.confidence === 'high'
                    ? 'bg-accent-green/10 text-accent-green'
                    : recurring.confidence === 'medium'
                    ? 'bg-accent-amber/10 text-accent-amber'
                    : 'bg-border text-text-muted'
                }`}
              >
                {recurring.confidence} confidence
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors p-1 -mr-1 -mt-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Transaction history */}
        <div className="overflow-y-auto max-h-[50vh]">
          {matchingTxns.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">No transaction history found.</p>
          ) : (
            <div className="divide-y divide-border">
              {matchingTxns.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-text-primary text-sm">{t.description}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {t.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      {t.category && (
                        <span className="ml-2 text-text-muted opacity-60">{t.category}</span>
                      )}
                    </p>
                  </div>
                  <span className="font-mono text-sm text-text-primary ml-4 shrink-0">
                    {Math.abs(t.amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-border text-text-muted text-sm rounded hover:border-text-muted transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleRemove}
            className="flex-1 py-2 bg-accent-red/10 text-accent-red border border-accent-red/20 text-sm rounded hover:bg-accent-red/20 transition-colors"
          >
            Remove from recurring
          </button>
        </div>
      </div>
    </div>
  );
}
