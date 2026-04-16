import { Search, X } from 'lucide-react';
import clsx from 'clsx';

export default function SearchInput({ value, onChange, placeholder = 'Search…', className }) {
  return (
    <div className={clsx('relative', className)}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && onChange('')}
        placeholder={placeholder}
        aria-label={placeholder}
        className="input pl-9 pr-8 w-full"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
