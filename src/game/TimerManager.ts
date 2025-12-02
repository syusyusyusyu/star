type TimerType = 'timeout' | 'interval'

type TimerHandle = {
  id: number
  type: TimerType
}

/**
 * Centralized helper to register and clear timers with string keys.
 * Ensures we never leave dangling timeouts/intervals across game sessions.
 */
export class TimerManager {
  private timers = new Map<string, TimerHandle>()

  setTimeout(key: string, callback: () => void, delay: number): number {
    this.clearTimer(key)
    const id = window.setTimeout(() => {
      this.timers.delete(key)
      callback()
    }, delay)
    this.timers.set(key, { id, type: 'timeout' })
    return id
  }

  setInterval(key: string, callback: () => void, interval: number): number {
    this.clearTimer(key)
    const id = window.setInterval(callback, interval)
    this.timers.set(key, { id, type: 'interval' })
    return id
  }

  clearTimer(key: string): void {
    const handle = this.timers.get(key)
    if (!handle) return
    if (handle.type === 'timeout') {
      clearTimeout(handle.id)
    } else {
      clearInterval(handle.id)
    }
    this.timers.delete(key)
  }

  has(key: string): boolean {
    return this.timers.has(key)
  }

  clearAll(): void {
    this.timers.forEach((_, key) => this.clearTimer(key))
  }
}
