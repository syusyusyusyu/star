import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from './types/supabase'

export type Env = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
}

export const getSupabase = (env: Env): SupabaseClient<Database> => {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY.')
  }

  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

