'use client';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Signal, SignalType, SignalSide, Exchange } from '@/types/signal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatVolume, formatPrice, formatTime, formatPercent, getPercentColor, cn } from '@/lib/utils';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Download,
  Eye,
  EyeOff,
  RefreshCw,
  X,
} from 'lucide-react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const columnHelper = createColumnHelper<Signal>();

interface SignalTableProps {
  signals: Signal[];
  isLoading?: boolean;
  onSignalClick?: (signal: Signal) => void;
  enableFilters?: boolean;
  enableExport?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const TYPE_VARIANTS: Record<SignalType, 'whale' | 'warning' | 'danger'> = {
  WHALE: 'whale',
  MOMENTUM: 'warning',
  PRICE_SPIKE: 'danger',
};

const TYPE_LABELS: Record<SignalType, string> = {
  WHALE: '🐋 Кит',
  MOMENTUM: '📈 Моментум',
  PRICE_SPIKE: '📉 Скачок',
};

export function SignalTable({
  signals,
  isLoading,
  onSignalClick,
  enableFilters = true,
  enableExport = true,
  autoRefresh = true,
  refreshInterval = 5000,
}: SignalTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sideFilter, setSideFilter] = useState<string>('all');
  const [exchangeFilter, setExchangeFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });
  const [visibleSignals, setVisibleSignals] = useState<Signal[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Auto-refresh simulation
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Filter signals by type, side, exchange
  const filteredSignals = useMemo(() => {
    let result = [...signals];

    if (typeFilter !== 'all') {
      result = result.filter((s) => s.type === typeFilter);
    }
    if (sideFilter !== 'all') {
      result = result.filter((s) => s.side === sideFilter);
    }
    if (exchangeFilter !== 'all') {
      result = result.filter((s) => s.exchange === exchangeFilter);
    }
    if (globalFilter) {
      const search = globalFilter.toLowerCase();
      result = result.filter(
        (s) =>
          s.pair.toLowerCase().includes(search) ||
          s.exchange.toLowerCase().includes(search)
      );
    }

    return result;
  }, [signals, typeFilter, sideFilter, exchangeFilter, globalFilter]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('type', {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-primary transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Тип <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ getValue }) => {
          const type = getValue();
          return (
            <Badge variant={TYPE_VARIANTS[type]} className="font-mono text-xs">
              {TYPE_LABELS[type]}
            </Badge>
          );
        },
        filterFn: 'equalsString',
      }),
      columnHelper.accessor('exchange', {
        header: 'Биржа',
        cell: ({ getValue }) => (
          <span className="font-medium text-gray-300">{getValue()}</span>
        ),
        filterFn: 'equalsString',
      }),
      columnHelper.accessor('pair', {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-primary transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Пара <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ getValue }) => (
          <span className="font-bold text-primary">{getValue()}</span>
        ),
        filterFn: 'includesString',
      }),
      columnHelper.accessor('side', {
        header: 'Сторона',
        cell: ({ getValue }) => {
          const side = getValue();
          return (
            <Badge
              variant={side === 'BUY' ? 'success' : 'danger'}
              className={cn(
                'font-bold text-xs',
                side === 'BUY' ? 'bg-success/20' : 'bg-danger/20'
              )}
            >
              {side === 'BUY' ? '🟢' : '🔴'} {side}
            </Badge>
          );
        },
        filterFn: 'equalsString',
      }),
      columnHelper.accessor('volumeUsd', {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-primary transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Объем <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ getValue }) => (
          <span className="font-mono text-success font-medium">
            {formatVolume(getValue())}
          </span>
        ),
      }),
      columnHelper.accessor('price', {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-primary transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Цена <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ getValue }) => (
          <span className="font-mono text-gray-300">{formatPrice(getValue())}</span>
        ),
      }),
      columnHelper.accessor('timestamp', {
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-primary transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Время <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ getValue, row }) => {
          const isRead = row.original.isRead;
          return (
            <div className="flex items-center gap-2">
              {!isRead && (
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}
              <span className="text-gray-400 text-sm">{formatTime(getValue())}</span>
            </div>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredSignals,
    columns,
    state: {
      sorting,
      pagination,
      globalFilter,
      columnFilters,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 15,
        pageIndex: 0,
      },
    },
  });

  // Export to CSV
  const handleExport = useCallback(() => {
    const headers = ['Time', 'Type', 'Exchange', 'Pair', 'Side', 'Price', 'Volume'];
    const rows = filteredSignals.map((s) => [
      new Date(s.timestamp).toLocaleString(),
      s.type,
      s.exchange,
      s.pair,
      s.side,
      s.price,
      s.volumeUsd,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signals-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredSignals]);

  // Reset all filters
  const handleResetFilters = useCallback(() => {
    setTypeFilter('all');
    setSideFilter('all');
    setExchangeFilter('all');
    setGlobalFilter('');
    setColumnFilters([]);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="h-14 bg-surface2 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-gray-800 overflow-hidden">
      {/* Toolbar */}
      {enableFilters && (
        <div className="p-4 border-b border-gray-800 space-y-3">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Поиск пары, биржи..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10"
              />
              {globalFilter && (
                <button
                  onClick={() => setGlobalFilter('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Type Filter */}
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Все типы' },
                { value: 'WHALE', label: '🐋 Кит' },
                { value: 'MOMENTUM', label: '📈 Моментум' },
                { value: 'PRICE_SPIKE', label: '📉 Скачок' },
              ]}
              className="w-40"
            />

            {/* Side Filter */}
            <Select
              value={sideFilter}
              onChange={(e) => setSideFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Все стороны' },
                { value: 'BUY', label: '🟢 BUY' },
                { value: 'SELL', label: '🔴 SELL' },
              ]}
              className="w-32"
            />

            {/* Exchange Filter */}
            <Select
              value={exchangeFilter}
              onChange={(e) => setExchangeFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Все биржи' },
                { value: 'BINANCE', label: 'Binance' },
                { value: 'BYBIT', label: 'ByBit' },
                { value: 'OKX', label: 'OKX' },
              ]}
              className="w-32"
            />

            {/* Actions */}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                disabled={!typeFilter && !sideFilter && !exchangeFilter && !globalFilter}
              >
                <Filter className="w-4 h-4" />
                Сброс
              </Button>

              {enableExport && (
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="w-4 h-4" />
                  Экспорт
                </Button>
              )}

              <Button variant="ghost" size="icon" onClick={() => setLastUpdated(new Date())}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Results info */}
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              Показано: {filteredSignals.length} из {signals.length} сигналов
            </span>
            <div className="flex items-center gap-2">
              <span>Обновлено:</span>
              <span className="text-primary">{formatTime(lastUpdated)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-gray-800 bg-surface2/50"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-gray-400"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Search className="w-8 h-8 opacity-50" />
                    <span>Сигналы не найдены</span>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-gray-800/50 hover:bg-surface2/50 transition-colors cursor-pointer',
                    !row.original.isRead && 'bg-primary/5'
                  )}
                  onClick={() => onSignalClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
        <div className="text-sm text-gray-400">
          Страница {table.getState().pagination.pageIndex + 1} из{' '}
          {table.getPageCount() || 1}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 mr-4">
            <span className="text-sm text-gray-400">Показать:</span>
            <Select
              value={String(pagination.pageSize)}
              onChange={(e) =>
                setPagination((p) => ({ ...p, pageSize: Number(e.target.value) }))
              }
              options={[
                { value: '10', label: '10' },
                { value: '15', label: '15' },
                { value: '25', label: '25' },
                { value: '50', label: '50' },
              ]}
              className="w-20"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="w-4 h-4" />
            <ChevronLeft className="w-4 h-4 -ml-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="w-4 h-4" />
            <ChevronRight className="w-4 h-4 -ml-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
