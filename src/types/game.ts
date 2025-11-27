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
  }
]

export type GameMode = 'cursor' | 'body'

export interface GameConfig {
  songId: number
  mode: GameMode
}
