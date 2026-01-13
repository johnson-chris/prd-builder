import { cn } from '@/lib/utils';
import type { PrdStatus } from '@/types';

interface StatusBadgeProps { status: PrdStatus; className?: string; }

export function StatusBadge({ status, className }: StatusBadgeProps): JSX.Element {
  const config: Record<PrdStatus, { label: string; classes: string }> = {
    draft: { label: 'Draft', classes: 'bg-gray-100 text-gray-700' },
    'in-review': { label: 'In Review', classes: 'bg-amber-100 text-amber-700' },
    approved: { label: 'Approved', classes: 'bg-green-100 text-green-700' },
  };
  const c = config[status];
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', c.classes, className)}>{c.label}</span>;
}
