import type { GameManager } from "../GameManager"
import { calculateRank } from "../types"
export class ResultsManager {
  private game: GameManager
  private turnstileWidgetId: string | null

  constructor(game: GameManager) {
    this.game = game;
    this.turnstileWidgetId = null;
  }

  private clearTurnstileWidget(): void {
    if (this.turnstileWidgetId && (window as any).turnstile) {
      try { (window as any).turnstile.remove(this.turnstileWidgetId); } catch {}
    }
    this.turnstileWidgetId = null;
    const container = document.getElementById('turnstile-container');
    if (container) container.innerHTML = '';
  }

  showResults(): void {
    if (this.game.resultsDisplayed) {
      console.log('すでに結果画面が表示されています');
      return;
    }
    console.log('結果画面を表示します');
    this.game.resultsDisplayed = true;
    this.game.cancelFinishGuards();
    this.clearTurnstileWidget();

    if (this.game.player?.isPlaying) {
      try { this.game.player.requestPause(); } catch (e) { console.error('Results pause error:', e); }
    }

    this.game.cancelResultTimers();

    // 曲終了時に画面上の全ての歌詞を即座に削除（最適化版）
    console.log('画面上の歌詞を全て削除します');
    this.game.clearActiveBubbles();
    
    // 表示済みリストもクリア
    this.game.displayedLyrics.clear();
    this.game.displayedViewerLyrics.clear();

    this.game.maxCombo = Math.max(this.game.maxCombo || 0, this.game.combo);

    const rank = calculateRank(this.game.score);
    // onGameEnd call removed to delay submission until user interaction

    const resultsScreen = document.getElementById('results-screen');
    if (!resultsScreen) {
      console.error('結果画面のDOM要素が見つかりません');
      return;
    }

    const finalScoreDisplay = document.getElementById('final-score-display');
    const finalComboDisplay = document.getElementById('final-combo-display');
    const rankDisplay = document.getElementById('rank-display');
    const perfectBanner = document.getElementById('perfect-banner');
    const registerScoreBtn = document.getElementById('register-score') as HTMLButtonElement;
    const nameInput = document.getElementById('player-name-input') as HTMLInputElement;

    if (finalScoreDisplay) finalScoreDisplay.textContent = String(Math.round(this.game.score));
    if (finalComboDisplay) finalComboDisplay.textContent = `最大コンボ: ${this.game.maxCombo}`;
    if (rankDisplay) rankDisplay.textContent = `ランク: ${rank}`;
    if (perfectBanner) {
      const isPerfect = this.game.lyricsData.length > 0 && this.game.maxCombo >= this.game.lyricsData.length;
      if (isPerfect) {
        perfectBanner.classList.remove('hidden');
        perfectBanner.classList.add('is-visible');
      } else {
        perfectBanner.classList.add('hidden');
        perfectBanner.classList.remove('is-visible');
      }
    }
    
    // Reset input and button state
    if (nameInput) nameInput.value = '';
    if (registerScoreBtn) {
      registerScoreBtn.textContent = 'ランキングに登録';
      registerScoreBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      registerScoreBtn.disabled = false;
    }
    this.game.resultReported = false; // Reset reported flag

    resultsScreen.classList.remove('hidden');
    resultsScreen.style.display = 'flex';
    setTimeout(() => {
      resultsScreen.classList.add('show');
      console.log('リザルト画面のshowクラスを追加しました');
    }, 100);

    this.setupResultsButtons();
  }

