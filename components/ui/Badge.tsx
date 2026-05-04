import type { PropsWithChildren } from 'react';

interface BadgeProps {
  variant?: 'blue' | 'orange' | 'red' | 'purple' | 'green' | 'slate';
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  blue: 'bg-blue-50 text-blue-700',
  orange: 'bg-orange-50 text-orange-700',
  red: 'bg-red-50 text-red-700',
  purple: 'bg-purple-50 text-purple-700',
  green: 'bg-emerald-50 text-emerald-700',
  slate: 'bg-slate-100 text-slate-800',
};

export function Badge({ variant = 'slate', children }: PropsWithChildren<BadgeProps>) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${variantClasses[variant]}`}>{children}</span>;
}
