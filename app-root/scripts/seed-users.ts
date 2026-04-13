/**
 * Seed Script: Create 13 users in Supabase Auth + public.users table
 * 
 * Usage: npx tsx scripts/seed-users.ts
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Admin client with service_role key (bypasses RLS and handles auth admin)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEFAULT_PASSWORD = 'Jigyasu@123';

const USERS = [
  { name: 'Biswa', email: 'biswa@jigyasu.com', role: 'admin' },
  { name: 'Biswajit Sahu', email: 'biswajit.sahu@jigyasu.com', role: 'tester' },
  { name: 'Rati', email: 'rati@jigyasu.com', role: 'tester' },
  { name: 'Sushanta', email: 'sushanta@jigyasu.com', role: 'tester' },
  { name: 'Biswajit Swain', email: 'biswajit.swain@jigyasu.com', role: 'tester' },
  { name: 'Guna', email: 'guna@jigyasu.com', role: 'tester' },
  { name: 'Abinash', email: 'abinash@jigyasu.com', role: 'solution' },
  { name: 'Aditya', email: 'aditya@jigyasu.com', role: 'solution' },
  { name: 'Swadhin', email: 'swadhin@jigyasu.com', role: 'design' },
  { name: 'Satwik Das', email: 'satwik@jigyasu.com', role: 'approver' },
  { name: 'Procurement', email: 'procurement@jigyasu.com', role: 'procurement' },
  { name: 'Rahul', email: 'products@jigyasu.co.in', role: 'super_admin', password: 'Rahul@4332' },
  { name: 'Rahul', email: 'rahul@jigyasu.co.in', role: 'super_admin', password: 'Rahul@4332' },
];

async function seedUsers() {
  console.log('🌱 Starting user seed (13 users)...\n');

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of USERS) {
    const password = user.password || DEFAULT_PASSWORD;
    try {
      // Check if user already exists in auth
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw listError;
      
      const existingAuth = listData?.users?.find((u) => u.email === user.email);
      let userId: string;

      if (existingAuth) {
        console.log(`⚠️  ${user.name} (${user.email}) — Auth user exists, checking public.users...`);
        userId = existingAuth.id;
        skipped++;
      } else {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: password,
          email_confirm: true,
          user_metadata: {
            name: user.name,
            role: user.role,
          },
        });

        if (authError) {
          console.error(`❌ ${user.name} — Auth error: ${authError.message}`);
          errors++;
          continue;
        }
        
        if (!authData.user) {
          console.error(`❌ ${user.name} — No user returned`);
          errors++;
          continue;
        }
        
        userId = authData.user.id;
        created++;
      }

      // Sync/Upsert into public.users table
      const { error: insertError } = await supabase.from('users').upsert({
        id: userId,
        name: user.name,
        email: user.email,
        role: user.role,
        status: 'active',
      });

      if (insertError) {
        console.error(`❌ ${user.name} — DB upsert error: ${insertError.message}`);
        errors++;
      } else {
        console.log(`✅ ${user.name} (${user.email}) — setup complete as ${user.role}`);
      }
    } catch (err: any) {
      console.error(`❌ ${user.name} — Unexpected error: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`🌱 Seed complete: ${created} created, ${skipped} existing, ${errors} errors`);
  console.log(`${'='.repeat(50)}\n`);
}

seedUsers().catch(console.error);
