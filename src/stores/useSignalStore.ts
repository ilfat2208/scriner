import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Signal, SignalFilters, SignalStats, SignalType, SignalSide, Exchange } from '@/types/signal';

interface SignalState {
  signals: Signal[];
  filters: SignalFilters;
  stats: SignalStats | null;
  isLoading: boolean;
  error: Error | null;
  sortBy: keyof Signal | null;
  sortDirection: 'asc' | 'desc';
  maxSignals: number;

  // Actions
  addSignal: (signal: Signal) => void;
  setSignals: (signals: Signal[]) => void;
  setFilters: (filters: SignalFilters) => void;
  setStats: (stats: SignalStats) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearSignals: () => void;
  setSort: (key: keyof Signal, direction?: 'asc' | 'desc') => void;
  resetFilters: () => void;
  getFilteredSignals: () => Signal[];
  getUnreadCount: () => number;
}

export const useSignalStore = create<SignalState>()(
  persist(
    (set, get) => ({
      signals: [],
      filters: {},
      stats: null,
      isLoading: false,
      error: null,
      sortBy: 'timestamp',
      sortDirection: 'desc',
      maxSignals: 1000,

      addSignal: (signal) =>
        set((state) => {
          const newSignals = [signal, ...state.signals].slice(0, state.maxSignals);
          return { signals: newSignals };
        }),

      setSignals: (signals) => set({ signals }),

      setFilters: (filters) => set({ filters }),

      setStats: (stats) => set({ stats }),

      markAsRead: (id) =>
        set((state) => ({
          signals: state.signals.map((s) =>
            s.id === id ? { ...s, isRead: true } : s
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          signals: state.signals.map((s) => ({ ...s, isRead: true })),
        })),

      clearSignals: () => set({ signals: [] }),

      setSort: (key, direction = 'desc') => set({ sortBy: key, sortDirection: direction }),

      resetFilters: () => set({ filters: {} }),

      getFilteredSignals: () => {
        const { signals, filters, sortBy, sortDirection } = get();
        
        let filtered = [...signals];

        // Apply filters
        if (filters.type) {
          filtered = filtered.filter((s) => s.type === filters.type);
        }
        if (filters.exchange) {
          filtered = filtered.filter((s) => s.exchange === filters.exchange);
        }
        if (filters.side) {
          filtered = filtered.filter((s) => s.side === filters.side);
        }
        if (filters.minVolume) {
          filtered = filtered.filter((s) => s.volumeUsd >= filters.minVolume!);
        }
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filtered = filtered.filter((s) =>
            s.pair.toLowerCase().includes(searchLower) ||
            s.exchange.toLowerCase().includes(searchLower)
          );
        }

        // Apply sorting
        if (sortBy) {
          filtered.sort((a, b) => {
            let aVal: any = a[sortBy];
            let bVal: any = b[sortBy];

            if (typeof aVal === 'string' && typeof bVal === 'string') {
              aVal = aVal.toLowerCase();
              bVal = bVal.toLowerCase();
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
          });
        }

        return filtered;
      },

      getUnreadCount: () => {
        const { signals } = get();
        return signals.filter((s) => !s.isRead).length;
      },
    }),
    {
      name: 'whale-screener-signals-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        filters: state.filters,
        sortBy: state.sortBy,
        sortDirection: state.sortDirection,
        maxSignals: state.maxSignals,
      }),
    }
  )
);
