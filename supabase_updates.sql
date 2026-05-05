-- Quote Trace Supabase production setup / repair script.
-- Run this in Supabase SQL Editor. Safe to run more than once.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user',
  name text,
  designation text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  customer_id uuid references public.customers(id) on delete set null,
  contact_person text,
  designation text,
  quote_amount numeric not null default 0,
  quotation_type text not null default 'service',
  status text not null default 'sent',
  file_url text,
  quotation_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.followup_email_logs (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  follow_up_number integer not null,
  due_on date not null,
  recipient_email text not null,
  provider_message_id text,
  status text not null default 'queued',
  attempt_count integer not null default 0,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint followup_email_logs_status_check check (status in ('queued', 'sending', 'sent', 'failed'))
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists role text not null default 'user',
  add column if not exists name text,
  add column if not exists designation text,
  add column if not exists avatar_url text,
  add column if not exists created_at timestamptz not null default now();

alter table public.customers
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

alter table public.customers alter column created_by set default auth.uid();

alter table public.quotations
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists contact_person text,
  add column if not exists designation text,
  add column if not exists quote_amount numeric not null default 0,
  add column if not exists quotation_type text not null default 'service',
  add column if not exists status text not null default 'sent',
  add column if not exists file_url text,
  add column if not exists quotation_date date not null default current_date,
  add column if not exists created_at timestamptz not null default now();

alter table public.quotations alter column user_id set default auth.uid();

alter table public.followup_email_logs
  add column if not exists quotation_id uuid references public.quotations(id) on delete cascade,
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists follow_up_number integer not null default 1,
  add column if not exists due_on date not null default current_date,
  add column if not exists recipient_email text,
  add column if not exists provider_message_id text,
  add column if not exists status text not null default 'queued',
  add column if not exists attempt_count integer not null default 0,
  add column if not exists error text,
  add column if not exists sent_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.followup_email_logs alter column recipient_email set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'followup_email_logs_unique_reminder'
      and conrelid = 'public.followup_email_logs'::regclass
  ) then
    alter table public.followup_email_logs
      add constraint followup_email_logs_unique_reminder
      unique (quotation_id, follow_up_number, recipient_email);
  end if;
end $$;

create index if not exists followup_email_logs_quotation_idx
on public.followup_email_logs (quotation_id, follow_up_number);

create index if not exists followup_email_logs_status_idx
on public.followup_email_logs (status);

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.quotations enable row level security;
alter table public.followup_email_logs enable row level security;

do $$
declare
  policy_name text;
begin
  for policy_name in select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles'
  loop execute format('drop policy if exists %I on public.profiles', policy_name); end loop;

  for policy_name in select policyname from pg_policies where schemaname = 'public' and tablename = 'customers'
  loop execute format('drop policy if exists %I on public.customers', policy_name); end loop;

  for policy_name in select policyname from pg_policies where schemaname = 'public' and tablename = 'quotations'
  loop execute format('drop policy if exists %I on public.quotations', policy_name); end loop;
end $$;

create policy "profiles_select_authenticated"
on public.profiles for select to authenticated using (true);

create policy "profiles_update_own"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "customers_select_authenticated"
on public.customers for select to authenticated using (true);

create policy "customers_insert_authenticated"
on public.customers for insert to authenticated with check (true);

create policy "customers_update_authenticated"
on public.customers for update to authenticated using (true) with check (true);

create policy "customers_delete_created_by"
on public.customers for delete to authenticated using (created_by = auth.uid());

create policy "quotations_select_own_or_admin"
on public.quotations for select to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "quotations_insert_own"
on public.quotations for insert to authenticated
with check (user_id = auth.uid());

create policy "quotations_update_own_or_admin"
on public.quotations for update to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  user_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "quotations_delete_own_or_admin"
on public.quotations for delete to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quotations', 'quotations', true, 10485760, array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Quotation PDFs are publicly accessible" on storage.objects;
drop policy if exists "Authenticated users can upload quotation PDFs" on storage.objects;
drop policy if exists "Users can update their own quotation PDFs" on storage.objects;
drop policy if exists "Users can delete their own quotation PDFs" on storage.objects;
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;

create policy "Quotation PDFs are publicly accessible"
on storage.objects for select using (bucket_id = 'quotations');

create policy "Authenticated users can upload quotation PDFs"
on storage.objects for insert to authenticated with check (bucket_id = 'quotations');

create policy "Users can update their own quotation PDFs"
on storage.objects for update to authenticated
using (bucket_id = 'quotations' and owner = auth.uid())
with check (bucket_id = 'quotations' and owner = auth.uid());

create policy "Users can delete their own quotation PDFs"
on storage.objects for delete to authenticated
using (bucket_id = 'quotations' and owner = auth.uid());

create policy "Avatar images are publicly accessible"
on storage.objects for select using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
on storage.objects for insert to authenticated with check (bucket_id = 'avatars');

create policy "Users can update their own avatar"
on storage.objects for update to authenticated
using (bucket_id = 'avatars' and owner = auth.uid())
with check (bucket_id = 'avatars' and owner = auth.uid());

create policy "Users can delete their own avatar"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and owner = auth.uid());

select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;
