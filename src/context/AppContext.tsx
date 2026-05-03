import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { AppState, AppContextValue, ChatMessage, LifeEvent, Transaction } from '@/types';
import { analyzeTransactions } from '@/engine/analyzer';
import { runProjection } from '@/engine/projector';
import { buildEngineContext } from '@/engine/summarizer';
import { sendChatMessage } from '@/ai/gemini';

// ── Types ─────────────────────────────────────────────────────────────────────

// Extend AppAction to cover all reducer actions
type Action =
  | { type: 'LOAD_TRANSACTIONS'; payload: { transactions: Transaction[]; currentBalance?: number; incomeOverride?: number; payFrequency?: string } }
  | { type: 'ADD_LIFE_EVENT'; payload: LifeEvent }
  | { type: 'REMOVE_LIFE_EVENT'; payload: string }
  | { type: 'DISMISS_RECURRING'; payload: string }
  | { type: 'SET_DISCRETIONARY_OVERRIDE'; payload: number }
  | { type: 'RECATEGORIZE_TRANSACTION'; payload: { id: string; category: string } }
  | { type: 'EXCLUDE_TRANSACTION'; payload: string } // mark transaction as 'transfer' to exclude from calcs
  | { type: 'OVERRIDE_RECURRING_AMOUNT'; payload: { description: string; amount: number | null } }
  | { type: 'SET_INCOME_OVERRIDE'; payload: number | null }
  | { type: 'SET_CATEGORY_SPENDING_OVERRIDE'; payload: { category: string; amount: number | null } }
  | { type: 'SET_SOLVE_MODE'; payload: { solveFor: 'surplus' | 'income' | 'expenses'; targetSurplus?: number } }
  | { type: 'RERUN_PROJECTION' }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_THINKING'; payload: boolean }
  | { type: 'UPDATE_LAST_MESSAGE'; payload: string }
  | { type: 'CLEAR_CHAT' }
  | { type: 'RESET_DASHBOARD' }
  | { type: 'RESET' };

interface State {
  appState: AppState;
  messages: ChatMessage[];
  isThinking: boolean;
}

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'clarifi_v2_state';
const STALE_DAYS = 7;

function toSerializable(state: State): unknown {
  return JSON.parse(JSON.stringify(state));
}

function loadFromStorage(): State | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Stale data guard
    if (parsed.appState?.status === 'loaded') {
      const generated = new Date(parsed.appState.engine?.generatedAt);
      const ageMs = Date.now() - generated.getTime();
      if (ageMs > STALE_DAYS * 24 * 60 * 60 * 1000) return null;
    }
    // Re-hydrate Dates
    if (parsed.appState?.status === 'loaded') {
      parsed.appState.transactions = parsed.appState.transactions.map(
        (t: { date: string; description: string; amount: number; category?: string; type: string }) => ({
          ...t,
          date: new Date(t.date),
        })
      );
      parsed.appState.engine.generatedAt = new Date(
        parsed.appState.engine.generatedAt
      );
      if (parsed.appState.engine.goals) {
        parsed.appState.engine.goals = parsed.appState.engine.goals.map(
          (g: { targetDate: string }) => ({ ...g, targetDate: new Date(g.targetDate) })
        );
      }
    }
    if (parsed.messages) {
      parsed.messages = parsed.messages.map((m: { timestamp: string }) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(state: State) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSerializable(state)));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

// ── Reducer ───────────────────────────────────────────────────────────────────

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "I've analyzed your last 90 days. Ask me anything — your balances, upcoming risks, whether you can afford something, or what hitting a goal would take.",
  timestamp: new Date(),
};

