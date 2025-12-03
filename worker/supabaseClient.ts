import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Cloudflare Workers環境では環境変数はEnvオブジェクト経由で渡される
export type Env = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

let supabaseInstance: SupabaseClient | null = null

export const getSupabase = (env: Env): SupabaseClient => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }

  // Workers環境ではリクエストごとにインスタンスを作成（シングルトンは使わない方が安全）
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
