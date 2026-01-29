import type { GameManager } from "../GameManager"
export class EffectsManager {
  private game: GameManager

  constructor(game: GameManager) {
    this.game = game;
  }

  createClickEffect(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const burstCount = this.game.isMobile ? 3 : 6;
    const lifespan = this.game.isMobile ? 600 : 800;
    for (let i = 0; i < burstCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      const size = 10 + Math.random() * 15;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${x - size/2 + (Math.random() - 0.5) * 30}px`;
      particle.style.top = `${y - size/2 + (Math.random() - 0.5) * 30}px`;
      this.game.gamecontainer.appendChild(particle);
      setTimeout(() => particle.remove(), lifespan);
    }

    const pointDisplay = document.createElement('div');
    pointDisplay.className = 'score-popup';
    pointDisplay.textContent = `+${Math.round(this.game.scorePerHit)}`;
    
    // 位置調整（モバイル時は画面内に収まるように補正）
    let popupX = x;
    let popupY = y;
    if (this.game.isMobile) {
      const marginX = 80; // 左右マージン
      const marginY = 60; // 上下マージン
      popupX = Math.max(marginX, Math.min(window.innerWidth - marginX, popupX));
      popupY = Math.max(marginY, Math.min(window.innerHeight - marginY, popupY));
      
      // 中央揃えのためにtransformを追加
      pointDisplay.style.transform = 'translate(-50%, -50%)';
    }

    pointDisplay.style.left = `${popupX}px`;
    pointDisplay.style.top = `${popupY}px`;
    pointDisplay.style.opacity = '1';
    pointDisplay.style.pointerEvents = 'none';
    this.game.gamecontainer.appendChild(pointDisplay);

    const start = performance.now();
    const duration = this.game.isMobile ? 900 : 1200;
    const drift = this.game.isMobile ? 20 : 28;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      // アニメーション基準点も補正後の位置を使う
      pointDisplay.style.top = `${popupY - drift * progress}px`;
      pointDisplay.style.opacity = String(1 - progress);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        pointDisplay.remove();
      }
    };
    requestAnimationFrame(animate);
    setTimeout(() => pointDisplay.remove(), duration + 500);
  }

  createHitEffect(x: number, y: number): void {
    const ripple = document.createElement('div');
    ripple.className = 'tap-ripple';
    ripple.style.left = `${x - 20}px`;
    ripple.style.top = `${y - 20}px`;
    this.game.gamecontainer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  }

  /**
   * 10コンボごとの特別演出
   * 銀テープの代わりにUIに合わせた花火と背景テキストを表示
   */
  triggerComboEffect(combo: number): void {
    this.createComboBackgroundText(combo);
  }

  private createMikuFirework(combo: number): void {
    const isBig = combo >= 50;
    const count = isBig ? 3 : 1;
    
    for(let i=0; i<count; i++) {
        setTimeout(() => {
            this.createFirework(); // 既存の花火メソッドを再利用（色は既にミクカラー対応済み）
        }, i * 300);
    }
  }
  private createComboBackgroundText(combo: number): void {
    const scoreContainer = document.getElementById('score-container');
    const rect = scoreContainer?.getBoundingClientRect();
    const host = rect ? document.body : this.game.gamecontainer;
    if (!host) return;

    let bgLayer = host.querySelector<HTMLElement>('#combo-bg-layer');
    if (!bgLayer) {
      bgLayer = document.createElement('div');
      bgLayer.id = 'combo-bg-layer';
      bgLayer.style.position = rect ? 'fixed' : 'absolute';
      bgLayer.style.pointerEvents = 'none';
      bgLayer.style.zIndex = '2000';
      bgLayer.style.display = 'flex';
      bgLayer.style.alignItems = 'center';
      bgLayer.style.justifyContent = 'flex-end';
      bgLayer.style.gap = '6px';
      host.appendChild(bgLayer);
    }

    if (rect) {
      bgLayer.style.left = `${rect.right}px`;
      bgLayer.style.top = `${rect.bottom + 6}px`;
      bgLayer.style.transform = 'translateX(-100%)';
      bgLayer.style.right = '';
    } else {
      bgLayer.style.top = '90px';
      bgLayer.style.right = '40px';
      bgLayer.style.left = '';
      bgLayer.style.transform = '';
    }

    const textEl = document.createElement('div');
    textEl.className = 'combo-bg-text';
    textEl.innerHTML = `${combo}<span style="font-size: 0.6em; margin-left: 6px">COMBO!</span>`;
    textEl.style.position = 'relative';
    textEl.style.color = 'rgba(57, 197, 187, 0.95)';
    textEl.style.fontFamily = "'Segoe UI', sans-serif";
    textEl.style.fontWeight = '800';
    textEl.style.textAlign = 'right';
    textEl.style.lineHeight = '1';
    textEl.style.whiteSpace = 'nowrap';
    textEl.style.textShadow = '0 0 10px rgba(57, 197, 187, 0.35)';
    textEl.style.padding = '4px 10px';
    textEl.style.background = 'rgba(10, 14, 18, 0.45)';
    textEl.style.border = '1px solid rgba(57, 197, 187, 0.35)';
    textEl.style.borderRadius = '6px';

    const fontSize = this.game.isMobile ? 14 : 18;
    textEl.style.fontSize = `${fontSize}px`;

    textEl.animate([
      { transform: 'translateY(-4px) scale(0.98)', opacity: 0 },
      { transform: 'translateY(0) scale(1)', opacity: 1, offset: 0.2 },
      { transform: 'translateY(4px) scale(0.98)', opacity: 0 }
    ], {
      duration: 1200,
      easing: 'ease-out',
      fill: 'forwards'
    });

    bgLayer.appendChild(textEl);
    setTimeout(() => textEl.remove(), 1500);
  }

  createSilverTapeBurst(): void {
    // 互換性のために残すが、中身は新演出に転送、または非推奨とする
    // 今回はGameManager側も更新するので、ここは削除してもよいが、
    // まだ呼び出し元が残っている過渡期のために新しい演出を呼ぶようにしておく
    this.triggerComboEffect(this.game.combo); 
  }

  createConfettiShower(): void {
    const container = document.body; // 画面全体
    const count = this.game.isMobile ? 80 : 150;
    // Cyber / Miku Color Palette
    const colors = ['#39C5BB', '#E0FFFF', '#FF69B4', '#FFFFFF', '#00FFFF'];

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'confetti';
      particle.style.position = 'fixed'; // fixedにしてウィンドウ基準に
      particle.style.zIndex = '9999';    // 最前面に
      particle.style.pointerEvents = 'none'; // 操作阻害防止
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `-20px`;
      
      // グロー効果を追加
      particle.style.boxShadow = `0 0 6px ${particle.style.backgroundColor}`;
      
      const speed = 1500 + Math.random() * 2000;
      particle.style.animationDuration = `${speed}ms`;
      particle.style.width = `${6 + Math.random() * 6}px`;
      particle.style.height = `${8 + Math.random() * 8}px`;
      
      // ランダムな遅延で自然に
      particle.style.animationDelay = `${Math.random() * 1000}ms`;
      
      container.appendChild(particle);
      setTimeout(() => particle.remove(), speed + 1000);
    }
  }

  createFirework(): void {
    const container = document.body;
    const x = 20 + Math.random() * 60; // 画面幅の20%~80%
    const y = 20 + Math.random() * 40; // 画面高さの20%~60%
    const count = this.game.isMobile ? 30 : 50;
    // Neon colors
    const colors = ['#39C5BB', '#FF69B4', '#00FFFF', '#FFFFFF'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'firework-particle';
      p.style.position = 'fixed'; // fixedにしてウィンドウ基準に
      p.style.zIndex = '9999';    // 最前面に
      p.style.pointerEvents = 'none'; // 操作阻害防止
      p.style.backgroundColor = color;
      p.style.boxShadow = `0 0 8px ${color}`; // Stronger glow
      p.style.left = `${x}%`;
      p.style.top = `${y}%`;

      const angle = Math.random() * Math.PI * 2;
      const velocity = 50 + Math.random() * 100;
      
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity;

      // CSS Variableを使ってアニメーションを制御
      p.style.setProperty('--tx', `${tx}px`);
      p.style.setProperty('--ty', `${ty}px`);
      
      p.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
      ], {
        duration: 800 + Math.random() * 400,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fill: 'forwards'
      });
      
      container.appendChild(p);
      setTimeout(() => p.remove(), 1200);
    }
  }
}

// SRP: 入力/イベント配線の責務
