export type Bindings = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  ADMIN_TOKEN: string
  FRONTEND_ORIGIN: string
}

export type Variables = {
  requestId: string
  sessionId: string
}

export type Env = {
  Bindings: Bindings
  Variables: Variables
}
