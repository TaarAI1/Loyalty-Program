import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string | number; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-xl border-2 border-[#e8e8e8] bg-[#f9f9f9] px-3 py-1 text-sm text-[#111111] font-medium focus:outline-none focus:border-[#FFD000] focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 transition-all',
        className,
      )}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  ),
);
Select.displayName = 'Select';
