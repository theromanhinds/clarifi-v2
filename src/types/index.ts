// Raw transaction as parsed from CSV
export interface Transaction {
  id: string; // unique identifier, e.g. "txn_0"
  date: Date;
  description: string;
  amount: number; // negative = expense, positive = income
  category?: string; // inferred or mapped
  type: 'income' | 'expense' | 'transfer';
}

// One month in the projection
export interface ProjectionMonth {
  month: string; // "2025-08", "2025-09", etc.
  label: string; // "Aug 2025"
  startingBalance: number;
  projectedIncome: number;
  projectedExpenses: number;
  goalContributions: number;
  endingBalance: number;
  riskFlag?: 'low' | 'medium' | 'high';
}

// Engine's full analysis output
export interface EngineOutput {
  currentBalance: number;
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  monthlySurplus: number;
  hardBillsMonthly: number;       // sum of hard bill recurring items (post-dismissal)
  debtMonthly: number;             // average monthly debt payments
  discretionaryMonthly: number;   // projected discretionary (historical minus bills, or user override)
  recurringExpenses: RecurringExpense[];
  topSpendingCategories: CategorySummary[];
  projectionMonths: ProjectionMonth[]; // 12 months
  riskFlags: RiskFlag[];
  goals: Goal[];
  generatedAt: Date;
}

export interface RecurringExpense {
  description: string;
  estimatedMonthlyAmount: number;
  confidence: 'high' | 'medium' | 'low';
  transactionIds: string[]; // IDs of transactions that make up this recurring item
  isHardBill: boolean; // true = fixed bill/subscription; false = frequent discretionary
}

export interface CategorySummary {
  category: string;
  monthlyAverage: number;
  percentOfExpenses: number;
}

export interface RiskFlag {
  severity: 'warning' | 'critical';
  month?: string;
  message: string;
}

export interface Goal {
  id: string;
  label: string;
  targetAmount: number;
  targetDate: Date;
  currentProgress: number;
  requiredMonthlySavings: number;
  onTrack: boolean;
}

export interface LifeEvent {
  id: string;
  label: string;
  startMonth: string; // "2025-10"
  type: 'income_change' | 'expense_change' | 'one_time_expense' | 'one_time_income';
  amount: number; // delta for changes, absolute for one-time
  ongoing: boolean;
}

// Chat
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Global app state
export type AppState =
  | { status: 'empty' }
  | {
      status: 'loaded';
      transactions: Transaction[];
      engine: EngineOutput;
      lifeEvents: LifeEvent[];
      incomeOverride?: number; // manually confirmed take-home income
      payFrequency?: string;   // e.g. "bi-weekly"
      discretionaryOverride?: number; // user-adjusted monthly discretionary spend
      dismissedRecurring: string[]; // descriptions the user has removed from recurring list
      recurringOverrides?: Record<string, number>; // per-bill monthly amount overrides
      categorySpendingOverrides?: Record<string, number>; // per-category monthly spending overrides
      solveFor?: 'surplus' | 'income' | 'expenses'; // which value is the derived output
      targetSurplus?: number; // goal surplus when solveFor = 'income' | 'expenses'
    };

export interface AppContextValue {
  state: AppState;
  messages: ChatMessage[];
  isThinking: boolean;
  loadTransactions: (
    transactions: Transaction[],
    options?: { currentBalance?: number; incomeOverride?: number; payFrequency?: string }
  ) => void;
  addLifeEvent: (event: LifeEvent) => void;
  removeLifeEvent: (id: string) => void;
  dismissRecurring: (description: string) => void;
  setDiscretionaryOverride: (amount: number) => void;
  setIncomeOverride: (amount: number | null) => void;
  overrideRecurringAmount: (description: string, amount: number | null) => void;
  setCategorySpendingOverride: (category: string, amount: number | null) => void;
  setSolveMode: (mode: 'surplus' | 'income' | 'expenses', targetSurplus?: number) => void;
  recategorizeTransaction: (id: string, newCategory: string) => void;
  excludeTransaction: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  reset: () => void;
  clearChat: () => void;
  resetDashboard: () => void;
}
