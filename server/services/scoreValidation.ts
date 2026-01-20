export type PlayMode = 'cursor' | 'body' | 'mobile' | 'hand' | 'face'

// セキュリティ: 入力検証ヘルパー
export const isPlayMode = (mode: unknown): mode is PlayMode =>
  mode === 'cursor' || mode === 'body' || mode === 'mobile' || mode === 'hand' || mode === 'face'

/** スコアの許容範囲: 0〜1,000,000 点 */
export const MIN_SCORE = 0
export const MAX_SCORE = 1_000_000

/** コンボの許容範囲: 0〜10,000 */
export const MAX_COMBO = 10_000

/** ランクの許容値 */
export const VALID_RANKS = ['SS', 'S', 'A', 'B', 'C', 'D', 'F']

/** songId の形式（英数字とハイフン、最大64文字） */
export const SONG_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/

export const isValidScore = (score: number): boolean =>
  Number.isFinite(score) && score >= MIN_SCORE && score <= MAX_SCORE

export const isValidCombo = (combo: number): boolean =>
  Number.isInteger(combo) && combo >= 0 && combo <= MAX_COMBO

export const isValidRank = (rank: unknown): rank is string =>
  typeof rank === 'string' && VALID_RANKS.includes(rank.toUpperCase())

export const isValidSongId = (songId: unknown): songId is string =>
  typeof songId === 'string' && SONG_ID_PATTERN.test(songId)
