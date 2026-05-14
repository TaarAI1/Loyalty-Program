import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-9 w-full rounded-xl border-2 border-[#e8e8e8] bg-[#f9f9f9] px-3 py-2 text-sm text-[#111111] font-medium placeholder:text-[#ccc] focus:outline-none focus:border-[#FFD000] focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 transition-all',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
