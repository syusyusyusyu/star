/**
 * GameManager 用の型定義
 */
import type { Player } from 'textalive-app-api'
import type * as THREE from 'three'

/** プレイモード */
export type PlayMode = 'cursor' | 'body' | 'hand'

/** ゲーム設定 */
export interface GameConfig {
  songId?: string
  mode?: PlayMode
  onGameEnd?: (result: GameResult) => void
}

/** ゲーム結果 */
export interface GameResult {
  songId: string
  mode: PlayMode
  score: number
  maxCombo: number
  rank: string
}

/** 歌詞データ */
export interface LyricData {
  time: number
  endTime?: number
  text: string
  displayDuration: number
  originalChars?: Array<{
    text: string
    timeOffset: number
  }>
}

/** マウス座標 */
export interface MousePosition {
  x: number
  y: number
}

/** TextAlive ビデオ型（簡易版） */
export interface TextAliveVideo {
  firstPhrase: TextAlivePhrase | null
  duration?: number
}

/** TextAlive フレーズ型 */
export interface TextAlivePhrase {
  firstWord: TextAliveWord | null
  next: TextAlivePhrase | null
}

/** TextAlive ワード型 */
export interface TextAliveWord {
  text: string | null
  startTime: number
  endTime: number
  next: TextAliveWord | null
}

/** TextAlive プレーヤー拡張型 */
export interface ExtendedPlayer extends Omit<Player, 'video' | 'timer' | 'mediaElement'> {
  mediaElement?: HTMLElement
  timer: { position: number }
  video?: { duration: number }
}

/** three.js LiveStageVisuals で使うアバタージョイント */
export interface AvatarJoints {
  [index: number]: THREE.Mesh
}

/** three.js LiveStageVisuals で使うボーン */
export interface AvatarBones {
  [index: number]: THREE.Line
}

/** プレイヤーアバター */
export interface PlayerAvatar {
  joints?: AvatarJoints
  bones?: AvatarBones
}

/** ランドマーク */
export interface Landmark {
  x: number
  y: number
  z?: number
  visibility?: number
}

/** ランク計算 */
export const calculateRank = (score: number): string => {
  if (typeof score !== 'number') return 'C'
  if (score >= 900000) return 'S'
  if (score >= 800000) return 'A'
  if (score >= 700000) return 'B'
  return 'C'
}

// グローバル型は src/vite-env.d.ts で定義済み
