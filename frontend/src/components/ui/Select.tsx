import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption { value: string; label: string; }
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { options: SelectOption[]; error?: string; }

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, options, error, ...props }, ref) => (
  <div className="w-full">
    <select ref={ref} className={cn('w-full rounded border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50', error ? 'border-error focus:border-error focus:ring-error' : 'border-border focus:border-accent focus:ring-accent', className)} {...props}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    {error && <p className="mt-1 text-sm text-error">{error}</p>}
  </div>
));
Select.displayName = 'Select';
