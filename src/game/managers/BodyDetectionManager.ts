import type { Landmark } from "../types"
import type { GameManager } from "../GameManager"
import { TIMER_KEYS } from "../constants"
import { TimerManager } from "../TimerManager"

type BodyDetectionDeps = {
  game: GameManager
  timers: TimerManager
}
export class BodyDetectionManager {
  private readonly game: GameManager
  private readonly timers: TimerManager
  private ready = false

  constructor({ game, timers }: BodyDetectionDeps) {
    this.game = game;
    this.timers = timers;
  }

  /** 全身が映って再生を開始できる状態か */
  isReady(): boolean {
    return this.ready;
  }

  /** カウントダウン中かどうか（歌詞出現を一時停止するために利用） */
  isCountdownActive(): boolean {
    return this.timers.has(TIMER_KEYS.BodyCountdown);
  }

  /** リスタート時などに検出状態と警告を完全リセット */
  reset(): void {
    this.ready = false;
    this.cancelCountdown();
    this.cancelFullBodyWarning();
  }

  /** 再生ボタン押下時に全身調整メッセージを提示 */
  remindAdjustment(): void {
    if (!this.game.isBodyWarningEnabled()) {
      this.hideCountdownOverlay();
      return;
    }
    this.game.countdownOverlay.classList.remove('hidden');
    this.game.countdownText.textContent = '全身が映るように調整してください';
  }

  /** MediaPipeのランドマークを評価し、全身検出の状態を更新 */
  evaluateLandmarks(landmarks: Landmark[]): void {
    const requiredLandmarks = [0, 11, 12, 23, 24, 27, 28];
    const allDetected = requiredLandmarks.every(index => {
      const lm = landmarks[index];
      return lm && (lm.visibility ?? 0) > 0.8;
    });

    if (allDetected) {
      if (!this.isCountdownActive()) {
        this.hideCountdownOverlay();
      }
      this.cancelFullBodyWarning();
      if (!this.ready && !this.isCountdownActive()) {
        this.startCountdown();
      }
      return;
    }

    if (this.isCountdownActive()) {
      this.cancelCountdown('全身が映るように調整してください');
    }

    if (
      this.game.isBodyWarningEnabled() &&
      (this.ready || this.game.player?.isPlaying) &&
      !this.timers.has(TIMER_KEYS.FullBodyLost)
    ) {
      this.timers.setTimeout(TIMER_KEYS.FullBodyLost, () => {
        this.game.countdownOverlay.classList.remove('hidden');
        this.game.countdownText.textContent = '全身が画面から外れています！';
      }, 3000);
    }
  }

  private startCountdown(): void {
    let count = 5;
    this.game.countdownOverlay.classList.remove('hidden');
    this.game.countdownText.textContent = String(count);
    this.game.isPaused = true;
    this.game.isFirstInteraction = true;
    this.timers.setInterval(TIMER_KEYS.BodyCountdown, () => {
      count--;
      if (count > 0) {
        this.game.countdownText.textContent = String(count);
        return;
      }
      this.timers.clearTimer(TIMER_KEYS.BodyCountdown);
      this.ready = true;
      this.hideCountdownOverlay();
      void this.game.playMusic();
    }, 1000);
  }

  cancelCountdown(message?: string): void {
    if (!this.isCountdownActive()) return;
    this.timers.clearTimer(TIMER_KEYS.BodyCountdown);
    if (message && this.game.isBodyWarningEnabled()) {
      this.game.countdownOverlay.classList.remove('hidden');
      this.game.countdownText.textContent = message;
    } else {
      this.hideCountdownOverlay();
    }
  }

  cancelFullBodyWarning(): void {
    if (!this.timers.has(TIMER_KEYS.FullBodyLost)) return;
    this.timers.clearTimer(TIMER_KEYS.FullBodyLost);
    this.hideCountdownOverlay();
  }

  private hideCountdownOverlay(): void {
    this.game.countdownText.textContent = '';
    this.game.countdownOverlay.classList.add('hidden');
  }
}

// SRP: 歌詞のDOM表示と鑑賞用表示を担当
