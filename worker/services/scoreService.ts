import { getSupabase } from "../supabaseClient"
import type { Bindings } from "../types"
import type { RankingQuery, ScorePayload } from "../schemas/scoreSchemas"

type HonoContext = {
  env: Bindings
  req: { header: (name: string) => string | undefined }
  get: (key: string) => string | undefined
  json: (body: unknown, status?: number) => Response
}

export const submitScore = async (c: HonoContext, body: ScorePayload) => {
  const sessionId = c.get("sessionId")
  const requestId = c.get("requestId")

  // Origin Check
  const origin = c.req.header("Origin") || c.req.header("Referer")
  const allowedOrigin = c.env.FRONTEND_ORIGIN
  // Allow localhost for dev
  const isLocalhost = origin?.includes("localhost") || origin?.includes("127.0.0.1")

  if (allowedOrigin && !isLocalhost) {
    if (origin && !origin.includes(allowedOrigin)) {
      return c.json({ error: { code: "FORBIDDEN", message: "Invalid Origin" }, meta: { requestId } }, 403)
    }
  }

  // Rate Limiting (IP based)
  const ip = c.req.header("CF-Connecting-IP") || "unknown"
  const rateLimiterId = c.env.RATE_LIMITER.idFromName("global")
  const rateLimiter = c.env.RATE_LIMITER.get(rateLimiterId)

  const limitRes = await rateLimiter.fetch(`http://do/limit?key=${ip}&limit=10&window=60`)
  if (limitRes.status === 429) {
    return c.json({ error: { code: "RATE_LIMIT", message: "Too many requests" }, meta: { requestId } }, 429)
  }

  // Token Verification (HMAC & Nonce)
  const token = c.req.header("x-score-token")
  if (c.env.SCORE_SIGNING_SECRET && token) {
    const [nonce, timestamp, signature] = token.split(".")
    if (!nonce || !timestamp || !signature) {
      return c.json({ error: { code: "INVALID_TOKEN", message: "Invalid token format" }, meta: { requestId } }, 403)
    }

    // Check expiration (5 minutes)
    if (Date.now() - parseInt(timestamp) > 5 * 60 * 1000) {
      return c.json({ error: { code: "TOKEN_EXPIRED", message: "Token expired" }, meta: { requestId } }, 403)
    }

    // Verify Signature
    const secret = c.env.SCORE_SIGNING_SECRET
    const data = `${nonce}:${timestamp}`
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    const expectedSignature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(data)
    )
    const expectedHex = Array.from(new Uint8Array(expectedSignature)).map(b => b.toString(16).padStart(2, "0")).join("")

    if (signature !== expectedHex) {
      return c.json({ error: { code: "INVALID_SIGNATURE", message: "Invalid token signature" }, meta: { requestId } }, 403)
    }

    // Check Nonce (Durable Object)
    const nonceRes = await rateLimiter.fetch(`http://do/nonce?val=${nonce}`)
    if (nonceRes.status !== 200) {
      return c.json({ error: { code: "NONCE_USED", message: "Token already used" }, meta: { requestId } }, 409)
    }
  } else if (c.env.SCORE_SIGNING_SECRET) {
    // If secret is configured but token is missing, reject
    return c.json({ error: { code: "MISSING_TOKEN", message: "Score token required" }, meta: { requestId } }, 401)
  }

  // Turnstile Verification
  if (c.env.TURNSTILE_SECRET_KEY && body.turnstileToken) {
    const formData = new FormData()
    formData.append("secret", c.env.TURNSTILE_SECRET_KEY)
    formData.append("response", body.turnstileToken)
    formData.append("remoteip", c.req.header("CF-Connecting-IP") || "")

    const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      body: formData,
      method: "POST",
    })

    const outcome = await result.json() as any
    if (!outcome.success) {
      return c.json({ error: { code: "INVALID_TOKEN", message: "Turnstile verification failed" }, meta: { requestId } }, 403)
    }
  }

  // Cheat Detection
  let isSuspicious = false
  if (body.score > 1000000) isSuspicious = true

  const supabase = getSupabase(c.env)

  const { data, error } = await supabase
    .from("scores")
    .insert({
      session_id: sessionId,
      song_id: body.songId,
      mode: body.mode,
      speed: body.speed,
      score: body.score,
      max_combo: body.maxCombo,
      rank: body.rank,
      accuracy: body.accuracy,
      player_name: body.playerName,
      is_suspicious: isSuspicious
    })
    .select("id, score, rank, player_name, created_at")
    .single()

  if (error) {
    console.error("Supabase insert error:", error)
    return c.json({
      error: { code: "DB_ERROR", message: "Failed to save score" },
      meta: { requestId }
    }, 500)
  }

  // Log success
  console.log(JSON.stringify({
    level: "info",
    message: "Score created",
    requestId,
    songId: body.songId,
    score: body.score,
    isSuspicious
  }))

  return c.json({
    data,
    meta: { requestId }
  })
}

export const fetchRanking = async (c: HonoContext, query: RankingQuery) => {
  const { songId, mode, speed, period, limit, offset = 0 } = query
  const requestId = c.get("requestId")
  const supabase = getSupabase(c.env)

  let queryBuilder = supabase
    .from("scores")
    .select("player_name, score, rank, mode, speed, created_at, accuracy, max_combo", { count: "exact" })
    .eq("song_id", songId)
    .eq("is_suspicious", false)

  if (mode) {
    queryBuilder = queryBuilder.eq("mode", mode)
  }

  if (speed) {
    queryBuilder = queryBuilder.eq("speed", speed)
  }

  if (period === "weekly") {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    queryBuilder = queryBuilder.gt("created_at", date.toISOString())
  } else if (period === "daily") {
    const date = new Date()
    date.setDate(date.getDate() - 1)
    queryBuilder = queryBuilder.gt("created_at", date.toISOString())
  }

  // Apply ordering and pagination after filters
  queryBuilder = queryBuilder
    .order("score", { ascending: false })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await queryBuilder

  if (error) {
    console.error("Supabase select error:", error)
    return c.json({
      error: { code: "DB_ERROR", message: "Failed to fetch scores" },
      meta: { requestId }
    }, 500)
  }

  const mappedData = data?.map(d => ({
    player_name: d.player_name,
    score: d.score,
    rank: d.rank,
    mode: d.mode,
    speed: d.speed,
    accuracy: d.accuracy,
    created_at: d.created_at,
    max_combo: d.max_combo
  }))

  return c.json({
    data: mappedData,
    meta: {
      count: mappedData?.length,
      total: count,
      requestId
    }
  })
}
