import type { PropsWithChildren } from 'react';

export function Card({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <div className={`rounded-[30px] bg-white p-6 shadow-soft ring-1 ring-slate-200/80 ${className}`}>{children}</div>;
}
