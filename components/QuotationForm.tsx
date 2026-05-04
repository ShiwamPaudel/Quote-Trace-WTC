'use client';

import { useMemo, useState } from 'react';
import { supabase, STORAGE_BUCKET } from '@/lib/supabaseClient';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { STATUS_OPTIONS, TYPE_OPTIONS } from '@/utils/status';

interface QuotationFormProps {
  customers: Array<{ id: string; name: string }>;
  onCreated: () => void;
}

const formatSaveError = (error: any) => {
  const message = error?.message ?? 'Unable to save quotation. Please try again.';
  const detail = [error?.code, error?.details, error?.hint].filter(Boolean).join(' ');

  if (message.toLowerCase().includes('row-level security')) {
    return `Supabase blocked this save with RLS. Run supabase_updates.sql in Supabase SQL Editor, then try again. ${detail || message}`;
  }

  return detail ? `${message} ${detail}` : message;
};

export function QuotationForm({ customers, onCreated }: QuotationFormProps) {
  const [quotationType, setQuotationType] = useState('service');
  const [status, setStatus] = useState('sent');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [designation, setDesignation] = useState('');
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');

  const customerOptions = useMemo(() => customers, [customers]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('error');

    if (!file?.name.endsWith('.pdf')) {
      setMessage('Please attach a PDF file.');
      setLoading(false);
      return;
    }

    try {
      let targetCustomerId = customerId;
      let createdCustomerId = '';

      if (!targetCustomerId && !newCustomer.trim()) {
        throw new Error('Please select or create a customer before saving.');
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        throw userError ?? new Error('Authentication required. Please sign in again.');
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(`quotations/${Date.now()}-${file.name}`, file, { cacheControl: '3600', upsert: false });

      if (uploadError || !uploadData) {
        throw uploadError ?? new Error('PDF upload failed. Check the quotations storage bucket and storage policies in Supabase.');
      }

      const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(uploadData.path);
      const fileUrl = publicData.publicUrl;

      if (!targetCustomerId && newCustomer.trim()) {
        const { data: newCustomerData, error: customerError } = await supabase
          .from('customers')
          .insert({ name: newCustomer.trim() })
          .select('id')
          .single();

        if (customerError || !newCustomerData) {
          await supabase.storage.from(STORAGE_BUCKET).remove([uploadData.path]);
          throw customerError ?? new Error('Unable to create customer');
        }

        targetCustomerId = newCustomerData.id;
        createdCustomerId = newCustomerData.id;
      }

      const { error: insertError } = await supabase.from('quotations').insert([
        {
          user_id: userId,
          customer_id: targetCustomerId,
          contact_person: contactPerson,
          designation,
          quote_amount: Number(amount || 0),
          quotation_type: quotationType,
          status,
          file_url: fileUrl,
          quotation_date: date,
        },
      ]);

      if (insertError) {
        await supabase.storage.from(STORAGE_BUCKET).remove([uploadData.path]);
        if (createdCustomerId) {
          await supabase.from('customers').delete().eq('id', createdCustomerId);
        }
        throw insertError;
      }

      setMessageType('success');
      setMessage('Quotation created successfully.');
      setFile(null);
      setContactPerson('');
      setDesignation('');
      setAmount('');
      onCreated();
    } catch (error: any) {
      console.error('Quotation save error:', error);
      setMessage(formatSaveError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Select label="Quotation Type" value={quotationType} onChange={(event) => setQuotationType(event.target.value)}>
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Input label="Quotation Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-700">
          <span className="font-semibold">Organization</span>
          <select
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Choose a customer</option>
            {customerOptions.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Add New Customer"
          placeholder="New customer name"
          value={newCustomer}
          onChange={(event) => setNewCustomer(event.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Contact Person" value={contactPerson} onChange={(event) => setContactPerson(event.target.value)} />
        <Input label="Designation" value={designation} onChange={(event) => setDesignation(event.target.value)} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Input label="Quote Amount" type="number" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700">Upload PDF</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none"
          />
        </div>
        <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {message && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            messageType === 'success'
              ? 'bg-emerald-50 text-emerald-900'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {message}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={loading} className="w-full md:w-auto">
          {loading ? 'Saving…' : 'Save Quotation'}
        </Button>
      </div>
    </form>
  );
}
