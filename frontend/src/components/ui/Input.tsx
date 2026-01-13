import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> { error?: string; }

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, error, ...props }, ref) => (
  <div className="w-full">
    <input ref={ref} className={cn('w-full rounded border bg-white px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50', error ? 'border-error focus:border-error focus:ring-error' : 'border-border focus:border-accent focus:ring-accent', className)} {...props} />
    {error && <p className="mt-1 text-sm text-error">{error}</p>}
  </div>
));
Input.displayName = 'Input';
