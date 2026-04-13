import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side only — uses service role key for admin auth operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...payload } = body;

    if (action === 'create_user') {
      const { name, email, password, role, status } = payload;

      // 1. Create in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role, status: status || 'active' },
      });

      if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

      // 2. Insert into public.users
      const { error: dbError } = await supabaseAdmin.from('users').insert({
        id: authData.user.id,
        name,
        email,
        role,
        status: status || 'active',
        avatar_color: '#c45c5c',
      });

      if (dbError) {
        // Rollback auth user on failure
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json({ error: dbError.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, user: authData.user });
    }

    if (action === 'update_user') {
      const { id, name, email, role, status, newPassword } = payload;

      // Update auth metadata + email/password
      const authUpdates: any = {
        user_metadata: { name, role, status },
      };
      if (email) authUpdates.email = email;
      if (newPassword) authUpdates.password = newPassword;

      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdates);
      if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

      // Update public.users
      const dbUpdates: any = { name, role, status };
      if (email) dbUpdates.email = email;

      const { error: dbError } = await supabaseAdmin.from('users').update(dbUpdates).eq('id', id);
      if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 });

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
