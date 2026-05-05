import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { PENDING_FOLLOW_UP_STATUSES } from '@/utils/followups';
import { formatNrs } from '@/utils/money';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_TIME_ZONE = 'Asia/Kathmandu';

interface QuotationRow {
  id: string;
  user_id: string | null;
  quote_amount: number | string | null;
  quotation_date: string;
  status: string;
  customer: { name: string | null } | Array<{ name: string | null }> | null;
}

interface ProfileRow {
  id: string;
  name: string | null;
  email: string | null;
}

interface EmailLogRow {
  id: string;
  quotation_id: string;
  follow_up_number: number;
  recipient_email: string;
  status: string;
  attempt_count: number | null;
}

interface FollowUpCandidate {
  quote: QuotationRow;
  followUpNumber: number;
  dueOn: string;
}

interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}

const getDateKeyInTimeZone = (timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.slice(0, 10).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

const addDays = (dateKey: string, days: number) => {
  const date = new Date(parseDateKey(dateKey) + days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
};

const getDaysBetween = (fromDateKey: string, toDateKey: string) => {
  const diff = parseDateKey(toDateKey) - parseDateKey(fromDateKey);
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
};

const normalizeCustomer = (customer: QuotationRow['customer']) => {
  const resolved = Array.isArray(customer) ? customer[0] : customer;
  return resolved?.name?.trim() || 'Unknown Customer';
};

const sanitizeDisplayName = (value: string) => value.replace(/[<>]/g, '').replace(/"/g, '\\"').trim();

const formatRecipient = (name: string, email: string) => {
  const safeName = sanitizeDisplayName(name);
  return safeName ? `"${safeName}" <${email}>` : email;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getLogKey = (quotationId: string, followUpNumber: number, recipientEmail: string) =>
  `${quotationId}:${followUpNumber}:${recipientEmail.toLowerCase()}`;

const buildEmail = (candidate: FollowUpCandidate, profile: ProfileRow) => {
  const recipientName = profile.name?.trim() || profile.email?.split('@')[0] || 'there';
  const customerName = normalizeCustomer(candidate.quote.customer);
  const sentDate = candidate.quote.quotation_date.slice(0, 10);
  const amount = formatNrs(Number(candidate.quote.quote_amount || 0));
  const subject = `Follow-up on the Quote Sent to '${customerName}' - '${recipientName}' Followup #${candidate.followUpNumber}`;

  const text = [
    `Dear ${recipientName},`,
    '',
    `Followup #${candidate.followUpNumber} for Quotation Sent to '${customerName}' on ${sentDate}`,
    `Amount: ${amount}`,
    '',
    'Thank You & Happy Sales',
    'Quote Trace - WTC',
  ].join('\n');

  const html = [
    `<p>Dear ${escapeHtml(recipientName)},</p>`,
    `<p>Followup #${candidate.followUpNumber} for Quotation Sent to '${escapeHtml(customerName)}' on ${escapeHtml(sentDate)}</p>`,
    `<p><strong>Amount:</strong> ${escapeHtml(amount)}</p>`,
    '<p>Thank You &amp; Happy Sales<br />Quote Trace - WTC</p>',
  ].join('');

  return {
    customerName,
    recipientName,
    subject,
    text,
    html,
  };
};

const placeholderValues = new Set(['your-resend-api-key', 'use-a-long-random-string']);

const getConfiguredEnv = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value || placeholderValues.has(value)) return '';
  return value;
};

const getEmailProvider = () => {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (provider === 'smtp' || provider === 'resend') return provider;

  if (getConfiguredEnv('SMTP_HOST') && getConfiguredEnv('SMTP_USER') && getConfiguredEnv('SMTP_PASSWORD')) {
    return 'smtp';
  }

  return 'resend';
};

const getSmtpConfig = (): SmtpConfig | null => {
  const host = getConfiguredEnv('SMTP_HOST');
  const user = getConfiguredEnv('SMTP_USER');
  const password = getConfiguredEnv('SMTP_PASSWORD');

  if (!host || !user || !password) return null;

  const port = Number(process.env.SMTP_PORT || 465);
  const secureSetting = process.env.SMTP_SECURE?.trim().toLowerCase();

  return {
    host,
    port,
    secure: secureSetting ? secureSetting === 'true' : port === 465,
    user,
    password,
  };
};

const sendResendEmail = async ({
  apiKey,
  from,
  to,
  subject,
  text,
  html,
  replyTo,
}: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
      reply_to: replyTo || undefined,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `Resend returned ${response.status}.`);
  }

  return payload?.id ?? null;
};

