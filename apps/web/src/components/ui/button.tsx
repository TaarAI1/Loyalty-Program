import { cn } from '@/lib/utils';
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9EB32] disabled:pointer-events-none disabled:opacity-40',
        {
          'bg-[#B9EB32] text-[#000820] hover:bg-[#A6D42A] active:bg-[#95C220]': variant === 'default',
          'border-2 border-[#D0DCE6] bg-white text-[#000820] hover:border-[#B9EB32] hover:bg-[#F4FCE3]': variant === 'outline',
          'text-[#487898] hover:bg-[#F8F8F8] hover:text-[#000820]': variant === 'ghost',
          'bg-red-500 text-white hover:bg-red-600': variant === 'destructive',
          'bg-[#F5F7FA] text-[#000820] hover:bg-[#E2EAF0]': variant === 'secondary',
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
  ),
);
Button.displayName = 'Button';
