import { get } from 'svelte/store';
import { score, combo, maxCombo, isPaused, loadingText, instructions, resultsVisible, results, mode, activeBubbles, apiReady, songInfo, type SongInfo, type Bubble, type Mode } from '../stores/game';

// 簡易コントローラ: 既存仕様の要点のみをSvelteで再構成（TextAliveはwindow.TextAliveApp経由で使用）
export class GameController {
  private startTime = 0;
  private lyricTimer: number | null = null;
  private randomTextTimer: number | null = null;
  private displayed = new Set<string>();
  private player: any = null;
  private isPlayerInit = false;
  private _op = false;

  // MediaPipe
  private camera: any = null;
  private hands: any = null;
  private pose: any = null;
  private videoEl: HTMLVideoElement | null = null;
  private mpActiveMode: Mode | null = null;
  private seg: any = null;
  private segCanvas: HTMLCanvasElement | null = null;
  private segCtx: CanvasRenderingContext2D | null = null;

  constructor() {}

  init(song: SongInfo, initialMode: Mode) {
    songInfo.set(song);
    mode.set(initialMode);
    loadingText.set(`${song.title} をロード中...`);
    instructions.set(this.buildInstructions(initialMode));
    this.initPlayer(song);
    // MediaPipeの初期化（必要なモードのみ）
    if (initialMode === 'hand' || initialMode === 'body') {
      this.initMediaPipe(initialMode).catch(() => {
        // カメラ不可等はフォールバック
        mode.set('cursor');
        instructions.set(this.buildInstructions('cursor'));
      });
    }
  }

  private buildInstructions(m: Mode) {
    switch (m) {
      case 'cursor': return '歌詞の文字にマウスを当ててポイントを獲得しよう！';
      case 'hand': return 'カメラに手を映して歌詞に触れてポイントを獲得しよう！';
      case 'body': return 'カメラに全身を映して歌詞に触れてポイントを獲得しよう！';
    }
  }

  private initPlayer(song: SongInfo) {
    if (typeof (window as any).TextAliveApp === 'undefined') {
      this.fallback();
      return;
    }
    try {
      const TextAliveApp = (window as any).TextAliveApp;
      this.player = new TextAliveApp.Player({ app: { token: song.apiToken }, mediaElement: document.createElement('audio') });
      document.body.appendChild(this.player.mediaElement);
      this.isPlayerInit = true;
      this.player.addListener({
        onAppReady: (app: any) => {
          if (app && !app.managed) {
            try { this.player.createFromSongUrl(song.songUrl); } catch { this.fallback(); }
          }
        },
        onVideoReady: (video: any) => {
          loadingText.set('準備中...');
          setTimeout(() => {
            apiReady.set(true);
            isPaused.set(true);
            loadingText.set('準備完了-「再生」ボタンを押してね');
            // 歌詞は時間に合わせてupdateLyricsで生成
          }, 800);
        },
        onTimeUpdate: (pos: number) => {
          if (!get(isPaused)) this.updateLyrics(pos);
        },
        onPlay: () => {
          isPaused.set(false);
          this.startRandomText();
        },
        onPause: () => {
          isPaused.set(true);
          this.stopRandomText();
        },
        onFinish: () => this.showResults(),
        onError: () => this.fallback(),
      });
    } catch {
      this.fallback();
    }
  }

  private fallback() {
    this.isPlayerInit = false;
    apiReady.set(true);
    isPaused.set(true);
    loadingText.set('準備完了 - 下の「再生」ボタンを押してください');
  }

  async play() {
    if (this._op) return; this._op = true;
    try {
      if (this.isPlayerInit && this.player && !this.player.isPlaying) {
        try { await this.player.requestPlay(); } catch { this.fallback(); this.startFallbackLyrics(); }
      } else if (!this.isPlayerInit) {
        this.startFallbackLyrics();
      }
      this.startRandomText();
    } finally { setTimeout(() => this._op = false, 500); }
  }

  pause() {
    if (this.player?.isPlaying) { try { this.player.requestPause(); } catch {}
    }
    isPaused.set(true);
    this.stopRandomText();
  }

  restart() {
    combo.set(0); score.set(0); maxCombo.set(0);
    this.displayed.clear(); activeBubbles.set([]);
  // MediaPipeは継続（pause/resumeはplayer/loop側で制御）
    if (this.isPlayerInit && this.player) {
      try { this.player.requestStop(); setTimeout(() => this.player.requestPlay(), 300); } catch {}
    } else {
      this.startFallbackLyrics();
    }
  }

