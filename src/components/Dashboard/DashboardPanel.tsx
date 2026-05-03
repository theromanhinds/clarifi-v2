import { useState } from 'react';
import { EngineOutput, LifeEvent, RecurringExpense, CategorySummary, Transaction } from '@/types';
import { SummaryCards } from './SummaryCards';
import { ProjectionChart } from './ProjectionChart';
import { RiskFlags } from './RiskFlags';
import { LifeEvents } from './LifeEvents';
import { RecurringDetail } from './RecurringDetail';
import { CategoryDetail } from './CategoryDetail';
import { ResetButton } from '@/components/shared/ResetButton';
import { formatCurrency } from '@/utils/formatters';
import { useApp } from '@/context/AppContext';

interface DashboardPanelProps {
  engine: EngineOutput;
  lifeEvents: LifeEvent[];
  transactions: Transaction[];
}

export function DashboardPanel({ engine, lifeEvents, transactions }: DashboardPanelProps) {
  const [activeRecurring, setActiveRecurring] = useState<RecurringExpense | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategorySummary | null>(null);
  const { overrideRecurringAmount, setCategorySpendingOverride, state } = useApp();

  // Per-bill inline editing state
  const [editingBill, setEditingBill] = useState<string | null>(null);
  const [billDraft, setBillDraft] = useState('');

  // Per-category inline editing state
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState('');

  const recurringOverrides =
    state.status === 'loaded' ? (state.recurringOverrides ?? {}) : {};
  const categorySpendingOverrides =
    state.status === 'loaded' ? (state.categorySpendingOverrides ?? {}) : {};

  function startEditBill(description: string, currentAmount: number, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingBill(description);
    setBillDraft(Math.round(currentAmount).toString());
  }

  function commitBillEdit(description: string) {
    const val = parseFloat(billDraft.replace(/[$,]/g, ''));
    if (!isNaN(val) && val >= 0) overrideRecurringAmount(description, val);
    setEditingBill(null);
  }

  function resetBill(description: string, e: React.MouseEvent) {
    e.stopPropagation();
    overrideRecurringAmount(description, null);
  }

  function startEditCategory(category: string, currentAmount: number, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingCategory(category);
    setCategoryDraft(Math.round(currentAmount).toString());
  }

  function commitCategoryEdit(category: string) {
    const val = parseFloat(categoryDraft.replace(/[$,]/g, ''));
    if (!isNaN(val) && val >= 0) setCategorySpendingOverride(category, val);
    setEditingCategory(null);
  }

  function resetCategory(category: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCategorySpendingOverride(category, null);
  }

  return (
    <div className="flex flex-col gap-4 overflow-y-auto h-full pr-1">
      {/* Balance pill */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-muted text-xs uppercase tracking-wider">Current Balance</p>
          <p className="font-mono text-3xl font-medium text-text-primary mt-0.5">
            {formatCurrency(engine.currentBalance)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-text-muted text-xs">Generated</p>
          <p className="text-text-muted text-xs font-mono">
            {engine.generatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      <SummaryCards engine={engine} />
      <ProjectionChart projectionMonths={engine.projectionMonths} />

      {engine.riskFlags.length > 0 && <RiskFlags flags={engine.riskFlags} />}

      <LifeEvents lifeEvents={lifeEvents} />

      {/* Bills & Subscriptions */}
      {engine.recurringExpenses.some((r) => r.isHardBill) && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-text-muted text-xs uppercase tracking-wider">
              Bills &amp; Subscriptions
            </h3>
            <span className="font-mono text-sm text-text-primary">
              {formatCurrency(engine.hardBillsMonthly)}<span className="text-text-muted text-xs">/mo</span>
            </span>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {engine.recurringExpenses
              .filter((r) => r.isHardBill)
              .map((r, i) => {
                const isOverridden = recurringOverrides[r.description] !== undefined;
                const isEditingThis = editingBill === r.description;
                return (
                  <div
                    key={i}
                    className="w-full flex items-center justify-between text-sm px-2 py-2 rounded hover:bg-background transition-colors duration-150 group"
                  >
                    {/* Description — click to open detail modal */}
                    <button
                      onClick={() => setActiveRecurring(r)}
                      className="flex-1 truncate text-left text-text-primary max-w-[45%]"
                    >
                      {r.description}
                    </button>

                    {/* Amount + controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isEditingThis ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <span className="text-text-muted font-mono text-xs">$</span>
                          <input
                            autoFocus
                            className="w-16 bg-background border border-accent-blue rounded px-1 py-0.5 font-mono text-xs text-text-primary outline-none"
                            value={billDraft}
                            onChange={(e) => setBillDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitBillEdit(r.description);
                              if (e.key === 'Escape') setEditingBill(null);
                            }}
                            onBlur={() => commitBillEdit(r.description)}
                          />
                          <span className="text-text-muted font-mono text-xs">/mo</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => startEditBill(r.description, r.estimatedMonthlyAmount, e)}
                          className={`flex items-center gap-1 font-mono text-xs group/amt ${isOverridden ? 'text-accent-amber' : 'text-text-primary'} hover:text-accent-blue transition-colors`}
                          title="Click to edit"
                        >
                          {formatCurrency(r.estimatedMonthlyAmount)}/mo
                          <svg className="w-2.5 h-2.5 opacity-0 group-hover/amt:opacity-60 transition-opacity shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L12 16H9v-3z" />
                          </svg>
                        </button>
                      )}

                      {/* Reset override */}
                      {isOverridden && !isEditingThis && (
                        <button
                          onClick={(e) => resetBill(r.description, e)}
                          title="Reset to detected amount"
                          className="text-accent-amber hover:text-text-primary transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      )}

                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          r.confidence === 'high'
                            ? 'bg-accent-green/10 text-accent-green'
                            : r.confidence === 'medium'
                            ? 'bg-accent-amber/10 text-accent-amber'
                            : 'bg-border text-text-muted'
                        }`}
                      >
                        {r.confidence}
                      </span>
                      <svg
                        className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        onClick={() => setActiveRecurring(r)}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Top categories */}
      {engine.topSpendingCategories.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-text-muted text-xs uppercase tracking-wider">
              Spending by Category
            </h3>
            <span className="font-mono text-sm text-text-primary">
              {formatCurrency(
                engine.topSpendingCategories.reduce((s, c) => s + c.monthlyAverage, 0)
              )}<span className="text-text-muted text-xs">/mo</span>
            </span>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {engine.topSpendingCategories.map((c, i) => {
              const isOverridden = categorySpendingOverrides[c.category] !== undefined;
              const isEditingThis = editingCategory === c.category;
              return (
                <div
                  key={i}
                  onClick={() => !isEditingThis && setActiveCategory(c)}
                  className="w-full flex flex-col gap-1 px-2 py-2 rounded hover:bg-background transition-colors duration-150 group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-sm">
                  {/* Name */}
                  <span className="flex-1 truncate text-left text-text-primary max-w-[45%]">
                    {c.category}
                  </span>

                  {/* Amount + controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isEditingThis ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <span className="text-text-muted font-mono text-xs">$</span>
                        <input
                          autoFocus
                          className="w-16 bg-background border border-accent-blue rounded px-1 py-0.5 font-mono text-xs text-text-primary outline-none"
                          value={categoryDraft}
                          onChange={(e) => setCategoryDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitCategoryEdit(c.category);
                            if (e.key === 'Escape') setEditingCategory(null);
                          }}
                          onBlur={() => commitCategoryEdit(c.category)}
                        />
                        <span className="text-text-muted font-mono text-xs">/mo</span>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => startEditCategory(c.category, c.monthlyAverage, e)}
                        className={`flex items-center gap-1 font-mono text-xs group/amt ${
                          isOverridden ? 'text-accent-amber' : 'text-text-muted'
                        } hover:text-accent-blue transition-colors`}
                        title="Click to edit"
                      >
                        {formatCurrency(c.monthlyAverage)}/mo
                        <svg className="w-2.5 h-2.5 opacity-0 group-hover/amt:opacity-60 transition-opacity shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L12 16H9v-3z" />
                        </svg>
                      </button>
                    )}

                    {isOverridden && !isEditingThis && (
                      <button
                        onClick={(e) => { e.stopPropagation(); resetCategory(c.category, e); }}
                        title="Reset to calculated amount"
                        className="text-accent-amber hover:text-text-primary transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    )}

                    <span className="text-text-muted text-xs">{c.percentOfExpenses.toFixed(0)}%</span>

                    <svg
                      className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-blue rounded-full"
                      style={{ width: `${Math.min(c.percentOfExpenses, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="pt-2 pb-4">
        <ResetButton />
      </div>

      {/* Recurring detail modal */}
      {activeRecurring && (
        <RecurringDetail
          recurring={activeRecurring}
          transactions={transactions}
          onClose={() => setActiveRecurring(null)}
        />
      )}

      {/* Category detail modal */}
      {activeCategory && (
        <CategoryDetail
          category={activeCategory}
          transactions={transactions}
          onClose={() => setActiveCategory(null)}
        />
      )}
    </div>
  );
}
