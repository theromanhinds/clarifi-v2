import { useEffect, useMemo, useState } from 'react';
import { CategorySummary, Transaction } from '@/types';
import { useApp } from '@/context/AppContext';

const ALL_CATEGORIES = [
  'Groceries', 'Dining', 'Transport', 'Subscriptions', 'Health',
  'Shopping', 'Rent/Utilities', 'Church/Giving', 'Debt', 'Income', 'Transfer', 'Other',
];

// ── Transaction group: all instances of one description ───────────────────────

interface TxnGroup {
  description: string;
  transactions: Transaction[];
  monthlyAvg: number;
  count: number;
}

function buildGroups(txns: Transaction[]): TxnGroup[] {
  const map = new Map<string, Transaction[]>();
  for (const t of txns) {
    const key = t.description.trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return Array.from(map.entries())
    .map(([desc, list]) => {
      const months = new Set(
        list.map((t) => `${t.date.getFullYear()}-${t.date.getMonth()}`)
      );
      const total = list.reduce((s, t) => s + Math.abs(t.amount), 0);
      return {
        description: desc,
        transactions: [...list].sort((a, b) => b.date.getTime() - a.date.getTime()),
        monthlyAvg: total / Math.max(months.size, 1),
        count: list.length,
      };
    })
    .sort((a, b) => b.monthlyAvg - a.monthlyAvg);
}

// ── Shared icon components ────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L12 16H9v-3z" />
    </svg>
  );
}

function ResetIcon({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} title={title} className="text-accent-amber hover:text-text-primary transition-colors ml-1">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </button>
  );
}

interface CategoryDetailProps {
  category: CategorySummary;
  transactions: Transaction[];
  onClose: () => void;
}

