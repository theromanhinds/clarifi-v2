import { useState } from 'react';
import { EngineOutput } from '@/types';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/utils/formatters';

interface SummaryCardsProps {
  engine: EngineOutput;
}

type SolveFor = 'surplus' | 'income' | 'expenses';

// ── Shared icons ──────────────────────────────────────────────────────────────

const PENCIL = (
  <svg className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L12 16H9v-3z" />
  </svg>
);

const RESET_ICON = (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// Small footer shown on each card indicating its role
function SolveForFooter({
  isOutput,
  onSolveFor,
  onReset,
}: {
  isOutput: boolean;
  onSolveFor?: () => void;
  onReset?: () => void;
}) {
  if (isOutput) {
    return (
      <div className="mt-auto flex items-center justify-between pt-2">
        <span className="text-xs text-accent-blue opacity-70 font-mono">= calculated</span>
        {onReset && (
          <button onClick={onReset} title="Reset to default (solve for surplus)" className="text-accent-blue/60 hover:text-text-muted transition-colors text-xs">
            reset
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="mt-auto pt-2">
      {onSolveFor && (
        <button
          onClick={onSolveFor}
          className="text-xs text-text-muted hover:text-text-primary transition-colors flex items-center gap-1"
          title="Solve for this value instead"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          solve for this
        </button>
      )}
    </div>
  );
}

// Inline number editor shared between cards
function InlineEdit({
  value,
  onCommit,
  onCancel,
}: {
  value: string;
  onCommit: (raw: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <div className="flex items-center gap-1">
      <span className="text-text-muted font-mono text-2xl">$</span>
      <input
        autoFocus
        className="flex-1 min-w-0 bg-background border border-accent-blue rounded px-1 py-0.5 font-mono text-2xl text-text-primary outline-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit(draft);
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={() => onCommit(draft)}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SummaryCards({ engine }: SummaryCardsProps) {
  const {
    setIncomeOverride,
    setDiscretionaryOverride,
    setSolveMode,
    state,
  } = useApp();

  const solveFor: SolveFor =
    (state.status === 'loaded' ? state.solveFor : undefined) ?? 'surplus';
  const targetSurplus =
    state.status === 'loaded' && state.targetSurplus != null
      ? state.targetSurplus
      : engine.monthlySurplus;

  const hasIncomeOverride =
    state.status === 'loaded' && state.incomeOverride != null && state.incomeOverride > 0;
  const hasDiscretionaryOverride =
    state.status === 'loaded' && state.discretionaryOverride !== undefined;

  const [editingIncome, setEditingIncome] = useState(false);
  const [editingDiscretionary, setEditingDiscretionary] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);

  const bills = engine.hardBillsMonthly;
  const debt = engine.debtMonthly;
  const discretionary = engine.discretionaryMonthly;

  function commitIncome(raw: string) {
    const val = parseFloat(raw.replace(/[$,]/g, ''));
    if (!isNaN(val) && val >= 0) setIncomeOverride(val);
    setEditingIncome(false);
  }

  function commitDiscretionary(raw: string) {
    const val = parseFloat(raw.replace(/[$,]/g, ''));
    if (!isNaN(val) && val >= 0) setDiscretionaryOverride(val);
    setEditingDiscretionary(false);
  }

  function commitTarget(raw: string) {
    const val = parseFloat(raw.replace(/[$,]/g, ''));
    if (!isNaN(val)) setSolveMode(solveFor, val);
    setEditingTarget(false);
  }

  const incomeIsOutput = solveFor === 'income';
  const expensesIsOutput = solveFor === 'expenses';
  const surplusIsOutput = solveFor === 'surplus';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

      {/* ── Income Card ── */}
      <div className={`bg-surface border rounded-lg p-4 flex flex-col gap-2 ${incomeIsOutput ? 'border-accent-blue/40' : 'border-border'}`}>
        <div className="flex items-center justify-between">
          <span className="text-text-muted text-xs uppercase tracking-wider">
            {incomeIsOutput ? 'Income Needed' : 'Monthly Income'}
          </span>
          {!incomeIsOutput && hasIncomeOverride && (
            <button onClick={() => setIncomeOverride(null)} title="Reset to detected income" className="text-text-muted hover:text-accent-amber transition-colors">
              {RESET_ICON}
            </button>
          )}
        </div>

        {incomeIsOutput ? (
          <span className="font-mono text-2xl font-medium text-accent-blue">
            {formatCurrency(engine.averageMonthlyIncome)}
          </span>
        ) : editingIncome ? (
          <InlineEdit
            value={Math.round(engine.averageMonthlyIncome).toString()}
            onCommit={commitIncome}
            onCancel={() => setEditingIncome(false)}
          />
        ) : (
          <button onClick={() => setEditingIncome(true)} className="flex items-center gap-2 text-left group" title="Click to adjust">
            <span className={`font-mono text-2xl font-medium ${hasIncomeOverride ? 'text-accent-amber' : 'text-text-primary'}`}>
              {formatCurrency(engine.averageMonthlyIncome)}
            </span>
            {PENCIL}
          </button>
        )}

        <SolveForFooter
          isOutput={incomeIsOutput}
          onSolveFor={() => setSolveMode('income', targetSurplus)}
          onReset={incomeIsOutput ? () => setSolveMode('surplus') : undefined}
        />

        {/* Annual salary breakdown — post-tax input, 30% NYC effective rate */}
        {(() => {
          const monthly = engine.averageMonthlyIncome;
          const annualPostTax = monthly * 12;
          const annualPreTax = annualPostTax / 0.70;
          return (
            <div className="space-y-0.5 pt-2 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Annual post-tax</span>
                <span className="font-mono text-text-muted">{formatCurrency(annualPostTax)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Annual pre-tax <span className="opacity-50">(≈30% NYC)</span></span>
                <span className="font-mono text-text-muted">{formatCurrency(annualPreTax)}</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Expenses Card ── */}
      <div className={`bg-surface border rounded-lg p-4 flex flex-col gap-2 ${expensesIsOutput ? 'border-accent-blue/40' : 'border-border'}`}>
        <div className="flex items-center justify-between">
          <span className="text-text-muted text-xs uppercase tracking-wider">
            {expensesIsOutput ? 'Max Expenses' : 'Monthly Expenses'}
          </span>
        </div>

        <span className={`font-mono text-2xl font-medium ${expensesIsOutput ? 'text-accent-blue' : 'text-text-primary'}`}>
          {formatCurrency(engine.averageMonthlyExpenses)}
        </span>

        <div className="space-y-1 pt-1 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Bills</span>
            <span className="font-mono text-text-primary">{formatCurrency(bills)}</span>
          </div>
          {debt > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Debt</span>
              <span className="font-mono text-accent-amber">{formatCurrency(debt)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <span className="text-text-muted">Spending</span>
              {!expensesIsOutput && hasDiscretionaryOverride && (
                <button onClick={() => setDiscretionaryOverride(engine.discretionaryMonthly)} title="Reset spending" className="text-text-muted hover:text-accent-amber transition-colors">
                  {RESET_ICON}
                </button>
              )}
            </div>
            {!expensesIsOutput && editingDiscretionary ? (
              <div className="flex items-center gap-1">
                <span className="text-text-muted">$</span>
                <input
                  autoFocus
                  className="w-20 bg-background border border-accent-blue rounded px-1 py-0.5 font-mono text-xs text-text-primary outline-none"
                  defaultValue={Math.round(discretionary).toString()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitDiscretionary((e.target as HTMLInputElement).value);
                    if (e.key === 'Escape') setEditingDiscretionary(false);
                  }}
                  onBlur={(e) => commitDiscretionary(e.target.value)}
                />
              </div>
            ) : (
              <button
                onClick={expensesIsOutput ? undefined : () => setEditingDiscretionary(true)}
                className={`flex items-center gap-1 font-mono ${expensesIsOutput ? 'text-accent-blue cursor-default' : 'text-text-primary hover:text-accent-blue transition-colors group'}`}
                title={expensesIsOutput ? undefined : 'Click to adjust'}
                disabled={expensesIsOutput}
              >
                {formatCurrency(discretionary)}
                {!expensesIsOutput && PENCIL}
              </button>
            )}
          </div>
        </div>

        <SolveForFooter
          isOutput={expensesIsOutput}
          onSolveFor={() => setSolveMode('expenses', targetSurplus)}
          onReset={expensesIsOutput ? () => setSolveMode('surplus') : undefined}
        />
      </div>

      {/* ── Surplus Card ── */}
      <div className={`bg-surface border rounded-lg p-4 flex flex-col gap-2 ${!surplusIsOutput ? 'border-accent-amber/40' : 'border-border'}`}>
        <span className="text-text-muted text-xs uppercase tracking-wider">
          {surplusIsOutput ? 'Monthly Surplus' : 'Target Surplus'}
        </span>

        {surplusIsOutput ? (
          <span className={`font-mono text-2xl font-medium ${engine.monthlySurplus >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {formatCurrency(engine.monthlySurplus)}
          </span>
        ) : editingTarget ? (
          <InlineEdit
            value={Math.round(targetSurplus).toString()}
            onCommit={commitTarget}
            onCancel={() => setEditingTarget(false)}
          />
        ) : (
          <button onClick={() => setEditingTarget(true)} className="flex items-center gap-2 text-left group" title="Click to adjust target surplus">
            <span className="font-mono text-2xl font-medium text-accent-amber">
              {formatCurrency(targetSurplus)}
            </span>
            {PENCIL}
          </button>
        )}

        {!surplusIsOutput && (
          <p className="text-text-muted text-xs">
            {solveFor === 'income'
              ? `You need ${formatCurrency(engine.averageMonthlyIncome)}/mo`
              : `Keep expenses under ${formatCurrency(engine.averageMonthlyExpenses)}/mo`}
          </p>
        )}

        <SolveForFooter
          isOutput={surplusIsOutput}
          onSolveFor={undefined}
        />
      </div>

    </div>
  );
}

