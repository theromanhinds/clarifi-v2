import { getAI, getGenerativeModel, VertexAIBackend } from 'firebase/ai';
import { app } from '@/lib/firebase';

export const VALID_CATEGORIES = [
  'Groceries', 'Dining', 'Transport', 'Subscriptions', 'Health',
  'Shopping', 'Rent/Utilities', 'Church/Giving', 'Debt', 'Income', 'Transfer', 'Other',
] as const;

type Category = (typeof VALID_CATEGORIES)[number];

/**
 * Uses Gemini to bulk-categorize transaction descriptions.
 * Pass only the unique descriptions that fell through keyword rules as "Other".
 * Returns a Map<description, category>. Silently returns empty map on any error
 * so the caller can gracefully fall back to the keyword-inferred categories.
 */
export async function categorizeBatch(
  descriptions: string[]
): Promise<Map<string, string>> {
  if (descriptions.length === 0) return new Map();

  const ai = getAI(app, { backend: new VertexAIBackend() });
  const model = getGenerativeModel(ai, {
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const categoryList = VALID_CATEGORIES.join(', ');
  const prompt = `You are a personal finance transaction categorizer. Assign each of the following bank transaction descriptions to exactly one category from this list: ${categoryList}.

Rules:
- "Income": salary, payroll, direct deposits from employer, government benefits, tax refunds, interest, cash-back rewards
- "Debt": loan payments, credit card bill payments, student loan servicers, auto loan payments, mortgages, buy-now-pay-later
- "Transfer": moving money between the user's own accounts (NOT Venmo/Zelle/Cash App — those are P2P payments)
- "Dining": restaurants, cafes, fast food, food delivery apps, bars, coffee shops
- "Groceries": supermarkets and grocery stores
- "Transport": rideshare (Uber/Lyft), fuel/gas stations, parking, public transit, tolls, bike share
- "Shopping": retail, online shopping, clothing, electronics, home goods
- "Subscriptions": streaming services, software subscriptions, recurring digital memberships
- "Health": pharmacies, medical providers, dental, vision, gyms, wellness services
- "Rent/Utilities": rent, utilities (electric/gas/water), phone bills, internet, insurance
- "Church/Giving": donations, tithing, charity, crowdfunding
- Use "Other" only when genuinely unclear

Respond with ONLY a valid JSON object. Keys are the exact input description strings, values are category names from the list above.
Example: {"AMAZON PRIME *AB1CD2": "Subscriptions", "CHASE CREDIT CARD PMT": "Debt"}

Transaction descriptions to categorize:
${descriptions.map((d) => JSON.stringify(d)).join('\n')}`;

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      // Strip markdown code fences if model wraps in ```json ... ```
      const json = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
      const parsed: Record<string, string> = JSON.parse(json);

      const map = new Map<string, string>();
      for (const [desc, cat] of Object.entries(parsed)) {
        if (VALID_CATEGORIES.includes(cat as Category)) {
          map.set(desc, cat);
        }
      }
      return map;
    } catch (err) {
      const is429 =
        err instanceof Error &&
        (err.message.includes('429') || err.message.toLowerCase().includes('quota'));
      if (is429 && attempt < maxRetries - 1) {
        // Exponential backoff: 2s, 4s
        await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt)));
        continue;
      }
      // Silent fallback — caller keeps the keyword-inferred "Other" category
      return new Map();
    }
  }
  return new Map();
}
