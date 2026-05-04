import type { ButtonHTMLAttributes, DetailedHTMLProps } from 'react';

interface ButtonProps extends DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60';
  const styles =
    variant === 'secondary'
      ? 'bg-secondary text-white hover:bg-sky-500'
      : variant === 'ghost'
      ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
      : 'bg-primary text-white hover:bg-[#0000aa]';

  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
