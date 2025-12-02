/**
 * 歌詞バブルのオブジェクトプール。DOM 再生成コストを抑えて GC を減らす。
 */
export class BubblePool {
  private readonly pool: HTMLElement[] = []
  private readonly active = new Set<HTMLElement>()
  private readonly maxSize: number

  constructor(initialSize = 32, maxSize = 120) {
    this.maxSize = maxSize
    for (let i = 0; i < initialSize; i += 1) {
      this.pool.push(this.createBubble())
    }
  }

  private createBubble(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'lyric-bubble'
    el.style.display = 'none'
    return el
  }

  acquire(): HTMLElement {
    const bubble = this.pool.pop() ?? this.createBubble()
    this.active.add(bubble)
    bubble.style.display = ''
    bubble.style.opacity = '1'
    bubble.style.pointerEvents = 'auto'
    bubble.textContent = ''
    return bubble
  }

  release(bubble: HTMLElement): void {
    if (!this.active.delete(bubble)) return
    bubble.remove()
    bubble.style.display = 'none'
    bubble.style.opacity = '1'
    bubble.style.pointerEvents = 'auto'
    bubble.textContent = ''
    if (this.pool.length < this.maxSize) {
      this.pool.push(bubble)
    }
  }

  releaseAll(): void {
    for (const bubble of Array.from(this.active)) {
      this.release(bubble)
    }
  }

  get activeElements(): IterableIterator<HTMLElement> {
    return this.active.values()
  }

  get activeCount(): number {
    return this.active.size
  }
}
