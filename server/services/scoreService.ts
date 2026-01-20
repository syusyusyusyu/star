import { supabase } from "../supabaseClient"
import type { PlayMode } from "./scoreValidation"

type InsertScoreInput = {
  songId: string
  mode: PlayMode
  score: number
  maxCombo: number
  rank: string
  playerName: string
}

type RankingQuery = {
  songId: string
  mode?: PlayMode | null
  period?: string | null
}

export const insertScore = async ({ songId, mode, score, maxCombo, rank, playerName }: InsertScoreInput) => {
  return supabase.from("scores").insert({
    song_id: songId,
    mode,
    score: Math.round(score), // 小数点以下を丸める
    max_combo: maxCombo,
    rank: rank.toUpperCase(),
    player_name: playerName,
  })
}

export const fetchRanking = async ({ songId, mode, period }: RankingQuery) => {
  let query = supabase
    .from("scores")
    .select("score,max_combo,rank,created_at,player_name")
    .eq("song_id", songId)
    .order("score", { ascending: false })
    .limit(10)

  if (mode) {
    query = query.eq("mode", mode)
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
