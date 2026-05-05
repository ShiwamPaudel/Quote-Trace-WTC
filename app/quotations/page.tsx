'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { buildCsv, downloadCsvFile } from '@/utils/csv';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { QuotationForm } from '@/components/QuotationForm';
import { FilterBar } from '@/components/FilterBar';
import { QuotationTypePill, getQuotationTypeRowClass } from '@/components/QuotationTypePill';
import { STATUS_LABELS, TYPE_LABELS, STATUS_OPTIONS, TYPE_OPTIONS } from '@/utils/status';
import { formatNrs } from '@/utils/money';

interface Customer {
  id: string;
  name: string;
}

interface QuotationRecord {
  id: string;
  user_id: string | null;
  user_name: string;
  quote_amount: number;
  quotation_date: string;
  status: string;
  quotation_type: string;
  contact_person: string | null;
  designation: string | null;
  file_url: string | null;
  customer: { name: string } | null;
}

type SortMode = 'date_desc' | 'state_asc' | 'state_desc';

const getStateLabel = (quote: QuotationRecord) => STATUS_LABELS[quote.status] ?? quote.status;

export default function QuotationsPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [updatingStatusId, setUpdatingStatusId] = useState('');
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [search, setSearch] = useState('');

  const refreshData = () => setRefreshFlag((value) => value + 1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('date_desc');

  useEffect(() => {
    const load = async () => {
      setLoadError('');
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        router.replace('/login');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      const isAdmin = profile?.role === 'admin';
      const profilesResult = isAdmin
        ? await supabase.from('profiles').select('id, name, email')
        : { data: [{ id: session.user.id, name: null, email: session.user.email }], error: null };

      const usersById = new Map(
        (profilesResult.data ?? []).map((user: any) => [user.id, user.name || user.email || 'Unknown user'])
      );

      const customersResult = await supabase.from('customers').select('id, name').order('name');
      const quotationsQuery = supabase
        .from('quotations')
        .select('id, user_id, quote_amount, quotation_date, status, quotation_type, contact_person, designation, file_url, customer:customers(name)')
        .order('quotation_date', { ascending: false });

      const quotationsResult = isAdmin
        ? await quotationsQuery
        : await quotationsQuery.eq('user_id', session.user.id);

      if (profilesResult.error || customersResult.error || quotationsResult.error) {
        setLoadError(profilesResult.error?.message ?? customersResult.error?.message ?? quotationsResult.error?.message ?? 'Unable to load quotation data.');
        setCustomers(customersResult.data ?? []);
        setQuotations([]);
        setLoading(false);
        return;
      }

      const quotationRecords = (quotationsResult.data ?? []).map((item: any) => ({
        ...item,
        user_name: usersById.get(item.user_id) ?? 'Unknown user',
        customer: Array.isArray(item.customer) ? item.customer[0] ?? null : item.customer,
      })) as QuotationRecord[];

      setCustomers(customersResult.data ?? []);
      setQuotations(quotationRecords);
      setLoading(false);
    };

    load();
  }, [router, refreshFlag]);

  const filtered = useMemo(() => {
    return quotations.filter((quote) => {
      const matchesSearch = [quote.customer?.name, quote.user_name, TYPE_LABELS[quote.quotation_type], STATUS_LABELS[quote.status]].some((value) =>
        value?.toLowerCase().includes(search.toLowerCase())
      );
      const matchesStatus = filterStatus ? quote.status === filterStatus : true;
      const matchesType = filterType ? quote.quotation_type === filterType : true;
      const matchesFrom = fromDate ? quote.quotation_date >= fromDate : true;
      const matchesTo = toDate ? quote.quotation_date <= toDate : true;
      return matchesSearch && matchesStatus && matchesType && matchesFrom && matchesTo;
    }).sort((a, b) => {
      if (sortMode === 'state_asc' || sortMode === 'state_desc') {
        const stateCompare = getStateLabel(a).localeCompare(getStateLabel(b));
        if (stateCompare !== 0) {
          return sortMode === 'state_asc' ? stateCompare : -stateCompare;
        }
      }

      return b.quotation_date.localeCompare(a.quotation_date);
    });
  }, [quotations, search, filterStatus, filterType, fromDate, toDate, sortMode]);

  const handleExport = () => {
      const rows = filtered.map((quote) => ({
        id: quote.id,
        customer: quote.customer?.name ?? '',
        sent_by: quote.user_name,
        contact_person: quote.contact_person ?? '',
        designation: quote.designation ?? '',
        type: TYPE_LABELS[quote.quotation_type] ?? quote.quotation_type,
        status: STATUS_LABELS[quote.status] ?? quote.status,
        amount: quote.quote_amount,
      date: quote.quotation_date.slice(0, 10),
      file_url: quote.file_url ?? '',
    }));
    const csv = buildCsv(rows);
    downloadCsvFile(csv, 'quotations-export.csv');
  };

  const handleStatusChange = async (quoteId: string, nextStatus: string) => {
    const previous = quotations.find((quote) => quote.id === quoteId)?.status;
    if (!previous || previous === nextStatus) return;

    setStatusMessage('');
    setUpdatingStatusId(quoteId);
    setQuotations((items) => items.map((quote) => (quote.id === quoteId ? { ...quote, status: nextStatus } : quote)));

    const { error } = await supabase.from('quotations').update({ status: nextStatus }).eq('id', quoteId);

    if (error) {
      setQuotations((items) => items.map((quote) => (quote.id === quoteId ? { ...quote, status: previous } : quote)));
      setStatusMessage(`Could not update status: ${error.message}`);
    } else {
      setStatusMessage('Status updated.');
    }

    setUpdatingStatusId('');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-cream px-6 py-10">
        <div className="mx-auto max-w-6xl rounded-[40px] bg-white p-10 shadow-soft text-center">
          <p className="text-slate-700">Loading quotations…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-secondary">Quotations</p>
            <h1 className="mt-2 text-4xl font-semibold text-slate-900">Create quotation entry</h1>
            <p className="mt-2 text-slate-600">Save the customer details, quotation value, status, and PDF in one place.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={() => router.push('/dashboard')}>
              Back to dashboard
            </Button>
            <Button onClick={handleExport}>Export CSV</Button>
          </div>
        </div>

        <Card>
          <QuotationForm customers={customers} onCreated={refreshData} />
        </Card>

        {loadError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {statusMessage && (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            {statusMessage}
          </div>
        )}

        <Card>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(190px,1.15fr)_repeat(3,minmax(150px,1fr))]">
              <Input placeholder="Search customer, type, or status" value={search} onChange={(event) => setSearch(event.target.value)} />
              <Select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Select value={filterType} onChange={(event) => setFilterType(event.target.value)}>
                <option value="">All types</option>
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                <option value="date_desc">Newest first</option>
                <option value="state_asc">State A-Z</option>
                <option value="state_desc">State Z-A</option>
              </Select>
            </div>
            <FilterBar
              fromDate={fromDate}
              toDate={toDate}
              onFromDateChange={setFromDate}
              onToDateChange={setToDate}
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1">{customers.length} customers</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">{filtered.length} matching quotations</span>
          </div>
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-500">Customer</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Sent by</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Contact</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Designation</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Type</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Amount</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Date</th>
                  <th className="px-4 py-3 font-medium text-slate-500">File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((quote) => (
                  <tr key={quote.id} className={getQuotationTypeRowClass(quote.quotation_type)}>
                    <td className="px-4 py-4">{quote.customer?.name ?? 'Unknown'}</td>
                    <td className="px-4 py-4">{quote.user_name}</td>
                    <td className="px-4 py-4">{quote.contact_person || '-'}</td>
                    <td className="px-4 py-4">{quote.designation || '-'}</td>
                    <td className="px-4 py-4"><QuotationTypePill type={quote.quotation_type} /></td>
                    <td className="px-4 py-4">
                      <select
                        value={quote.status}
                        disabled={updatingStatusId === quote.id}
                        onChange={(event) => handleStatusChange(quote.id, event.target.value)}
                        className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">{formatNrs(Number(quote.quote_amount || 0))}</td>
                    <td className="px-4 py-4">{quote.quotation_date.slice(0, 10)}</td>
                    <td className="px-4 py-4">
                      {quote.file_url ? (
                        <a href={quote.file_url} target="_blank" rel="noreferrer">
                          <Button type="button" variant="ghost" className="rounded-full px-3 py-2 text-xs">
                            View
                          </Button>
                        </a>
                      ) : (
                        <span className="text-slate-400">No file</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500">
                      No quotations found. Create a quotation entry above to populate this table.
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