function buildEngine(
  transactions: Transaction[],
  lifeEvents: LifeEvent[],
  opts?: {
    currentBalance?: number;
    incomeOverride?: number;
    discretionaryOverride?: number;
    dismissedRecurring?: string[];
    recurringOverrides?: Record<string, number>;
    categorySpendingOverrides?: Record<string, number>;
    solveFor?: 'surplus' | 'income' | 'expenses';
    targetSurplus?: number;
  }
) {
  const analysis = analyzeTransactions(transactions, {
    dismissedDescriptions: opts?.dismissedRecurring,
  });
  const balance = opts?.currentBalance !== undefined ? opts.currentBalance : analysis.currentBalance;
  let income =
    opts?.incomeOverride !== undefined && opts.incomeOverride > 0
      ? opts.incomeOverride
      : analysis.averageMonthlyIncome;

  // Apply any per-bill amount overrides before computing totals
  const overrides = opts?.recurringOverrides ?? {};
  const recurringExpenses = analysis.recurringExpenses.map((r) =>
    overrides[r.description] !== undefined
      ? { ...r, estimatedMonthlyAmount: overrides[r.description] }
      : r
  );
  const hardBillsMonthly = recurringExpenses
    .filter((r) => r.isHardBill)
    .reduce((s, r) => s + r.estimatedMonthlyAmount, 0);

  let discretionary =
    opts?.discretionaryOverride !== undefined
      ? opts.discretionaryOverride
      : analysis.baseDiscretionary;

  // Apply per-category spending overrides to topSpendingCategories so the
  // displayed numbers reflect what the user set. Recompute percentages from
  // the updated totals so the bars stay consistent.
  const categorySpendingOverrides = opts?.categorySpendingOverrides ?? {};
  const topSpendingCategoriesRaw = analysis.topSpendingCategories.map((c) =>
    categorySpendingOverrides[c.category] !== undefined
      ? { ...c, monthlyAverage: categorySpendingOverrides[c.category] }
      : c
  );
  const overriddenCategoryTotal = topSpendingCategoriesRaw.reduce(
    (s, c) => s + c.monthlyAverage, 0
  );
  const topSpendingCategories = topSpendingCategoriesRaw.map((c) => ({
    ...c,
    percentOfExpenses:
      overriddenCategoryTotal > 0 ? (c.monthlyAverage / overriddenCategoryTotal) * 100 : 0,
  }));

  // Compute discretionary delta: sum of (override - original) for all overridden categories.
  // Only applied when there is no top-level discretionaryOverride.
  if (
    opts?.discretionaryOverride === undefined &&
    Object.keys(categorySpendingOverrides).length > 0
  ) {
    let delta = 0;
    for (const [cat, overrideAmt] of Object.entries(categorySpendingOverrides)) {
      const original =
        analysis.topSpendingCategories.find((c) => c.category === cat)?.monthlyAverage ?? 0;
      delta += (overrideAmt as number) - original;
    }
    discretionary = Math.max(0, discretionary + delta);
  }

  // Solve-for: adjust income or discretionary so the user's target surplus is met.
  const solveFor = opts?.solveFor ?? 'surplus';
  const targetSurplus = opts?.targetSurplus;
  if (solveFor === 'income' && targetSurplus !== undefined) {
    // income needed = current projected expenses + target surplus
    income = hardBillsMonthly + discretionary + targetSurplus;
  } else if (solveFor === 'expenses' && targetSurplus !== undefined) {
    // max total expenses = current income - target surplus
    const maxExpenses = income - targetSurplus;
    discretionary = Math.max(0, maxExpenses - hardBillsMonthly);
  }

  const projectedExpenses = hardBillsMonthly + discretionary;

  const { projectionMonths, riskFlags } = runProjection(
    income,
    projectedExpenses,
    balance,
    lifeEvents,
    []
  );
  return {
    currentBalance: balance,
    averageMonthlyIncome: income,
    averageMonthlyExpenses: projectedExpenses,
    monthlySurplus: income - projectedExpenses,
    hardBillsMonthly,
    debtMonthly: analysis.debtMonthly,
    discretionaryMonthly: discretionary,
    recurringExpenses,
    topSpendingCategories,
    projectionMonths,
    riskFlags,
    goals: [],
    generatedAt: new Date(),
  };
}

