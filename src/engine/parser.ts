import Papa from 'papaparse';
import { Transaction } from '@/types';

// ── Column detection ──────────────────────────────────────────────────────────

export interface ColumnMapping {
  date: string | null;
  amount: string | null;
  description: string | null;
  debit: string | null;
  credit: string | null;
}

const DATE_PATTERNS = ['date', 'posted', 'transaction date', 'trans date', 'trans. date', 'post date'];
const AMOUNT_PATTERNS = ['amount', 'transaction amount', 'amt'];
const DEBIT_PATTERNS = ['debit', 'withdrawal', 'withdrawals'];
const CREDIT_PATTERNS = ['credit', 'deposit', 'deposits'];
const DESC_PATTERNS = [
  'description',
  'memo',
  'payee',
  'merchant',
  'name',
  'transaction description',
  'details',
  'particulars',
];

export function detectColumns(headers: string[]): ColumnMapping {
  const lower = headers.map((h) => h.toLowerCase().trim());

  const find = (patterns: string[]) => {
    for (const p of patterns) {
      const idx = lower.findIndex((h) => h.includes(p));
      if (idx !== -1) return headers[idx];
    }
    return null;
  };

  return {
    date: find(DATE_PATTERNS),
    amount: find(AMOUNT_PATTERNS),
    description: find(DESC_PATTERNS),
    debit: find(DEBIT_PATTERNS),
    credit: find(CREDIT_PATTERNS),
  };
}

// ── Category inference ────────────────────────────────────────────────────────

