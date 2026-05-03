import { Transaction } from '@/types';

// Generates a Date relative to today (daysAgo = 0 means today)
function d(daysAgo: number): Date {
  const dt = new Date();
  dt.setHours(12, 0, 0, 0);
  dt.setDate(dt.getDate() - daysAgo);
  return dt;
}

let _n = 0;
const sid = () => `sandbox_${_n++}`;

export const SANDBOX_TRANSACTIONS: Transaction[] = [
  // ── Income (bi-weekly, $2,200/paycheck) ──────────────────────────────────
  { id: sid(), date: d(1),  description: 'Direct Deposit – Acme Corp', amount: 2200,   type: 'income',   category: 'Income' },
  { id: sid(), date: d(15), description: 'Direct Deposit – Acme Corp', amount: 2200,   type: 'income',   category: 'Income' },
  { id: sid(), date: d(29), description: 'Direct Deposit – Acme Corp', amount: 2200,   type: 'income',   category: 'Income' },
  { id: sid(), date: d(43), description: 'Direct Deposit – Acme Corp', amount: 2200,   type: 'income',   category: 'Income' },
  { id: sid(), date: d(57), description: 'Direct Deposit – Acme Corp', amount: 2200,   type: 'income',   category: 'Income' },
  { id: sid(), date: d(71), description: 'Direct Deposit – Acme Corp', amount: 2200,   type: 'income',   category: 'Income' },
  { id: sid(), date: d(85), description: 'Direct Deposit – Acme Corp', amount: 2200,   type: 'income',   category: 'Income' },

  // ── Rent / Utilities ──────────────────────────────────────────────────────
  { id: sid(), date: d(3),  description: 'Rent Payment',               amount: -1450,  type: 'expense',  category: 'Rent/Utilities' },
  { id: sid(), date: d(33), description: 'Rent Payment',               amount: -1450,  type: 'expense',  category: 'Rent/Utilities' },
  { id: sid(), date: d(63), description: 'Rent Payment',               amount: -1450,  type: 'expense',  category: 'Rent/Utilities' },
  { id: sid(), date: d(8),  description: 'Electric & Gas – City Power', amount: -94,   type: 'expense',  category: 'Rent/Utilities' },
  { id: sid(), date: d(38), description: 'Electric & Gas – City Power', amount: -87,   type: 'expense',  category: 'Rent/Utilities' },
  { id: sid(), date: d(68), description: 'Electric & Gas – City Power', amount: -102,  type: 'expense',  category: 'Rent/Utilities' },
  { id: sid(), date: d(12), description: 'Internet – Comcast',          amount: -65,   type: 'expense',  category: 'Rent/Utilities' },
  { id: sid(), date: d(42), description: 'Internet – Comcast',          amount: -65,   type: 'expense',  category: 'Rent/Utilities' },
  { id: sid(), date: d(72), description: 'Internet – Comcast',          amount: -65,   type: 'expense',  category: 'Rent/Utilities' },

  // ── Groceries ─────────────────────────────────────────────────────────────
  { id: sid(), date: d(4),  description: 'Whole Foods Market',          amount: -127,  type: 'expense',  category: 'Groceries' },
  { id: sid(), date: d(18), description: "Trader Joe's",                amount: -84,   type: 'expense',  category: 'Groceries' },
  { id: sid(), date: d(25), description: 'Whole Foods Market',          amount: -143,  type: 'expense',  category: 'Groceries' },
  { id: sid(), date: d(35), description: "Trader Joe's",                amount: -91,   type: 'expense',  category: 'Groceries' },
  { id: sid(), date: d(48), description: 'Kroger',                      amount: -67,   type: 'expense',  category: 'Groceries' },
  { id: sid(), date: d(55), description: 'Whole Foods Market',          amount: -118,  type: 'expense',  category: 'Groceries' },
  { id: sid(), date: d(62), description: "Trader Joe's",                amount: -79,   type: 'expense',  category: 'Groceries' },
  { id: sid(), date: d(75), description: 'Whole Foods Market',          amount: -134,  type: 'expense',  category: 'Groceries' },
  { id: sid(), date: d(82), description: 'Kroger',                      amount: -55,   type: 'expense',  category: 'Groceries' },

  // ── Dining ────────────────────────────────────────────────────────────────
  { id: sid(), date: d(5),  description: 'Chipotle',                    amount: -14,   type: 'expense',  category: 'Dining' },
  { id: sid(), date: d(9),  description: 'Starbucks',                   amount: -7,    type: 'expense',  category: 'Dining' },
  { id: sid(), date: d(16), description: 'DoorDash',                    amount: -38,   type: 'expense',  category: 'Dining' },
  { id: sid(), date: d(20), description: 'Sweetgreen',                  amount: -17,   type: 'expense',  category: 'Dining' },
  { id: sid(), date: d(23), description: 'Starbucks',                   amount: -6,    type: 'expense',  category: 'Dining' },
  { id: sid(), date: d(30), description: 'Cheesecake Factory',          amount: -63,   type: 'expense',  category: 'Dining' },
  { id: sid(), date: d(36), description: 'Starbucks',                   amount: -8,    type: 'expense',  category: 'Dining' },
  { id: sid(), date: d(40), description: 'DoorDash',                    amount: -29,   type: 'expense',  category: 'Dining' },
  { id: sid(), date: d(46), description: 'Chipotle',                    amount: -13,   type: 'expense',  category: 'Dining' },
  { id: sid(), date: d(51), description: 'Starbucks',                   amount: -7,    type: 'expense',  category: 'Dining' },
  { id: sid(), date: d(58), description: 'Olive Garden',                amount: -48,   type: 'expense',  category: 'Dining' },
  { id: sid(), date: d(64), description: 'Starbucks',                   amount: -6,    type: 'expense',  category: 'Dining' },
  { id: sid(), date: d(69), description: 'DoorDash',                    amount: -33,   type: 'expense',  category: 'Dining' },
  { id: sid(), date: d(77), description: 'Chipotle',                    amount: -15,   type: 'expense',  category: 'Dining' },
  { id: sid(), date: d(83), description: 'Starbucks',                   amount: -7,    type: 'expense',  category: 'Dining' },
  { id: sid(), date: d(88), description: 'DoorDash',                    amount: -27,   type: 'expense',  category: 'Dining' },

  // ── Subscriptions ─────────────────────────────────────────────────────────
  { id: sid(), date: d(7),  description: 'Netflix',                     amount: -15.99, type: 'expense', category: 'Subscriptions' },
  { id: sid(), date: d(37), description: 'Netflix',                     amount: -15.99, type: 'expense', category: 'Subscriptions' },
  { id: sid(), date: d(67), description: 'Netflix',                     amount: -15.99, type: 'expense', category: 'Subscriptions' },
  { id: sid(), date: d(10), description: 'Spotify',                     amount: -9.99,  type: 'expense', category: 'Subscriptions' },
  { id: sid(), date: d(40), description: 'Spotify',                     amount: -9.99,  type: 'expense', category: 'Subscriptions' },
  { id: sid(), date: d(70), description: 'Spotify',                     amount: -9.99,  type: 'expense', category: 'Subscriptions' },
  { id: sid(), date: d(14), description: 'iCloud+',                     amount: -2.99,  type: 'expense', category: 'Subscriptions' },
  { id: sid(), date: d(44), description: 'iCloud+',                     amount: -2.99,  type: 'expense', category: 'Subscriptions' },
  { id: sid(), date: d(74), description: 'iCloud+',                     amount: -2.99,  type: 'expense', category: 'Subscriptions' },
  { id: sid(), date: d(21), description: 'ChatGPT Plus',                amount: -20,    type: 'expense', category: 'Subscriptions' },
  { id: sid(), date: d(51), description: 'ChatGPT Plus',                amount: -20,    type: 'expense', category: 'Subscriptions' },
  { id: sid(), date: d(81), description: 'ChatGPT Plus',                amount: -20,    type: 'expense', category: 'Subscriptions' },

  // ── Transport ─────────────────────────────────────────────────────────────
  { id: sid(), date: d(6),  description: 'Shell Gas Station',           amount: -48,   type: 'expense',  category: 'Transport' },
  { id: sid(), date: d(22), description: 'Shell Gas Station',           amount: -52,   type: 'expense',  category: 'Transport' },
  { id: sid(), date: d(39), description: 'Shell Gas Station',           amount: -45,   type: 'expense',  category: 'Transport' },
  { id: sid(), date: d(55), description: 'Shell Gas Station',           amount: -50,   type: 'expense',  category: 'Transport' },
  { id: sid(), date: d(71), description: 'Shell Gas Station',           amount: -47,   type: 'expense',  category: 'Transport' },
  { id: sid(), date: d(87), description: 'Shell Gas Station',           amount: -44,   type: 'expense',  category: 'Transport' },
  { id: sid(), date: d(11), description: 'Uber',                        amount: -18,   type: 'expense',  category: 'Transport' },
  { id: sid(), date: d(27), description: 'Uber',                        amount: -24,   type: 'expense',  category: 'Transport' },
  { id: sid(), date: d(60), description: 'Lyft',                        amount: -21,   type: 'expense',  category: 'Transport' },

  // ── Health ────────────────────────────────────────────────────────────────
  { id: sid(), date: d(13), description: 'Planet Fitness',              amount: -24.99, type: 'expense', category: 'Health' },
  { id: sid(), date: d(43), description: 'Planet Fitness',              amount: -24.99, type: 'expense', category: 'Health' },
  { id: sid(), date: d(73), description: 'Planet Fitness',              amount: -24.99, type: 'expense', category: 'Health' },
  { id: sid(), date: d(31), description: 'CVS Pharmacy',                amount: -22,    type: 'expense', category: 'Health' },
  { id: sid(), date: d(61), description: 'Walgreens',                   amount: -15,    type: 'expense', category: 'Health' },

  // ── Shopping ─────────────────────────────────────────────────────────────
  { id: sid(), date: d(17), description: 'Amazon.com',                  amount: -67,   type: 'expense',  category: 'Shopping' },
  { id: sid(), date: d(34), description: 'Target',                      amount: -43,   type: 'expense',  category: 'Shopping' },
  { id: sid(), date: d(50), description: 'Amazon.com',                  amount: -29,   type: 'expense',  category: 'Shopping' },
  { id: sid(), date: d(66), description: 'Amazon.com',                  amount: -112,  type: 'expense',  category: 'Shopping' },
  { id: sid(), date: d(80), description: 'Target',                      amount: -57,   type: 'expense',  category: 'Shopping' },

  // ── Church / Giving ───────────────────────────────────────────────────────
  { id: sid(), date: d(6),  description: 'Tithe – Church Online',       amount: -200,  type: 'expense',  category: 'Church/Giving' },
  { id: sid(), date: d(36), description: 'Tithe – Church Online',       amount: -200,  type: 'expense',  category: 'Church/Giving' },
  { id: sid(), date: d(66), description: 'Tithe – Church Online',       amount: -200,  type: 'expense',  category: 'Church/Giving' },

  // ── Transfers to savings ──────────────────────────────────────────────────
  { id: sid(), date: d(5),  description: 'Transfer to Savings',         amount: -300,  type: 'transfer', category: 'Transfer' },
  { id: sid(), date: d(35), description: 'Transfer to Savings',         amount: -300,  type: 'transfer', category: 'Transfer' },
  { id: sid(), date: d(65), description: 'Transfer to Savings',         amount: -300,  type: 'transfer', category: 'Transfer' },

  // ── Debt ─────────────────────────────────────────────────────────────────
  { id: sid(), date: d(9),  description: 'Student Loan – FedLoan',      amount: -280,  type: 'expense',  category: 'Debt' },
  { id: sid(), date: d(39), description: 'Student Loan – FedLoan',      amount: -280,  type: 'expense',  category: 'Debt' },
  { id: sid(), date: d(69), description: 'Student Loan – FedLoan',      amount: -280,  type: 'expense',  category: 'Debt' },
];

// Pre-set values fed into loadTransactions — no wizard needed
export const SANDBOX_BALANCE = 4250;
export const SANDBOX_INCOME = 4400;   // ~2 paychecks/month
export const SANDBOX_PAY_FREQUENCY = 'bi-weekly';
