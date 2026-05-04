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
    <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <CalendarDays size={18} />
      </div>
      <label className="flex min-w-[145px] flex-col gap-1 text-xs font-medium text-slate-500">
        From
        <input
          type="date"
          value={fromDate}
          onChange={(e) => onFromDateChange(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
        />
      </label>
      <label className="flex min-w-[145px] flex-col gap-1 text-xs font-medium text-slate-500">
        To
        <input
          type="date"
          value={toDate}
          onChange={(e) => onToDateChange(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
        />
      </label>
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            onFromDateChange('');
            onToDateChange('');
          }}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          aria-label="Clear date filters"
        >
          <X size={16} />
        </button>
      )}
      {children}
    </div>
  );
};
