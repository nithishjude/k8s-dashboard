import clsx from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from './Skeleton';

export default function MetricCard({ icon: Icon, label, value, sub, trend, trendUp, color = 'brand', loading }) {
  const colorMap = {
    brand:  { icon: 'bg-brand-600/20 text-brand-400',   ring: 'ring-brand-600/30'  },
    green:  { icon: 'bg-emerald-500/20 text-emerald-400', ring: 'ring-emerald-500/30' },
    yellow: { icon: 'bg-amber-500/20 text-amber-400',   ring: 'ring-amber-500/30'  },
    red:    { icon: 'bg-red-500/20 text-red-400',       ring: 'ring-red-500/30'    },
    purple: { icon: 'bg-purple-500/20 text-purple-400', ring: 'ring-purple-500/30' },
    cyan:   { icon: 'bg-cyan-500/20 text-cyan-400',     ring: 'ring-cyan-500/30'   },
  };
  const c = colorMap[color] || colorMap.brand;

  return (
    <div className="card card-hover p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={clsx('p-2.5 rounded-xl ring-1', c.icon, c.ring)}>
          {loading ? <Skeleton className="w-5 h-5 rounded" /> : <Icon size={20} />}
        </div>
        {trend !== undefined && !loading && (
          <div className={clsx(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg',
            trendUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400',
          )}>
            {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend}
          </div>
        )}
      </div>

      {loading ? (
        <>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-32" />
        </>
      ) : (
        <>
          <div>
            <p className="text-2xl font-bold text-slate-100 tracking-tight">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
          {sub && <p className="text-xs text-slate-400 border-t border-surface-600 pt-2.5">{sub}</p>}
        </>
      )}
    </div>
  );
}
