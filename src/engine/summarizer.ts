import { EngineOutput, LifeEvent } from '@/types';

function fmt(n: number): string {
  return `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function pad(s: string, len: number): string {
  return s.padEnd(len, ' ');
}

export function buildEngineContext(
  engine: EngineOutput,
  lifeEvents: LifeEvent[],
  meta?: { incomeOverride?: number; payFrequency?: string }
): string {
  const lines: string[] = [];
  const generatedStr = engine.generatedAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  lines.push('=== CLAIRE FINANCIAL CONTEXT ===');
  lines.push(`Generated: ${generatedStr}`);
  lines.push('');

  // ── Snapshot ──────────────────────────────────────────────────────────────
  lines.push('CURRENT FINANCIAL SNAPSHOT:');
  lines.push(`- Estimated current balance: ${fmt(engine.currentBalance)}`);
  lines.push(`- Average monthly income: ${fmt(engine.averageMonthlyIncome)}${meta?.incomeOverride ? ' (user-confirmed)' : ' (detected from transactions)'}`);
  if (meta?.payFrequency) lines.push(`- Pay schedule: ${meta.payFrequency}`);
  lines.push(`- Average monthly expenses: ${fmt(engine.averageMonthlyExpenses)}`);
  const surplus = engine.monthlySurplus;
  lines.push(`- Monthly surplus: ${surplus >= 0 ? '' : '-'}${fmt(surplus)}`);
  lines.push('');

  // ── Recurring expenses ────────────────────────────────────────────────────
  if (engine.recurringExpenses.length > 0) {
    lines.push('RECURRING EXPENSES DETECTED:');
    for (const r of engine.recurringExpenses.slice(0, 10)) {
      lines.push(
        `- ${r.description}: ~${fmt(r.estimatedMonthlyAmount)}/mo (${r.confidence} confidence)`
      );
    }
    lines.push('');
  }

  // ── Top spending categories ───────────────────────────────────────────────
  if (engine.topSpendingCategories.length > 0) {
    lines.push('TOP SPENDING CATEGORIES:');
    for (const c of engine.topSpendingCategories) {
      lines.push(
        `- ${c.category}: ${fmt(c.monthlyAverage)}/mo (${c.percentOfExpenses.toFixed(0)}%)`
      );
    }
    lines.push('');
  }

  // ── 12-month projection table ─────────────────────────────────────────────
  lines.push('12-MONTH CASH FLOW PROJECTION:');
  const header = `${pad('Month', 12)}${pad('Start Bal', 12)}${pad('Income', 10)}${pad('Expenses', 12)}${pad('End Bal', 12)}Risk`;
  lines.push(header);
  lines.push('-'.repeat(header.length));

  for (const m of engine.projectionMonths) {
    const risk = m.riskFlag === 'high' ? 'HIGH' : m.riskFlag === 'medium' ? 'WARN' : m.riskFlag === 'low' ? 'LOW' : '—';
    lines.push(
      `${pad(m.label, 12)}${pad(fmt(m.startingBalance), 12)}${pad(fmt(m.projectedIncome), 10)}${pad(fmt(m.projectedExpenses), 12)}${pad(fmt(m.endingBalance), 12)}${risk}`
    );
  }
  lines.push('');

  // ── Life events ────────────────────────────────────────────────────────────
  if (lifeEvents.length > 0) {
    lines.push('LIFE EVENTS FACTORED IN:');
    for (const e of lifeEvents) {
      const typeLabel =
        e.type === 'income_change'
          ? 'Income change'
          : e.type === 'expense_change'
          ? 'Expense change'
          : e.type === 'one_time_expense'
          ? 'One-time expense'
          : 'One-time income';
      const sign = e.amount >= 0 ? '+' : '-';
      lines.push(
        `- ${e.startMonth}: ${e.label} — ${typeLabel} ${sign}${fmt(Math.abs(e.amount))}${e.ongoing ? ' (ongoing)' : ''}`
      );
    }
    lines.push('');
  }

  // ── Risk flags ────────────────────────────────────────────────────────────
  if (engine.riskFlags.length > 0) {
    lines.push('RISK FLAGS:');
    for (const f of engine.riskFlags) {
      lines.push(`- ${f.severity.toUpperCase()}: ${f.message}`);
    }
    lines.push('');
  }

  // ── Goals ─────────────────────────────────────────────────────────────────
  if (engine.goals.length > 0) {
    lines.push('GOALS:');
    for (const g of engine.goals) {
      const targetStr = g.targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      lines.push(
        `- ${g.label}: ${fmt(g.targetAmount)} by ${targetStr} | Needs ${fmt(g.requiredMonthlySavings)}/mo | ${g.onTrack ? 'On track' : 'NOT on track'}`
      );
    }
    lines.push('');
  }

  lines.push('=== END CONTEXT ===');

  return lines.join('\n');
}
