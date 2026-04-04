import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Volume formatting
export function formatVolume(volume: number, decimals: number = 2): string {
  if (volume === 0 || isNaN(volume)) return '$0.00';
  if (volume >= 1e12) return `$${(volume / 1e12).toFixed(decimals)}T`;
  if (volume >= 1e9) return `$${(volume / 1e9).toFixed(decimals)}B`;
  if (volume >= 1e6) return `$${(volume / 1e6).toFixed(decimals)}M`;
  if (volume >= 1e3) return `$${(volume / 1e3).toFixed(decimals)}K`;
  return `$${volume.toFixed(decimals)}`;
}

// Price formatting with intelligent decimals
export function formatPrice(price: number, decimals: number = 4): string {
  if (price === 0 || isNaN(price)) return '$0.00';
  if (price >= 10000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 100) return `$${price.toFixed(3)}`;
  if (price >= 10) return `$${price.toFixed(4)}`;
  if (price >= 1) return `$${price.toFixed(4)}`;
  if (price >= 0.1) return `$${price.toFixed(5)}`;
  if (price >= 0.01) return `$${price.toFixed(6)}`;
  if (price >= 0.001) return `$${price.toFixed(7)}`;
  if (price >= 0.0001) return `$${price.toFixed(8)}`;
  return `$${price.toFixed(10)}`;
}

// Percentage formatting with color indication
export function formatPercent(value: number, showSign: boolean = true): string {
  if (value === 0 || isNaN(value)) return '0.00%';
  const formatted = `${Math.abs(value).toFixed(2)}%`;
  if (showSign) {
    return value > 0 ? `+${formatted}` : `-${formatted}`;
  }
  return formatted;
}

// Get color class for percentage
export function getPercentColor(value: number): string {
  if (value > 5) return 'text-success';
  if (value > 0) return 'text-success/80';
  if (value < -5) return 'text-danger';
  if (value < 0) return 'text-danger/80';
  return 'text-gray-400';
}

// Get background color class for percentage
export function getPercentBgColor(value: number): string {
  if (value > 5) return 'bg-success/10';
  if (value > 0) return 'bg-success/5';
  if (value < -5) return 'bg-danger/10';
  if (value < 0) return 'bg-danger/5';
  return 'bg-gray-500/10';
}

// Time formatting
export function formatTime(timestamp: string | number | Date): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// Date formatting
export function formatDate(timestamp: string | number | Date): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// DateTime formatting
export function formatDateTime(timestamp: string | number | Date): string {
  const date = new Date(timestamp);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Relative time formatting (e.g., "5 min ago")
export function formatRelativeTime(timestamp: string | number | Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(timestamp);
}

// Countdown formatting (e.g., "2h 34m remaining")
export function formatCountdown(targetTimestamp: number): string {
  const now = Date.now();
  const diff = targetTimestamp - now;
  
  if (diff <= 0) return 'expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

// Number formatting with commas
export function formatNumber(num: number, decimals: number = 2): string {
  if (num === 0 || isNaN(num)) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Compact number formatting (e.g., 1.5K, 2.3M)
export function formatCompactNumber(num: number): string {
  if (num === 0 || isNaN(num)) return '0';
  return Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 2,
  }).format(num);
}

// Crypto amount formatting
export function formatCryptoAmount(amount: number, symbol: string = ''): string {
  if (amount === 0 || isNaN(amount)) return `0 ${symbol}`.trim();
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
  return symbol ? `${formatted} ${symbol}` : formatted;
}

// Duration formatting (seconds to human readable)
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

// Timezone-aware formatting
export function formatTimezone(timezone: string = 'UTC'): string {
  try {
    const date = new Date();
    return date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
  } catch {
    return timezone;
  }
}

// Calculate percentage change
export function calculatePercentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

// Clamp number between min and max
export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

// Round to specific decimals
export function roundTo(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

// Check if value is within range
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// Generate unique ID
export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