export function CategoryDetail({ category, transactions, onClose }: CategoryDetailProps) {
  const { recategorizeTransaction, excludeTransaction, setCategorySpendingOverride } = useApp();

  type View = 'groups' | 'detail';
  const [view, setView] = useState<View>('groups');
  const [activeGroup, setActiveGroup] = useState<TxnGroup | null>(null);

  // Locally overridden monthly averages (desc → user value). Display-only.
  const [avgOverrides, setAvgOverrides] = useState<Record<string, number>>({});
  const [editingAvg, setEditingAvg] = useState<string | null>(null);
  const [avgDraft, setAvgDraft] = useState('');

  // Group-level recategorize state (desc → new category)
  const [groupCats, setGroupCats] = useState<Record<string, string>>({});

  // Excluded transaction IDs
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  // Close / back on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (view === 'detail') { setView('groups'); setActiveGroup(null); }
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, view]);

  // Base transactions for this category
  const baseTxns = useMemo(
    () =>
      transactions.filter(
        (t) =>
          (t.category ?? 'Other') === category.category &&
          t.type !== 'transfer' &&
          !excludedIds.has(t.id)
      ),
    [transactions, category.category, excludedIds]
  );

  const groups = useMemo(() => buildGroups(baseTxns), [baseTxns]);

  function handleRecategorizeGroup(group: TxnGroup, newCat: string) {
    setGroupCats((prev) => ({ ...prev, [group.description]: newCat }));
    for (const t of group.transactions) {
      recategorizeTransaction(t.id, newCat);
    }
  }

  function handleExclude(id: string) {
    excludeTransaction(id);
    setExcludedIds((prev) => new Set([...prev, id]));
  }

  function handleExcludeGroup(group: TxnGroup) {
    for (const t of group.transactions) excludeTransaction(t.id);
    setExcludedIds((prev) => new Set([...prev, ...group.transactions.map((t) => t.id)]));
    // Remove this group's avg override if it existed, then recompute category total
    const newOverrides = { ...avgOverrides };
    delete newOverrides[group.description];
    setAvgOverrides(newOverrides);
    if (Object.keys(newOverrides).length === 0) {
      setCategorySpendingOverride(category.category, null);
    } else {
      const total = groups
        .filter((g) => g.description !== group.description)
        .reduce((s, g) => s + (newOverrides[g.description] ?? g.monthlyAvg), 0);
      setCategorySpendingOverride(category.category, total);
    }
  }

  function startEditAvg(desc: string, currentAvg: number) {
    setEditingAvg(desc);
    setAvgDraft(Math.round(currentAvg).toString());
  }

  // Dispatch updated category total to engine whenever avg overrides change
  function dispatchCategoryTotal(newOverrides: Record<string, number>) {
    if (Object.keys(newOverrides).length === 0) {
      setCategorySpendingOverride(category.category, null);
    } else {
      const total = groups.reduce((s, g) => s + (newOverrides[g.description] ?? g.monthlyAvg), 0);
      setCategorySpendingOverride(category.category, total);
    }
  }

  function commitAvgEdit(desc: string) {
    const val = parseFloat(avgDraft.replace(/[$,]/g, ''));
    if (!isNaN(val) && val >= 0) {
      const newOverrides = { ...avgOverrides, [desc]: val };
      setAvgOverrides(newOverrides);
      dispatchCategoryTotal(newOverrides);
    }
    setEditingAvg(null);
  }

  // ── Level 2: individual transactions ─────────────────────────────────────

  if (view === 'detail' && activeGroup) {
    const visibleTxns = activeGroup.transactions.filter((t) => !excludedIds.has(t.id));
    return (
      <div
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) { setView('groups'); setActiveGroup(null); } }}
      >
        <div className="w-full max-w-lg bg-surface border border-border rounded-t-2xl md:rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
          <div className="flex items-start justify-between p-5 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => { setView('groups'); setActiveGroup(null); }}
                className="text-text-muted hover:text-text-primary transition-colors shrink-0"
                aria-label="Back"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="min-w-0">
                <p className="text-text-muted text-xs">{category.category}</p>
                <h3 className="text-text-primary font-medium text-base truncate">{activeGroup.description}</h3>
              </div>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1 -mr-1 -mt-1 shrink-0" aria-label="Close">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto max-h-[55vh]">
            {visibleTxns.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-8">No transactions remaining.</p>
            ) : (
              <div className="divide-y divide-border">
                {visibleTxns.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <p className="text-text-muted text-xs flex-1">
                      {t.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <span className="font-mono text-sm text-text-primary shrink-0">
                      ${Math.abs(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => handleExclude(t.id)}
                      className="text-xs text-text-muted hover:text-accent-red transition-colors shrink-0"
                      title="Exclude from calculations"
                    >
                      exclude
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border">
            <button
              onClick={() => { setView('groups'); setActiveGroup(null); }}
              className="w-full py-2 border border-border text-text-muted text-sm rounded hover:border-text-muted transition-colors"
            >
              ← Back to groups
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Level 1: group list ───────────────────────────────────────────────────

  const totalMonthlyAvg = groups.reduce((s, g) => s + (avgOverrides[g.description] ?? g.monthlyAvg), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-surface border border-border rounded-t-2xl md:rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <h3 className="text-text-primary font-medium text-base leading-snug">{category.category}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-text-muted font-mono text-sm">
                ${totalMonthlyAvg.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo avg
              </span>
              <span className="text-text-muted text-xs">·</span>
              <span className="text-text-muted text-xs">{groups.length} unique payees</span>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1 -mr-1 -mt-1" aria-label="Close">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Group list */}
        <div className="overflow-y-auto max-h-[55vh]">
          {groups.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">No transactions in this category.</p>
          ) : (
            <div className="divide-y divide-border">
              {groups
                .filter((g) => !groupCats[g.description] || groupCats[g.description] === category.category)
                .map((g) => {
                  const overriddenAvg = avgOverrides[g.description];
                  const displayAvg = overriddenAvg ?? g.monthlyAvg;
                  const isEditingThis = editingAvg === g.description;

                  return (
                    <div key={g.description} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        {/* Left: description + recategorize */}
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => { setActiveGroup(g); setView('detail'); }}
                            className="text-text-primary text-sm text-left hover:text-accent-blue transition-colors flex items-center gap-1 group w-full"
                            title="Click to see individual transactions"
                          >
                            <span className="truncate">{g.description}</span>
                            <svg className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-60 transition-opacity shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <p className="text-text-muted text-xs mt-0.5">
                            {g.count} transaction{g.count !== 1 ? 's' : ''}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <select
                              value={groupCats[g.description] ?? category.category}
                              onChange={(e) => handleRecategorizeGroup(g, e.target.value)}
                              className="text-xs bg-background border border-border rounded px-1.5 py-1 text-text-muted hover:border-text-muted focus:outline-none focus:border-accent-blue transition-colors"
                            >
                              {ALL_CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleExcludeGroup(g)}
                              className="text-xs text-text-muted hover:text-accent-red transition-colors whitespace-nowrap"
                              title="Exclude all transactions in this group from calculations"
                            >
                              exclude all
                            </button>
                          </div>
                        </div>

                        {/* Right: editable monthly average */}
                        <div className="shrink-0 flex flex-col items-end gap-1 pt-0.5">
                          {isEditingThis ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <span className="text-text-muted text-xs font-mono">$</span>
                              <input
                                autoFocus
                                className="w-16 bg-background border border-accent-blue rounded px-1 py-0.5 font-mono text-xs text-text-primary outline-none"
                                value={avgDraft}
                                onChange={(e) => setAvgDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitAvgEdit(g.description);
                                  if (e.key === 'Escape') setEditingAvg(null);
                                }}
                                onBlur={() => commitAvgEdit(g.description)}
                              />
                              <span className="text-text-muted text-xs font-mono">/mo</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <button
                                onClick={() => startEditAvg(g.description, displayAvg)}
                                className={`flex items-center gap-1 font-mono text-xs group ${overriddenAvg !== undefined ? 'text-accent-amber' : 'text-text-primary'} hover:text-accent-blue transition-colors`}
                                title="Click to adjust"
                              >
                                ${displayAvg.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo
                                <PencilIcon />
                              </button>
                              {overriddenAvg !== undefined && (
                                <ResetIcon
                                  onClick={() => {
                                    const n = { ...avgOverrides };
                                    delete n[g.description];
                                    setAvgOverrides(n);
                                    dispatchCategoryTotal(n);
                                  }}
                                  title="Reset to historical average"
                                />
                              )}
                            </div>
                          )}
                          {overriddenAvg !== undefined && (
                            <span className="text-text-muted text-xs">
                              was ${g.monthlyAvg.toLocaleString('en-US', { maximumFractionDigits: 0 })}/mo
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-2 border border-border text-text-muted text-sm rounded hover:border-text-muted transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
