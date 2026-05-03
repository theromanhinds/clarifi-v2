import { RiskFlag } from '@/types';

interface RiskFlagsProps {
  flags: RiskFlag[];
}

export function RiskFlags({ flags }: RiskFlagsProps) {
  if (flags.length === 0) return null;

  return (
    <div className="space-y-2">
      {flags.map((flag, i) => (
        <div
          key={i}
          className={`px-4 py-3 rounded-lg border text-sm flex items-start gap-3 ${
            flag.severity === 'critical'
              ? 'bg-accent-red/10 border-accent-red/30 text-accent-red'
              : 'bg-accent-amber/10 border-accent-amber/30 text-accent-amber'
          }`}
        >
          <span className="mt-0.5 flex-shrink-0">
            {flag.severity === 'critical' ? '⚠' : '↘'}
          </span>
          <span>{flag.message}</span>
        </div>
      ))}
    </div>
  );
}
