import { Transaction, RecurringExpense, CategorySummary } from '@/types';

export interface AnalysisResult {
  currentBalance: number;
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  hardBillsMonthly: number;    // sum of non-dismissed hard bill recurring items
  debtMonthly: number;         // average monthly debt payments (category='Debt')
  baseDiscretionary: number;   // historical spending minus all hard bills (before dismissal)
  recurringExpenses: RecurringExpense[];
  topSpendingCategories: CategorySummary[];
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeDescription(desc: string): string {
  // Lowercase, remove numbers and dates, collapse whitespace
  return desc
    .toLowerCase()
    .replace(/\d+/g, '')
    .replace(/[^a-z\s*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Categories that are always discretionary (variable, optional, habitual but not billed)
const DISCRETIONARY_CATEGORIES = new Set([
  'Groceries', 'Dining', 'Shopping', 'Transport', 'Church/Giving',
]);

// Categories that are always hard bills/subscriptions
const HARD_BILL_CATEGORIES = new Set([
  'Subscriptions', 'Rent/Utilities', 'Debt',
]);

// Coefficient of variation — measures how consistent amounts are (0 = identical each time)
function computeCV(amounts: number[]): number {
  if (amounts.length < 2) return 0;
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  if (mean === 0) return 0;
  const variance = amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length;
  return Math.sqrt(variance) / mean;
}

export function analyzeTransactions(
  transactions: Transaction[],
  options?: { dismissedDescriptions?: string[] }
): AnalysisResult {
  // ── Current balance (sum of all transactions) ────────────────────────────
  const currentBalance = transactions.reduce((sum, t) => sum + t.amount, 0);

  // ── Group by month ───────────────────────────────────────────────────────
  const incomeByMonth = new Map<string, number>();
  const expensesByMonth = new Map<string, number>();

  for (const t of transactions) {
    if (t.type === 'transfer') continue;
    const key = getMonthKey(t.date);
    if (t.type === 'income' && t.amount > 0) {
      incomeByMonth.set(key, (incomeByMonth.get(key) ?? 0) + t.amount);
    } else if (t.type === 'expense' && t.amount < 0) {
      expensesByMonth.set(key, (expensesByMonth.get(key) ?? 0) + Math.abs(t.amount));
    }
  }

  const incomeMonths = Array.from(incomeByMonth.values());
  const expenseMonths = Array.from(expensesByMonth.values());

  const averageMonthlyIncome =
    incomeMonths.length > 0
      ? incomeMonths.reduce((a, b) => a + b, 0) / incomeMonths.length
      : 0;

  const averageMonthlyExpenses =
    expenseMonths.length > 0
      ? expenseMonths.reduce((a, b) => a + b, 0) / expenseMonths.length
      : 0;

  // ── Recurring expense detection ──────────────────────────────────────────
  // Only look at expense transactions
  const expenseTransactions = transactions.filter(
    (t) => t.type === 'expense' && t.amount < 0
  );

  // Get the 3 most recent months in the data
  const allMonths = Array.from(
    new Set(expenseTransactions.map((t) => getMonthKey(t.date)))
  ).sort();
  const recentMonths = allMonths.slice(-3);

  // Group by normalized description
  const groupedByDesc = new Map<string, { month: string; amount: number; id: string }[]>();
  for (const t of expenseTransactions) {
    const month = getMonthKey(t.date);
    if (!recentMonths.includes(month)) continue;
    const norm = normalizeDescription(t.description);
    if (!groupedByDesc.has(norm)) groupedByDesc.set(norm, []);
    groupedByDesc.get(norm)!.push({ month, amount: Math.abs(t.amount), id: t.id });
  }

  const recurringExpenses: RecurringExpense[] = [];
  for (const [norm, occurrences] of groupedByDesc) {
    const monthsPresent = new Set(occurrences.map((o) => o.month)).size;
    if (monthsPresent < 2) continue;

    const totalAmount = occurrences.reduce((s, o) => s + o.amount, 0);
    const estimatedMonthlyAmount = totalAmount / monthsPresent;

    let confidence: RecurringExpense['confidence'] = 'low';
    if (monthsPresent >= 3) confidence = 'high';
    else if (monthsPresent === 2) confidence = 'medium';

    // Use the original description (find first matching transaction)
    const originalDesc = expenseTransactions.find(
      (t) => normalizeDescription(t.description) === norm
    )?.description ?? norm;

    const transactionIds = occurrences.map((o) => o.id);

    // Classify: hard bill (fixed, must-pay) vs discretionary (frequent but optional)
    const cat = expenseTransactions.find(
      (t) => normalizeDescription(t.description) === norm
    )?.category ?? 'Other';
    const amounts = occurrences.map((o) => o.amount);
    const cv = computeCV(amounts);

    let isHardBill: boolean;
    if (DISCRETIONARY_CATEGORIES.has(cat)) {
      isHardBill = false; // dining, groceries, shopping etc. are never hard bills
    } else if (HARD_BILL_CATEGORIES.has(cat)) {
      isHardBill = true; // subscriptions, rent/utilities are always hard bills
    } else {
      // Health, Other: use amount consistency — CV < 0.35 = predictable enough to be a bill
      isHardBill = cv < 0.35;
    }

    recurringExpenses.push({
      description: originalDesc,
      estimatedMonthlyAmount,
      confidence,
      transactionIds,
      isHardBill,
    });
  }

  // Sort by amount descending
  recurringExpenses.sort((a, b) => b.estimatedMonthlyAmount - a.estimatedMonthlyAmount);

  // Compute totals BEFORE filtering dismissed (for accurate base discretionary)
  const allHardBillsMonthly = recurringExpenses
    .filter((r) => r.isHardBill)
    .reduce((s, r) => s + r.estimatedMonthlyAmount, 0);

  const baseDiscretionary = Math.max(0, averageMonthlyExpenses - allHardBillsMonthly);

  // Debt payments: average monthly total for Debt-category transactions across all months
  const debtByMonth = new Map<string, number>();
  for (const t of expenseTransactions) {
    if ((t.category ?? 'Other') === 'Debt') {
      const key = getMonthKey(t.date);
      debtByMonth.set(key, (debtByMonth.get(key) ?? 0) + Math.abs(t.amount));
    }
  }
  const debtMonthly =
    debtByMonth.size > 0
      ? Array.from(debtByMonth.values()).reduce((a, b) => a + b, 0) / debtByMonth.size
      : 0;

  // Filter out dismissed descriptions
  const dismissed = new Set(options?.dismissedDescriptions ?? []);
  const filteredRecurring = recurringExpenses.filter((r) => !dismissed.has(r.description));

  // Hard bills monthly AFTER dismissal (used in projections)
  const hardBillsMonthly = filteredRecurring
    .filter((r) => r.isHardBill)
    .reduce((s, r) => s + r.estimatedMonthlyAmount, 0);

  // ── Category summaries ───────────────────────────────────────────────────
  const categoryTotals = new Map<string, number>();
  for (const t of expenseTransactions) {
    const cat = t.category ?? 'Other';
    categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + Math.abs(t.amount));
  }

  // Use the full month span so category averages match averageMonthlyExpenses.
  // recentMonths only covers the last 3 months (for recurring detection) but
  // categoryTotals sums ALL expense transactions, so dividing by recentMonths
  // would inflate the per-category averages for datasets longer than 3 months.
  const numMonths = Math.max(allMonths.length, 1);
  const totalExpenses = Array.from(categoryTotals.values()).reduce((a, b) => a + b, 0);

  const topSpendingCategories: CategorySummary[] = Array.from(categoryTotals.entries())
    .map(([category, total]) => ({
      category,
      monthlyAverage: total / numMonths,
      percentOfExpenses: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.monthlyAverage - a.monthlyAverage)
    .slice(0, 8);

  return {
    currentBalance,
    averageMonthlyIncome,
    averageMonthlyExpenses,
    hardBillsMonthly,
    debtMonthly,
    baseDiscretionary,
    recurringExpenses: filteredRecurring,
    topSpendingCategories,
  };
}
