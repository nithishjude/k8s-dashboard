import clsx from 'clsx';

const STATUS_MAP = {
  // Pod / Deployment statuses
  Running:     { bg: 'bg-status-running/15',  text: 'text-status-running',  dot: 'bg-status-running',  pulse: true  },
  Pending:     { bg: 'bg-status-pending/15',  text: 'text-status-pending',  dot: 'bg-status-pending',  pulse: true  },
  Failed:      { bg: 'bg-status-failed/15',   text: 'text-status-failed',   dot: 'bg-status-failed',   pulse: false },
  Succeeded:   { bg: 'bg-emerald-500/10',     text: 'text-emerald-400',     dot: 'bg-emerald-400',     pulse: false },
  Unknown:     { bg: 'bg-slate-500/15',       text: 'text-slate-400',       dot: 'bg-slate-400',       pulse: false },
  Terminating: { bg: 'bg-orange-500/15',      text: 'text-orange-400',      dot: 'bg-orange-400',      pulse: true  },
  // Node statuses
  Ready:       { bg: 'bg-status-running/15',  text: 'text-status-running',  dot: 'bg-status-running',  pulse: false },
  NotReady:    { bg: 'bg-status-failed/15',   text: 'text-status-failed',   dot: 'bg-status-failed',   pulse: false },
  // Deployment statuses
  Available:   { bg: 'bg-status-running/15',  text: 'text-status-running',  dot: 'bg-status-running',  pulse: false },
  Progressing: { bg: 'bg-status-pending/15',  text: 'text-status-pending',  dot: 'bg-status-pending',  pulse: true  },
  Degraded:    { bg: 'bg-status-failed/15',   text: 'text-status-failed',   dot: 'bg-status-failed',   pulse: false },
  // Namespace
  Active:      { bg: 'bg-status-running/15',  text: 'text-status-running',  dot: 'bg-status-running',  pulse: false },
  Terminating2:{ bg: 'bg-orange-500/15',      text: 'text-orange-400',      dot: 'bg-orange-400',      pulse: false },
  // Generic
  True:        { bg: 'bg-status-running/15',  text: 'text-status-running',  dot: 'bg-status-running',  pulse: false },
  False:       { bg: 'bg-status-failed/15',   text: 'text-status-failed',   dot: 'bg-status-failed',   pulse: false },
  // Alerts
  critical:    { bg: 'bg-red-500/15',         text: 'text-red-400',         dot: 'bg-red-400',         pulse: true  },
  warning:     { bg: 'bg-amber-500/15',       text: 'text-amber-400',       dot: 'bg-amber-400',       pulse: false },
  info:        { bg: 'bg-blue-500/15',        text: 'text-blue-400',        dot: 'bg-blue-400',        pulse: false },
  success:     { bg: 'bg-emerald-500/10',     text: 'text-emerald-400',     dot: 'bg-emerald-400',     pulse: false },
  // Audit
  forbidden:   { bg: 'bg-red-500/15',         text: 'text-red-400',         dot: 'bg-red-400',         pulse: false },
};

export default function StatusBadge({ status, size = 'sm', showDot = true, className }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.Unknown;
  return (
    <span className={clsx(
      'badge font-semibold',
      cfg.bg, cfg.text,
      size === 'xs' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1',
      className,
    )}>
      {showDot && (
        <span className={clsx(
          'status-dot',
          cfg.dot,
          cfg.pulse && 'animate-pulse-slow',
        )} />
      )}
      {status}
    </span>
  );
}