const CATEGORY_RULES: [string, string[]][] = [
  ['Debt', [
    'student loan', 'sallie mae', 'navient', 'nelnet', 'fedloan', 'aidvantage', 'great lakes loan',
    'sofi loan', 'earnest loan', 'car payment', 'auto payment', 'auto loan', 'vehicle payment',
    'mortgage', 'home loan', 'affirm', 'klarna', 'afterpay', 'sezzle', 'zip pay',
    'credit card payment', 'minimum payment', 'loan payment', 'personal loan',
  ]],
  ['Groceries', [
    'walmart', 'kroger', 'whole foods', 'trader joe', 'safeway', 'aldi', 'publix', 'costco',
    'lincoln market', 'shop fair', 'giant', 'jackson market', 'heavenly food',
    'sprouts', 'food lion', 'wegmans', 'heb', 'meijer', 'winco', 'fresh market',
    'market basket', 'stop & shop', 'price chopper', 'fairway', 'key food', 'western beef',
    'bravo supermarket', 'compare foods', 'stew leonards', 'bj\'s wholesale', 'grocery',
  ]],
  ['Dining', [
    'restaurant', 'doordash', 'ubereats', 'grubhub', 'postmates', 'seamless', 'caviar',
    'mcdonald', 'chipotle', 'starbucks', 'coffee', 'dunkin', 'pizza', 'sushi', 'taco',
    'burger', 'diner', 'cafe', 'gelato', 'bakery', 'jollibee', 'cava', 'chick-fil',
    'five guys', 'papa john', 'andiamo', 'asuka', 'moku', 'thai', 'udon', 'ramen',
    'likkle', 'junior', 'chicko', 'honey pie', 'inday', 'wagamama', 'menkoi',
    'la bergamote', 'sq *', 'tst*', 'wingstop', 'wendys', 'wendy\'s', 'subway',
    'panera', 'panda express', 'shake shack', 'sweetgreen', 'halal', 'bbq grill',
    'poke', 'boba', 'bubble tea', 'smoothie', 'juice bar', 'food hall',
    'ihop', 'applebee', 'olive garden', 'red lobster', 'cheesecake factory',
    'jersey mike', 'jimmy john', 'potbelly', 'toast tab', 'olo.com',
  ]],
  ['Transport', [
    'uber', 'lyft', 'gas', 'shell', 'chevron', 'bp', 'exxon', 'mobil', 'sunoco',
    'parking', 'mta', 'metro', 'septa', 'citibik', 'amtrak', 'ferry', 'waterway', 'transit',
    'sunpass', 'e-zpass', 'ezpass', 'toll', 'vta', 'bart', 'wmata', 'mbta', 'cta', 'marta',
    'zipcar', 'turo', 'bird scooter', 'lime scooter', 'divvy', 'jump bike',
    'nj transit', 'path train', 'lirr', 'metro north',
  ]],
  ['Subscriptions', [
    'netflix', 'spotify', 'hulu', 'amazon prime', 'disney+', 'disney plus', 'hbo', 'max',
    'paramount+', 'peacock', 'showtime', 'apple', 'google one', 'microsoft 365',
    'office 365', 'adobe', 'dropbox', 'icloud', 'youtube premium', 'twitch',
    'audible', 'kindle unlimited', 'duolingo', 'masterclass', 'skillshare',
    'coursera', 'udemy', 'chatgpt', 'openai', 'midjourney', 'notion',
    'figma', 'grammarly', 'expressvpn', 'nordvpn', 'nytimes', 'wsj subscription',
    'github', 'canva', 'squarespace', 'sqsp', 'continue.dev', 'anthropic',
    'rocket money', 'hevy', 'familyfirst', 'tracfone', 'namecheap',
  ]],
  ['Health', [
    'walgreens', 'duane reade', 'cvs', 'pharmacy', 'medical', 'hospital', 'doctor', 'clinic',
    'nyu hosp', 'mychart', 'summit medical', 'dental', 'vision', 'optometrist',
    'urgent care', 'emergency room', 'optum', 'cigna', 'aetna', 'bluecross',
    'united healthcare', 'therapy', 'counseling', 'psychiatry', 'planet fitness',
    'la fitness', 'equinox', 'gym', 'fitness', 'peloton', 'noom', 'hims', 'hers',
    'ro health', 'ritual vitamin',
  ]],
  ['Shopping', [
    'amazon', 'etsy', 'ebay', 'wayfair', 'ikea', 'home depot', 'lowe\'s', 'lowes',
    'best buy', 'macy\'s', 'macys', 'nordstrom', 'marshalls', 'tj maxx', 't.j. maxx',
    'ross', 'gap', 'forever 21', 'h&m', 'zara', 'urban outfitters', 'anthropologie',
    'nike', 'adidas', 'foot locker', 'dick\'s sporting', 'rei', 'bath & body',
    'victoria\'s secret', 'sephora', 'ulta', 'dollar tree', 'dollar general', 'five below',
    'oldnavy', 'banana republic', 'backmarket', 'columbus hardware', 'beauty town',
  ]],
  ['Rent/Utilities', [
    'rent', 'electric', 'internet', 'comcast', 'at&t', 'bilt', 'tmobile', 't-mobile',
    'con edison', 'coned', 'pge', 'pg&e', 'duke energy', 'national grid',
    'dominion energy', 'xcel energy', 'water bill', 'sewer', 'trash', 'garbage',
    'cox communications', 'spectrum', 'frontier', 'centurylink', 'phone bill',
    'cricket wireless', 'boost mobile', 'metro pcs', 'visible wireless', 'google fi',
    'mint mobile', 'apartment', 'landlord', 'property management', 'hoa dues',
  ]],
  ['Church/Giving', ['church', 'nyc church', 'new york city church', 'tithe', 'offering', 'donation', 'charity', 'gofundme', 'patreon']],
  ['Income', ['payroll', 'direct deposit', 'interest earned', 'tax refund', 'irs treas', 'state refund', 'unemployment', 'benefits payment', 'reimbursement']],
  ['Transfer', ['to savings', 'from savings', 'to checking', 'from checking', 'vault', 'transfer', 'xfer', 'wire transfer', 'account transfer', 'internal transfer', 'move money', 'sweep']],
];

function inferCategory(description: string): string {
  const lower = description.toLowerCase();

  // P2P direction detection — must come before generic keyword scan
  // "Zelle Payment from Jane" → Income; "Zelle Payment to John" → Other (classified by amount sign)
  const isP2P = lower.includes('zelle') || lower.includes('venmo') || lower.includes('cash app');
  if (isP2P) {
    return /\bfrom\b/.test(lower) ? 'Income' : 'Other';
  }

  for (const [category, keywords] of CATEGORY_RULES) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return 'Other';
}

