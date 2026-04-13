import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy'
  
  return createBrowserClient(url, key)
}
