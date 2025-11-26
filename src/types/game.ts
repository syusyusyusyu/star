export interface Song {
  id: number
  title: string
  artist: string
  apiToken: string
  songUrl: string
}

export const songsData: Song[] = [
  {
    id: 1,
    title: "ストリートライト",
    artist: "加賀(ネギシャワーP)",
    apiToken: "HmfsoBVch26BmLCm",
    songUrl: "https://piapro.jp/t/ULcJ/20250205120202"
  },
  {
    id: 2,
    title: "アリフレーション",
    artist: "雨良 Amala",
    apiToken: "rdja5JxMEtcYmyKP",
    songUrl: "https://piapro.jp/t/SuQO/20250127235813"
  }
]

export type GameMode = 'cursor' | 'body'

export interface GameConfig {
  songId: number
  mode: GameMode
}
