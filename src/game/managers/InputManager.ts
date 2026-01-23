import type { GameManager } from "../GameManager"
import { TIMER_KEYS } from "../constants"
export class InputManager {
  private game: GameManager

  constructor(game: GameManager) {
    this.game = game;
  }

  setupEvents(): void {
    const gm = this.game;
    let lastTime = 0, lastX = 0, lastY = 0;
    let touched = false;

    // デバッグ用コマンド入力
    let keyBuffer = '';
    const secretCommands: Record<string, () => void> = {
      hhrg: () => {
        console.log('Debug command detected: Force Results');
        gm.showResults();
      },
      knnk: () => gm.suppressBodyWarningsForSong()
    };
    const maxCommandLength = Math.max(...Object.keys(secretCommands).map(code => code.length));
    document.addEventListener('keydown', (e) => {
      keyBuffer += e.key.toLowerCase();
      if (keyBuffer.length > maxCommandLength) {
        keyBuffer = keyBuffer.slice(-maxCommandLength);
      }
      for (const [code, action] of Object.entries(secretCommands)) {
        if (keyBuffer.endsWith(code)) {
          action();
          keyBuffer = '';
          break;
        }
      }
    });

    const handleMove = (x: number, y: number, isTouch: boolean) => {
      // 警告表示中は操作無効
      if (!gm.countdownOverlay.classList.contains('hidden')) return;

      const now = Date.now();
      if (now - lastTime < 16) return;
      lastTime = now;
      const dx = x - lastX, dy = y - lastY;
      if (Math.sqrt(dx*dx + dy*dy) >= 3) {
        lastX = x; lastY = y;
        gm.lastMousePos = { x, y };
        const isPointerMode = gm.currentMode === 'cursor' || gm.currentMode === 'mobile';
        if (!isPointerMode) {
          gm.checkLyrics(x, y, isTouch ? 45 : 35);
        }
      }
    };

    gm.gamecontainer.addEventListener('mousemove', e => {
      if (!touched) handleMove(e.clientX, e.clientY, false);
    });

    gm.gamecontainer.addEventListener('touchstart', e => {
      touched = true;
      if (e.touches && e.touches[0] && (gm.currentMode === 'cursor' || gm.currentMode === 'mobile')) {
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      }
    }, { passive: true });

    gm.gamecontainer.addEventListener('touchmove', e => {
      if (!gm.isFirstInteraction && e.touches && e.touches[0]) {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY, true);
      }
    }, { passive: false });

    gm.gamecontainer.addEventListener('touchend', () => {
      setTimeout(() => { touched = false; }, 300);
    }, { passive: true });

    const stopPointerHold = () => gm.stopActivePointerHold();
    document.addEventListener('mouseup', stopPointerHold);
    document.addEventListener('touchend', stopPointerHold);
    document.addEventListener('touchcancel', stopPointerHold);

    const handleButtonClick = async (event: Event | null) => {
      if (event) event.preventDefault();

      // 警告表示中は操作無効 (ただしFirstInteraction時の警告表示ロジックは通す必要があるため、
      // 既に警告が出ている場合のみブロックする)
      // 注意: 下記のbody mode logicで警告を出すので、その前段階ではまだhiddenの場合がある
      if (!gm.countdownOverlay.classList.contains('hidden')) {
          // Warning already visible
          return;
      }

      if (!gm.apiLoaded) return;
      if (gm.isFirstInteraction) {
        // カメラ権限と動作確認 (カメラを使用する全モード)
        if (gm.currentMode === 'body' || gm.currentMode === 'face' || gm.currentMode === 'hand') {
            const success = await gm.ensureCameraReady();
            if (!success) return;
        }

        if (gm.currentMode === 'body') {
          gm.isFirstInteraction = false;
          // アイドルタイマー解除
          gm.timers.clearTimer(TIMER_KEYS.IdleTimeout);
          if (gm.isBodyWarningEnabled()) {
            gm.countdownOverlay.classList.remove('hidden');
            gm.countdownText.style.whiteSpace = 'nowrap';
            gm.countdownText.innerHTML = '<span style="font-size: 60%">全身が映るように調整してください</span>';
          } else {
            gm.countdownOverlay.classList.add('hidden');
          }
          return;
        }
      // アイドルタイマー解除
      gm.timers.clearTimer(TIMER_KEYS.IdleTimeout);
        gm.playMusic();
        return;
      }
      gm.togglePlay();
    };

    gm.playpause.addEventListener('click', handleButtonClick);
    gm.playpause.addEventListener('touchend', handleButtonClick, { passive: false });

    const handleRestartClick = (event: Event | null) => {
      if (event) event.preventDefault();
      
      // 警告表示中は操作無効
      if (!gm.countdownOverlay.classList.contains('hidden')) return;

      if (!gm.apiLoaded) return;
      gm.restartGame();
    };

    gm.restart.addEventListener('click', handleRestartClick);
    gm.restart.addEventListener('touchend', handleRestartClick, { passive: false });

    document.addEventListener('dblclick', (event) => {
      const firesTouchEvents =
        'sourceCapabilities' in event &&
        (event as { sourceCapabilities?: { firesTouchEvents?: boolean } }).sourceCapabilities
          ?.firesTouchEvents;
      if (gm.isMobile || firesTouchEvents) return;
      if (!gm.isFirstInteraction && !gm.resultsDisplayed) {
        console.log('ダブルクリックによる結果表示');
        gm.showResults();
      }
    });
  }
}

// SRP: ビューポート・デバイス関連の責務