  private startFallbackLyrics() {
    this.startTime = Date.now();
    if (this.lyricTimer) cancelAnimationFrame(this.lyricTimer as any);
    const phrases = [
      { text: 'マジカル', t: 1000 },
      { text: 'ミライ', t: 4000 },
      { text: '初音ミク', t: 6500 },
    ];
    const chars: Array<{ time: number; text: string; dur: number }>= [];
    phrases.forEach(p => Array.from(p.text.normalize('NFC')).forEach((ch, i) => {
      chars.push({ time: p.t + i * 400, text: ch, dur: 600 });
    }));
    let idx = 0;
    const step = () => {
      if (get(isPaused)) { this.lyricTimer = requestAnimationFrame(step) as any; return; }
      const now = Date.now() - this.startTime;
      while (idx < chars.length && chars[idx].time <= now) {
        this.spawnBubble(chars[idx].text, chars[idx].dur);
        idx++;
      }
      if (idx >= chars.length) {
        // 1周終わったら少し待って結果
        setTimeout(() => this.showResults(), 5000);
      } else {
        this.lyricTimer = requestAnimationFrame(step) as any;
      }
    };
    isPaused.set(false);
    step();
  }

  private updateLyrics(position: number) {
    // TextAlive からの正確なタイムスタンプは player.video から読み出せるが、
    // ここでは簡易に近傍 500ms 窓で出現させる例に留める（詳細移植は次段階で拡張）
    const video = this.player?.video;
    if (!video) return;
    let phrase = video.firstPhrase;
    while (phrase) {
      let word = phrase.firstWord;
      while (word) {
        let char = word.firstChar;
        while (char) {
          if (char.startTime <= position && char.startTime > position - 500) {
            const t = (char.text ?? '').toString().trim();
            if (t) this.spawnBubble(t, Math.max(3000, char.endTime - char.startTime));
          }
          char = char.next;
        }
        word = word.next;
      }
      phrase = phrase.next;
    }
  }

  private spawnBubble(text: string, displayDuration: number) {
    const id = `${Date.now()}-${Math.random()}`;
    const screenWidth = window.innerWidth;
    const isSmall = screenWidth <= 768;
    const x = isSmall ? screenWidth * 0.15 + Math.random() * (screenWidth * 0.7) : 100 + Math.random() * (screenWidth - 300);
    const y = isSmall ? window.innerHeight * 0.3 + Math.random() * (window.innerHeight * 0.55) : window.innerHeight - 300 - Math.random() * 100;
    const fontSize = isSmall ? (screenWidth <= 480 ? '18px' : '22px') : '48px';
    const bubble: Bubble = {
      id, text: String(text).normalize('NFC'), x, y, color: '#39C5BB', fontSize,
      expiresAt: Date.now() + Math.min(8000, Math.max(3000, displayDuration)), clicked: false
    };
    activeBubbles.update(list => [...list, bubble]);
    setTimeout(() => {
      activeBubbles.update(list => list.filter(b => b.id !== id));
      if (!get(isPaused) && !bubble.clicked) {
        combo.set(0);
      }
    }, Math.min(8000, Math.max(3000, displayDuration)));
  }

  clickBubble(id: string) {
    let curScore = get(score);
    let curCombo = get(combo) + 1;
    combo.set(curCombo);
    maxCombo.set(Math.max(get(maxCombo), curCombo));
    const pts = 100 * (Math.floor(curCombo / 5) + 1);
    score.set(curScore + pts);
    activeBubbles.update(list => list.map(b => b.id === id ? { ...b, clicked: true, color: '#FF69B4' } : b));
  }

  private startRandomText() {
    if (this.randomTextTimer) return;
    const texts = ['ミク！', 'かわいい！', '最高！', '39！', 'イェーイ！'];
    this.randomTextTimer = window.setInterval(() => {
      // 将来的にSvelteで演出用レイヤーを作る。今はno-op。
    }, 500);
  }

  private stopRandomText() {
    if (this.randomTextTimer) { clearInterval(this.randomTextTimer); this.randomTextTimer = null; }
  }

  showResults() {
    isPaused.set(true);
    const s = get(score); const mc = get(maxCombo);
    let rank = 'C'; if (s >= 10000) rank = 'S'; else if (s >= 8000) rank = 'A'; else if (s >= 6000) rank = 'B';
    results.set({ score: s, maxCombo: mc, rank });
    resultsVisible.set(true);
  }

