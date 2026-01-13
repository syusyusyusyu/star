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
    title: 'ストリートライト',
    artist: 'ネギシャワーP',
    apiToken: 'HmfsoBVch26BmLCm',
    songUrl: 'https://piapro.jp/t/ULcJ/20250205120202',
  },
]

export type PlayMode = 'cursor' | 'body' | 'mobile' | 'hand' | 'face'
export type GameMode = PlayMode

export interface GameConfig {
  songId: number
  mode: GameMode
}

export type GameResult = {
  songId: string
  mode: PlayMode
  score: number
  maxCombo: number
  rank: string
  playerName?: string
}
