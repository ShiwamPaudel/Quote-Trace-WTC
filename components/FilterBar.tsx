import React from 'react';
import { CalendarDays, X } from 'lucide-react';

interface FilterBarProps {
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  children?: React.ReactNode;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  children,
}) => {
  const hasFilters = Boolean(fromDate || toDate);

  return (
    <div className="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-2 sm:w-auto">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
        <CalendarDays size={18} />
      </div>
      <label className="flex h-10 min-w-[160px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 shadow-sm transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 sm:flex-none">
        <span className="shrink-0">From</span>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => onFromDateChange(e.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-medium text-slate-900 outline-none"
        />
      </label>
      <label className="flex h-10 min-w-[160px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 shadow-sm transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 sm:flex-none">
        <span className="shrink-0">To</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => onToDateChange(e.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-medium text-slate-900 outline-none"
        />
      </label>
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            onFromDateChange('');
            onToDateChange('');
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          aria-label="Clear date filters"
        >
          <X size={16} />
        </button>
      )}
      {children}
    </div>
  );
};
