import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('Testing connection to:', supabaseUrl)
  const { data, error } = await supabase
    .from('users')
    .select('count', { count: 'exact', head: true })

  if (error) {
    console.error('Connection failed:', error.message)
    // If table doesn't exist yet, it might still mean "connected" but schema not applied
    if (error.code === 'PGRST116' || error.message.includes('relation "users" does not exist')) {
        console.log('Successfully reached Supabase, but "users" table is missing. (Did you run the migration?)')
    }
  } else {
    console.log('Supabase connected successfully! Data:', data)
  }
}

testConnection()
