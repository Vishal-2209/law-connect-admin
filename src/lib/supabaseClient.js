import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://keefsnfzssalzircslln.supabase.co'
export const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlZWZzbmZ6c3NhbHppcmNzbGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NTc5NjAsImV4cCI6MjA3MjUzMzk2MH0.ni3fn2KP16y6w4w-NdBfXpwlbCiZiWq0B1AjyawJUzM'

export const getAdminKey = () => localStorage.getItem('supabase_admin_key')
export const setAdminKey = (key) => localStorage.setItem('supabase_admin_key', key)
export const clearAdminKey = () => localStorage.removeItem('supabase_admin_key')

let supabaseInstance = null

export const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance

  const adminKey = getAdminKey()
  // If we have an admin key, use it. Otherwise use Anon (read-only mostly).
  // Note: Using Service Role Key in 'createClient' allows bypassing RLS.
  const key = adminKey || ANON_KEY
  
  supabaseInstance = createClient(SUPABASE_URL, key, {
    auth: {
      persistSession: true, // For admin panel, we might not need auth session if using Service Key, but good to have.
      autoRefreshToken: true,
    }
  })
  
  return supabaseInstance
}

export const resetSupabase = () => {
  supabaseInstance = null
}
