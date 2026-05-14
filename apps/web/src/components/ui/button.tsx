import { cn } from '@/lib/utils';
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052ff] disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-[#0052ff] text-white hover:bg-[#003ecc] shadow-sm': variant === 'default',
            'border-2 border-slate-200 bg-white text-[#00112c] hover:bg-[#f0f2f8] hover:border-[#0052ff]': variant === 'outline',
            'text-slate-600 hover:bg-[#f0f2f8] hover:text-[#00112c]': variant === 'ghost',
            'bg-red-500 text-white hover:bg-red-600': variant === 'destructive',
            'bg-[#f0f2f8] text-[#00112c] hover:bg-slate-200': variant === 'secondary',
          },
          {
            'h-9 px-4 text-sm': size === 'default',
            'h-8 px-3 text-xs': size === 'sm',
            'h-11 px-6 text-sm': size === 'lg',
            'h-9 w-9': size === 'icon',
          },
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
