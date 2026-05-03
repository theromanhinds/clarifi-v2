import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ProjectionMonth } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface ProjectionChartProps {
  projectionMonths: ProjectionMonth[];
}

interface TooltipPayload {
  payload?: ProjectionMonth;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.[0]?.payload) return null;
  const m = payload[0].payload;
  const riskColor =
    m.riskFlag === 'high'
      ? '#ef4444'
      : m.riskFlag === 'medium'
      ? '#f59e0b'
      : m.riskFlag === 'low'
      ? '#f59e0b'
      : '#22c55e';

  return (
    <div className="bg-surface border border-border rounded-lg p-3 text-xs shadow-lg min-w-[180px]">
      <p className="text-text-primary font-medium mb-2">{m.label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-text-muted">Start</span>
          <span className="font-mono">{formatCurrency(m.startingBalance)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-text-muted">Income</span>
          <span className="font-mono text-accent-green">{formatCurrency(m.projectedIncome)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-text-muted">Expenses</span>
          <span className="font-mono text-accent-red">{formatCurrency(m.projectedExpenses)}</span>
        </div>
        {m.goalContributions > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-text-muted">Goals</span>
            <span className="font-mono text-accent-amber">{formatCurrency(m.goalContributions)}</span>
          </div>
        )}
        <div className="border-t border-border my-1" />
        <div className="flex justify-between gap-4">
          <span className="text-text-muted">End bal</span>
          <span className="font-mono font-medium" style={{ color: riskColor }}>
            {formatCurrency(m.endingBalance)}
          </span>
        </div>
      </div>
    </div>
  );
}

function getRiskColor(flag: ProjectionMonth['riskFlag']): string {
  switch (flag) {
    case 'high': return '#ef4444';
    case 'medium': return '#f59e0b';
    case 'low': return '#f59e0b';
    default: return '#22c55e';
  }
}

export function ProjectionChart({ projectionMonths }: ProjectionChartProps) {
  const data = projectionMonths.map((m) => ({
    ...m,
    color: getRiskColor(m.riskFlag),
  }));

  // Build gradient stops from risk flags
  const gradientStops = data.map((d, i) => ({
    offset: `${(i / Math.max(data.length - 1, 1)) * 100}%`,
    color: d.color,
  }));

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <h3 className="text-text-muted text-xs uppercase tracking-wider mb-4">
        12-Month Cash Flow Projection
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="1" y2="0">
              {gradientStops.map((stop, i) => (
                <stop key={i} offset={stop.offset} stopColor={stop.color} />
              ))}
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#666666', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
            tickLine={false}
            axisLine={false}
            interval={1}
          />
          <YAxis
            tick={{ fill: '#666666', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.4} />
          <Line
            type="monotone"
            dataKey="endingBalance"
            stroke="url(#balanceGradient)"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props as { cx: number; cy: number; payload: typeof data[0] };
              return (
                <circle
                  key={`dot-${payload.month}`}
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill={payload.color}
                  stroke="none"
                />
              );
            }}
            activeDot={{ r: 5, fill: '#22c55e' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
