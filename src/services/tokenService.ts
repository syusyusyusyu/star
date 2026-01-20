export const fetchScoreToken = async (): Promise<string | null> => {
  try {
    const res = await fetch("/api/token")
    if (!res.ok) return null
    const data = await res.json()
    const token = data?.data?.token
    return typeof token === "string" && token.trim() ? token : null
  } catch (error) {
    console.error("Failed to fetch token:", error)
    return null
  }
}
