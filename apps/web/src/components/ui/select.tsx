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
        'flex h-9 w-full rounded-xl border-2 border-[#D0DCE6] bg-[#F5F7FA] px-3 py-1 text-sm text-[#000820] font-medium focus:outline-none focus:border-[#B9EB32] focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 transition-all',
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
