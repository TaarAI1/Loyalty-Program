import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-xl border-2 border-slate-100 bg-[#f8faff] px-3 py-2 text-sm text-[#00112c] font-medium placeholder:text-slate-300 focus:outline-none focus:ring-0 focus:border-[#0052ff] focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 transition-all',
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';
