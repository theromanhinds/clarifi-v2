import { useState, useCallback, useRef, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { parseCSV, ColumnMapping } from '@/engine/parser';
import { categorizeBatch } from '@/ai/categorizer';
import { Spinner } from '@/components/shared/Spinner';
import { CSVMapper } from './CSVMapper';
import { Transaction } from '@/types';
import { SANDBOX_TRANSACTIONS, SANDBOX_BALANCE, SANDBOX_INCOME, SANDBOX_PAY_FREQUENCY } from '@/data/sandboxData';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_CATEGORIES = [
  'Groceries', 'Dining', 'Transport', 'Subscriptions', 'Health',
  'Shopping', 'Rent/Utilities', 'Church/Giving', 'Debt', 'Income', 'Transfer', 'Other',
];

const PAY_FREQUENCIES = [
  { value: 'weekly',        label: 'Weekly' },
  { value: 'bi-weekly',     label: 'Bi-weekly (every 2 weeks)' },
  { value: 'semi-monthly',  label: 'Semi-monthly (twice a month)' },
  { value: 'monthly',       label: 'Monthly' },
];

// ─── Wizard progress bar ─────────────────────────────────────────────────────

type WizardStep = 'balance' | 'income' | 'transfers' | 'spotcheck';
const WIZARD_STEPS: WizardStep[] = ['balance', 'income', 'transfers', 'spotcheck'];
const STEP_LABELS: Record<WizardStep, string> = {
  balance: 'Balance',
  income: 'Income',
  transfers: 'Transfers',
  spotcheck: 'Verify',
};

function WizardProgress({ current }: { current: WizardStep }) {
  const idx = WIZARD_STEPS.indexOf(current);
  return (
    <div className="flex items-center gap-2 mb-8">
      {WIZARD_STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${
                i < idx
                  ? 'bg-accent-green text-black'
                  : i === idx
                  ? 'bg-accent-blue text-white'
                  : 'bg-surface border border-border text-text-muted'
              }`}
            >
              {i < idx ? '✓' : i + 1}
            </div>
            <span className={`text-[10px] mt-1 ${i === idx ? 'text-text-primary' : 'text-text-muted'}`}>
              {STEP_LABELS[step]}
            </span>
          </div>
          {i < WIZARD_STEPS.length - 1 && (
            <div className={`h-px w-8 mb-4 transition-all duration-200 ${i < idx ? 'bg-accent-green' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Balance ─────────────────────────────────────────────────────────

function BalanceStep({
  inferredBalance,
  onNext,
}: {
  inferredBalance: number;
  onNext: (balance: number | undefined) => void;
}) {
  const [value, setValue] = useState('');
  const formatted = inferredBalance.toLocaleString('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  });

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      <div className="text-center mb-4">
        <p className="text-text-primary font-medium">What's your current balance?</p>
        <p className="text-text-muted text-xs mt-1">
          We inferred {formatted} from your transactions. Your real balance may differ.
        </p>
      </div>
      <input
        type="number"
        placeholder={`${inferredBalance.toFixed(2)} (inferred)`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        className="w-full px-3 py-2 bg-background border border-border rounded text-text-primary font-mono text-sm focus:outline-none focus:border-accent-blue transition-colors"
      />
      <button
        onClick={() => { const n = parseFloat(value); onNext(isNaN(n) ? undefined : n); }}
        className="w-full py-2 bg-accent-green text-black text-sm font-medium rounded hover:opacity-80 transition-all duration-150"
      >
        {value ? 'Use my balance' : 'Use inferred balance'}
      </button>
    </div>
  );
}

// ─── Step 2: Income ──────────────────────────────────────────────────────────

function IncomeStep({
  detectedIncome,
  onNext,
  onBack,
}: {
  detectedIncome: number;
  onNext: (income: number | undefined, payFrequency: string) => void;
  onBack: () => void;
}) {
  const [value, setValue] = useState('');
  const [payFreq, setPayFreq] = useState('bi-weekly');
  const hasDetected = detectedIncome > 100;
  const formattedDetected = detectedIncome.toLocaleString('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  });

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      <div className="text-center mb-4">
        <p className="text-text-primary font-medium">Confirm your income</p>
        {hasDetected ? (
          <p className="text-text-muted text-xs mt-1">
            We detected ~{formattedDetected}/mo in this account.
            If your paycheck deposits elsewhere (e.g. savings), enter the correct amount.
          </p>
        ) : (
          <p className="text-text-muted text-xs mt-1">
            No income found in this account — your paycheck likely deposits elsewhere.
            Enter your monthly take-home for accurate projections.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-text-muted text-xs block mb-1">Monthly take-home pay</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-mono">$</span>
            <input
              type="number"
              placeholder={hasDetected ? String(Math.round(detectedIncome)) : 'e.g. 4500'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              className="w-full pl-7 pr-3 py-2 bg-background border border-border rounded text-text-primary font-mono text-sm focus:outline-none focus:border-accent-blue transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="text-text-muted text-xs block mb-1">Pay schedule</label>
          <select
            value={payFreq}
            onChange={(e) => setPayFreq(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded text-text-primary text-sm focus:outline-none focus:border-accent-blue transition-colors"
          >
            {PAY_FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      {!value && !hasDetected && (
        <p className="text-accent-amber text-xs text-center">
          Projections will assume $0 income until confirmed. You can adjust this later via life events.
        </p>
      )}

      <div className="flex gap-2">
        <button onClick={onBack} className="flex-1 py-2 border border-border text-text-muted text-sm rounded hover:border-text-muted transition-colors">
          Back
        </button>
        <button
          onClick={() => { const n = parseFloat(value); onNext(isNaN(n) ? undefined : n, payFreq); }}
          className="flex-1 py-2 bg-accent-green text-black text-sm font-medium rounded hover:opacity-80 transition-all duration-150"
        >
          {value ? 'Use this income' : hasDetected ? 'Use detected income' : 'Skip for now'}
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Transfer review ─────────────────────────────────────────────────

interface TransferGroup {
  description: string;
  ids: string[];
  totalAmount: number;
  count: number;
}

function groupTransfers(transfers: Transaction[]): TransferGroup[] {
  const map = new Map<string, TransferGroup>();
  for (const t of transfers) {
    const key = t.description.trim();
    if (!map.has(key)) {
      map.set(key, { description: key, ids: [], totalAmount: 0, count: 0 });
    }
    const g = map.get(key)!;
    g.ids.push(t.id);
    g.totalAmount += t.amount;
    g.count += 1;
  }
  // Sort by count descending so highest-frequency groups appear first
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function TransferStep({
  transfers,
  onNext,
  onBack,
}: {
  transfers: Transaction[];
  onNext: (unmarkedIds: Set<string>) => void;
  onBack: () => void;
}) {
  const groups = useMemo(() => groupTransfers(transfers), [transfers]);
  // Track which group descriptions are unmarked (not transfers)
  const [unmarkedGroups, setUnmarkedGroups] = useState<Set<string>>(new Set());

  const toggle = (description: string) =>
    setUnmarkedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(description)) next.delete(description); else next.add(description);
      return next;
    });

  const unmarkedIdCount = groups
    .filter((g) => unmarkedGroups.has(g.description))
    .reduce((sum, g) => sum + g.count, 0);

  const buildUnmarkedIds = (): Set<string> => {
    const ids = new Set<string>();
    for (const g of groups) {
      if (unmarkedGroups.has(g.description)) {
        for (const id of g.ids) ids.add(id);
      }
    }
    return ids;
  };

  if (transfers.length === 0) {
    return (
      <div className="w-full max-w-sm mx-auto space-y-4 text-center">
        <p className="text-text-primary font-medium">No transfers detected</p>
        <p className="text-text-muted text-xs">No internal transfers found in your history.</p>
        <div className="flex gap-2">
          <button onClick={onBack} className="flex-1 py-2 border border-border text-text-muted text-sm rounded hover:border-text-muted transition-colors">Back</button>
          <button onClick={() => onNext(new Set())} className="flex-1 py-2 bg-accent-green text-black text-sm font-medium rounded hover:opacity-80 transition-all duration-150">Next</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      <div className="text-center mb-2">
        <p className="text-text-primary font-medium">Review transfers</p>
        <p className="text-text-muted text-xs mt-1">
          We excluded {transfers.length} transaction{transfers.length !== 1 ? 's' : ''} ({groups.length} unique) as internal transfers.
          Tap any that are actually real expenses or income.
        </p>
      </div>

      <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
        {groups.map((g) => {
          const isUnmarked = unmarkedGroups.has(g.description);
          const avgAmount = g.totalAmount / g.count;
          return (
            <div
              key={g.description}
              onClick={() => toggle(g.description)}
              className={`flex items-center justify-between p-3 rounded border text-sm cursor-pointer select-none transition-all duration-150 ${
                isUnmarked
                  ? 'border-accent-amber bg-accent-amber/5'
                  : 'border-border bg-surface hover:border-text-muted'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-text-primary truncate">{g.description}</p>
                <p className="text-text-muted text-xs">
                  {g.count} transaction{g.count !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-2 shrink-0">
                <span className={`font-mono text-xs ${avgAmount > 0 ? 'text-accent-green' : 'text-text-muted'}`}>
                  avg {avgAmount > 0 ? '+' : ''}{avgAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </span>
                {isUnmarked && <span className="text-accent-amber text-xs whitespace-nowrap">not a transfer</span>}
              </div>
            </div>
          );
        })}
      </div>

      {unmarkedGroups.size > 0 && (
        <p className="text-text-muted text-xs text-center">
          {unmarkedIdCount} transaction{unmarkedIdCount !== 1 ? 's' : ''} ({unmarkedGroups.size} group{unmarkedGroups.size !== 1 ? 's' : ''}) will be reclassified
        </p>
      )}

      <div className="flex gap-2">
        <button onClick={onBack} className="flex-1 py-2 border border-border text-text-muted text-sm rounded hover:border-text-muted transition-colors">Back</button>
        <button
          onClick={() => onNext(buildUnmarkedIds())}
          className="flex-1 py-2 bg-accent-green text-black text-sm font-medium rounded hover:opacity-80 transition-all duration-150"
        >
          {unmarkedGroups.size > 0 ? `Reclassify ${unmarkedIdCount}` : 'Looks good'}
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Category spot-check ─────────────────────────────────────────────

function SpotCheckStep({
  topExpenses,
  onNext,
  onBack,
}: {
  topExpenses: Transaction[];
  onNext: (edits: Map<string, string>) => void;
  onBack: () => void;
}) {
  const [edits, setEdits] = useState<Map<string, string>>(new Map());

  const setCategory = (id: string, cat: string) =>
    setEdits((prev) => new Map(prev).set(id, cat));

  const editCount = edits.size;

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      <div className="text-center mb-2">
        <p className="text-text-primary font-medium">Do these look right?</p>
        <p className="text-text-muted text-xs mt-1">
          Here are your biggest transactions. Fix any categories that look wrong.
        </p>
      </div>

      <div className="space-y-2">
        {topExpenses.map((t) => (
          <div key={t.id} className="flex items-center gap-2 p-3 bg-surface border border-border rounded text-sm">
            <div className="flex-1 min-w-0">
              <p className="text-text-primary truncate text-sm">{t.description}</p>
              <p className="text-text-muted text-xs">
                {t.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' · '}
                <span className="font-mono">{Math.abs(t.amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
              </p>
            </div>
            <select
              value={edits.get(t.id) ?? (t.category ?? 'Other')}
              onChange={(e) => setCategory(t.id, e.target.value)}
              className="bg-background border border-border rounded text-text-primary text-xs px-2 py-1 focus:outline-none focus:border-accent-blue shrink-0 transition-colors"
            >
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {editCount > 0 && (
        <p className="text-text-muted text-xs text-center">{editCount} correction{editCount !== 1 ? 's' : ''} noted</p>
      )}

      <div className="flex gap-2">
        <button onClick={onBack} className="flex-1 py-2 border border-border text-text-muted text-sm rounded hover:border-text-muted transition-colors">Back</button>
        <button
          onClick={() => onNext(edits)}
          className="flex-1 py-2 bg-accent-green text-black text-sm font-medium rounded hover:opacity-80 transition-all duration-150"
        >
          Analyze my finances
        </button>
      </div>
    </div>
  );
}

// ─── Main upload screen ───────────────────────────────────────────────────────

type Stage = 'idle' | 'mapping' | 'analyzing' | 'categorizing' | 'error';

export function UploadScreen() {
  const { loadTransactions } = useApp();

  const loadSandbox = useCallback(() => {
    loadTransactions(SANDBOX_TRANSACTIONS, {
      currentBalance: SANDBOX_BALANCE,
      incomeOverride: SANDBOX_INCOME,
      payFrequency: SANDBOX_PAY_FREQUENCY,
    });
  }, [loadTransactions]);
  const [stage, setStage] = useState<Stage>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [needsMapping, setNeedsMapping] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingMapping, setPendingMapping] = useState<ColumnMapping | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep | null>(null);
  const [editedTransactions, setEditedTransactions] = useState<Transaction[]>([]);
  const [inferredBalance, setInferredBalance] = useState(0);
  const [detectedIncome, setDetectedIncome] = useState(0);
  const [confirmedBalance, setConfirmedBalance] = useState<number | undefined>();
  const [confirmedIncome, setConfirmedIncome] = useState<number | undefined>();
  const [confirmedPayFreq, setConfirmedPayFreq] = useState('bi-weekly');

  const processFile = useCallback(async (file: File, mapping?: Partial<ColumnMapping>) => {
    setStage('analyzing');
    setError('');
    try {
      const result = await parseCSV(file, mapping);
      if (result.needsMapping) {
        setPendingFile(file);
        setPendingMapping(result.mapping);
        setNeedsMapping(true);
        setStage('mapping');
        return;
      }
      if (result.transactions.length === 0) {
        setError('No transactions could be parsed. Please check your CSV format.');
        setStage('error');
        return;
      }

      const txns = result.transactions;
      const inferred = txns.reduce((sum, t) => sum + t.amount, 0);

      // AI categorization pass — send unique "Other" descriptions to Gemini for better classification
      const otherDescs = [...new Set(txns.filter((t) => t.category === 'Other').map((t) => t.description))];
      let finalTxns = txns;
      if (otherDescs.length > 0) {
        setStage('categorizing');
        const aiCategories = await categorizeBatch(otherDescs);
        if (aiCategories.size > 0) {
          finalTxns = txns.map((t) => {
            if (t.category !== 'Other') return t;
            const newCat = aiCategories.get(t.description);
            return newCat ? { ...t, category: newCat } : t;
          });
        }
      }

      // Detect monthly income from the data (may be $0 if income lands in savings)
      const incomeByMonth = new Map<string, number>();
      for (const t of finalTxns) {
        if (t.type === 'income' && t.amount > 0) {
          const key = `${t.date.getFullYear()}-${t.date.getMonth()}`;
          incomeByMonth.set(key, (incomeByMonth.get(key) ?? 0) + t.amount);
        }
      }
      const avgMonthlyIncome =
        incomeByMonth.size > 0
          ? Array.from(incomeByMonth.values()).reduce((a, b) => a + b, 0) / incomeByMonth.size
          : 0;

      setEditedTransactions(finalTxns);
      setInferredBalance(inferred);
      setDetectedIncome(avgMonthlyIncome);
      setStage('idle');
      setWizardStep('balance');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV');
      setStage('error');
    }
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        setError('Please upload a .csv file.');
        setStage('error');
        return;
      }
      processFile(file);
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // ── Wizard step handlers ─────────────────────────────────────────────────

  const handleBalanceDone = useCallback((balance: number | undefined) => {
    setConfirmedBalance(balance);
    setWizardStep('income');
  }, []);

  const handleIncomeDone = useCallback((income: number | undefined, payFreq: string) => {
    setConfirmedIncome(income);
    setConfirmedPayFreq(payFreq);
    setWizardStep('transfers');
  }, []);

  const handleTransfersDone = useCallback((unmarkedIds: Set<string>) => {
    if (unmarkedIds.size > 0) {
      setEditedTransactions((prev) =>
        prev.map((t) =>
          unmarkedIds.has(t.id)
            ? { ...t, type: t.amount > 0 ? ('income' as const) : ('expense' as const) }
            : t
        )
      );
    }
    setWizardStep('spotcheck');
  }, []);

  const handleSpotCheckDone = useCallback(
    (categoryEdits: Map<string, string>) => {
      const finalTransactions =
        categoryEdits.size > 0
          ? editedTransactions.map((t) => {
              const newCat = categoryEdits.get(t.id);
              return newCat ? { ...t, category: newCat } : t;
            })
          : editedTransactions;

      loadTransactions(finalTransactions, {
        currentBalance: confirmedBalance,
        incomeOverride: confirmedIncome,
        payFrequency: confirmedPayFreq,
      });
    },
    [editedTransactions, confirmedBalance, confirmedIncome, confirmedPayFreq, loadTransactions]
  );

  // ── Column mapping fallback ──────────────────────────────────────────────

  if (needsMapping && pendingFile && pendingMapping) {
    return (
      <CSVMapper
        file={pendingFile}
        detectedMapping={pendingMapping}
        onConfirm={(mapping) => {
          setNeedsMapping(false);
          processFile(pendingFile, mapping);
        }}
        onCancel={() => {
          setNeedsMapping(false);
          setPendingFile(null);
          setStage('idle');
        }}
      />
    );
  }

  // ── Wizard steps ─────────────────────────────────────────────────────────

  if (wizardStep !== null) {
    const transfers = editedTransactions.filter((t) => t.type === 'transfer');
    const topExpenses = editedTransactions
      .filter((t) => t.type === 'expense')
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 6);

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="mb-4 text-center">
          <h1 className="font-display text-3xl text-text-primary mb-1">One last thing</h1>
          <p className="text-text-muted text-sm">Help us build an accurate picture</p>
        </div>
        <WizardProgress current={wizardStep} />

        {wizardStep === 'balance' && (
          <BalanceStep inferredBalance={inferredBalance} onNext={handleBalanceDone} />
        )}
        {wizardStep === 'income' && (
          <IncomeStep
            detectedIncome={detectedIncome}
            onNext={handleIncomeDone}
            onBack={() => setWizardStep('balance')}
          />
        )}
        {wizardStep === 'transfers' && (
          <TransferStep
            transfers={transfers}
            onNext={handleTransfersDone}
            onBack={() => setWizardStep('income')}
          />
        )}
        {wizardStep === 'spotcheck' && (
          <SpotCheckStep
            topExpenses={topExpenses}
            onNext={handleSpotCheckDone}
            onBack={() => setWizardStep('transfers')}
          />
        )}
      </div>
    );
  }

  // ── Upload screen ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="font-display text-5xl text-text-primary mb-3">Clarifi</h1>
        <p className="text-text-muted text-base">
          Upload your last 90 days. Know where you stand.
        </p>
      </div>

      {(stage === 'analyzing' || stage === 'categorizing') ? (
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-text-muted text-sm">
            {stage === 'categorizing' ? 'Categorizing transactions with AI...' : 'Analyzing your finances...'}
          </p>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            w-full max-w-md border-2 border-dashed rounded-lg p-12
            flex flex-col items-center gap-4 cursor-pointer
            transition-all duration-150
            ${isDragging
              ? 'border-accent-green bg-surface'
              : 'border-border hover:border-text-muted bg-surface'
            }
          `}
        >
          <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center">
            <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-text-primary text-sm font-medium">Drop your CSV here</p>
            <p className="text-text-muted text-xs mt-1">or click to browse</p>
          </div>
          <p className="text-text-muted text-xs text-center leading-relaxed">
            Export from SoFi, Chase, Bank of America, or any bank.<br />
            Supports most CSV formats.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      )}

      {stage === 'error' && (
        <div className="mt-4 px-4 py-3 bg-surface border border-accent-red rounded-lg max-w-md w-full">
          <p className="text-accent-red text-sm">{error}</p>
          <button
            className="text-text-muted text-xs mt-1 hover:text-text-primary transition-all duration-150"
            onClick={() => { setStage('idle'); setError(''); }}
          >
            Try again
          </button>
        </div>
      )}

      <p className="mt-8 text-text-muted text-xs text-center max-w-xs leading-relaxed">
        All data stays in your browser. Nothing is uploaded to a server.
      </p>

      <button
        onClick={loadSandbox}
        className="mt-6 text-text-muted text-xs hover:text-text-primary transition-colors underline underline-offset-2"
      >
        Try with sandbox data
      </button>
    </div>
  );
}