  // ===================== MediaPipe =====================
  private async initMediaPipe(m: Mode) {
    try {
      this.videoEl = document.getElementById('camera-video') as HTMLVideoElement | null;
      if (!this.videoEl) throw new Error('video element not found');
      const base: string = (window as any).__BASE_URL || (import.meta as any).env?.BASE_URL || '/';

      // 動的 import でバンドル肥大化を抑制
      const [{ Camera }, handsMod, poseMod, segMod] = await Promise.all([
        import('@mediapipe/camera_utils'),
        m === 'hand' ? import('@mediapipe/hands') : Promise.resolve(null as any),
        m === 'body' ? import('@mediapipe/pose') : Promise.resolve(null as any),
        import('@mediapipe/selfie_segmentation'),
      ]);

      const locate = (dir: string) => (file: string) => `${base}mediapipe/${dir}/${file}`;

      if (m === 'hand' && handsMod) {
        this.hands = new (handsMod as any).Hands({ locateFile: locate('hands') });
        this.hands.setOptions({
          selfieMode: true,
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });
        this.hands.onResults((res: any) => this.onHandsResults(res));
      }

      if (m === 'body' && poseMod) {
        this.pose = new (poseMod as any).Pose({ locateFile: locate('pose') });
        this.pose.setOptions({
          selfieMode: true,
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });
        this.pose.onResults((res: any) => this.onPoseResults(res));
      }

      // Selfie Segmentation（背景切り抜き表示）
      const segCanvas = document.getElementById('segmentation-canvas') as HTMLCanvasElement | null;
      if (segCanvas && segMod) {
        this.seg = new (segMod as any).SelfieSegmentation({ locateFile: locate('selfie_segmentation') });
        this.seg.setOptions({ modelSelection: 1 }); // 0: Landscape, 1: General
        this.seg.onResults((res: any) => this.onSegmentationResults(res));
        this.segCanvas = segCanvas; this.segCtx = segCanvas.getContext('2d');
      }

      // カメラ開始
      this.camera = new (Camera as any)(this.videoEl, {
        onFrame: async () => {
          if (get(isPaused)) return; // 一時停止中は処理しない
          try {
            if (this.seg) {
              await this.seg.send({ image: this.videoEl });
            }
            if (this.hands) {
              await this.hands.send({ image: this.videoEl });
            } else if (this.pose) {
              await this.pose.send({ image: this.videoEl });
            }
          } catch {
            // no-op
          }
        },
        width: 640,
        height: 480,
      });
      await this.camera.start();
      this.mpActiveMode = m;
    } catch (e) {
      // カメラ権限なし等
      console.warn('MediaPipe init failed', e);
      this.stopMediaPipe();
      throw e;
    }
  }

  private stopMediaPipe() {
    try { this.camera?.stop?.(); } catch {}
    this.camera = null;
    this.hands = null;
    this.pose = null;
  this.seg = null;
    this.mpActiveMode = null;
  }

  private onHandsResults(res: any) {
    if (!res || !res.multiHandLandmarks) return;
    const vw = window.innerWidth; const vh = window.innerHeight;
    const idsHit = new Set<string>();
    const bubbles = get(activeBubbles);
    const threshold = vw <= 480 ? 60 : (vw <= 768 ? 50 : 40); // px
    for (const lm of res.multiHandLandmarks as Array<Array<any>>) {
      // 主に人差し指・中指の指先
      const picks = [8, 12];
      for (const idx of picks) {
        const p = lm[idx]; if (!p) continue;
        const x = (1 - p.x) * vw; // selfieMode でミラー
        const y = p.y * vh;
        for (const b of bubbles) {
          if (b.clicked) continue;
          const dx = b.x - x; const dy = b.y - y;
          if (dx * dx + dy * dy <= threshold * threshold) {
            idsHit.add(b.id);
          }
        }
      }
    }
    if (!get(isPaused)) idsHit.forEach((id) => this.clickBubble(id));
  }

  private onPoseResults(res: any) {
    if (!res || !res.poseLandmarks) return;
    const vw = window.innerWidth; const vh = window.innerHeight;
    const idsHit = new Set<string>();
    const bubbles = get(activeBubbles);
    const threshold = vw <= 480 ? 70 : (vw <= 768 ? 60 : 50); // px（手首は少し広め）
    const wristsIdx = [15, 16]; // left/right wrist
    for (const wi of wristsIdx) {
      const p = res.poseLandmarks[wi]; if (!p) continue;
      const x = (1 - p.x) * vw; // selfieMode ミラー
      const y = p.y * vh;
      for (const b of bubbles) {
        if (b.clicked) continue;
        const dx = b.x - x; const dy = b.y - y;
        if (dx * dx + dy * dy <= threshold * threshold) {
          idsHit.add(b.id);
        }
      }
    }
    if (!get(isPaused)) idsHit.forEach((id) => this.clickBubble(id));
  }

  private onSegmentationResults(res: any) {
    if (!this.segCanvas || !this.segCtx || !res) return;
    const canvas = this.segCanvas; const ctx = this.segCtx;
    const vw = this.videoEl?.videoWidth || 640;
    const vh = this.videoEl?.videoHeight || 480;
    // Canvasをビューポートに合わせる
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    }
    // videoをキャンバスへ描画し、セグメンテーションマスクで人物のみ残す
    // 1) 元映像を描画
    ctx.save();
    // カバー用にアスペクト比を維持しつつ全画面に描画
    const scale = Math.max(canvas.width / vw, canvas.height / vh);
    const dw = vw * scale; const dh = vh * scale;
    const dx = (canvas.width - dw) / 2; const dy = (canvas.height - dh) / 2;
    ctx.drawImage(this.videoEl as HTMLVideoElement, dx, dy, dw, dh);
    // 2) マスク適用（背景を暗く）
    if (res.segmentationMask) {
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(res.segmentationMask, dx, dy, dw, dh); // 人物のみ残す
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
  }
}
