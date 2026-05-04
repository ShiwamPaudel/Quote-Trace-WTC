import { STATUS_CLASSES, STATUS_LABELS } from '@/utils/status';

interface StatusPillProps {
  status: string;
}

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASSES[status] ?? 'bg-slate-100 text-slate-800'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