// Extract buildEngine opts from loaded AppState — avoids repetition in reducer
function stateOpts(appState: Extract<AppState, { status: 'loaded' }>) {
  return {
    currentBalance: appState.engine.currentBalance,
    incomeOverride: appState.incomeOverride,
    discretionaryOverride: appState.discretionaryOverride,
    dismissedRecurring: appState.dismissedRecurring,
    recurringOverrides: appState.recurringOverrides,
    categorySpendingOverrides: appState.categorySpendingOverrides,
    solveFor: appState.solveFor,
    targetSurplus: appState.targetSurplus,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD_TRANSACTIONS': {
      const { transactions, currentBalance, incomeOverride, payFrequency } = action.payload;
      const engine = buildEngine(transactions, [], { currentBalance, incomeOverride });
      return {
        ...state,
        appState: {
          status: 'loaded',
          transactions,
          engine,
          lifeEvents: [],
          incomeOverride,
          payFrequency,
          dismissedRecurring: [],
        },
        messages: [{ ...WELCOME_MESSAGE, timestamp: new Date() }],
      };
    }

    case 'ADD_LIFE_EVENT': {
      if (state.appState.status !== 'loaded') return state;
      const lifeEvents = [...state.appState.lifeEvents, action.payload];
      const engine = buildEngine(state.appState.transactions, lifeEvents, stateOpts(state.appState));
      return { ...state, appState: { ...state.appState, lifeEvents, engine } };
    }

    case 'REMOVE_LIFE_EVENT': {
      if (state.appState.status !== 'loaded') return state;
      const lifeEvents = state.appState.lifeEvents.filter((e) => e.id !== action.payload);
      const engine = buildEngine(state.appState.transactions, lifeEvents, stateOpts(state.appState));
      return { ...state, appState: { ...state.appState, lifeEvents, engine } };
    }

    case 'DISMISS_RECURRING': {
      if (state.appState.status !== 'loaded') return state;
      const dismissedRecurring = [...state.appState.dismissedRecurring, action.payload];
      const engine = buildEngine(state.appState.transactions, state.appState.lifeEvents, {
        ...stateOpts(state.appState), dismissedRecurring,
      });
      return { ...state, appState: { ...state.appState, dismissedRecurring, engine } };
    }

    case 'SET_DISCRETIONARY_OVERRIDE': {
      if (state.appState.status !== 'loaded') return state;
      const engine = buildEngine(state.appState.transactions, state.appState.lifeEvents, {
        ...stateOpts(state.appState), discretionaryOverride: action.payload,
      });
      return { ...state, appState: { ...state.appState, discretionaryOverride: action.payload, engine } };
    }

    case 'RECATEGORIZE_TRANSACTION': {
      if (state.appState.status !== 'loaded') return state;
      const transactions = state.appState.transactions.map((t) =>
        t.id === action.payload.id ? { ...t, category: action.payload.category } : t
      );
      const engine = buildEngine(transactions, state.appState.lifeEvents, stateOpts(state.appState));
      return { ...state, appState: { ...state.appState, transactions, engine } };
    }

    case 'EXCLUDE_TRANSACTION': {
      if (state.appState.status !== 'loaded') return state;
      const transactions = state.appState.transactions.map((t) =>
        t.id === action.payload ? { ...t, type: 'transfer' as const } : t
      );
      const engine = buildEngine(transactions, state.appState.lifeEvents, stateOpts(state.appState));
      return { ...state, appState: { ...state.appState, transactions, engine } };
    }

    case 'OVERRIDE_RECURRING_AMOUNT': {
      if (state.appState.status !== 'loaded') return state;
      const { description, amount } = action.payload;
      const recurringOverrides = { ...(state.appState.recurringOverrides ?? {}) };
      if (amount === null) {
        delete recurringOverrides[description];
      } else {
        recurringOverrides[description] = amount;
      }
      const engine = buildEngine(state.appState.transactions, state.appState.lifeEvents, {
        ...stateOpts(state.appState), recurringOverrides,
      });
      return { ...state, appState: { ...state.appState, recurringOverrides, engine } };
    }

    case 'SET_INCOME_OVERRIDE': {
      if (state.appState.status !== 'loaded') return state;
      const incomeOverride = action.payload ?? undefined;
      const engine = buildEngine(state.appState.transactions, state.appState.lifeEvents, {
        ...stateOpts(state.appState), incomeOverride,
      });
      return { ...state, appState: { ...state.appState, incomeOverride, engine } };
    }

    case 'SET_CATEGORY_SPENDING_OVERRIDE': {
      if (state.appState.status !== 'loaded') return state;
      const { category, amount } = action.payload;
      const categorySpendingOverrides = { ...(state.appState.categorySpendingOverrides ?? {}) };
      if (amount === null) {
        delete categorySpendingOverrides[category];
      } else {
        categorySpendingOverrides[category] = amount;
      }
      const engine = buildEngine(state.appState.transactions, state.appState.lifeEvents, {
        ...stateOpts(state.appState), categorySpendingOverrides,
      });
      return { ...state, appState: { ...state.appState, categorySpendingOverrides, engine } };
    }

    case 'SET_SOLVE_MODE': {
      if (state.appState.status !== 'loaded') return state;
      const { solveFor, targetSurplus } = action.payload;
      const engine = buildEngine(state.appState.transactions, state.appState.lifeEvents, {
        ...stateOpts(state.appState), solveFor, targetSurplus,
      });
      return { ...state, appState: { ...state.appState, solveFor, targetSurplus, engine } };
    }

    case 'RERUN_PROJECTION': {
      if (state.appState.status !== 'loaded') return state;
      const engine = buildEngine(state.appState.transactions, state.appState.lifeEvents, stateOpts(state.appState));
      return { ...state, appState: { ...state.appState, engine } };
    }

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };

    case 'UPDATE_LAST_MESSAGE': {
      const messages = [...state.messages];
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content: action.payload,
        };
      }
      return { ...state, messages };
    }

    case 'SET_THINKING':
      return { ...state, isThinking: action.payload };

    case 'CLEAR_CHAT':
      return { ...state, messages: [{ ...WELCOME_MESSAGE, timestamp: new Date() }], isThinking: false };

    case 'RESET_DASHBOARD': {
      if (state.appState.status !== 'loaded') return state;
      // Re-run the engine from raw transactions with no overrides, keeping chat intact
      const engine = buildEngine(state.appState.transactions, [], {
        currentBalance: state.appState.engine.currentBalance,
        incomeOverride: state.appState.incomeOverride,
      });
      return {
        ...state,
        appState: {
          status: 'loaded',
          transactions: state.appState.transactions,
          engine,
          lifeEvents: [],
          incomeOverride: state.appState.incomeOverride,
          payFrequency: state.appState.payFrequency,
          dismissedRecurring: [],
        },
      };
    }

    case 'RESET':
      localStorage.removeItem(STORAGE_KEY);
      return { appState: { status: 'empty' }, messages: [], isThinking: false };

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

