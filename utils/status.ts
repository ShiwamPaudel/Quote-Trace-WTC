export const STATUS_LABELS: Record<string, string> = {
  sent: 'Sent',
  awaiting_poi: 'Awaiting PO',
  rejected_lost: 'Rejected - Lost',
  delivery_pending: 'Delivery Pending',
  completed: 'Completed',
};

export const STATUS_CLASSES: Record<string, string> = {
  sent: 'bg-blue-50 text-blue-700',
  awaiting_poi: 'bg-orange-50 text-orange-700',
  rejected_lost: 'bg-red-50 text-red-700',
  delivery_pending: 'bg-purple-50 text-purple-700',
  completed: 'bg-green-50 text-green-700',
};

export const TYPE_LABELS: Record<string, string> = {
  service: 'Service Quotation',
  sales: 'Sales Quotation',
};

export const STATUS_OPTIONS = [
  { value: 'sent', label: 'Sent' },
  { value: 'awaiting_poi', label: 'Awaiting PO' },
  { value: 'rejected_lost', label: 'Rejected - Lost' },
  { value: 'delivery_pending', label: 'Delivery Pending' },
  { value: 'completed', label: 'Completed' },
];

export const TYPE_OPTIONS = [
  { value: 'service', label: TYPE_LABELS.service },
  { value: 'sales', label: TYPE_LABELS.sales },
];
