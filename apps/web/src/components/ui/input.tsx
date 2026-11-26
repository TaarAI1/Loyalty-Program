import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-9 w-full rounded-xl border-2 border-[#D0DCE6] bg-[#F5F7FA] px-3 py-2 text-sm text-[#000820] font-medium placeholder:text-[#ccc] focus:outline-none focus:border-[#B9EB32] focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 transition-all',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
