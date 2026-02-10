import crypto from "node:crypto"
import { Context } from "hono"
import { supabase } from "../supabaseClient"
import type { ScorePayload, RankingQuery } from "../schemas/scoreSchemas"
import type { Env } from "../types"

// --- Nonce管理（インメモリ、TTL付き） ---
const usedNonces = new Map<string, number>()
const NONCE_TTL_MS = 5 * 60 * 1000 // 5分

// 定期クリーンアップ
setInterval(() => {
  const now = Date.now()
  for (const [nonce, expiry] of usedNonces.entries()) {
    if (now > expiry) {
      usedNonces.delete(nonce)
    }
  }
}, 60_000)

// --- Origin検証 ---
const verifyOrigin = (c: Context<Env>): { ok: true } | { ok: false; response: Response } => {
  const origin: string | undefined = c.req.header("Origin") || c.req.header("Referer")
  const allowedOrigin = process.env.FRONTEND_ORIGIN
  const isLocalhost = origin?.includes("localhost") || origin?.includes("127.0.0.1")

  if (allowedOrigin && !isLocalhost) {
    if (origin && !origin.includes(allowedOrigin)) {
      return {
        ok: false,
        response: c.json({
          error: { code: "FORBIDDEN", message: "Invalid Origin" },
          meta: { requestId: c.get("requestId") }
        }, 403)
      }
    }
  }
  return { ok: true }
}

// --- HMACトークン検証 ---
const verifyToken = (c: Context<Env>): { ok: true } | { ok: false; response: Response } => {
  const secret = process.env.SCORE_SIGNING_SECRET
  const token = c.req.header("x-score-token")
  const requestId = c.get("requestId")

  if (secret && token) {
    const parts = token.split(".")
    if (parts.length !== 3) {
      return {
        ok: false,
        response: c.json({ error: { code: "INVALID_TOKEN", message: "Invalid token format" }, meta: { requestId } }, 403)
      }
    }
    const [nonce, timestamp, signature] = parts

    // 有効期限チェック（5分）
    if (Date.now() - parseInt(timestamp) > NONCE_TTL_MS) {
      return {
        ok: false,
        response: c.json({ error: { code: "TOKEN_EXPIRED", message: "Token expired" }, meta: { requestId } }, 403)
      }
    }

    // 署名検証（Node.js crypto）
    const data = `${nonce}:${timestamp}`
    const expectedHex = crypto.createHmac("sha256", secret).update(data).digest("hex")

    if (signature !== expectedHex) {
      return {
        ok: false,
        response: c.json({ error: { code: "INVALID_SIGNATURE", message: "Invalid token signature" }, meta: { requestId } }, 403)
      }
    }

    // Nonce再利用防止
    if (usedNonces.has(nonce)) {
      return {
        ok: false,
        response: c.json({ error: { code: "NONCE_USED", message: "Token already used" }, meta: { requestId } }, 409)
      }
    }
    usedNonces.set(nonce, Date.now() + NONCE_TTL_MS)
  } else if (secret) {
    return {
      ok: false,
      response: c.json({ error: { code: "MISSING_TOKEN", message: "Score token required" }, meta: { requestId } }, 401)
    }
  }

  return { ok: true }
}

// --- Turnstile検証 ---
const verifyTurnstile = async (c: Context<Env>, turnstileToken?: string): Promise<{ ok: true } | { ok: false; response: Response }> => {
  const secretKey = process.env.TURNSTILE_SECRET_KEY
  const requestId = c.get("requestId")

  if (secretKey && turnstileToken) {
    const formData = new URLSearchParams()
    formData.append("secret", secretKey)
    formData.append("response", turnstileToken)
    formData.append("remoteip", c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "")

    const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      body: formData,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })

    const outcome = await result.json() as { success: boolean }
    if (!outcome.success) {
      return {
        ok: false,
        response: c.json({ error: { code: "INVALID_TOKEN", message: "Turnstile verification failed" }, meta: { requestId } }, 403)
      }
    }
  }

  return { ok: true }
}

// --- 不正スコア検出 ---
const detectSuspicious = (body: ScorePayload): boolean => {
  if (body.score > 1000000) return true
  return false
}

// --- スコア送信 ---
export const submitScore = async (c: Context<Env>, body: ScorePayload) => {
  const sessionId = c.get("sessionId")
  const requestId = c.get("requestId")

  // Origin検証
  const originCheck = verifyOrigin(c)
  if (!originCheck.ok) return originCheck.response

  // HMACトークン検証+Nonce
  const tokenCheck = verifyToken(c)
  if (!tokenCheck.ok) return tokenCheck.response

  // Turnstile検証
  const turnstileCheck = await verifyTurnstile(c, body.turnstileToken)
  if (!turnstileCheck.ok) return turnstileCheck.response

  // 不正検出
  const isSuspicious = detectSuspicious(body)

  const { data, error } = await supabase
    .from("scores")
    .insert({
      session_id: sessionId,
      song_id: body.songId,
      mode: body.mode,
      speed: body.speed,
      score: Math.round(body.score),
      max_combo: body.maxCombo,
      rank: body.rank.toUpperCase(),
      accuracy: body.accuracy,
      player_name: body.playerName,
      is_suspicious: isSuspicious,
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

// --- ランキング取得 ---
export const fetchRanking = async (c: Context<Env>, query: RankingQuery) => {
  const { songId, mode, speed, period, limit = 20, offset = 0 } = query
  const requestId = c.get("requestId")

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
    max_combo: d.max_combo,
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
