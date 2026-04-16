import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
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

  const currentPage = manualPagination ? page : pageState;
  const currentPageSize = manualPagination ? pageSize : pageSizeState;
  const totalItems = manualPagination ? (total ?? data.length) : data.length;

  // ── Sorting ──────────────────────────────────────────────────────────────
  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

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

  return (
    <div className="card overflow-hidden">
      {loading ? (
        <div className="p-5">
          <TableSkeleton rows={skeletonRows} cols={columns.length} />
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
          {/* Table */}
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-max">
              <thead>
                <tr className="border-b border-surface-600">
                  {columns.map(col => (
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
                    {columns.map(col => (
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
