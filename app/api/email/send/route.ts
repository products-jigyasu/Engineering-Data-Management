import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { buildEmailHtml, getEmailSubject, EmailType, EmailData } from '@/lib/email-templates';

// ─── POST /api/email/send ────────────────────────────────────────
// Accepts: { to: string | string[], type: EmailType, data: EmailData }
// Sends branded email via Resend. Fire-and-forget from the client.

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Jigyasu ERP <onboarding@resend.dev>';

export async function POST(req: NextRequest) {
  try {
    // Validate API key is configured
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_PASTE_YOUR_KEY_HERE') {
      console.warn('[Email] RESEND_API_KEY not configured, skipping email send.');
      return NextResponse.json({ success: false, reason: 'API key not configured' }, { status: 200 });
    }

    const body = await req.json();
    const { to, type, data } = body as { to: string | string[]; type: EmailType; data: EmailData };

    if (!to || !type || !data) {
      return NextResponse.json({ error: 'Missing required fields: to, type, data' }, { status: 400 });
    }

    const subject = getEmailSubject(type, data);
    const html = buildEmailHtml(type, data);

    const recipients = Array.isArray(to) ? to : [to];

    // Send to each recipient (Resend free tier supports batch via array)
    const { data: resendData, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipients,
      subject,
      html,
    });

    if (error) {
      console.error('[Email] Resend error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    console.log(`[Email] Sent "${type}" to ${recipients.join(', ')} — ID: ${resendData?.id}`);
    return NextResponse.json({ success: true, id: resendData?.id });

  } catch (err: any) {
    console.error('[Email] Unexpected error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal error' }, { status: 500 });
  }
}
