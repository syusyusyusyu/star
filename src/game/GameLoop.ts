export interface GameLoopCallbacks {
  onUpdate: (deltaTime: number, elapsedTime: number) => void
}

/**
 * requestAnimationFrame ベースの軽量ゲームループ。
 * React / TextAlive から分離し、描画系ロジックを集約する。
 */
export class GameLoop {
  private frameId: number | null = null
  private running = false
  private lastTime = 0
  private startTime = 0
  private callbacks: GameLoopCallbacks

  constructor(callbacks: GameLoopCallbacks) {
    this.callbacks = callbacks
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    this.startTime = this.lastTime
    this.schedule()
  }

  stop(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId)
      this.frameId = null
    }
    this.running = false
  }

  private schedule(): void {
    this.frameId = requestAnimationFrame(this.handleFrame)
  }

  private handleFrame = (): void => {
    if (!this.running) return
    const now = performance.now()
    const delta = now - this.lastTime
    const elapsed = now - this.startTime
    this.lastTime = now
    this.callbacks.onUpdate(delta, elapsed)
    this.schedule()
  }
}