// ── Date parsing ──────────────────────────────────────────────────────────────

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const s = raw.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.substring(0, 10));
    return isNaN(d.getTime()) ? null : d;
  }

  // MM/DD/YYYY or MM-DD-YYYY
  const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (mdy) {
    const d = new Date(parseInt(mdy[3]), parseInt(mdy[1]) - 1, parseInt(mdy[2]));
    return isNaN(d.getTime()) ? null : d;
  }

  // DD/MM/YYYY fallback
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const d = new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]));
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// ── Amount parsing ────────────────────────────────────────────────────────────

function parseAmount(raw: string): number | null {
  if (!raw && raw !== '0') return null;
  const s = raw.toString().trim();
  // Handle (123.45) as negative
  const parens = s.match(/^\(([0-9,]+\.?\d*)\)$/);
  if (parens) return -parseFloat(parens[1].replace(/,/g, ''));
  const n = parseFloat(s.replace(/[$,]/g, ''));
  return isNaN(n) ? null : n;
}

// ── Transaction type inference ────────────────────────────────────────────────

function inferType(description: string, amount: number): Transaction['type'] {
  const lower = description.toLowerCase();
  // Venmo/Zelle/CashApp are P2P payments — classify by amount sign, not as transfers
  const transferKeywords = [
    'transfer', 'vault', 'xfer',
    'to savings', 'from savings', 'to checking', 'from checking',
    'wire transfer', 'account transfer', 'internal transfer', 'move money', 'sweep',
    'online transfer', 'mobile transfer',
  ];
  if (transferKeywords.some((kw) => lower.includes(kw))) return 'transfer';
  if (amount > 0) return 'income';
  return 'expense';
}

// ── Main parser ───────────────────────────────────────────────────────────────

export interface ParseResult {
  transactions: Transaction[];
  mapping: ColumnMapping;
  needsMapping: boolean;
}

export function parseCSV(
  file: File,
  overrideMapping?: Partial<ColumnMapping>
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const headers = results.meta.fields ?? [];
          const autoMapping = detectColumns(headers);
          const mapping: ColumnMapping = {
            date: overrideMapping?.date ?? autoMapping.date,
            amount: overrideMapping?.amount ?? autoMapping.amount,
            description: overrideMapping?.description ?? autoMapping.description,
            debit: overrideMapping?.debit ?? autoMapping.debit,
            credit: overrideMapping?.credit ?? autoMapping.credit,
          };

          // Determine if we have enough to auto-proceed
          const hasSingleAmount = !!mapping.amount;
          const hasSplitAmount = !!(mapping.debit || mapping.credit);
          const needsMapping = !mapping.date || !mapping.description || (!hasSingleAmount && !hasSplitAmount);

          if (needsMapping && !overrideMapping) {
            resolve({ transactions: [], mapping, needsMapping: true });
            return;
          }

          const transactions: Transaction[] = [];

          for (const row of results.data as Record<string, string>[]) {
            const rawDate = mapping.date ? row[mapping.date] : null;
            const rawDesc = mapping.description ? row[mapping.description] : '';
            if (!rawDate || !rawDesc) continue;

            const date = parseDate(rawDate);
            if (!date) continue;

            let amount: number | null = null;
            if (mapping.amount) {
              amount = parseAmount(row[mapping.amount]);
            } else if (mapping.debit || mapping.credit) {
              const debit = mapping.debit ? parseAmount(row[mapping.debit]) : null;
              const credit = mapping.credit ? parseAmount(row[mapping.credit]) : null;
              // Credits positive, debits negative
              if (credit !== null && credit !== 0) amount = Math.abs(credit);
              else if (debit !== null && debit !== 0) amount = -Math.abs(debit);
              else amount = 0;
            }

            if (amount === null) continue;

            const description = rawDesc.trim();
            const category = inferCategory(description);
            const type = inferType(description, amount);

            transactions.push({ id: `txn_${transactions.length}`, date, description, amount, category, type });
          }

          // Sort newest first
          transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

          resolve({ transactions, mapping, needsMapping: false });
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => reject(err),
    });
  });
}
