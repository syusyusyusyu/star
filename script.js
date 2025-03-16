/**
 * ボイスアイドル・ミュージックゲーム
 * 
 * このゲームは歌詞が画面上に表示され、プレイヤーがそれらをクリックまたはスワイプして
 * ポイントを獲得する音楽リズムゲームです。TextAlivePlayerを使用して歌詞と音楽を同期させています。
 * 
 * 最適化ポイント:
 * - デバイス性能に応じた処理の調整
 * - オブジェクトプールとメモリ管理の強化
 * - イベント処理の統合とスロットリング
 * - 数学計算の簡略化
 */
class GameManager {
    /**
     * ゲームマネージャーの初期化
     * 各コンポーネントの初期化と設定を行う
     */
    constructor() {
      Object.assign(this, {
        apiToken: window.songConfig?.apiToken,
        songUrl: window.songConfig?.songUrl ,
        score: 0, combo: 0, maxCombo: 0,
        startTime: Date.now(),
        isPaused: true,
        isPlaying: false,
        isPlayerInit: false,
        isFirstInteraction: true,
        player: null,
        isMobile: /Android|iPhone/.test(navigator.userAgent),
        activeChars: new Set,
        displayedLyrics: new Set,
        mouseTrail: [],
        maxTrailLength: 15,
        lastMousePos: {x:0, y:0}
      });
      [this.gamecontainer, this.scoreEl, this.comboEl, this.playpause, this.restart, this.loading] = 
        ['game-container','score','combo','play-pause','restart','loading'].map(id => document.getElementById(id));
      this.setupEvents();
      this.createLightEffects();
      this.initGame();
      this.initPlayer();
      this.gamecontainer.style.cursor = document.body.style.cursor = 'pointer';
    }
  
    /**
     * 音楽再生を開始する
     */
    async playMusic() {
      if (this._processing) return;
      this._processing = true;
      
      try {
        this.isPaused = false;
        this.playpause.textContent = '一時停止';
        
        // テキストアライブプレーヤーを使用
        if (this.player && this.isPlayerInit) {
          try {
            await this.player.requestPlay();
          } catch (e) {
            console.error("Player play error:", e);
            // エラー発生時はフォールバックモードへ
            this.fallback();
            this.startLyricsTimer(); // 歌詞タイマー開始を明示的に呼び出し
          }
        } else {
          // フォールバックモードですでに初期化済みの場合
          this.startTime = Date.now();
          this.startLyricsTimer(); // 明示的に歌詞タイマー開始
        }
        
        // ランダムテキスト表示開始
        if (!this.randomTextInterval) {
          this.randomTextInterval = setInterval(() => this.createRandomText(), 500);
        }
        
        // 最初のロード表示を非表示にする
        if (this.loading) {
          this.loading.style.opacity = '0';
          setTimeout(() => {
            if (this.loading && this.loading.parentNode) {
              this.loading.parentNode.removeChild(this.loading);
            }
          }, 1000);
        }
      } finally {
        setTimeout(() => this._processing = false, 800);
      }
    }
  
    /**
     * イベントリスナーの設定
     * ユーザー入力とシステムイベントの処理を設定
     * 最適化: 重複するイベント処理を統合
     */
    setupEvents() {
      const handleMove = (x, y, isTouch) => {
        const dx = x - this.lastMousePos.x, dy = y - this.lastMousePos.y;
        if (Math.hypot(dx, dy) >= 3) {
          this.lastMousePos = { x, y };
          this.checkLyrics(x, y, isTouch ? 45 : 35);
          
          if (!this.isFirstInteraction) {
            this.createTrailParticle(x, y);
            Math.random() < (isTouch ? 0.03 : 0.01) && this.createShooting(x, y, dx, dy);
          }
        }
      };

      this.gamecontainer.addEventListener('mousemove', e => handleMove(e.clientX, e.clientY, false));
      this.gamecontainer.addEventListener('touchmove', e => {
        !this.isFirstInteraction && e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY, true);
      }, { passive: true });
      
      this.gamecontainer.addEventListener('click', e => {
        if (this.isFirstInteraction) return; // 初回インタラクション前は何もしない
        
        this.checkLyrics(e.clientX, e.clientY, 35);
        if (Math.random() < 0.2) {
          const angle = Math.random() * Math.PI * 2;
          this.createShooting(e.clientX, e.clientY, Math.cos(angle) * 5, Math.sin(angle) * 5);
        }
      });
      
