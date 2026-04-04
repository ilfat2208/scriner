'use client';

import { Card } from '@/components/ui/Card';
import { SignalStats } from '@/types/signal';
import { TrendingUp, TrendingDown, Activity, DollarSign, Zap, Waves } from 'lucide-react';
import { formatVolume, formatPercent, getPercentColor, cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

interface MetricsCardsProps {
  stats: SignalStats | null;
  isLoading?: boolean;
  previousStats?: SignalStats | null;
}

// Animated number component
function AnimatedNumber({
  value,
  duration = 500,
  format = (v) => v.toString(),
}: {
  value: number;
  duration?: number;
  format?: (v: number) => string;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);
  const startTime = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === displayValue) return;

    const startValue = previousValue.current;
    const change = value - startValue;
    
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      
      // Easing function (ease-out-cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + change * eased;
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        previousValue.current = value;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration, displayValue]);

  return <span>{format(displayValue)}</span>;
}

// Trend indicator component
function TrendIndicator({
  currentValue,
  previousValue,
  inverse = false,
}: {
  currentValue: number;
  previousValue?: number;
  inverse?: boolean;
}) {
  if (previousValue === undefined || previousValue === 0) {
    return null;
  }

  const change = currentValue - previousValue;
  const percentChange = (change / previousValue) * 100;
  const isPositive = inverse ? change < 0 : change > 0;
  const isNegative = inverse ? change > 0 : change < 0;

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-xs font-medium',
        isPositive && 'text-success',
        isNegative && 'text-danger'
      )}
    >
      {isPositive && <TrendingUp className="w-3 h-3" />}
      {isNegative && <TrendingDown className="w-3 h-3" />}
      <span>{formatPercent(Math.abs(percentChange), false)}</span>
    </div>
  );
}

export function MetricsCards({ stats, isLoading, previousStats }: MetricsCardsProps) {
  const metrics = [
    {
      title: 'Всего сигналов',
      value: stats?.totalSignals ?? 0,
      previousValue: previousStats?.totalSignals,
      icon: Zap,
      color: 'text-whale',
      bgColor: 'bg-whale/10',
      borderColor: 'border-whale/20',
    },
    {
      title: 'Активных токенов',
      value: stats?.activeTokens ?? 0,
      previousValue: previousStats?.activeTokens,
      icon: Activity,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
    },
    {
      title: 'Прибыль 24ч',
      value: stats?.profit24h ?? 0,
      previousValue: previousStats?.profit24h,
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/20',
      format: (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`,
      isPercent: true,
    },
    {
      title: 'Объем китов',
      value: stats?.whaleCount ? stats.whaleCount * 75000 : 0,
      previousValue: previousStats?.whaleCount
        ? previousStats.whaleCount * 75000
        : undefined,
      icon: Waves,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/20',
      format: (v: number) => formatVolume(v),
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="h-36 animate-pulse bg-surface2">
            <div className="w-full h-full" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        const hasIncreased =
          metric.previousValue !== undefined &&
          metric.value > metric.previousValue;
        const hasDecreased =
          metric.previousValue !== undefined &&
          metric.value < metric.previousValue;

        return (
          <Card
            key={metric.title}
            variant="glow"
            className={cn(
              'relative overflow-hidden',
              'transition-all duration-300 hover:scale-105',
              hasIncreased && 'ring-1 ring-success/30',
              hasDecreased && 'ring-1 ring-danger/30'
            )}
          >
            {/* Background gradient */}
            <div
              className={cn(
                'absolute inset-0 opacity-5',
                metric.bgColor
              )}
            />

            {/* Pulse animation for increased values */}
            {hasIncreased && (
              <div className="absolute inset-0 bg-success/5 animate-pulse" />
            )}

            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">{metric.title}</span>
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    metric.bgColor,
                    metric.borderColor,
                    'border'
                  )}
                >
                  <Icon className={cn('w-5 h-5', metric.color)} />
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p
                    className={cn(
                      'text-2xl font-bold font-mono',
                      metric.color
                    )}
                  >
                    {metric.format ? (
                      <AnimatedNumber
                        value={metric.value}
                        format={metric.format}
                      />
                    ) : (
                      <AnimatedNumber value={metric.value} />
                    )}
                  </p>
                  {metric.previousValue !== undefined && (
                    <TrendIndicator
                      currentValue={metric.value}
                      previousValue={metric.previousValue}
                      inverse={metric.title.includes('Прибыль')}
                    />
                  )}
                </div>

                {/* Mini sparkline placeholder */}
                <div className="flex items-end gap-0.5 h-8">
                  {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-1.5 rounded-t',
                        metric.bgColor,
                        metric.color.replace('text-', 'bg-')
                      )}
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
