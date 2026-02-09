import { supabase } from "../supabaseClient"
import type { PlayMode } from "./scoreValidation"

type InsertScoreInput = {
  songId: string
  mode: PlayMode
  speed: number
  score: number
  maxCombo: number
  rank: string
  playerName: string
}

type RankingQuery = {
  songId: string
  mode?: PlayMode | null
  speed?: number | null
  period?: string | null
  limit?: number
  offset?: number
}

export const insertScore = async ({ songId, mode, speed, score, maxCombo, rank, playerName }: InsertScoreInput) => {
  return supabase.from("scores").insert({
    song_id: songId,
    mode,
    speed,
    score: Math.round(score), // 小数点以下を丸める
    max_combo: maxCombo,
    rank: rank.toUpperCase(),
    player_name: playerName,
  })
}

export const fetchRanking = async ({ songId, mode, speed, period, limit = 20, offset = 0 }: RankingQuery) => {
  let query = supabase
    .from("scores")
    .select("score,max_combo,rank,created_at,player_name", { count: "exact" })
    .eq("song_id", songId)
    .order("score", { ascending: false })
    .range(offset, offset + limit - 1)

  if (mode) {
    query = query.eq("mode", mode)
  }

  if (speed) {
    query = query.eq("speed", speed)
  }

  if (period === "weekly") {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    query = query.gt("created_at", date.toISOString())
  } else if (period === "daily") {
    const date = new Date()
    date.setDate(date.getDate() - 1)
    query = query.gt("created_at", date.toISOString())
  }

  return query
}
