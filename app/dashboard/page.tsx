'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/StatusPill';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { STATUS_LABELS, TYPE_LABELS } from '@/utils/status';
import { getFollowUpInfo } from '@/utils/followups';
import { formatNrs } from '@/utils/money';
import { Plus } from 'lucide-react';



import { FilterBar } from '@/components/FilterBar';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface QuotationRecord {
  id: string;
  quote_amount: number;
  quotation_date: string;
  status: string;
  quotation_type: string;
  customer: { name: string } | null;
}

const statusPalette: Record<string, string> = {
  sent: '#2563eb',
  awaiting_poi: '#f97316',
  rejected_lost: '#dc2626',
  delivery_pending: '#7c3aed',
  completed: '#16a34a',
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export default function DashboardPage() {
  const router = useRouter();
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [profileName, setProfileName] = useState<string>('');
  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        router.replace('/login');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('role, name').eq('id', session.user.id).single();
      if (!profile) {
        router.replace('/login');
        return;
      }
      const userRole = profile?.role === 'admin' ? 'admin' : 'user';
      setRole(userRole);
      setProfileName(profile?.name ?? session.user.email?.split('@')[0] ?? 'there');

      let query = supabase
        .from('quotations')
        .select('id, quote_amount, quotation_date, status, quotation_type, customer:customers(name)')
        .order('quotation_date', { ascending: false });

      if (userRole !== 'admin') {
        query = query.eq('user_id', session.user.id);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching quotations:', error);
        setLoading(false);
        return;
      }

    const parsed = (data ?? []).map((item: any) => ({
      ...item,
      customer: Array.isArray(item.customer) ? item.customer[0] ?? null : item.customer,
    })) as QuotationRecord[];
    setQuotations(parsed);
    setLoading(false);
  };

  load();
}, [router]);

  const filteredQuotations = useMemo(() => {
    if (!fromDate && !toDate) return quotations;
    return quotations.filter((q) => {
      const date = q.quotation_date?.slice(0, 10);
      if (!date) return false;
      if (fromDate && date < fromDate) return false;
      if (toDate && date > toDate) return false;
      return true;
    });
  }, [quotations, fromDate, toDate]);

  const totals = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekTs = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7);
    const monthTs = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
    const summary = {
      today: 0,
      week: 0,
      month: 0,
      value: 0,
      status: {} as Record<string, number>,
      type: {} as Record<string, number>,
    };

    filteredQuotations.forEach((quotation) => {
      const quoteDate = quotation.quotation_date?.slice(0, 10);
      const created = new Date(quotation.quotation_date);
      if (quoteDate === today) summary.today += 1;
      if (created >= weekTs) summary.week += 1;
      if (created >= monthTs) summary.month += 1;
      summary.value += Number(quotation.quote_amount || 0);
      summary.status[quotation.status] = (summary.status[quotation.status] || 0) + 1;
      summary.type[quotation.quotation_type] = (summary.type[quotation.quotation_type] || 0) + 1;
    });

    return summary;
  }, [filteredQuotations]);

  const chartSeries = useMemo(() => {
    const map: Record<string, number> = {};
    const days = Array.from({ length: 14 }, (_, index) => {
      const d = new Date();
      d.setDate(d.getDate() - index);
      const key = d.toISOString().slice(0, 10);
      map[key] = 0;
      return key;
    }).reverse();

    filteredQuotations.forEach((quotation) => {
      const key = quotation.quotation_date?.slice(0, 10);
      if (key && key in map) {
        map[key] += 1;
      }
    });

    return Object.entries(map).map(([date, value]) => ({ date, value }));
  }, [filteredQuotations]);

  const statusDistribution = useMemo(
    () =>
      Object.entries(totals.status).map(([key, value]) => ({ name: STATUS_LABELS[key] ?? key, value, fill: statusPalette[key] ?? '#64748b' })),
    [totals.status]
  );

  const followUps = useMemo(
    () =>
      quotations
        .map((quote) => ({ quote, info: getFollowUpInfo(quote.status, quote.quotation_date) }))
        .filter((item): item is { quote: QuotationRecord; info: NonNullable<ReturnType<typeof getFollowUpInfo>> } => Boolean(item.info?.due)),
    [quotations]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-cream px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[40px] bg-white p-10 text-center shadow-soft">
            <p className="text-slate-700">Loading dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-secondary">Quotation Tracker</p>
            <h1 className="mt-3 text-4xl font-semibold text-slate-900">
              {getGreeting()}, {profileName}
            </h1>
            <p className="mt-2 text-slate-600">Track your Sent Quotations, Follow Up Due Dates in One Place.</p>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-3 md:justify-end">
            <Button onClick={() => router.push('/quotations')} className="gap-2">
              <Plus size={16} />
              Make Quote Entry
            </Button>
            <FilterBar
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />
          </div>
        </div>

        <Card className="border-l-4 border-orange-500 bg-orange-50/80">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-orange-900">Follow-ups due</p>
              <p className="text-slate-700">
                Sent, Awaiting PO, and Delivery Pending quotations are due every 3 days from the selected quotation date.
              </p>
            </div>
            <Badge variant="orange">{followUps.length} due</Badge>
          </div>
          {followUps.length > 0 ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {followUps.slice(0, 4).map(({ quote, info }) => (
                <div key={quote.id} className="rounded-2xl border border-orange-200 bg-white/70 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{quote.customer?.name ?? 'Unknown Customer'}</p>
                    <StatusPill status={quote.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {info.cadenceText} due, {info.daysOpen} day(s) since selected quotation date.
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-600">No follow-ups are due right now.</p>
          )}
        </Card>

        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Today</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{totals.today}</p>
          </Card>
          <Card>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">This week</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{totals.week}</p>
          </Card>
          <Card>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">This month</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{totals.month}</p>
          </Card>
          <Card>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Total quote value</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{formatNrs(totals.value)}</p>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Card className="h-[420px]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Quotation trend</h2>
                <p className="text-sm text-slate-500">Quotes created in the last 14 days</p>
              </div>
            </div>
            {filteredQuotations.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartSeries} margin={{ top: 10, right: 15, left: -12, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#0000CC" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                <p className="font-semibold text-slate-900">No quotations yet</p>
                <p className="mt-1 text-sm text-slate-500">Create a quotation to populate this trend.</p>
              </div>
            )}
          </Card>

          <Card className="grid gap-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Status distribution</h2>
              <p className="text-sm text-slate-500">Proportion of quotations by status</p>
            </div>
            <div className="h-[320px] w-full">
              {statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4}>
                      {statusDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                  <p className="font-semibold text-slate-900">No status data</p>
                  <p className="mt-1 text-sm text-slate-500">Saved quotations will appear here.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <Card>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Recent quotations</h2>
              <p className="text-sm text-slate-500">Your most recent records with status and value.</p>
            </div>
            {role === 'admin' && <Badge variant="blue">Admin view</Badge>}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-500">Customer</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Type</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Value</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Date</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
              {filteredQuotations.slice(0, 8).map((quote) => (
                <tr key={quote.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4">{quote.customer?.name ?? 'Unknown'}</td>
                  <td className="px-4 py-4">{TYPE_LABELS[quote.quotation_type] ?? quote.quotation_type}</td>
                  <td className="px-4 py-4"><StatusPill status={quote.status} /></td>
                  <td className="px-4 py-4">{formatNrs(Number(quote.quote_amount || 0))}</td>
                  <td className="px-4 py-4">{quote.quotation_date.slice(0, 10)}</td>
                  <td className="px-4 py-4">
                    <Button variant="ghost" className="rounded-full px-4 py-2 text-xs text-slate-700" onClick={() => router.push('/quotations')}>
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredQuotations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    No quotations found. Use Create quotation to add the first entry.
                  </td>
                </tr>
              )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </main>
  );
}
