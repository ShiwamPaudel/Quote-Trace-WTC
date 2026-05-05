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
- Daily email reminders for due quotation follow-ups

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` at the project root and fill in your Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

EMAIL_PROVIDER=smtp
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM="Quote Trace - WTC <quotetrace@wtcnepal.com>"
EMAIL_REPLY_TO=quotetrace@wtcnepal.com

SMTP_HOST=smtppro.zoho.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=quotetrace@wtcnepal.com
SMTP_PASSWORD=your-zoho-app-password

CRON_SECRET=use-a-long-random-string
FOLLOWUP_TIME_ZONE=Asia/Kathmandu
```

3. Run the development server:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

5. Test the follow-up reminder job without sending email:

```bash
curl -H "Authorization: Bearer your-cron-secret" "http://localhost:3000/api/followup-reminders?dryRun=1"
```

## Supabase schema guidance

Create the tables and RLS policies using Supabase SQL or the dashboard. Example schema is provided in `supabase-schema.sql`.

## Notes

- The app expects a `quotations` storage bucket in Supabase.
- Uploads are restricted to PDF files.
- Login uses username lookup to map to an internal Supabase auth email.
- Follow-up emails are sent by `/api/followup-reminders`, protected by `CRON_SECRET`, and scheduled in `vercel.json` for 09:00 Nepal time. They repeat every 3 days while a quotation is still pending/open (`sent`, `awaiting_poi`, or `delivery_pending`) and stop automatically when the quotation is closed (`completed` or `rejected_lost`).
- For Zoho Mail, set `EMAIL_PROVIDER=smtp` and use your Zoho SMTP host, user, and app password.
- For Resend, set `EMAIL_PROVIDER=resend`; Resend requires `EMAIL_FROM` to use a verified sender/domain before production emails can be delivered.

## Deploy

This project is ready for Vercel.
Set all environment variables from `.env.example` in Vercel, then redeploy.