const sendSmtpEmail = async (config: SmtpConfig, message: EmailMessage) => {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
  });

  const result = await transporter.sendMail({
    from: message.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    replyTo: message.replyTo,
  });

  return result.messageId ?? null;
};

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

export async function GET(request: NextRequest) {
  const dryRun = ['1', 'true'].includes(request.nextUrl.searchParams.get('dryRun')?.toLowerCase() ?? '');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 500 });
  }

  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  const emailFrom = getConfiguredEnv('EMAIL_FROM');
  if (!emailFrom) {
    return NextResponse.json({ error: 'EMAIL_FROM must be configured.' }, { status: 500 });
  }

  const emailProvider = getEmailProvider();
  const resendApiKey = getConfiguredEnv('RESEND_API_KEY');
  const smtpConfig = getSmtpConfig();

  if (emailProvider === 'resend' && !resendApiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY must be configured when EMAIL_PROVIDER is resend.' }, { status: 500 });
  }

  if (emailProvider === 'smtp' && !smtpConfig) {
    return NextResponse.json({ error: 'SMTP_HOST, SMTP_USER, and SMTP_PASSWORD must be configured when EMAIL_PROVIDER is smtp.' }, { status: 500 });
  }

  const timeZone = process.env.FOLLOWUP_TIME_ZONE || DEFAULT_TIME_ZONE;
  const today = getDateKeyInTimeZone(timeZone);
  const oldestDueDate = addDays(today, -3);
  const supabase = createSupabaseAdminClient();

  const { data: quotations, error: quotationsError } = await supabase
    .from('quotations')
    .select('id, user_id, quote_amount, quotation_date, status, customer:customers(name)')
    .in('status', Array.from(PENDING_FOLLOW_UP_STATUSES))
    .not('user_id', 'is', null)
    .lte('quotation_date', oldestDueDate)
    .order('quotation_date', { ascending: true })
    .limit(1000);

  if (quotationsError) {
    return NextResponse.json({ error: quotationsError.message }, { status: 500 });
  }

  const candidates = ((quotations ?? []) as QuotationRow[])
    .map((quote) => {
      const quotationDate = quote.quotation_date.slice(0, 10);
      const daysOpen = getDaysBetween(quotationDate, today);
      const followUpNumber = Math.floor(daysOpen / 3);

      if (daysOpen < 3 || followUpNumber < 1) return null;

      return {
        quote,
        followUpNumber,
        dueOn: addDays(quotationDate, followUpNumber * 3),
      };
    })
    .filter((candidate): candidate is FollowUpCandidate => Boolean(candidate));

  if (candidates.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, failed: 0, today, timeZone });
  }

  const userIds = Array.from(new Set(candidates.map((candidate) => candidate.quote.user_id).filter(Boolean))) as string[];
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('id', userIds);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile as ProfileRow]));
  const quotationIds = Array.from(new Set(candidates.map((candidate) => candidate.quote.id)));
  const { data: existingLogs, error: logsError } = await supabase
    .from('followup_email_logs')
    .select('id, quotation_id, follow_up_number, recipient_email, status, attempt_count')
    .in('quotation_id', quotationIds);

  if (logsError) {
    return NextResponse.json({ error: `${logsError.message}. Run the followup_email_logs SQL migration first.` }, { status: 500 });
  }

  const logsByKey = new Map(
    ((existingLogs ?? []) as EmailLogRow[]).map((log) => [
      getLogKey(log.quotation_id, log.follow_up_number, log.recipient_email),
      log,
    ])
  );

  if (dryRun) {
    const evaluated = candidates.map((candidate) => {
      const profile = candidate.quote.user_id ? profilesById.get(candidate.quote.user_id) : null;
      const recipientEmail = profile?.email?.trim();
      const logKey = recipientEmail ? getLogKey(candidate.quote.id, candidate.followUpNumber, recipientEmail) : '';
      const existingLog = logKey ? logsByKey.get(logKey) : null;
      const email = profile ? buildEmail(candidate, profile) : null;

      return {
        quotationId: candidate.quote.id,
        customer: normalizeCustomer(candidate.quote.customer),
        quotationDate: candidate.quote.quotation_date.slice(0, 10),
        followUpNumber: candidate.followUpNumber,
        dueOn: candidate.dueOn,
        status: candidate.quote.status,
        hasProfile: Boolean(profile),
        hasRecipientEmail: Boolean(recipientEmail),
        alreadyLogged: Boolean(existingLog && ['queued', 'sending', 'sent'].includes(existingLog.status)),
        previousFailure: existingLog?.status === 'failed',
        subject: email?.subject ?? null,
      };
    });

    const sendable = evaluated.filter((item) => item.hasProfile && item.hasRecipientEmail && !item.alreadyLogged).length;

    return NextResponse.json({
      dryRun: true,
      provider: emailProvider,
      checked: candidates.length,
      sendable,
      preview: evaluated.slice(0, 10),
      today,
      timeZone,
    });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const profile = candidate.quote.user_id ? profilesById.get(candidate.quote.user_id) : null;
    const recipientEmail = profile?.email?.trim();

    if (!profile || !recipientEmail) {
      skipped += 1;
      continue;
    }

    const logKey = getLogKey(candidate.quote.id, candidate.followUpNumber, recipientEmail);
    const existingLog = logsByKey.get(logKey);

    if (existingLog && ['queued', 'sending', 'sent'].includes(existingLog.status)) {
      skipped += 1;
      continue;
    }

    const now = new Date().toISOString();
    let logId = existingLog?.id;

    if (existingLog?.status === 'failed') {
      const { error: updateError } = await supabase
        .from('followup_email_logs')
        .update({
          status: 'sending',
          error: null,
          provider_message_id: null,
          attempt_count: (existingLog.attempt_count ?? 0) + 1,
          updated_at: now,
        })
        .eq('id', existingLog.id);

      if (updateError) {
        failed += 1;
        continue;
      }
    } else {
      const { data: insertedLog, error: insertError } = await supabase
        .from('followup_email_logs')
        .insert({
          quotation_id: candidate.quote.id,
          user_id: candidate.quote.user_id,
          follow_up_number: candidate.followUpNumber,
          due_on: candidate.dueOn,
          recipient_email: recipientEmail,
          status: 'sending',
          attempt_count: 1,
          updated_at: now,
        })
        .select('id')
        .single();

      if (insertError || !insertedLog) {
        if (insertError?.code === '23505') skipped += 1;
        else failed += 1;
        continue;
      }

      logId = insertedLog.id;
    }

    if (!logId) {
      failed += 1;
      continue;
    }

    const email = buildEmail(candidate, profile);

    try {
      const message: EmailMessage = {
        from: emailFrom,
        to: formatRecipient(email.recipientName, recipientEmail),
        subject: email.subject,
        text: email.text,
        html: email.html,
        replyTo: getConfiguredEnv('EMAIL_REPLY_TO') || undefined,
      };

      const messageId =
        emailProvider === 'smtp'
          ? await sendSmtpEmail(smtpConfig as SmtpConfig, message)
          : await sendResendEmail({ apiKey: resendApiKey, ...message });

      await supabase
        .from('followup_email_logs')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider_message_id: messageId,
          error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', logId);

      sent += 1;
    } catch (error: any) {
      failed += 1;
      await supabase
        .from('followup_email_logs')
        .update({
          status: 'failed',
          error: error?.message ?? 'Email send failed.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', logId);
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    failed,
    checked: candidates.length,
    today,
    timeZone,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