const initialState: State = loadFromStorage() ?? {
  appState: { status: 'empty' },
  messages: [],
  isThinking: false,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const streamingRef = useRef('');

  // Persist on every change
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  const loadTransactions = useCallback(
    (transactions: Transaction[], options?: { currentBalance?: number; incomeOverride?: number; payFrequency?: string }) => {
      dispatch({ type: 'LOAD_TRANSACTIONS', payload: { transactions, ...options } });
    },
    []
  );

  const addLifeEvent = useCallback((event: LifeEvent) => {
    dispatch({ type: 'ADD_LIFE_EVENT', payload: event });
  }, []);

  const removeLifeEvent = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_LIFE_EVENT', payload: id });
  }, []);

  const dismissRecurring = useCallback((description: string) => {
    dispatch({ type: 'DISMISS_RECURRING', payload: description });
  }, []);

  const setDiscretionaryOverride = useCallback((amount: number) => {
    dispatch({ type: 'SET_DISCRETIONARY_OVERRIDE', payload: amount });
  }, []);

  const recategorizeTransaction = useCallback((id: string, newCategory: string) => {
    dispatch({ type: 'RECATEGORIZE_TRANSACTION', payload: { id, category: newCategory } });
  }, []);

  const excludeTransaction = useCallback((id: string) => {
    dispatch({ type: 'EXCLUDE_TRANSACTION', payload: id });
  }, []);

  const overrideRecurringAmount = useCallback((description: string, amount: number | null) => {
    dispatch({ type: 'OVERRIDE_RECURRING_AMOUNT', payload: { description, amount } });
  }, []);

  const setIncomeOverride = useCallback((amount: number | null) => {
    dispatch({ type: 'SET_INCOME_OVERRIDE', payload: amount });
  }, []);

  const setCategorySpendingOverride = useCallback((category: string, amount: number | null) => {
    dispatch({ type: 'SET_CATEGORY_SPENDING_OVERRIDE', payload: { category, amount } });
  }, []);

  const setSolveMode = useCallback(
    (mode: 'surplus' | 'income' | 'expenses', targetSurplus?: number) => {
      dispatch({ type: 'SET_SOLVE_MODE', payload: { solveFor: mode, targetSurplus } });
    },
    []
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (state.appState.status !== 'loaded') return;

      const userMsg: ChatMessage = {
        id: `u_${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: userMsg });
      dispatch({ type: 'SET_THINKING', payload: true });

      // Placeholder assistant message for streaming
      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: assistantMsg });
      dispatch({ type: 'SET_THINKING', payload: false }); // streaming acts as indicator

      const engineContext = buildEngineContext(
        state.appState.engine,
        state.appState.lifeEvents,
        {
          incomeOverride: state.appState.incomeOverride,
          payFrequency: state.appState.payFrequency,
        }
      );

      streamingRef.current = '';

      try {
        await sendChatMessage(
          content,
          [...state.messages, userMsg],
          engineContext,
          (token) => {
            streamingRef.current += token;
            dispatch({ type: 'UPDATE_LAST_MESSAGE', payload: streamingRef.current });
          }
        );
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        dispatch({
          type: 'UPDATE_LAST_MESSAGE',
          payload: `I had trouble connecting — please try again. (${errMsg})`,
        });
      }
    },
    [state]
  );

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const clearChat = useCallback(() => {
    dispatch({ type: 'CLEAR_CHAT' });
  }, []);

  const resetDashboard = useCallback(() => {
    dispatch({ type: 'RESET_DASHBOARD' });
  }, []);

  const value: AppContextValue = {
    state: state.appState,
    messages: state.messages,
    isThinking: state.isThinking,
    loadTransactions,
    addLifeEvent,
    removeLifeEvent,
    dismissRecurring,
    setDiscretionaryOverride,
    setIncomeOverride,
    overrideRecurringAmount,
    setCategorySpendingOverride,
    setSolveMode,
    recategorizeTransaction,
    excludeTransaction,
    sendMessage,
    reset,
    clearChat,
    resetDashboard,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// Keep Action export for type compatibility
export type { Action as AppAction };
