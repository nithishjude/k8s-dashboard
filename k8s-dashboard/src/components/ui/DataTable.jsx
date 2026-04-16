import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Columns3, LayoutList, LayoutGrid, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { TableSkeleton } from './Skeleton';

const PAGE_SIZES = [10, 20, 50];

export default function DataTable({
  columns,
  data = [],
  loading = false,
  error,
  onRowClick,
  emptyMessage = 'No resources found',
  skeletonRows = 8,
  density: densityProp,
  onDensityChange,
  manualPagination = false,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}) {
  const [sortKey,  setSortKey]  = useState(null);
  const [sortDir,  setSortDir]  = useState('asc');
  const [pageState,     setPageState]     = useState(1);
  const [pageSizeState, setPageSizeState] = useState(10);
  const [densityState, setDensityState] = useState('comfortable');
  const [showColumns, setShowColumns] = useState(false);
  const [hiddenKeys, setHiddenKeys] = useState(() => columns.filter(c => c.hidden).map(c => c.key));
  const popoverRef = useRef(null);
  const density = densityProp || densityState;

  const currentPage = manualPagination ? (page || 1) : pageState;
  const currentPageSize = manualPagination ? (pageSize || 10) : pageSizeState;
  const totalItems = manualPagination ? (total ?? data.length) : data.length;

  useEffect(() => {
    const keys = new Set(columns.map(c => c.key));
    setHiddenKeys(prev => prev.filter(k => keys.has(k)));
  }, [columns]);

  useEffect(() => {
    if (!showColumns) return undefined;
    const onDocClick = (e) => {
      if (!popoverRef.current?.contains(e.target)) setShowColumns(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showColumns]);

  // ── Sorting ──────────────────────────────────────────────────────────────
  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    if (manualPagination) onPageChange?.(1);
    else setPageState(1);
  };

  const visibleColumns = useMemo(() => columns.filter(col => !hiddenKeys.includes(col.key)), [columns, hiddenKeys]);
  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(totalItems / currentPageSize));
  const paginated  = manualPagination
    ? sorted
    : sorted.slice((currentPage - 1) * currentPageSize, currentPage * currentPageSize);

  const SortIcon = ({ colKey }) => {
    if (sortKey !== colKey) return <ChevronsUpDown size={12} className="opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp   size={12} className="text-brand-400" />
      : <ChevronDown size={12} className="text-brand-400" />;
  };

  const toggleColumn = (key) => {
    setHiddenKeys(prev => {
      const isHidden = prev.includes(key);
      const visibleCount = columns.length - prev.length;
      if (!isHidden && visibleCount <= 1) return prev;
      return isHidden ? prev.filter(k => k !== key) : [...prev, key];
    });
  };

  const applyDensity = (value) => {
    if (onDensityChange) onDensityChange(value);
    else setDensityState(value);
  };

  return (
    <div className="card overflow-hidden">
      {loading ? (
        <div className="p-5">
          <TableSkeleton rows={skeletonRows} cols={visibleColumns.length || columns.length} />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
          <div className="text-4xl">⚠️</div>
          <p className="text-sm">{error.statusCode === 403 ? 'Insufficient permissions (RBAC)' : error.message}</p>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
          <div className="text-4xl">📭</div>
          <p className="text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-600 flex-wrap gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <SlidersHorizontal size={14} className="text-slate-500" />
              <span>{totalItems} items</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-surface-700 rounded-lg p-0.5 border border-surface-600">
                <button
                  onClick={() => applyDensity('compact')}
                  className={clsx('table-toolbar-btn', density === 'compact' && 'active')}
                  title="Compact density"
                >
                  <LayoutList size={14} />
                </button>
                <button
                  onClick={() => applyDensity('comfortable')}
                  className={clsx('table-toolbar-btn', density === 'comfortable' && 'active')}
                  title="Comfortable density"
                >
                  <LayoutGrid size={14} />
                </button>
              </div>

              <div className="relative" ref={popoverRef}>
                <button
                  onClick={() => setShowColumns(s => !s)}
                  className="table-toolbar-btn"
                  title="Columns"
                >
                  <Columns3 size={14} className="mr-1" /> Columns
                </button>
                {showColumns && (
                  <div className="absolute right-0 mt-2 w-56 card p-2 z-20">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 px-2 py-1">Visible Columns</p>
                    {columns.map(col => (
                      <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-300 hover:bg-surface-700/60 rounded-lg">
                        <input
                          type="checkbox"
                          checked={!hiddenKeys.includes(col.key)}
                          onChange={() => toggleColumn(col.key)}
                          disabled={col.hideable === false}
                        />
                        <span className={col.hideable === false ? 'text-slate-500' : ''}>{col.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto scrollbar-thin">
            <table className={clsx('w-full min-w-max', density === 'compact' && 'table-density-compact')}>
              <thead className="table-sticky-head">
                <tr>
                  {visibleColumns.map(col => (
                    <th
                      key={col.key}
                      className={clsx(
                        'px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap',
                        col.sortable !== false && 'cursor-pointer select-none hover:text-slate-300 transition-colors',
                      )}
                      onClick={() => col.sortable !== false && toggleSort(col.key)}
                      style={{ width: col.width }}
                    >
                      <div className="flex items-center gap-1.5">
                        {col.label}
                        {col.sortable !== false && <SortIcon colKey={col.key} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/50">
                {paginated.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    className={clsx('table-row-hover animate-fade-in', onRowClick && 'cursor-pointer')}
                    onClick={() => onRowClick?.(row)}
                  >
                    {visibleColumns.map(col => (
                      <td key={col.key} className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                        {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-600 flex-wrap gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Rows per page:</span>
              <select
                value={currentPageSize}
                onChange={e => {
                  const next = Number(e.target.value);
                  if (manualPagination) {
                    onPageSizeChange?.(next);
                    onPageChange?.(1);
                  } else {
                    setPageSizeState(next);
                    setPageState(1);
                  }
                }}
                className="input py-1 px-2 text-xs"
              >
                {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="ml-2">
                {(currentPage - 1) * currentPageSize + 1}–{Math.min(currentPage * currentPageSize, totalItems)} of {totalItems}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
                <span>Page</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={e => {
                    const next = Math.min(totalPages, Math.max(1, Number(e.target.value)));
                    manualPagination ? onPageChange?.(next) : setPageState(next);
                  }}
                  className="input py-1 px-2 text-xs w-16"
                />
                <span>of {totalPages}</span>
              </div>
              <button
                onClick={() => manualPagination
                  ? onPageChange?.(Math.max(1, currentPage - 1))
                  : setPageState(p => Math.max(1, p - 1))
                }
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-surface-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="px-1.5 text-slate-500 text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => manualPagination ? onPageChange?.(p) : setPageState(p)}
                      className={clsx(
                        'min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors',
                        p === currentPage
                          ? 'bg-brand-600 text-white shadow-glow'
                          : 'hover:bg-surface-600 text-slate-400',
                      )}
                    >
                      {p}
                    </button>
                  ),
                )}
              <button
                onClick={() => manualPagination
                  ? onPageChange?.(Math.min(totalPages, currentPage + 1))
                  : setPageState(p => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-surface-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
