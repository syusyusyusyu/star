import type { GameManager } from "../GameManager"
import type { LyricData } from "../types"
export class LyricsRenderer {
  private readonly game: GameManager
  private readonly maxLyricsOnScreen = 50

  constructor(game: GameManager) {
    this.game = game;
  }

  private bindBubbleEvents(bubble: HTMLElement): void {
    if (bubble.dataset.bound === 'true') return;
    bubble.dataset.bound = 'true';
    bubble.addEventListener('mouseenter', this.handleBubbleHoldStart);
    bubble.addEventListener('touchstart', this.handleBubbleHoldStart, { passive: false });
    bubble.addEventListener('mouseleave', this.handleBubbleHoldEnd);
    bubble.addEventListener('mouseout', this.handleBubbleHoldEnd);
    bubble.addEventListener('touchend', this.handleBubbleHoldEnd);
    bubble.addEventListener('touchcancel', this.handleBubbleHoldEnd);
    bubble.addEventListener('animationend', this.handleBubbleAnimationEnd);
  }

  private handleBubbleHoldStart = (event: Event): void => {
    if (event.type === 'touchstart') event.preventDefault();
    if (this.game.isFaceMode()) return;
    const bubble = event.currentTarget as HTMLElement;
    this.game.startBubbleHold(bubble, 'pointer');
  }

  private handleBubbleHoldEnd = (event: Event): void => {
    if (this.game.isFaceMode()) return;
    const bubble = event.currentTarget as HTMLElement;
    this.game.stopBubbleHold(bubble, 'pointer');
  }

  private handleBubbleAnimationEnd = (event: AnimationEvent): void => {
    const bubble = event.currentTarget as HTMLElement;
    if (bubble.style.pointerEvents !== 'none') {
      this.game.combo = 0;
      this.game.comboEl.textContent = `コンボ: 0`;
    }
    this.game.releaseBubble(bubble);
  }

  private resetBubbleStyles(bubble: HTMLElement): void {
    bubble.removeAttribute('style');
    bubble.className = 'lyric-bubble';
    bubble.style.pointerEvents = 'auto';
    bubble.style.opacity = '1';
    bubble.style.display = '';
    bubble.style.animationPlayState = 'running';
    bubble.style.setProperty('--hold-progress', '0%');
    bubble.style.setProperty('--progress-visible', '0');
  }

  private placeBubble(bubble: HTMLElement, lyric: LyricData): void {
    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= 480;
    const xPercent = this.game.getSafeBubbleXPercent();
    const isLong = (lyric.text || '').length > 10;
    
    // フォントサイズ調整: モバイル時はサイズを統一
    const fontSize = isMobile 
      ? '12px' 
      : screenWidth <= 768 
        ? (isLong ? '22px' : '26px') 
        : (isLong ? '28px' : '32px');

    bubble.style.position = 'absolute';
    bubble.style.left = `${xPercent}%`;
    bubble.style.bottom = '-60px';
    bubble.style.transform = 'translateX(-50%)';
    bubble.style.color = '#39C5BB';
    bubble.style.fontSize = fontSize;
    
    // モバイル用: 折り返しを禁止しつつ、最大幅を設定（万が一用）
    if (isMobile) {
      bubble.style.whiteSpace = 'nowrap';
      bubble.style.maxWidth = '95vw';
    } else {
      bubble.style.whiteSpace = '';
      bubble.style.maxWidth = '';
    }

    this.game.gamecontainer.appendChild(bubble);

    // 位置補正: モバイル時は画面外にはみ出さないように強制補正
    if (isMobile) {
      const rect = bubble.getBoundingClientRect();
      const containerRect = this.game.gamecontainer.getBoundingClientRect();
      const bubbleHalfWidth = rect.width / 2;
      const padding = 10; // 画面端からの余裕
      
      const currentLeftPx = (xPercent / 100) * containerRect.width;
      let newLeftPx = currentLeftPx;

      // 左端チェック
      if (currentLeftPx - bubbleHalfWidth < padding) {
        newLeftPx = bubbleHalfWidth + padding;
      }
      // 右端チェック
      else if (currentLeftPx + bubbleHalfWidth > containerRect.width - padding) {
        newLeftPx = containerRect.width - bubbleHalfWidth - padding;
      }

      if (Math.abs(newLeftPx - currentLeftPx) > 1) {
        bubble.style.left = `${newLeftPx}px`;
      }
    }

    bubble.style.animation = 'none';
    void bubble.offsetWidth;
    bubble.style.animation = 'slotFloat var(--lyric-speed) linear forwards';
  }

  displayLyric(lyric: LyricData | null): HTMLElement | undefined {
    if (lyric == null || lyric.text == null) return;

    if (this.game.activeLyricBubbles.size >= this.maxLyricsOnScreen) {
      const iterator = this.game.activeLyricBubbles.values().next();
      if (!iterator.done) {
        this.game.releaseBubble(iterator.value as HTMLElement);
      }
    }

    const norm = String(lyric.text).normalize('NFC');
    const bubble = this.game.bubblePool.acquire();
    this.resetBubbleStyles(bubble);
    bubble.textContent = norm;
    this.bindBubbleEvents(bubble);
    this.placeBubble(bubble, lyric);
    this.game.prepareBubbleForLyric(bubble, lyric);

    this.game.activeLyricBubbles.add(bubble);
    this.game.updateBubbleBounds(bubble);

    if (this.game.enableViewerLyrics) {
      this.displayViewerLyric(norm, bubble);
    }

    return bubble;
  }

  displayViewerLyric(text: string, gameBubble: HTMLElement): void {
    if (!this.game.enableViewerLyrics || !this.game.viewerLyricsContainer) return;

    const viewerChar = document.createElement('span');
    viewerChar.className = 'viewer-lyric-char';
    viewerChar.textContent = String(text).normalize('NFC');
    viewerChar.style.opacity = '0';
    this.game.viewerLyricsContainer.appendChild(viewerChar);

    setTimeout(() => {
      viewerChar.style.opacity = '1';
      viewerChar.style.transform = 'translateY(0)';
    }, 50);

    this.game.displayedViewerLyrics.set(gameBubble, viewerChar);

    setTimeout(() => {
      viewerChar.style.opacity = '0';
      setTimeout(() => {
        if (viewerChar.parentNode) viewerChar.parentNode.removeChild(viewerChar);
        if (this.game.displayedViewerLyrics.get(gameBubble) === viewerChar) {
          this.game.displayedViewerLyrics.delete(gameBubble);
        }
      }, 1000);
    }, 8000);
  }
}

// SRP: リザルト画面の表示とボタン配線を担当
