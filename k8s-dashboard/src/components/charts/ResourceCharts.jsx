import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// ── Shared tooltip style ─────────────────────────────────────────────────────
const TooltipStyle = {
  contentStyle: {
    background: '#111827',
    border: '1px solid #334155',
    borderRadius: '12px',
    color: '#e2e8f0',
    fontSize: '12px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
  },
  itemStyle: { color: '#94a3b8' },
  labelStyle: { color: '#e2e8f0', fontWeight: 600, marginBottom: 4 },
};

// ── CPU + Memory area chart ───────────────────────────────────────────────────
export function ResourceAreaChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2235" vertical={false} />
        <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} interval={3} />
        <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
        <Tooltip {...TooltipStyle} formatter={(v, name) => [`${v}%`, name === 'cpu' ? 'CPU' : 'Memory']} />
        <Legend formatter={v => <span className="text-slate-400 text-xs">{v === 'cpu' ? 'CPU %' : 'Memory %'}</span>} />
        <Area type="monotone" dataKey="cpu"    stroke="#6366f1" strokeWidth={2} fill="url(#cpuGrad)" dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
        <Area type="monotone" dataKey="memory" stroke="#22d3ee" strokeWidth={2} fill="url(#memGrad)" dot={false} activeDot={{ r: 4, fill: '#22d3ee' }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Pods bar chart ────────────────────────────────────────────────────────────
export function PodsTrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a2235" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip {...TooltipStyle} />
        <Legend formatter={v => <span className="text-slate-400 text-xs capitalize">{v}</span>} />
        <Bar dataKey="running" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        <Bar dataKey="failed"  fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Donut/radial usage chart ─────────────────────────────────────────────────
const RADIAN = Math.PI / 180;
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return value > 5 ? (
    <text x={x} y={y} fill="#e2e8f0" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {value}%
    </text>
  ) : null;
};

export function UsageDonut({ value, label, color = '#6366f1' }) {
  const remaining = 100 - value;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <ResponsiveContainer width={100} height={100}>
          <PieChart>
            <Pie
              data={[{ value }, { value: remaining }]}
              cx="50%" cy="50%"
              innerRadius={32} outerRadius={44}
              startAngle={90} endAngle={-270}
              dataKey="value" stroke="none"
            >
              <Cell fill={color} />
              <Cell fill="#1a2235" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-slate-100">{value}%</span>
        </div>
      </div>
      <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">{label}</span>
    </div>
  );
}

// ── Mini sparkline ────────────────────────────────────────────────────────────
export function MiniSparkline({ data, dataKey, color = '#6366f1', height = 40 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
