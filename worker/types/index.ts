export type Bindings = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  ADMIN_TOKEN: string
  FRONTEND_ORIGIN: string
  TURNSTILE_SECRET_KEY?: string
  TURNSTILE_SITE_KEY?: string
  SCORE_SIGNING_SECRET?: string
  RATE_LIMITER: DurableObjectNamespace
}

export type Variables = {
  requestId: string
  sessionId: string
}

export type Env = {
  Bindings: Bindings
  Variables: Variables
}
