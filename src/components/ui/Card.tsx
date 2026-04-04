import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'glow' | 'success' | 'danger';
}

export function Card({ children, className, variant = 'default' }: CardProps) {
  const variants = {
    default: 'bg-surface border border-gray-800',
    glow: 'bg-surface border border-primary/30 neon-border',
    success: 'bg-surface border border-success/30 neon-border-success',
    danger: 'bg-surface border border-danger/30 neon-border-danger',
  };

  return (
    <div className={cn(
      'rounded-xl p-6 transition-all duration-300',
      variants[variant],
      className
    )}>
      {children}
    </div>
  );
}
