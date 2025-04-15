/**
 * 拡張型ゲームマネージャークラス
 * WebGLレンダラーと既存のゲームロジックを統合
 */
class EnhancedGameManager extends GameManager {
    /**
     * 拡張型ゲームマネージャーの初期化
     */
    constructor() {
      // 親クラスのコンストラクタを呼び出し
      super();
      
      // WebGLレンダラーを初期化
      this.initWebGLRenderer();
      
      // 元のエフェクト関数をオーバーライド
      this.originalClickLyric = this.clickLyric;
      this.clickLyric = this.enhancedClickLyric;
    }
    
    /**
     * WebGLレンダラーの初期化
     */
    initWebGLRenderer() {
      // Three.jsのスクリプトが読み込まれているか確認
      if (typeof THREE === 'undefined') {
        console.warn('THREE.js not loaded, loading scripts...');
        this.loadThreeJS(() => {
          this.webglRenderer = new WebGLRenderer(this.gamecontainer);
          console.log('WebGL renderer initialized after script loading');
        });
      } else {
        // WebGLレンダラーを作成
        this.webglRenderer = new WebGLRenderer(this.gamecontainer);
        console.log('WebGL renderer initialized');
      }
    }
    
    /**
     * THREE.jsとその依存関係を動的に読み込む
     * @param {Function} callback - 読み込み完了時のコールバック
     */
    loadThreeJS(callback) {
      // THREE.jsの読み込み
      const threeScript = document.createElement('script');
      threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      threeScript.onload = () => {
        console.log('THREE.js loaded');
        
        // UnrealBloomPassの読み込み
        const bloomScript = document.createElement('script');
        bloomScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.min.js';
        bloomScript.onload = () => {
          console.log('UnrealBloomPass loaded');
          
          // その他の依存関係の読み込み
          const effectComposerScript = document.createElement('script');
          effectComposerScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.min.js';
          effectComposerScript.onload = () => {
            
            const renderPassScript = document.createElement('script');
            renderPassScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.min.js';
            renderPassScript.onload = () => {
              
              const shaderPassScript = document.createElement('script');
              shaderPassScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.min.js';
              shaderPassScript.onload = () => {
                console.log('All THREE.js dependencies loaded');
                callback();
              };
              document.head.appendChild(shaderPassScript);
            };
            document.head.appendChild(renderPassScript);
          };
          document.head.appendChild(effectComposerScript);
        };
        document.head.appendChild(bloomScript);
      };
      document.head.appendChild(threeScript);
    }
    
    /**
     * 音楽再生を開始する拡張メソッド
     * WebGLレンダラーの再生状態も連動
     */
    async playMusic() {
      // 親クラスのメソッドを呼び出し
      await super.playMusic();
      
      // WebGLレンダラーの再生状態を更新
      if (this.webglRenderer) {
        this.webglRenderer.setPlayingState(true);
      }
    }
    
    /**
     * 再生/一時停止を切り替える拡張メソッド
     */
    async togglePlay() {
      // 親クラスのメソッドを呼び出し
      await super.togglePlay();
      
      // WebGLレンダラーの再生状態を更新
      if (this.webglRenderer) {
        this.webglRenderer.setPlayingState(!this.isPaused);
      }
    }
    
    /**
     * ゲームをリスタートする拡張メソッド
     */
    async restartGame() {
      // 親クラスのメソッドを呼び出し
      await super.restartGame();
      
      // WebGLレンダラーの再生状態を更新
      if (this.webglRenderer) {
        this.webglRenderer.setPlayingState(true);
      }
    }
    
    /**
     * 歌詞をクリック/タッチした時の拡張処理
     * WebGLでのエフェクトも連動
     * @param {HTMLElement} element - クリックされた歌詞要素
     */
    enhancedClickLyric(element) {
      // 元のクリック処理を実行
      this.originalClickLyric.call(this, element);
      
      // WebGLエフェクトを追加
      if (this.webglRenderer && element) {
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        
        // WebGLレンダラーのヒットエフェクトを呼び出し
        this.webglRenderer.hitEffect(x, y);
        
        // コンボエフェクトも連動
        this.webglRenderer.comboEffect(this.combo);
      }
    }
    
    /**
     * リソースの解放とクリーンアップの拡張メソッド
     */
    cleanup() {
      // 親クラスのクリーンアップを実行
      super.cleanup();
      
      // WebGLレンダラーのクリーンアップ
      if (this.webglRenderer) {
        this.webglRenderer.dispose();
      }
    }
  }
  
  // 元のGameManagerを拡張型に置き換え
  window.GameManager = EnhancedGameManager;