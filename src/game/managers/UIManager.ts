import type { GameManager } from "../GameManager"
import type { Landmark } from "../types"
export class UIManager {
  private game: GameManager

  constructor(game: GameManager) {
    this.game = game;
  }

  updateInstructions(): void {
    const instructionsEl = document.getElementById('instructions');
    if (!instructionsEl) return;

    let text = '';
    const mobileModeActive = this.game.isMobile || this.game.currentMode === 'mobile';
    if (mobileModeActive) {
      text = '歌詞フレーズを長押ししてゲージを満タンにしよう！';
    } else {
      switch (this.game.currentMode) {
        case 'cursor':
          text = '歌詞フレーズを長押しして円形ゲージを100%にしよう！';
          break;
        case 'hand':
          text = 'カメラに手を映してフレーズの上でホールドしよう！';
          break;
        case 'body': 
          text = 'カメラに全身を映してフレーズをホールドしよう！';
          break;
        case 'mobile':
          text = '歌詞フレーズを長押ししてゲージを満タンにしよう！';
          break;
        case 'face':
          text = '口の位置を合わせて、口を大きく開けて歌詞バブルをキャッチしよう！';
          break;
      }
    }
    instructionsEl.textContent = text;
  }

  updateHandDetectionIndicator(multiHandLandmarks: Array<Landmark[]> | undefined): void {
    let indicator = document.getElementById('hand-detection-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'hand-detection-indicator';
      indicator.style.cssText = `
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: bold;
        z-index: 100;
        transition: all 0.3s ease;
        pointer-events: none;
      `;
      this.game.gamecontainer.appendChild(indicator);
    }

    if (multiHandLandmarks && multiHandLandmarks.length > 0) {
      const handCount = multiHandLandmarks.length;
      indicator.textContent = `✋ ${handCount}つの手を検出中 - 準備OK！`;
      indicator.style.backgroundColor = 'rgba(57, 197, 187, 0.9)';
      indicator.style.color = 'white';
      indicator.style.opacity = '1';
    } else {
      const tips = [
        '💡 手のひらをカメラに向けてください',
        '💡 明るい場所で手をかざしてください',
        '💡 カメラから30-60cm離れてください',
        '💡 背景とのコントラストを意識してください'
      ];
      const randomTip = tips[Math.floor(Date.now() / 3000) % tips.length];
      indicator.textContent = randomTip;
      indicator.style.backgroundColor = 'rgba(255, 107, 107, 0.9)';
      indicator.style.color = 'white';
      indicator.style.opacity = '0.95';
    }

    if (this.game.currentMode !== 'hand' || this.game.isMobile) {
      indicator.style.display = 'none';
    } else {
      indicator.style.display = 'block';
    }
  }
}

// SRP: 演出（クリック/ヒット）生成の責務
