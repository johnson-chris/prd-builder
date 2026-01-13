import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> { children: ReactNode; }

export function Card({ className, children, ...props }: CardProps): JSX.Element {
  return <div className={cn('rounded-lg border border-border bg-white p-6 shadow-card transition-shadow hover:shadow-card-hover', className)} {...props}>{children}</div>;
}
