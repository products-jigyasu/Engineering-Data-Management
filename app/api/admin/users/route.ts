import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side only — uses service role key for admin auth operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─── Send password email via Resend ──────────────────────────────
async function sendPasswordEmail(toEmail: string, toName: string, password: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY not set — skipping password email.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #f8f9fb; margin: 0; padding: 32px 0;">
      <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #c45c5c 0%, #e07a7a 100%); padding: 32px 40px;">
          <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">Jigyasu ERP</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px;">Engineering Data Management Platform</p>
        </div>

        <!-- Body -->
        <div style="padding: 36px 40px;">
          <p style="font-size: 15px; color: #374151; margin: 0 0 8px;">Hello, <strong>${toName}</strong></p>
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 28px;">
            Your password for the Jigyasu ERP system has been updated by your organisation administrator. 
            Please use the credentials below to log in.
          </p>

          <!-- Credentials box -->
          <div style="background: #fdf2f2; border: 1px solid #fca5a5; border-radius: 10px; padding: 20px 24px; margin-bottom: 28px;">
            <p style="font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px;">Your Login Credentials</p>
            <div style="margin-bottom: 10px;">
              <span style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Email</span>
              <span style="font-size: 15px; font-weight: 600; color: #1a1a2e;">${toEmail}</span>
            </div>
            <div>
              <span style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">New Password</span>
              <span style="font-size: 18px; font-weight: 700; color: #c45c5c; letter-spacing: 2px; font-family: monospace;">${password}</span>
            </div>
          </div>

          <!-- Warning -->
          <div style="background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 6px; padding: 12px 16px; margin-bottom: 28px;">
            <p style="font-size: 13px; color: #92400e; margin: 0; line-height: 1.5;">
              🔒 For your security, we recommend changing this password after your first login. 
              Do not share this email with anyone.
            </p>
          </div>

          <p style="font-size: 13px; color: #9ca3af; margin: 0;">
            If you have any questions, please connect with your organisation admin.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 18px 40px;">
          <p style="font-size: 12px; color: #9ca3af; margin: 0; text-align: center;">
            © ${new Date().getFullYear()} Jigyasu · Engineering Data Management · This is an automated message.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Jigyasu ERP <noreply@jigyasu.com>',
        to: [toEmail],
        subject: 'This is your Jigyasu ERP Password - please connect with your organisation admin',
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('[Email] Resend error:', err);
    } else {
      console.log('[Email] Password email sent to', toEmail);
    }
  } catch (err) {
    console.error('[Email] Failed to send email:', err);
  }
}

// ─── Send welcome email for new users ───────────────────────────
async function sendWelcomeEmail(toEmail: string, toName: string, password: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY not set — skipping welcome email.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #f8f9fb; margin: 0; padding: 32px 0;">
      <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #c45c5c 0%, #e07a7a 100%); padding: 32px 40px;">
          <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">Welcome to Jigyasu ERP</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px;">Engineering Data Management Platform</p>
        </div>
        <div style="padding: 36px 40px;">
          <p style="font-size: 15px; color: #374151; margin: 0 0 8px;">Hello, <strong>${toName}</strong> 👋</p>
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 28px;">
            Your account has been created on the Jigyasu ERP platform. Here are your login credentials:
          </p>
          <div style="background: #fdf2f2; border: 1px solid #fca5a5; border-radius: 10px; padding: 20px 24px; margin-bottom: 28px;">
            <p style="font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px;">Your Login Credentials</p>
            <div style="margin-bottom: 10px;">
              <span style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Email</span>
              <span style="font-size: 15px; font-weight: 600; color: #1a1a2e;">${toEmail}</span>
            </div>
            <div>
              <span style="font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px;">Password</span>
              <span style="font-size: 18px; font-weight: 700; color: #c45c5c; letter-spacing: 2px; font-family: monospace;">${password}</span>
            </div>
          </div>
          <div style="background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 6px; padding: 12px 16px; margin-bottom: 28px;">
            <p style="font-size: 13px; color: #92400e; margin: 0; line-height: 1.5;">
              🔒 For your security, change this password after your first login. Do not share this email.
            </p>
          </div>
          <p style="font-size: 13px; color: #9ca3af; margin: 0;">
            If you have any questions, please connect with your organisation admin.
          </p>
        </div>
        <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 18px 40px;">
          <p style="font-size: 12px; color: #9ca3af; margin: 0; text-align: center;">
            © ${new Date().getFullYear()} Jigyasu · Engineering Data Management
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Jigyasu ERP <noreply@jigyasu.com>',
        to: [toEmail],
        subject: 'Welcome to Jigyasu ERP - Your Account Has Been Created',
        html,
      }),
    });
  } catch (err) {
    console.error('[Email] Failed to send welcome email:', err);
  }
}

// ─── Main handler ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...payload } = body;

    if (action === 'create_user') {
      const { name, email, password, role, status } = payload;

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role, status: status || 'active' },
      });

      if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

      const { error: dbError } = await supabaseAdmin.from('users').insert({
        id: authData.user.id,
        name,
        email,
        role,
        status: status || 'active',
        avatar_color: '#c45c5c',
      });

      if (dbError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json({ error: dbError.message }, { status: 400 });
      }

      // Send welcome email with credentials
      await sendWelcomeEmail(email, name, password);

      return NextResponse.json({ success: true, user: authData.user });
    }

    if (action === 'update_user') {
      const { id, name, email, role, status, newPassword } = payload;

      const authUpdates: any = {
        user_metadata: { name, role, status },
      };
      if (email) authUpdates.email = email;
      if (newPassword) authUpdates.password = newPassword;

      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdates);
      if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

      const dbUpdates: any = { name, role, status };
      if (email) dbUpdates.email = email;

      const { error: dbError } = await supabaseAdmin.from('users').update(dbUpdates).eq('id', id);
      if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 });

      // Send password email only if password was changed
      if (newPassword && email) {
        await sendPasswordEmail(email, name, newPassword);
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'toggle_status') {
      const { id, currentStatus, userRole } = payload;
      if (userRole === 'admin' || userRole === 'super_admin') {
        return NextResponse.json({ error: 'Cannot deactivate an Admin.' }, { status: 403 });
      }

      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

      await supabaseAdmin.auth.admin.updateUserById(id, {
        user_metadata: { status: newStatus },
      });

      const { error } = await supabaseAdmin.from('users').update({ status: newStatus }).eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      return NextResponse.json({ success: true, newStatus });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
