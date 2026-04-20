import { AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { cn } from '../../lib/cn';

interface Props {
  probability: number;
  disclosed: boolean;
}

export function RealityCheckConfidenceBar({ probability, disclosed }: Props) {
  // Determine color coding based on stark mathematical reality
  let colorClass = '';
  let bgColorClass = '';
  let borderColorClass = '';
  let label = '';
  let Icon = Activity;

  if (probability < 30) {
    colorClass = 'text-red-500';
    bgColorClass = 'bg-red-500/10';
    borderColorClass = 'border-red-500/20';
    label = 'Critical Risk';
    Icon = AlertTriangle;
  } else if (probability <= 70) {
    colorClass = 'text-yellow-500';
    bgColorClass = 'bg-yellow-500/10';
    borderColorClass = 'border-yellow-500/20';
    label = 'Moderate Risk';
    Icon = Activity;
  } else {
    colorClass = 'text-emerald-500';
    bgColorClass = 'bg-emerald-500/10';
    borderColorClass = 'border-emerald-500/20';
    label = 'High Confidence';
    Icon = CheckCircle;
  }

  return (
    <div
      className={cn(
        'w-full rounded-2xl border p-4 transition-colors',
        bgColorClass,
        borderColorClass
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-5 w-5', colorClass)} />
          <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--panel-heading)' }}>
            MVP Success Probability
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-2xl font-black', colorClass)}>
            {probability}%
          </span>
        </div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--panel-bg)' }}>
        <div
          className={cn('h-full rounded-full transition-all duration-1000 ease-out', colorClass.replace('text-', 'bg-'))}
          style={{ width: `${probability}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs font-medium" style={{ color: 'var(--panel-text)' }}>
          {label}
        </p>
        {!disclosed && (
          <p className="text-xs font-bold text-red-400 flex items-center gap-1">
            <AlertTriangle size={12} />
            Warning: Statistical Uncertainty Obscured by Provider
          </p>
        )}
        {disclosed && (
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--panel-text-muted)' }}>
            Grounded via Logprobs
          </p>
        )}
      </div>
    </div>
  );
}