  setupResultsButtons(): void {
    const backToTitle = document.getElementById('back-to-title');
    const replaySong = document.getElementById('replay-song');
    const registerScore = document.getElementById('register-score');
    const openRanking = document.getElementById('open-ranking');
    const nameInput = document.getElementById('player-name-input') as HTMLInputElement;

    const submitScore = async () => {
      if (this.game.resultReported) return;
      
      const rank = calculateRank(this.game.score);
      // そのまま送る (サーバー側でバリデーションされる)
      const modeForResult = this.game.currentMode;
      const playerName = nameInput?.value.trim() || 'ゲスト';

      // Turnstile 実行
      const turnstileContainer = document.getElementById('turnstile-container');
      const hasTurnstile = Boolean(turnstileContainer && (window as any).turnstile);
      const siteKey = hasTurnstile ? await this.game.getTurnstileSiteKey() : null;
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const resolvedSiteKey = siteKey || (isLocalhost ? '1x00000000000000000000AA' : null);
      if (hasTurnstile) {
          if (!resolvedSiteKey) {
            console.error('[Results] Turnstile site key not configured');
            if (registerScore) {
              (registerScore as HTMLButtonElement).disabled = false;
              registerScore.textContent = '認証設定エラー';
            }
            return;
          }
          if (this.turnstileWidgetId) {
            if (registerScore) {
              (registerScore as HTMLButtonElement).disabled = true;
              registerScore.textContent = '認証中...';
            }
            try { (window as any).turnstile.reset(this.turnstileWidgetId); } catch {}
            return;
          }
          if (registerScore) {
             (registerScore as HTMLButtonElement).disabled = true;
             registerScore.textContent = '認証中...';
          }

          try {
              const widgetId = (window as any).turnstile.render('#turnstile-container', {
                  // テスト用キー (Always Pass): 1x00000000000000000000AA
                  sitekey: resolvedSiteKey,
                  callback: async (token: string) => {
                      if (typeof this.game.onGameEnd === 'function') {
                        try {
                          const result = await this.game.onGameEnd({
                            songId: this.game.songId || 'HmfsoBVch26BmLCm',
                            mode: modeForResult,
                            score: Math.round(this.game.score),
                            maxCombo: this.game.maxCombo,
                            rank,
                            playerName,
                            turnstileToken: token
                          });
                          
                          if ((result as any) === true) {
                            this.game.resultReported = true;
                            if (registerScore) {
                              registerScore.textContent = '登録完了';
                              registerScore.classList.add('opacity-50', 'cursor-not-allowed');
                              (registerScore as HTMLButtonElement).disabled = true;
                            }
                            // ウィジェット削除
                            setTimeout(() => {
                               try {
                                 if (this.turnstileWidgetId) {
                                   (window as any).turnstile.remove(this.turnstileWidgetId);
                                 } else {
                                   (window as any).turnstile.remove('#turnstile-container');
                                 }
                               } catch(e) {}
                               this.turnstileWidgetId = null;
                            }, 1000);
                          } else {
                            if (registerScore) {
                              (registerScore as HTMLButtonElement).disabled = false;
                              registerScore.textContent = '登録失敗 (再試行)';
                            }
                            try {
                              if (this.turnstileWidgetId) {
                                (window as any).turnstile.reset(this.turnstileWidgetId);
                              } else {
                                (window as any).turnstile.reset('#turnstile-container');
                              }
                            } catch(e) {}
                          }
                        } catch (error) {
                          console.error('onGameEnd handler error', error);
                          if (registerScore) {
                              (registerScore as HTMLButtonElement).disabled = false;
                              registerScore.textContent = '登録失敗 (再試行)';
                          }
                        }
                      }
                  },
                  'error-callback': () => {
                      if (registerScore) {
                          (registerScore as HTMLButtonElement).disabled = false;
                          registerScore.textContent = '登録失敗 (再試行)';
                      }
                  }
              });
              this.turnstileWidgetId = typeof widgetId === 'string' ? widgetId : null;
          } catch (e) {
              console.error('Turnstile error:', e);
              this.turnstileWidgetId = null;
              // フォールバック
              if (typeof this.game.onGameEnd === 'function') {
                  (async () => {
                    const result = await this.game.onGameEnd!({
                        songId: this.game.songId || 'HmfsoBVch26BmLCm',
                        mode: modeForResult,
                        score: Math.round(this.game.score),
                        maxCombo: this.game.maxCombo,
                        rank,
                        playerName,
                    });
                    if ((result as any) === true) {
                        this.game.resultReported = true;
                        if (registerScore) {
                            registerScore.textContent = '登録完了';
                            registerScore.classList.add('opacity-50', 'cursor-not-allowed');
                            (registerScore as HTMLButtonElement).disabled = true;
                        }
                    } else {
                        if (registerScore) {
                            (registerScore as HTMLButtonElement).disabled = false;
                            registerScore.textContent = '登録失敗 (再試行)';
                        }
                    }
                  })();
              }
          }
      } else {
          if (typeof this.game.onGameEnd === 'function') {
            (async () => {
                try {
                  const result = await this.game.onGameEnd!({
                    songId: this.game.songId || 'HmfsoBVch26BmLCm', // Fallback ID if undefined
                    mode: modeForResult,
                    score: Math.round(this.game.score),
                    maxCombo: this.game.maxCombo,
                    rank,
                    playerName,
                  });
                  
                  if ((result as any) === true) {
                    this.game.resultReported = true;
                    if (registerScore) {
                        registerScore.textContent = '登録完了';
                        registerScore.classList.add('opacity-50', 'cursor-not-allowed');
                        (registerScore as HTMLButtonElement).disabled = true;
                    }
                  } else {
                    if (registerScore) {
                        (registerScore as HTMLButtonElement).disabled = false;
                        registerScore.textContent = '登録失敗 (再試行)';
                    }
                  }
                } catch (error) {
                  console.error('onGameEnd handler error', error);
                  if (registerScore) {
                      (registerScore as HTMLButtonElement).disabled = false;
                      registerScore.textContent = '登録失敗 (再試行)';
                  }
                }
            })();
          }
      }
    };

    let lastTouchTime = 0;
    const addEvents = (element: HTMLElement | null, handler: () => void) => {
      if (!element) return;
      // Use onclick to prevent duplicate listeners
      element.onclick = (e) => {
        if (Date.now() - lastTouchTime < 600) return;
        handler();
      };
      element.ontouchend = (e) => {
        e.preventDefault();
        lastTouchTime = Date.now();
        handler();
      };
    };

    addEvents(registerScore, () => {
      void submitScore();
    });

    addEvents(openRanking, () => {
      void submitScore();
    });

    addEvents(backToTitle, () => {
      if (!this.game.resultReported) {
        // カスタムモーダルを表示するためにイベントを発火
        const event = new CustomEvent('show-confirm-modal', { 
          detail: { 
            type: 'title',
            message: 'ランキングに登録されていません。\nスコアは破棄されますが、タイトルに戻りますか？' 
          } 
        });
        window.dispatchEvent(event);
        return;
      }
      // React側で遷移処理を行う（beforeunload対策）
      window.dispatchEvent(new CustomEvent('game-navigate', { detail: { url: '/' } }));
    });

    addEvents(replaySong, () => {
      if (!this.game.resultReported) {
        // カスタムモーダルを表示するためにイベントを発火
        const event = new CustomEvent('show-confirm-modal', { 
          detail: { 
            type: 'retry',
            message: 'ランキングに登録されていません。\nスコアは破棄されますが、リトライしますか？' 
          } 
        });
        window.dispatchEvent(event);
        return;
      }
      // React側でリロード処理を行う（beforeunload対策）
      window.dispatchEvent(new CustomEvent('game-reload'));
    });
  }
}

// SRP: UI表示・テキスト更新・インジケーターの責務
