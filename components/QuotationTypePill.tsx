import { TYPE_LABELS } from '@/utils/status';

interface QuotationTypePillProps {
  type: string;
}

const typePillClasses: Record<string, string> = {
  service: 'border-sky-200 bg-sky-50 text-sky-700',
  sales: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const typeRowClasses: Record<string, string> = {
  service: 'bg-sky-50/30 hover:bg-sky-50/70',
  sales: 'bg-emerald-50/30 hover:bg-emerald-50/70',
};

export function getQuotationTypeRowClass(type: string) {
  return `${typeRowClasses[type] ?? 'hover:bg-slate-50'} transition-colors`;
}

export function QuotationTypePill({ type }: QuotationTypePillProps) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${
        typePillClasses[type] ?? 'border-slate-200 bg-slate-100 text-slate-700'
      }`}
    >
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}
