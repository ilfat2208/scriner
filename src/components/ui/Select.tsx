import { cn } from '@/lib/utils';
import { SelectHTMLAttributes, ChangeEvent } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string; emoji?: string }[];
  className?: string;
}

export function Select({ options, className, onChange, ...props }: SelectProps) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange?.(e);
  };

  return (
    <select
      className={cn(
        'bg-surface2 border border-gray-700 rounded-lg px-3 py-1.5 text-sm',
        'focus:outline-none focus:border-primary transition-colors',
        'text-white cursor-pointer',
        className
      )}
      onChange={handleChange}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.emoji && <span>{option.emoji} </span>}
          {option.label}
        </option>
      ))}
    </select>
  );
}
