# Quotation Tracker

Minimal quotation management dashboard built with Next.js App Router, Tailwind CSS, Recharts, and Supabase.

## Features

- Login-only access for pre-created users
- Admin / Standard user roles
- Quotations list with status, type, and file upload
- PDF file storage in Supabase Storage
- Dashboard charts and summary cards
- CSV export with filters
- Follow-up reminder badge for delayed quotations

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` at the project root and fill in your Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. Run the development server:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Supabase schema guidance

Create the tables and RLS policies using Supabase SQL or the dashboard. Example schema is provided in `supabase-schema.sql`.

## Notes

- The app expects a `quotations` storage bucket in Supabase.
- Uploads are restricted to PDF files.
- Login uses username lookup to map to an internal Supabase auth email.

## Deploy

This project is ready for Vercel.
Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel environment variables.
