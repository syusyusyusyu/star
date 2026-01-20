import type { GameResult } from "../types/game"

type SubmitScoreOptions = {
  gameResult: GameResult
  token: string | null
  onSuccess?: () => void
}

export const submitScore = async ({ gameResult, token, onSuccess }: SubmitScoreOptions): Promise<boolean> => {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (token) {
      headers["x-score-token"] = token
    }

    const res = await fetch("/api/score", {
      method: "POST",
      headers,
      body: JSON.stringify(gameResult),
    })

    if (!res.ok) {
      const payload = await res.json().catch(() => null)
      console.error("Score submit failed", payload?.error?.message ?? res.statusText)
      return false
    }

    onSuccess?.()
    return true
  } catch (error) {
    console.error("Score submit error", error)
    return false
  }
}
