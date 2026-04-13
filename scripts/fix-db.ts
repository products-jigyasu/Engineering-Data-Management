import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function fixDB() {
  console.log('Fixing storage...');
  
  // Create experiments bucket if missing
  const { error: b1 } = await supabase.storage.createBucket('experiments', { public: true });
  if (b1) console.log('Create Bucket Error:', b1.message);
  else console.log('Created experiments bucket');

  // We can't execute raw SQL via JS without RPC, but we can verify users
  const { data: users } = await supabase.from('users').select('*');
  console.log(`Found ${users?.length} users.`);

}
fixDB();