      this.playpause.addEventListener('click', () => {
        if (this.isFirstInteraction) {
          this.isFirstInteraction = false;
          this.gamecontainer.style.cursor = document.body.style.cursor = '';
        }
        this.togglePlay();
      });
      
      this.restart.addEventListener('click', () => this.restartGame());
    }
  
    /**
     * ゲームの初期化処理
     * 観客生成、タイマー開始などの初期設定
     */
    initGame() {
      this.createStars();
      this.createAudience();
      this.lyricsData = [];
      this.fallbackLyricsData = "マジカルミライ初音ミク".split('').map((c, i) => ({time: 1000 + i * 500, text: c}));
      this.randomTexts = ["ミク！", "かわいい！", "最高！", "39！", "イェーイ！"];
      
      // 初回インタラクション前はランダムテキストを表示しない
      // 初回クリック後に開始する
      this.randomTextInterval = null;
      
      this.comboResetTimer = setInterval(() => {
        if (Date.now() - (this.lastScoreTime || 0) > 30000 && this.combo > 0) {
          this.combo = 0;
          this.comboEl.textContent = `コンボ: 0`;
        }
      }, 1000);
    }
  
    /**
     * 星空背景を作成
     */
    createStars() {
      const fragment = document.createDocumentFragment();
      const starCount = Math.min(60, Math.floor(window.innerWidth * window.innerHeight / 10000));
      
      for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'light-effect';
        star.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;animation-delay:${Math.random()*3}s;${Math.random()>.7?'width:6px;height:6px;box-shadow:0 0 10px #fff':''}`;
        fragment.appendChild(star);
      }
      
      this.gamecontainer.appendChild(fragment);
    }
  
    /**
     * 舞台照明などの光エフェクトを作成
     */
    createLightEffects() {
      // スポットライト
      for (let i = 0; i < 3; i++) {
        const spotlight = document.createElement('div');
        spotlight.className = 'spotlight';
        spotlight.style.left = `${(i * 30) + 20}%`;
        spotlight.style.animationDelay = `${i * -2.5}s`;
        this.gamecontainer.appendChild(spotlight);
      }
    }
  
    /**
     * 再生/一時停止の切り替え
     */
    async togglePlay() {
      if (this._processing) return;
      this._processing = true;
      try {
        this.isPaused = !this.isPaused;
        this.playpause.textContent = this.isPaused ? '再生' : '一時停止';
        
        if (this.isPaused) {
          if (this.player?.isPlaying) await this.player.requestPause().catch(() => {});
          clearInterval(this.randomTextInterval);
          this.randomTextInterval = null;
        } else {
          if (this.player?.isPlaying === false) await this.player.requestPlay().catch(() => this.fallback());
          else if (!this.player) this.startTime = Date.now() - (this.lyricsData[this.currentLyricIndex]?.time || 0);
          if (!this.randomTextInterval) this.randomTextInterval = setInterval(() => this.createRandomText(), 500);
        }
      } finally {
        setTimeout(() => this._processing = false, 800);
      }
    }
  
    /**
     * ゲームをリスタート
     */
    async restartGame() {
      if (this._processing) return;
      this._processing = true;
      this.score = this.combo = this.currentLyricIndex = 0;
      this.startTime = Date.now();
      this.isPaused = false;
      this.scoreEl.textContent = '0';
      this.comboEl.textContent = 'コンボ: 0';
      
      document.querySelectorAll('.lyric-bubble').forEach(l => l.remove());
      this.displayedLyrics.clear();
      
      try {
        if (this.player) {
          if (this.player.isPlaying) await this.player.requestPause();
          await this.player.requestStop();
          await this.player.requestPlay().catch(() => this.fallback());
        }
        this.playpause.textContent = '一時停止';
      } finally {
        setTimeout(() => this._processing = false, 1500);
      }
    }
  
    /**
     * TextAlivePlayerを初期化
     * 歌詞と音楽の同期を行うAPIを使用
     */
    initPlayer() {
      if (typeof TextAliveApp === 'undefined') {
        if (this.loading) this.loading.textContent = "TextAliveが見つかりません。代替モードで起動中...";
        this.fallback();
        return;
      }
      
      try {
        this.player = new TextAliveApp.Player({
          app: { token: this.apiToken },
          mediaElement: document.createElement('audio')
        });
        document.body.appendChild(this.player.mediaElement);
        this.isPlayerInit = true;
        
        this.player.addListener({
          onAppReady: (app) => {
            if (app && !app.managed) this.player.createFromSongUrl(this.songUrl).catch(() => this.fallback());
          },
          onVideoReady: (video) => {
            if (video?.firstPhrase) this.processLyrics(video);
            if (this.loading) this.loading.textContent = "準備完了 - クリックして開始";
          },
          onTimeUpdate: (pos) => {
            if (!this.isPaused) this.updateLyrics(pos);
          },
          onPlay: () => {
            this.isPaused = false;
            this.playpause.textContent = '一時停止';
            if (!this.randomTextInterval) {
              this.randomTextInterval = setInterval(() => this.createRandomText(), 500);
            }
          },
          onPause: () => {
            this.isPaused = true;
            this.playpause.textContent = '再生';
            clearInterval(this.randomTextInterval);
          },
          onStop: () => {
            this.isPaused = true;
            this.playpause.textContent = '再生';
            this.restartGame();
          },
          onError: () => this.fallback()
        });
      } catch {
        this.fallback();
      }
    }
  
    /**
     * API接続に失敗した場合の代替モードに切り替え
     */
    fallback() {
      this.isPlayerInit = false;
      this.player = null;
      if (this.loading) this.loading.textContent = "APIエラー。代替モードで起動中...";
      
      const text = "マジカルミライ初音ミク";
      this.lyricsData = [];
      
      // 3文字ずつ処理（余りはそのまま）
      for (let i = 0; i < text.length; i += 3) {
        this.lyricsData.push({
          time: 1000 + (i/3) * 500,
          text: text.slice(i, Math.min(i + 3, text.length))
        });
      }
    }
    
    /**
     * ビデオデータから歌詞情報を更新
     * @param {Object} video - TextAliveから取得したビデオデータ
     */
    processLyrics(video) {
      try {
        this.lyricsData = [];
        let phrase = video.firstPhrase;
        
        while (phrase) {
          let word = phrase.firstWord;
          while (word) {
            let char = word.firstChar;
            while (char) {
              let text = char.text;
              let currentChar = char;
              
              // 最大3文字まで追加
              for (let i = 1; i < 3 && currentChar.next; i++) {
                currentChar = currentChar.next;
                text += currentChar.text;
              }
              
              this.lyricsData.push({
                time: char.startTime,
                text: text
              });
              
              // 次の処理開始位置へ
              char = currentChar.next;
            }
            word = word.next;
          }
          phrase = phrase.next;
        }
        
        this.lyricsData.sort((a, b) => a.time - b.time);
      } catch {}
    }
  
    /**
     * 歌詞表示タイマーを開始
     * APIが使用できない場合のフォールバックモード用
     */
    startLyricsTimer() {
      this.currentLyricIndex = 0;
      this.startTime = Date.now();
      
      const checkLyrics = () => {
        if ((this.isPlayerInit && this.player) || this.isPaused || this.isFirstInteraction) {
          requestAnimationFrame(checkLyrics);
          return;
        }
        
        const now = Date.now() - this.startTime;
        let processed = 0;
        
        while (this.currentLyricIndex < this.lyricsData.length && 
               this.lyricsData[this.currentLyricIndex].time <= now && 
               processed < 3) {
          
          const lyric = this.lyricsData[this.currentLyricIndex];
          if (!this.displayedLyrics.has(lyric.time)) {
            this.displayLyric(lyric.text);
            this.displayedLyrics.add(lyric.time);
            setTimeout(() => this.displayedLyrics.delete(lyric.time), 8000);
            processed++;
          }
          
          this.currentLyricIndex++;
        }
        
        if (this.currentLyricIndex >= this.lyricsData.length) {
          this.currentLyricIndex = 0;
          this.displayedLyrics.clear();
          this.startTime = Date.now();
        }
        
        requestAnimationFrame(checkLyrics);
      };
      
      requestAnimationFrame(checkLyrics);
    }
  
    /**
     * 現在の再生位置に応じて歌詞を表示
     * @param {number} position - 現在の再生位置（ミリ秒）
     */
    updateLyrics(position) {
      if (this.isPaused || this.isFirstInteraction) return;
      if (!this.displayedLyrics) this.displayedLyrics = new Set();
      
      for (let i = 0; i < this.lyricsData.length; i++) {
        const lyric = this.lyricsData[i];
        if (lyric.time <= position && lyric.time > position - 500 && !this.displayedLyrics.has(lyric.time)) {
          this.displayLyric(lyric.text);
          this.displayedLyrics.add(lyric.time);
          setTimeout(() => this.displayedLyrics.delete(lyric.time), 10000);
        }
      }
      
      if (this.player?.video && position >= this.player.video.duration - 1000) {
        this.showResults();
      }
    }
  
    /**
     * 歌詞バブルを表示
     * @param {string} text - 表示する歌詞テキスト
     */
    displayLyric(text) {
      if (!text) return;
  
      // 実際の文字数分だけ表示
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const existingBubbles = document.querySelectorAll('.lyric-bubble');
        for (let bubble of existingBubbles) {
          if (bubble.textContent === char) return;
        }
  
        const bubble = document.createElement('div');
        bubble.className = 'lyric-bubble';
        bubble.textContent = char;
        bubble.style.pointerEvents = 'auto';
        bubble.style.opacity = '1';
        
        const screenWidth = window.innerWidth;
        const isSmallScreen = screenWidth <= 768;
        
        let x = isSmallScreen 
          ? screenWidth * 0.15 + Math.random() * (screenWidth * 0.7)
          : 100 + Math.random() * (screenWidth - 300);
        let y = isSmallScreen
          ? window.innerHeight * 0.3 + Math.random() * (window.innerHeight * 0.55)
          : window.innerHeight - 300 - Math.random() * 100;
        
        bubble.style.left = `${x}px`;
        bubble.style.top = `${y}px`;
        bubble.style.color = '#39C5BB';
        
        bubble.addEventListener('mouseenter', () => this.clickLyric(bubble));
        this.gamecontainer.appendChild(bubble);
        
        setTimeout(() => bubble.remove(), 8000);
      }
    }
  
    /**
     * 指定された座標を中心とする円形の領域内にある歌詞要素をチェック
     */
    checkLyrics(x, y, radius) {
      if (this.isFirstInteraction) return false; // 初回インタラクション前は何もしない
      
      const lyrics = document.querySelectorAll('.lyric-bubble');
      const radiusSquared = radius * radius;
      
      for (const el of lyrics) {
        if (el.style.pointerEvents === 'none') continue;
        
        const rect = el.getBoundingClientRect();
        const elX = rect.left + rect.width / 2;
        const elY = rect.top + rect.height / 2;
        
        const dx = x - elX, dy = y - elY;
        const distanceSquared = dx * dx + dy * dy;
        const hitRadius = radius + Math.max(rect.width, rect.height) / 2;
        
        if (distanceSquared <= hitRadius * hitRadius) {
          this.clickLyric(el);
          this.createHitEffect(elX, elY);
        }
      }
    }
  
    /**
     * 歌詞要素がクリックされた時の処理
     */
    clickLyric(element) {
      if (element.style.pointerEvents === 'none' || this.isFirstInteraction) return;
      
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      const points = 100 * (Math.floor(this.combo / 5) + 1);
      this.score += points;
      
      this.scoreEl.textContent = this.score;
      this.comboEl.textContent = `コンボ: ${this.combo}`;
      
      element.style.color = '#FF69B4';
      this.createClickEffect(element);
      element.style.pointerEvents = 'none';
      
      setTimeout(() => element.style.opacity = '0', 100);
      this.lastScoreTime = Date.now();
    }
  
    /**
     * 歌詞クリック時のエフェクトを作成
     */
    createClickEffect(element) {
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      
      for (let i = 0; i < 6; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        const size = 10 + Math.random() * 15;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${x - size/2 + (Math.random() - 0.5) * 30}px`;
        particle.style.top = `${y - size/2 + (Math.random() - 0.5) * 30}px`;
        this.gamecontainer.appendChild(particle);
        
        setTimeout(() => particle.remove(), 800);
      }
      
      const pointDisplay = document.createElement('div');
      pointDisplay.className = 'lyric-bubble';
      pointDisplay.textContent = `+${100 * (Math.floor(this.combo / 5) + 1)}`;
      pointDisplay.style.left = `${x}px`;
      pointDisplay.style.top = `${y}px`;
      pointDisplay.style.color = '#FFFF00';
      pointDisplay.style.pointerEvents = 'none';
      
      this.gamecontainer.appendChild(pointDisplay);
      
      const animate = () => {
        const top = parseFloat(pointDisplay.style.top);
        pointDisplay.style.top = `${top - 1}px`;
        pointDisplay.style.opacity = parseFloat(pointDisplay.style.opacity || 1) - 0.02;
        
        if (parseFloat(pointDisplay.style.opacity) > 0) {
          requestAnimationFrame(animate);
        } else {
          pointDisplay.remove();
        }
      };
      
      requestAnimationFrame(animate);
    }
  
    /**
     * ヒットエフェクトを作成
     */
    createHitEffect(x, y) {
      const ripple = document.createElement('div');
      ripple.className = 'tap-ripple';
      ripple.style.left = `${x - 20}px`;
      ripple.style.top = `${y - 20}px`;
      
      this.gamecontainer.appendChild(ripple);
      setTimeout(() => ripple.remove(), 500);
    }
  
    /**
     * マウス/指の軌跡を表現するパーティクルを作成
     */
    createTrailParticle(x, y) {
      if (this.isFirstInteraction) return;
      
      const size = 25 + Math.random() * 40;
      const hue = Math.floor(Math.random() * 360);
      const particle = document.createElement('div');
      
      particle.className = 'star-particle';
      particle.style.cssText = `width:${size}px;height:${size}px;left:${x-size/2}px;top:${y-size/2}px;background-color:hsla(${hue},100%,70%,.8);box-shadow:0 0 ${size/2}px hsla(${hue},100%,70%,.8);transform:rotate(${Math.random()*360}deg)`;
      
      this.gamecontainer.appendChild(particle);
      this.mouseTrail.push({ element: particle, createdAt: Date.now() });
      
      while (this.mouseTrail.length > this.maxTrailLength) {
        const oldest = this.mouseTrail.shift();
        oldest.element.remove();
      }
      
      setTimeout(() => {
        const index = this.mouseTrail.findIndex(p => p.element === particle);
        index !== -1 && (this.mouseTrail.splice(index, 1), particle.remove());
      }, 800);
    }
  
    /**
     * 流れ星エフェクトを作成
     */
    createShooting(x, y, dx = 0, dy = 0) {
      if (this.isFirstInteraction) return;
      
      if (!dx && !dy) {
        const angle = Math.random() * Math.PI * 2;
        dx = Math.cos(angle) * 5;
        dy = Math.sin(angle) * 5;
      }

      const size = 15 + Math.random() * 15;
      const meteor = document.createElement('div');
      meteor.className = 'shooting-star';
      meteor.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;transform:rotate(${Math.atan2(dy,dx)*180/Math.PI+45}deg);box-shadow:0 0 ${size}px ${size/2}px rgba(255,255,200,.8);filter:blur(1px) drop-shadow(0 0 ${Math.min(150,Math.hypot(dx,dy)*5)/10}px #fff)`;
      
      this.gamecontainer.appendChild(meteor);
      meteor.animate([
        { transform: `rotate(${Math.atan2(dy,dx)*180/Math.PI+45}deg) scale(1)`, opacity: 1 },
        { transform: `translate(${dx*10}px,${dy*10}px) rotate(${Math.atan2(dy,dx)*180/Math.PI+45}deg) scale(.1)`, opacity: 0 }
      ], { duration: 800, easing: 'ease-out' });
      
      setTimeout(() => meteor.remove(), 800);
    }
  
    /**
     * ランダムテキストを作成して表示
     */
    createRandomText() {
      if (this.isPaused || this.isFirstInteraction) return;
      
      const text = document.createElement('div');
      text.className = 'random-text';
      text.textContent = this.randomTexts[Math.floor(Math.random() * this.randomTexts.length)];
      
      const x = Math.random() * window.innerWidth * 0.8 + window.innerWidth * 0.1;
      const y = window.innerHeight - Math.random() * 200;
      
      text.style.left = `${x}px`;
      text.style.top = `${y}px`;
      text.style.opacity = 0.5 + Math.random() * 0.5;
      text.style.fontSize = `${14 + Math.random() * 12}px`;
      text.style.transform = `rotate(${-20 + Math.random() * 40}deg)`;
      
      this.gamecontainer.appendChild(text);
      setTimeout(() => text.remove(), 6000);
    }
  
    /**
     * 観客を作成
     */
    createAudience() {
      const centerX = window.innerWidth / 2;
      const maxAudience = 180;
      
      const rows = [
        { distance: 70, count: 14, scale: 0.9 },
        { distance: 130, count: 20, scale: 0.85 },
        { distance: 190, count: 26, scale: 0.8 },
        { distance: 250, count: 32, scale: 0.75 },
        { distance: 310, count: 38, scale: 0.7 },
        { distance: 370, count: 44, scale: 0.65 },
        { distance: 430, count: 50, scale: 0.6 },
        { distance: 490, count: 56, scale: 0.55 }
      ];
      
      const colors = ['#39C5BB', '#FF69B4', '#FFA500', '#9370DB', '#32CD32', '#00BFFF'];
      let total = 0;
      
      for (const row of rows) {
        if (total >= maxAudience) break;
        
        const count = Math.min(row.count, Math.floor(row.count * window.innerWidth / 900));
        const step = 360 / count;
        
        for (let i = 0; i < count; i++) {
          if (total >= maxAudience) break;
          
          const angle = step * i * (Math.PI / 180);
          const x = Math.cos(angle) * row.distance;
          const y = Math.sin(angle) * (row.distance * 0.5);
          
          const posX = centerX + x;
          const posY = 100 - y;
          
          if (posX >= -20 && posX <= window.innerWidth + 20 && posY >= -20 && posY <= window.innerHeight + 20) {
            const audience = document.createElement('div');
            audience.className = 'audience';
            audience.style.left = `${posX}px`;
            audience.style.bottom = `${posY}px`;
            audience.style.transform = `scale(${row.scale})`;
            audience.style.opacity = Math.max(0.5, row.scale);
            
            if (row.distance > 250 && total % 2 === 0) {
              audience.style.backgroundColor = '#333';
              audience.style.height = '12px';
              audience.style.width = '8px';
            } else {
              const penlight = document.createElement('div');
              penlight.className = 'penlight';
              
              if (total % 3 !== 0 || row.distance <= 190) {
                penlight.style.animationDelay = `${Math.random() * 0.8}s`;
              } else {
                penlight.style.animation = 'none';
                penlight.style.transform = `rotate(${Math.random() * 20 - 10}deg)`;
              }
              
              const color = colors[Math.floor(Math.random() * colors.length)];
              penlight.style.backgroundColor = color;
              
              if (row.distance <= 190) {
                penlight.style.boxShadow = `0 0 8px ${color}`;
              }
              
              audience.appendChild(penlight);
            }
            
            this.gamecontainer.appendChild(audience);
            total++;
          }
        }
      }
      
      if (total > 100) {
        const penlights = document.querySelectorAll('.audience .penlight');
        for (let i = 0; i < penlights.length; i++) {
          if (i % 3 === 0) {
            penlights[i].style.animation = 'none';
            penlights[i].style.transform = `rotate(${Math.random() * 20 - 10}deg)`;
          }
        }
      }
    }
  
    /**
     * リザルト画面を表示
     */
    showResults() {
      if (this.resultsDisplayed) return;
      this.resultsDisplayed = true;
      
      if (this.player?.isPlaying) this.player.requestPause();
      
      this.maxCombo = Math.max(this.maxCombo || 0, this.combo);
      
      let rank = 'C';
      if (this.score >= 10000) rank = 'S';
      else if (this.score >= 8000) rank = 'A';
      else if (this.score >= 6000) rank = 'B';
      
      const resultsScreen = document.getElementById('results-screen');
      document.getElementById('final-score-display').textContent = this.score;
      document.getElementById('final-combo-display').textContent = `最大コンボ: ${this.maxCombo}`;
      document.getElementById('rank-display').textContent = `ランク: ${rank}`;
      
      setTimeout(() => {
        resultsScreen.classList.remove('hidden');
        setTimeout(() => {
          resultsScreen.classList.add('show');
          
          for (let i = 0; i < 15; i++) {
            setTimeout(() => {
              const x = Math.random() * window.innerWidth;
              const y = Math.random() * window.innerHeight;
              this.createShooting(x, y, Math.random() * 10 - 5, Math.random() * 10 - 5);
            }, i * 200);
          }
        }, 100);
      }, 1500);
      
      document.getElementById('back-to-title').addEventListener('click', () => {
        window.location.href = 'index.html';
      });
      
      document.getElementById('replay-song').addEventListener('click', () => {
        resultsScreen.classList.remove('show');
        setTimeout(() => {
          resultsScreen.classList.add('hidden');
          this.restartGame();
          this.resultsDisplayed = false;
        }, 1000);
      });
    }
  
    /**
     * ゲーム終了時のクリーンアップ処理
     */
    cleanup() {
      this.randomTextInterval && clearInterval(this.randomTextInterval);
      this.comboResetTimer && clearInterval(this.comboResetTimer);
      this.mouseTrail.forEach(({element}) => element?.parentNode && element.remove());
      this.mouseTrail = [];
      this.player?.dispose?.();
    }
  }
  
  /**
   * ページ読み込み時にゲームを起動
   */
  window.addEventListener('load', () => setTimeout(() => {
    window.gameManager = new GameManager();
    window.addEventListener('beforeunload', () => window.gameManager?.cleanup());
  }, 100));