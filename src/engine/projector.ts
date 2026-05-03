import { ProjectionMonth, LifeEvent, Goal, RiskFlag } from '@/types';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function toLabel(date: Date): string {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

export function runProjection(
  baselineIncome: number,
  baselineExpenses: number,
  startingBalance: number,
  lifeEvents: LifeEvent[],
  goals: Goal[],
  monthsToProject = 12
): { projectionMonths: ProjectionMonth[]; riskFlags: RiskFlag[] } {
  const projectionMonths: ProjectionMonth[] = [];
  let currentBalance = startingBalance;
  const now = new Date();
  // Start from beginning of next month
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);

  for (let i = 0; i < monthsToProject; i++) {
    const monthDate = addMonths(startDate, i);
    const monthKey = toMonthKey(monthDate);
    const label = toLabel(monthDate);

    let income = baselineIncome;
    let expenses = baselineExpenses;
    let oneTimeItems = 0;
    const goalContributions = goals.reduce(
      (sum, g) => sum + (g.onTrack ? 0 : g.requiredMonthlySavings),
      0
    );

    for (const evt of lifeEvents) {
      if (evt.startMonth > monthKey) continue;

      switch (evt.type) {
        case 'income_change':
          if (evt.ongoing) income += evt.amount;
          else if (evt.startMonth === monthKey) income += evt.amount;
          break;
        case 'expense_change':
          if (evt.ongoing) expenses += evt.amount;
          else if (evt.startMonth === monthKey) expenses += evt.amount;
          break;
        case 'one_time_expense':
          if (evt.startMonth === monthKey) oneTimeItems -= evt.amount;
          break;
        case 'one_time_income':
          if (evt.startMonth === monthKey) oneTimeItems += evt.amount;
          break;
      }
    }

    const endingBalance =
      currentBalance + income - expenses - goalContributions + oneTimeItems;

    let riskFlag: ProjectionMonth['riskFlag'] = undefined;
    if (endingBalance < 0) {
      riskFlag = 'high';
    } else if (endingBalance < baselineExpenses) {
      riskFlag = 'medium';
    } else if (endingBalance < baselineExpenses * 2) {
      riskFlag = 'low';
    }

    projectionMonths.push({
      month: monthKey,
      label,
      startingBalance: currentBalance,
      projectedIncome: income,
      projectedExpenses: expenses,
      goalContributions,
      endingBalance,
      riskFlag,
    });

    currentBalance = endingBalance;
  }

  // ── Risk flags pass ──────────────────────────────────────────────────────
  const riskFlags: RiskFlag[] = [];
  let negativeReported = false;   // only show the first/closest negative-balance month
  let dipReported = false;        // only show the first/closest low-balance dip month
  let trendReported = false;      // only show the first 3-month declining trend

  for (const m of projectionMonths) {
    if (m.endingBalance < 0) {
      if (!negativeReported) {
        riskFlags.push({
          severity: 'critical',
          month: m.label,
          message: `Balance goes negative in ${m.label} (projected -$${Math.abs(m.endingBalance).toFixed(0)})`,
        });
        negativeReported = true;
      }
    } else if (m.riskFlag === 'medium' && !dipReported) {
      riskFlags.push({
        severity: 'warning',
        month: m.label,
        message: `Balance dips below 1 month of expenses in ${m.label} ($${m.endingBalance.toFixed(0)})`,
      });
      dipReported = true;
    }
  }

  // 3-consecutive-month declining trend — only report the first occurrence
  for (let i = 2; i < projectionMonths.length; i++) {
    const [a, b, c] = [
      projectionMonths[i - 2],
      projectionMonths[i - 1],
      projectionMonths[i],
    ];
    if (
      a.endingBalance > b.endingBalance &&
      b.endingBalance > c.endingBalance &&
      !trendReported
    ) {
      riskFlags.push({
        severity: 'warning',
        month: c.label,
        message: `3-month declining balance trend ending ${c.label}`,
      });
      trendReported = true;
    }
  }

  return { projectionMonths, riskFlags };
}
