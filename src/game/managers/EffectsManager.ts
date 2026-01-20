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

  createSilverTapeBurst(): void {
    const container = document.getElementById('live-background') || this.game.gamecontainer;
    if (!container) return;
    
    // コンボ数に応じて演出を強化
    const combo = this.game.combo;
    const isBigCombo = combo >= 50;
    const isSuperCombo = combo >= 100;
    
    const count = (this.game.isMobile ? 12 : 20) * (isSuperCombo ? 1.5 : 1);
    const baseDuration = this.game.isMobile ? 1500 : 2000;
    
    // テープの色セット
    const colors = [
      'linear-gradient(135deg, #fff 0%, #e0e0e0 50%, #fff 100%)', // Silver
    ];
    
    if (isBigCombo) {
      colors.push('linear-gradient(135deg, #87cefa 0%, #00bfff 50%, #87cefa 100%)'); // Blue
      colors.push('linear-gradient(135deg, #ff69b4 0%, #ff1493 50%, #ff69b4 100%)'); // Pink
    }
    
    if (isSuperCombo) {
      colors.push('linear-gradient(135deg, #ffd700 0%, #fdb931 50%, #ffd700 100%)'); // Gold
      colors.push('linear-gradient(135deg, #ff0000 0%, #00ff00 25%, #0000ff 50%, #ff00ff 75%, #ff0000 100%)'); // Rainbow
    }

    for (let i = 0; i < count; i++) {
      const tape = document.createElement('div');
      tape.className = 'silver-tape';
      
      // 色をランダム適用
      tape.style.background = colors[Math.floor(Math.random() * colors.length)];
      
      const duration = baseDuration + Math.random() * 800;
      const swayDuration = 800 + Math.random() * 500;
      const drift = (Math.random() - 0.5) * (this.game.isMobile ? 80 : 150);
      
      // テープの幅や長さもランダムに
      if (isSuperCombo && Math.random() > 0.7) {
        tape.style.width = '16px';
        tape.style.height = '100px';
        tape.style.zIndex = '1000';
      }
      
      const startX = Math.random() * 100;
      tape.style.left = `${startX}%`;
      tape.style.setProperty('--tape-drift', `${drift}px`);
      
      // 3D回転アニメーション用の変数をセット（CSS側でアニメーション定義済み）
      tape.style.animationDuration = `${duration}ms, ${swayDuration}ms, ${duration * 0.8}ms`;
      tape.style.animationDelay = `${Math.random() * 200}ms, 0ms, 0ms`;
      
      container.appendChild(tape);
      setTimeout(() => tape.remove(), duration + 500);
    }
  }

  createConfettiShower(): void {
    const container = document.body; // 画面全体
    const count = this.game.isMobile ? 80 : 150;
    const colors = ['#f00', '#0f0', '#00f', '#ff0', '#f0f', '#0ff', '#fff', '#ffd700'];

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'confetti';
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `-20px`;
      
      const speed = 1500 + Math.random() * 2000;
      particle.style.animationDuration = `${speed}ms`;
      particle.style.width = `${6 + Math.random() * 8}px`;
      particle.style.height = `${8 + Math.random() * 12}px`;
      
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
    const colors = ['#ff0', '#f0f', '#0ff', '#f00', '#0f0'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'firework-particle';
      p.style.backgroundColor = color;
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
