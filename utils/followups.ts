import { STATUS_LABELS } from './status';

const FOLLOW_UP_STATUSES = new Set(['sent', 'awaiting_poi', 'delivery_pending']);

export interface FollowUpInfo {
  due: boolean;
  daysOpen: number;
  followUpNumber: number;
  statusLabel: string;
  cadenceText: string;
}

export const getDaysOpen = (dateString: string): number => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

export const getFollowUpInfo = (status: string, quotationDate: string): FollowUpInfo | null => {
  if (!FOLLOW_UP_STATUSES.has(status)) return null;

  const daysOpen = getDaysOpen(quotationDate);
  const followUpNumber = Math.floor(daysOpen / 3);

  return {
    due: daysOpen >= 3,
    daysOpen,
    followUpNumber,
    statusLabel: STATUS_LABELS[status] ?? status,
    cadenceText: daysOpen >= 3 ? `Follow-up ${followUpNumber}` : `First follow-up in ${3 - daysOpen} day(s)`,
  };
};
