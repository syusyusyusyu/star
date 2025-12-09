/**
 * ゲームイベントの型定義と EventEmitter
 */
import type { GameResult } from './types'

export type GameEventMap = {
  'score:update': { score: number; combo: number; maxCombo: number }
  'game:start': void
  'game:pause': void
  'game:resume': void
  'game:end': GameResult
  'lyrics:hit': { text: string; x: number; y: number }
  'mode:change': { mode: 'cursor' | 'body' | 'mobile' }
}

type EventCallback<T> = T extends void ? () => void : (data: T) => void

/**
 * シンプルな型安全イベントエミッター
 */
export class GameEventEmitter {
  private listeners = new Map<keyof GameEventMap, Set<EventCallback<unknown>>>()

  on<K extends keyof GameEventMap>(event: K, callback: EventCallback<GameEventMap[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback as EventCallback<unknown>)
  }

  off<K extends keyof GameEventMap>(event: K, callback: EventCallback<GameEventMap[K]>): void {
    this.listeners.get(event)?.delete(callback as EventCallback<unknown>)
  }

  emit<K extends keyof GameEventMap>(
    event: K,
    ...args: GameEventMap[K] extends void ? [] : [GameEventMap[K]]
  ): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach((cb) => {
        if (args.length > 0) {
          (cb as (data: unknown) => void)(args[0])
        } else {
          (cb as () => void)()
        }
      })
    }
  }

  removeAllListeners(): void {
    this.listeners.clear()
  }
}

// グローバルインスタンス（シングルトン）
export const gameEvents = new GameEventEmitter()
