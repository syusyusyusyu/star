/**
 * WebGLレンダラー - 高度な視覚効果を実装するためのクラス
 * マジカルミライのライブ体験をリアルにするための3Dレンダリングを担当
 */
class WebGLRenderer {
    /**
     * WebGLレンダラーの初期化
     * @param {HTMLElement} container - レンダリング先のコンテナ要素
     */
    constructor(container) {
      // 基本プロパティの設定
      this.container = container;
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.devicePixelRatio = Math.min(window.devicePixelRatio, 2);
      this.time = 0;
      this.isPlaying = false;
      this.paused = true;
      
      // シーン要素
      this.particleSystems = [];
      this.spotlights = [];
      this.penlights = [];
      this.stageBeams = [];
      this.lyricParticles = [];
      
      // 設定
      this.config = {
        stars: {
          count: this.calculateStarCount(),
          size: { min: 1, max: 3 },
          color: new THREE.Color('#ffffff')
        },
        audience: {
          rows: 8,
          density: this.isMobile() ? 0.5 : 1.0,
          colors: [
            new THREE.Color('#39C5BB'), // ミクブルー
            new THREE.Color('#FF69B4'), // ピンク
            new THREE.Color('#FFA500'), // オレンジ
            new THREE.Color('#9370DB'), // 紫
            new THREE.Color('#32CD32'), // 緑
            new THREE.Color('#00BFFF')  // 水色
          ]
        },
        stage: {
          width: 300,
          depth: 200,
          color: new THREE.Color('#39C5BB'),
          emissiveIntensity: 0.8
        },
        postprocessing: {
          enabled: !this.isMobile(),
          bloom: {
            strength: 1.5,
            radius: 0.7,
            threshold: 0.2
          }
        }
      };
      
      // 初期化
      this.init();
      this.createScene();
      this.setupPostprocessing();
      this.addEventListeners();
      
      // アニメーションループ開始
      this.animate();
    }
    
    /**
     * モバイルデバイスかどうかを判定
     * @returns {boolean} モバイルデバイスの場合はtrue
     */
    isMobile() {
      return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    }
    
    /**
     * デバイスに適した星の数を計算
     * @returns {number} 生成する星の数
     */
    calculateStarCount() {
      const base = this.isMobile() ? 1000 : 2000;
      const adjustedCount = Math.floor(base * (window.innerWidth * window.innerHeight) / (1920 * 1080));
      return Math.min(adjustedCount, 3000); // 最大3000個まで
    }
    
    /**
     * WebGLの初期化
     */
    init() {
      // レンダラーの設定
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(this.devicePixelRatio);
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.2;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      
      // キャンバスをコンテナに追加
      this.canvas = this.renderer.domElement;
      this.canvas.classList.add('webgl-canvas');
      this.canvas.style.position = 'absolute';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.zIndex = '1';
      this.container.prepend(this.canvas);
      
      // カメラの設定
      this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 2000);
      this.camera.position.set(0, 150, 400);
      this.camera.lookAt(0, 80, 0);
      
      // シーンの作成
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x090A0F, 0.001);
      
      // ライティングの設定
      this.ambientLight = new THREE.AmbientLight(0x222244, 0.5);
      this.scene.add(this.ambientLight);
      
      // ステージ中央ライト
      this.centerLight = new THREE.PointLight(0x39C5BB, 1, 300);
      this.centerLight.position.set(0, 120, 0);
      this.centerLight.castShadow = true;
      this.centerLight.shadow.mapSize.width = 1024;
      this.centerLight.shadow.mapSize.height = 1024;
      this.centerLight.shadow.camera.near = 0.5;
      this.centerLight.shadow.camera.far = 500;
      this.scene.add(this.centerLight);
      
      // ロード画面を表示
      this.showLoadingScreen();
    }
    
    /**
     * ロード画面の表示
     */
    showLoadingScreen() {
      const loadingManager = new THREE.LoadingManager();
      
      loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
        const progress = (itemsLoaded / itemsTotal) * 100;
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
          loadingElement.textContent = `3Dライブステージをロード中... ${Math.floor(progress)}%`;
        }
      };
      
      loadingManager.onLoad = () => {
        setTimeout(() => {
          const loadingElement = document.getElementById('loading');
          if (loadingElement) {
            loadingElement.textContent = "準備完了 - 下の「再生」ボタンを押してください";
          }
        }, 500);
      };
      
      this.textureLoader = new THREE.TextureLoader(loadingManager);
      this.fontLoader = new THREE.FontLoader(loadingManager);
    }
    
    /**
     * シーン要素の作成
     */
    createScene() {
      this.createStarField();
      this.createStage();
      this.createAudience();
      this.createSpotlights();
      this.createVolumetricLights();
    }
    
    /**
     * 星空の作成
     */
    createStarField() {
      // 背景グラデーションシェーダー
      const skyGeometry = new THREE.PlaneGeometry(2, 2, 1, 1);
      const skyMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uResolution: { value: new THREE.Vector2(this.width, this.height) },
          uColorTop: { value: new THREE.Color('#1B2735') },
          uColorBottom: { value: new THREE.Color('#090A0F') },
          uAccentColor: { value: new THREE.Color('#39C5BB') },
          uAccentIntensity: { value: 0.1 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec2 uResolution;
          uniform vec3 uColorTop;
          uniform vec3 uColorBottom;
          uniform vec3 uAccentColor;
          uniform float uAccentIntensity;
          varying vec2 vUv;
          
          float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
          }
          
          void main() {
            // グラデーション背景
            vec3 color = mix(uColorBottom, uColorTop, vUv.y);
            
            // アクセントカラーのパルス効果
            float pulse = 0.5 + 0.5 * sin(uTime * 0.2);
            vec2 center = vec2(0.8, 0.9);
            float dist = distance(vUv, center);
            float radialGradient = smoothstep(0.8, 0.0, dist);
            color = mix(color, uAccentColor, radialGradient * uAccentIntensity * pulse);
            
            gl_FragColor = vec4(color, 1.0);
          }
        `,
        depthWrite: false,
        depthTest: false
      });
      
      const skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
      skyMesh.renderOrder = -1000;
      this.camera.add(skyMesh);
      this.scene.add(this.camera);
      this.skyMaterial = skyMaterial;
      
      // 3D星空
      const starGeometry = new THREE.BufferGeometry();
      const starPositions = [];
      const starSizes = [];
      const starOpacities = [];
      const starOffsets = [];
      
      const count = this.config.stars.count;
      
      for (let i = 0; i < count; i++) {
        // 球面上に分布
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const radius = 600 + Math.random() * 800;
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        starPositions.push(x, y, z);
        
        // サイズとオパシティをランダムに
        starSizes.push(this.config.stars.size.min + Math.random() * (this.config.stars.size.max - this.config.stars.size.min));
        starOpacities.push(0.3 + Math.random() * 0.7);
        starOffsets.push(Math.random() * Math.PI * 2);
      }
      
      starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
      starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
      starGeometry.setAttribute('opacity', new THREE.Float32BufferAttribute(starOpacities, 1));
      starGeometry.setAttribute('offset', new THREE.Float32BufferAttribute(starOffsets, 1));
      
      // 星のテクスチャをロード
      const starTexture = this.textureLoader.load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDggNzkuMTY0MDM2LCAyMDE5LzA4LzEzLTAxOjA2OjU3ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIzLTAyLTE1VDIxOjM5OjI5KzA5OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMy0wMi0xNVQyMTo0MToyNSswOTowMCIgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyMy0wMi0xNVQyMTo0MToyNSswOTowMCIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJzUkdCIElFQzYxOTY2LTIuMSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDplZDBmYWY4NC1iMzgwLTFlNDQtOWE0NC01MGRiYWJhODFjZmUiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDphMTJiYzlkYi0xNzA5LWY1NDYtYTJkNi05ZDlmZGFkYTA4YTQiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDowMGVkZGI4My05ZDRkLTQ0NDEtYmMwOC1jZDkzZTE5Y2RiMWQiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjAwZWRkYjgzLTlkNGQtNDQ0MS1iYzA4LWNkOTNlMTljZGIxZCIgc3RFdnQ6d2hlbj0iMjAyMy0wMi0xNVQyMTozOToyOSswOTowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTkgKFdpbmRvd3MpIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDplZDBmYWY4NC1iMzgwLTFlNDQtOWE0NC01MGRiYWJhODFjZmUiIHN0RXZ0OndoZW49IjIwMjMtMDItMTVUMjE6NDE6MjUrMDk6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE5IChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6a3J91AAAHJ0lEQVRYw62Xa4xdVRXHf3ufc+89d+68+87QTqfTdlra0hemiAQNoviIxg9qjFFjDFFjYkRM/OIDFTVGIZHEkPCBGEWMRuOnxkR8xKgxKg+RFloKLdOZ6WM67Tye9557ztl7+eG2FNsOpWxykrPP3Xed/1rrf9baa8saRqZcydkAKrN9nZp3/Qj4F2BnPT/6lkx9XSiXt7B9+y2Mj5/kxImTVKtVDhw4wOTkJNdffz3GGEZGRrj66qsZHR1lcnKSyclJrr32Wqanp5mammJqagrvPc1mk2azifee1dVV4jimWCxSLpfJ5/McO3aMer1OtVrl8OHDGGPYsWMHQ0NDDA0NsXv3biYmJti/f/9vgbuAedNut7nzzjuZm5sjiiLiOKZUKp2BvDGGOI4xxmCMoVAoYIyhWCzinCOOY8rlMs45SqUS5XKZarUKQLVapVgsksvlzixrDFEU0Wg0qNfrLCwsUKvVWFlZIY5jdu7cyZ49e7KdO3fyzW9846/GGObn5/nYxz72YGZm5i0bxbZarbK4uMji4iLz8/PMz8/TbDbPeCylpFarEUUR1lo2b95MPp8nCALCMCSKImZmZvDek8vl2LJlCyMjI+zbt4/du3cTRREHDx586IMf/OCnjDHcfvvtbwMOvRTAWrv2Wwhx5ufiOCaKIqIo4uTJkwRBQK/XY2FhgW63S7PZxDmHlJJSqUSr1aLT6VCr1SgUCtRqNXK5HCsrKygK/Od736Pb7VIqlZienianNUuLixw4cOCsMeacNhqNaDabJEny/7qVZRlZltHv989pExsbP7b01/Y1JW3yqFzn1c+9YafRejSnBKNSMqolWyiwLjPMJGWmXcJKBj0r8MaglCJJkgsT4Jz7b2vDMCTLMsQFpP3S+e/d/Ux6+6Otzr3rnQVVAEkJHMoH00sS9eRiyH9qUd+hTUCjZ4nzkPmN4bfW2gvbAd/9LsjT3Pa1pfbIB5JUnhdqTVYVQWcCowXOK5wBJxw5I5BSoIUg8hZtFT9LYq5QZe6aw5xJRlNI6eGMpfxSAN37N6Lw23zy4Ug9fP9qBFqANRInJM5J0kxhhMJaiRcS5wVGS3qxIEsVIgHH+dIuX0n+QK5njj0XcYF58IBt3kBQOslDT9VJM48SAi0h0YJeJmg7RWw0vaQffpEIogzaGXQSwD6GGP/YFh6rVw5yy62HCYXEWot4kYDj3Y+zefBR7ntumCzJkBJ0kNGVipm+oJdqVCbo9iRpJggiTeQESarQPUGgLQ0rMUM52mZs6MlRW9ZfR9vXoeInnvdoRFtdH5/47pAuPsWxpYKv+BqjujzmHBiBlYJeprGtlG7qSDJBnEn6maCdCrJMkDqBEuAJAOgbW3/JJg2eTrePRxU+LkzjLNQtV27a0N/dVN0/OkluLMtIvUMLiXMgpUUKg5UKJQVWCLRSOCFQUnLOoOGxgN/gYCYFzlHIKVzXgNWAHbC7JTB9g+8asizFe48QAuklXnhEKrFekAmPEx7vPcYZjLNYZ1lLGLkuJN5jpUNIT4oFD0p4rLcoJZFSokWMtw5BjEJAIDF9Q5YZvPcb4yA9eO+xziGExzmHtRZnLcYYnLNkWYZ1Fm8t3oOzDmMsQoCzDus8WZrQaLVpJ5Y08yiZRwQaFUicNyglyKXgLNYYrDVnPPfO4ZzDWos1BmstzjmQHmILyiGkwcqIbpySZR4hFYHWKKWQMo+Qmmw1Jg4V7bFpYiWJewlCCLzzOO9JM0svyTDW4YVCKUVnaoZs8SSJ83jrybzECIUQFiE8eJCJRabJWtE55M03Ud06hQg9xkVEkSKf0+QCQaC/QJ6kzHUNSSKQIsRaS5ZlLLW7NJOUVJaY62e0VyOSOMaYhDTJSDLLarvL/GKTVreP8AqEREjw3uOcIzOGJE0JsrRBd57RK97M9OG/UihECAHCe4SCQAuUsihpcE5vDKVoQD7qy7jOvF9h/uQijdVFGq0+zVabxWaLdpwQpyk9Y+j0IzKviSOBlJpCSTA+vIuV9iqjo2OEQYgXDuc93jsyY0gyQ5AljcnrrvPbx67ATYH2ilwg0F6SmQyVbwEK7zxuYyJ5IchXKowMV6hUBhjaNEShUmSwWCCnFSgYLA8QaEUYBIRBgERQKBSYuPm9HFo4yvFb3o2IFEKCs5a97z2KfvwRRHlgK9v270W4AcQ8SEhTj8BgiNHqfxoIAcbaDb+FQCCQUhCGAVprlFJore8VQnD55bv8Aw/8wv/lL38mjpZB5pF7PsB1Bx/C5ctltr/rFtKL34BZqSEbx1lQr+HY5Jt4a/xDQEBYnlgfsz2gPVLNEwQ63yjOWgjh2LZtm5+b+50/8vQj/rHHH/VR9yQstTFXXskVb3iDH9i+E/vc0/j8ADY/8grZbO+XmBDrRpYAVqZhLkLlBWLjCwpCeEqlom82/unT5nE/OzPtT50c9yNbx/yWLSOel0o+P2l0Ll/2USvyp/7xDz82Wfdzx4/7TjtO/wPF0/Es6hWc9QAAAABJRU5ErkJggg==');
      
      // 星を描画するシェーダー
      const starMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uTexture: { value: starTexture },
          uColor: { value: this.config.stars.color }
        },
        vertexShader: `
          attribute float size;
          attribute float opacity;
          attribute float offset;
          uniform float uTime;
          varying float vOpacity;
          
          void main() {
            vOpacity = opacity * (0.5 + 0.5 * sin(uTime * 0.5 + offset));
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform sampler2D uTexture;
          uniform vec3 uColor;
          varying float vOpacity;
          
          void main() {
            vec4 texColor = texture2D(uTexture, gl_PointCoord);
            gl_FragColor = vec4(uColor, vOpacity) * texColor;
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      
      this.starPoints = new THREE.Points(starGeometry, starMaterial);
      this.starPoints.renderOrder = -990;
      this.scene.add(this.starPoints);
      this.starMaterial = starMaterial;
    }
    
    /**
     * ステージの作成
     */
    createStage() {
      // ステージ床
      const stageGeometry = new THREE.CylinderGeometry(
        this.config.stage.width / 2, 
        this.config.stage.width / 2 + 30, 
        20, 
        32, 
        1, 
        false, 
        0, 
        Math.PI
      );
      
      const stageMaterial = new THREE.MeshStandardMaterial({
        color: this.config.stage.color,
        emissive: this.config.stage.color,
        emissiveIntensity: this.config.stage.emissiveIntensity,
        metalness: 0.7,
        roughness: 0.3
      });
      
      const stageMesh = new THREE.Mesh(stageGeometry, stageMaterial);
      stageMesh.position.set(0, -10, 0);
      stageMesh.rotation.x = Math.PI;
      stageMesh.receiveShadow = true;
      this.scene.add(stageMesh);
      this.stageMesh = stageMesh;
      
      // 床のピカピカ光るライン
      const lineGeometry = new THREE.RingGeometry(
        this.config.stage.width / 2 - 5, 
        this.config.stage.width / 2, 
        64, 
        1, 
        0, 
        Math.PI
      );
      
      const lineMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color('#39C5BB') }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uColor;
          varying vec2 vUv;
          
          void main() {
            float intensity = 0.6 + 0.4 * sin(uTime * 2.0 + vUv.x * 10.0);
            vec3 color = uColor * intensity;
            gl_FragColor = vec4(color, 1.0);
          }
        `,
        side: THREE.DoubleSide,
        transparent: true
      });
      
      const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
      lineMesh.position.set(0, -9.9, 0);
      lineMesh.rotation.x = -Math.PI / 2;
      lineMesh.rotation.z = Math.PI;
      this.scene.add(lineMesh);
      this.lineMaterial = lineMaterial;
      
      // ステージセンターに光る円柱（ミクの立ち位置）
      const centerGeometry = new THREE.CylinderGeometry(30, 30, 0.5, 32);
      const centerMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color('#39C5BB') }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uColor;
          varying vec2 vUv;
          
          void main() {
            float dist = distance(vUv, vec2(0.5, 0.5));
            float ring = smoothstep(0.4, 0.5, dist) * smoothstep(0.6, 0.5, dist);
            float pulse = 0.5 + 0.5 * sin(uTime * 3.0);
            
            vec3 color = uColor * (ring * pulse + 0.5);
            gl_FragColor = vec4(color, 0.7);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide
      });
      
      const centerMesh = new THREE.Mesh(centerGeometry, centerMaterial);
      centerMesh.position.set(0, -9.5, 0);
      this.scene.add(centerMesh);
      this.centerMaterial = centerMaterial;
    }
    
    /**
     * 観客（ペンライト）の作成
     */
    createAudience() {
      // 観客配置の行ごとの設定
      const rows = [
        { distance: 170, count: 20, scale: 0.9, height: 0 },
        { distance: 230, count: 30, scale: 0.85, height: 15 },
        { distance: 290, count: 40, scale: 0.8, height: 30 },
        { distance: 350, count: 50, scale: 0.75, height: 45 },
        { distance: 410, count: 60, scale: 0.7, height: 60 },
        { distance: 470, count: 70, scale: 0.65, height: 75 },
        { distance: 530, count: 80, scale: 0.6, height: 90 },
        { distance: 590, count: 90, scale: 0.55, height: 105 }
      ];
      
      // ペンライトのマテリアル
      const penlightCore = new THREE.CylinderGeometry(1, 1, 20, 6);
      const penlightTip = new THREE.SphereGeometry(1.5, 8, 8);
      
      // ペンライトのインスタンス管理用
      this.penlightInstances = [];
      
      // 各行ごとに観客配置
      for (const row of rows) {
        // モバイルデバイスでは密度を下げる
        const density = this.config.audience.density;
        const count = Math.floor(row.count * density);
        const step = 2 * Math.PI / count;
        
        for (let i = 0; i < count; i++) {
          if (Math.random() > density) continue; // ランダムにスキップして密度調整
          
          // 円形に配置（楕円を形成）
          const angle = step * i + Math.random() * step * 0.5;
          const radius = row.distance + Math.random() * 20;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          const y = -10 + row.height + Math.random() * 10;
          
          // 人のシルエット（簡易的な表現）
          if (Math.random() > 0.7 || row.distance <= 290) {
            // ペンライトの色をランダムに選択
            const colorIndex = Math.floor(Math.random() * this.config.audience.colors.length);
            const color = this.config.audience.colors[colorIndex];
            
            // 揺れの周期をランダムに
            const speed = 0.5 + Math.random() * 1.5;
            const offset = Math.random() * Math.PI * 2;
            const amplitude = 0.2 + Math.random() * 0.3;
            
            // ペンライトのマテリアル
            const penlightMaterial = new THREE.MeshStandardMaterial({
              color: color,
              emissive: color,
              emissiveIntensity: 1.0,
              transparent: true,
              opacity: 0.9
            });
            
            // ペンライトの作成
            const penlightGroup = new THREE.Group();
            
            const core = new THREE.Mesh(penlightCore, penlightMaterial);
            core.position.y = 10;
            penlightGroup.add(core);
            
            const tip = new THREE.Mesh(penlightTip, penlightMaterial);
            tip.position.y = 20;
            penlightGroup.add(tip);
            
            // 光のエフェクト
            const light = new THREE.PointLight(color, 0.5, 30);
            light.position.y = 20;
            penlightGroup.add(light);
            
            // 位置と回転
            penlightGroup.position.set(x, y, z);
            penlightGroup.scale.multiplyScalar(row.scale);
            
            // 中心に向ける
            penlightGroup.lookAt(0, 50, 0);
            
            // アニメーション用のデータを保存
            this.penlightInstances.push({
              mesh: penlightGroup,
              speed: speed,
              offset: offset,
              amplitude: amplitude,
              baseRotation: new THREE.Euler().copy(penlightGroup.rotation)
            });
            
            this.scene.add(penlightGroup);
          } else {
            // 後ろの観客は簡易表現（パフォーマンス対策）
            const personGeometry = new THREE.BoxGeometry(5, 15, 5);
            const personMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
            const person = new THREE.Mesh(personGeometry, personMaterial);
            person.position.set(x, y - 5, z);
            person.scale.multiplyScalar(row.scale);
            this.scene.add(person);
          }
        }
      }
    }
    
    /**
     * スポットライトの作成
     */
    createSpotlights() {
      // スポットライトの設定
      const spotlightPositions = [
        { x: -150, y: 200, z: 150, color: 0x39C5BB, angle: Math.PI / 6 },
        { x: 150, y: 200, z: 150, color: 0xFF69B4, angle: Math.PI / 6 },
        { x: 0, y: 200, z: -200, color: 0xFFA500, angle: Math.PI / 6 }
      ];
      
      // スポットライト用のシェーダーマテリアル
      const spotlightMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0xFFFFFF) },
          uIntensity: { value: 0.5 }
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vPosition;
          
          void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uColor;
          uniform float uIntensity;
          varying vec2 vUv;
          varying vec3 vPosition;
          
          void main() {
            float dist = length(vUv - vec2(0.5));
            float alpha = smoothstep(0.5, 0.0, dist);
            
            // 時間変化する強度
            float intensity = uIntensity * (0.7 + 0.3 * sin(uTime * 0.5));
            
            // 光の揺らぎ効果
            float noise = sin(vPosition.x * 0.1 + uTime) * sin(vPosition.z * 0.1 + uTime * 0.7) * 0.1;
            
            gl_FragColor = vec4(uColor, (alpha + noise) * intensity);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      
      // 各スポットライトを作成
      for (const spotConfig of spotlightPositions) {
        // スポットライトのコーン形状
        const height = 300;
        const radiusTop = 10;
        const radiusBottom = Math.tan(spotConfig.angle) * height;
        
        const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 32, 5, true);
        geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, -height / 2, 0));
        geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI));
        
        // マテリアルをクローンして色を設定
        const material = spotlightMaterial.clone();
        material.uniforms.uColor.value = new THREE.Color(spotConfig.color);
        
        const spotlight = new THREE.Mesh(geometry, material);
        spotlight.position.set(spotConfig.x, spotConfig.y, spotConfig.z);
        spotlight.lookAt(0, 0, 0);
        
        // アニメーションプロパティを保存
        this.spotlights.push({
          mesh: spotlight,
          material: material,
          basePosition: new THREE.Vector3(spotConfig.x, spotConfig.y, spotConfig.z),
          baseRotation: new THREE.Euler().copy(spotlight.rotation),
          speed: 0.3 + Math.random() * 0.5,
          amplitude: 0.05 + Math.random() * 0.1,
          offset: Math.random() * Math.PI * 2
        });
        
        this.scene.add(spotlight);
        
        // 光源も追加
        const light = new THREE.SpotLight(spotConfig.color, 2, 1000, spotConfig.angle, 0.5, 2);
        light.position.copy(spotlight.position);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        this.scene.add(light);
        this.scene.add(light.target);
      }
    }
    
    /**
     * ボリューメトリックライト（空気中の光のビーム）作成
     */
    createVolumetricLights() {
      // ボリューメトリックライトのシェーダー
      const volumetricMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0x39C5BB) },
          uNoiseIntensity: { value: 0.15 },
          uIntensity: { value: 0.5 }
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vPosition;
          
          void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uColor;
          uniform float uNoiseIntensity;
          uniform float uIntensity;
          varying vec2 vUv;
          varying vec3 vPosition;
          
          // Simple noise function
          float noise(vec3 p) {
            return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
          }
          
          void main() {
            // ボリューメトリックライトの効果を作成
            float dist = length(vUv - vec2(0.5));
            float radialGradient = smoothstep(0.5, 0.0, dist);
            
            // 光線の中をパーティクルが漂うようなノイズを追加
            float noiseVal = noise(vec3(vPosition.xyz * 0.02 + uTime * 0.1));
            float dustEffect = smoothstep(0.3, 0.7, noiseVal) * uNoiseIntensity;
            
            // 時間変化する強度
            float timeVary = 0.7 + 0.3 * sin(uTime * 0.2);
            
            // 最終的な色と透明度
            vec3 finalColor = uColor * (uIntensity * timeVary);
            float alpha = (radialGradient + dustEffect) * uIntensity * timeVary;
            
            gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      
      // ステージ中央から放射するライトビーム
      const beamCount = 8;
      const angleStep = (Math.PI * 2) / beamCount;
      
      for (let i = 0; i < beamCount; i++) {
        const angle = angleStep * i;
        const height = 500;
        const width = 30 + Math.random() * 20;
        
        // 光のビームのジオメトリ
        const geometry = new THREE.PlaneGeometry(width, height);
        geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, height / 2, 0));
        
        // マテリアルをクローンして色をランダムに
        const material = volumetricMaterial.clone();
        const hue = (i / beamCount) * 0.3 + 0.5; // 水色〜緑色〜ピンク
        material.uniforms.uColor.value.setHSL(hue, 0.8, 0.5);
        material.uniforms.uIntensity.value = 0.3 + Math.random() * 0.3;
        
        const beam = new THREE.Mesh(geometry, material);
        beam.position.set(0, 0, 0);
        beam.rotation.y = angle;
        
        // アニメーション用のプロパティを保存
        this.stageBeams.push({
          mesh: beam,
          material: material,
          baseRotation: beam.rotation.y,
          speed: 0.2 + Math.random() * 0.3,
          offset: Math.random() * Math.PI * 2
        });
        
        this.scene.add(beam);
      }
    }
    
    /**
     * ポストプロセッシングのセットアップ
     */
    setupPostprocessing() {
      if (!this.config.postprocessing.enabled) return;
      
      // コンポーザーを作成
      this.composer = new THREE.EffectComposer(this.renderer);
      
      // レンダーパスを追加
      const renderPass = new THREE.RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);
      
      // アンリアルブルーム効果を追加
      const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(this.width, this.height),
        this.config.postprocessing.bloom.strength,
        this.config.postprocessing.bloom.radius,
        this.config.postprocessing.bloom.threshold
      );
      this.composer.addPass(bloomPass);
      this.bloomPass = bloomPass;
      
      // シェーダーパスでカラーグレーディングとビネットを追加
      const finalShader = {
        uniforms: {
          tDiffuse: { value: null },
          uTime: { value: 0 },
          uVignetteIntensity: { value: 1.5 },
          uSaturation: { value: 1.1 },
          uBrightness: { value: 1.05 },
          uContrast: { value: 1.05 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform float uTime;
          uniform float uVignetteIntensity;
          uniform float uSaturation;
          uniform float uBrightness;
          uniform float uContrast;
          varying vec2 vUv;
          
          // 色をHSLからRGBに変換
          vec3 hsl2rgb(vec3 c) {
            vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0);
            return c.z + c.y * (rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
          }
          
          // 色をRGBからHSLに変換
          vec3 rgb2hsl(vec3 c) {
            float h = 0.0;
            float s = 0.0;
            float l = 0.0;
            float r = c.r;
            float g = c.g;
            float b = c.b;
            float cMin = min(r, min(g, b));
            float cMax = max(r, max(g, b));
            
            l = (cMax + cMin) / 2.0;
            if (cMax > cMin) {
              float cDelta = cMax - cMin;
              
              s = l < 0.5 ? cDelta / (cMax + cMin) : cDelta / (2.0 - cMax - cMin);
              
              if (r == cMax) {
                h = (g - b) / cDelta + (g < b ? 6.0 : 0.0);
              } else if (g == cMax) {
                h = (b - r) / cDelta + 2.0;
              } else {
                h = (r - g) / cDelta + 4.0;
              }
              h /= 6.0;
            }
            return vec3(h, s, l);
          }
          
          void main() {
            // テクスチャから色を取得
            vec4 texColor = texture2D(tDiffuse, vUv);
            
            // ビネット効果（周辺を暗くする）
            vec2 uv = vUv * 2.0 - 1.0;
            float vignetteAmount = uVignetteIntensity * length(uv);
            texColor.rgb *= 1.0 - vignetteAmount * 0.5;
            
            // 色調補正
            // コントラスト
            texColor.rgb = (texColor.rgb - 0.5) * uContrast + 0.5;
            
            // 輝度
            texColor.rgb *= uBrightness;
            
            // 彩度
            vec3 hsl = rgb2hsl(texColor.rgb);
            hsl.y *= uSaturation;
            texColor.rgb = hsl2rgb(hsl);
            
            // パルス効果（微妙な色の変化）
            float pulse = 0.05 * sin(uTime * 0.2);
            texColor.rgb += pulse * vec3(0.1, 0.2, 0.3);
            
            gl_FragColor = texColor;
          }
        `
      };
      
      const finalPass = new THREE.ShaderPass(finalShader);
      finalPass.renderToScreen = true;
      this.composer.addPass(finalPass);
      this.finalPass = finalPass;
    }
    
    /**
     * イベントリスナーのセットアップ
     */
    addEventListeners() {
      // リサイズイベント
      window.addEventListener('resize', this.onResize.bind(this));
      
      // カメラシェイク効果用の設定
      this.cameraShake = {
        intensity: 0,
        decay: 0.9,
        offset: new THREE.Vector3(),
        originalPosition: new THREE.Vector3().copy(this.camera.position)
      };
    }
    
    /**
     * リサイズ処理
     */
    onResize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      
      this.renderer.setSize(this.width, this.height);
      if (this.composer) {
        this.composer.setSize(this.width, this.height);
      }
      
      // ユニフォーム変数のリサイズ対応
      if (this.skyMaterial) {
        this.skyMaterial.uniforms.uResolution.value.set(this.width, this.height);
      }
    }
    
    /**
     * カメラシェイク効果の適用
     * @param {number} intensity - シェイクの強度
     */
    applyCameraShake(intensity = 1.0) {
      this.cameraShake.intensity = Math.min(4.0, this.cameraShake.intensity + intensity);
    }
    
    /**
     * 歌詞を取った時のパーティクル効果
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {number} z - Z座標（省略可）
     */
    createLyricHitEffect(x, y, z = 0) {
      if (this.paused) return;
      
      // スクリーン座標からワールド座標に変換
      const vector = new THREE.Vector3(
        (x / window.innerWidth) * 2 - 1,
        -(y / window.innerHeight) * 2 + 1,
        0.5
      );
      
      vector.unproject(this.camera);
      const dir = vector.sub(this.camera.position).normalize();
      const distance = -this.camera.position.z / dir.z;
      const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));
      
      // パーティクルシステムを作成
      const particleCount = this.isMobile() ? 15 : 30;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const scales = new Float32Array(particleCount);
      const colors = new Float32Array(particleCount * 3);
      
      const color = new THREE.Color(0x39C5BB);
      
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
        
        scales[i] = Math.random() * 15 + 5;
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      // パーティクルのシェーダーマテリアル
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uTexture: { value: this.textureLoader.load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAA+UlEQVRYR+2XQQ6CMBBFfy+gnoHEhBUr9RB6A+MdJJh4BxJXnAFXHkFWrNAzCKnpJARrCm1DCjF0V22n/fOmM9MhQCdOe5+7Vbm+AcbC6J0BRyABkPDeALh1RFIANSTWsC2ePksAx77lGEQG4oaxVwaUfkwOzRNw7wuAXTmfdbXzLwBT3wJ5AjwvqZJlF8RIAf8GQDcqgynIu15nCnPp+r8FcND8YQq2mtDHBKDqX+sDYp3QBjDlL3JAHO5Zu97iOMzAU7W3BLXrXXqABo3oeF6NiP1Kx3PpBuTpUyE+ztSMQWdAKxrOBqXhANBxPVcGyoRRGGVETxyb+gEBiD8+hRu94AAAAABJRU5ErkJggg==') }
        },
        vertexShader: `
          attribute float scale;
          attribute vec3 color;
          uniform float uTime;
          varying vec3 vColor;
          
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = scale * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform sampler2D uTexture;
          varying vec3 vColor;
          
          void main() {
            vec4 texColor = texture2D(uTexture, gl_PointCoord);
            if (texColor.a < 0.1) discard;
            gl_FragColor = vec4(vColor, 1.0) * texColor;
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      
      const particleSystem = new THREE.Points(geometry, material);
      this.scene.add(particleSystem);
      
      // パーティクルのアニメーションデータ
      const velocities = [];
      for (let i = 0; i < particleCount; i++) {
        velocities.push({
          x: (Math.random() - 0.5) * 5,
          y: (Math.random() - 0.5) * 5,
          z: (Math.random() - 0.5) * 5
        });
      }
      
      this.lyricParticles.push({
        system: particleSystem,
        velocities: velocities,
        geometry: geometry,
        material: material,
        time: 0,
        duration: 1.0
      });
      
      // カメラシェイクを適用
      this.applyCameraShake(0.5);
    }
    
    /**
     * パーティクルシステムの更新
     * @param {number} deltaTime - 前フレームからの経過時間
     */
    updateParticles(deltaTime) {
      // 歌詞ヒットエフェクトのパーティクル更新
      for (let i = this.lyricParticles.length - 1; i >= 0; i--) {
        const particles = this.lyricParticles[i];
        particles.time += deltaTime;
        
        // 寿命チェック
        if (particles.time >= particles.duration) {
          this.scene.remove(particles.system);
          particles.geometry.dispose();
          particles.material.dispose();
          this.lyricParticles.splice(i, 1);
          continue;
        }
        
        // パーティクルの位置を更新
        const positions = particles.geometry.attributes.position.array;
        const velocities = particles.velocities;
        const lifePercent = particles.time / particles.duration;
        
        for (let j = 0; j < velocities.length; j++) {
          // 位置を更新
          positions[j * 3] += velocities[j].x * deltaTime * (1 - lifePercent);
          positions[j * 3 + 1] += velocities[j].y * deltaTime * (1 - lifePercent);
          positions[j * 3 + 2] += velocities[j].z * deltaTime * (1 - lifePercent);
          
          // 重力効果
          velocities[j].y -= deltaTime * 2;
        }
        
        particles.geometry.attributes.position.needsUpdate = true;
        
        // サイズと透明度のフェードアウト
        const scales = particles.geometry.attributes.scale.array;
        for (let j = 0; j < scales.length; j++) {
          scales[j] *= (1 - deltaTime * 0.5);
        }
        particles.geometry.attributes.scale.needsUpdate = true;
      }
    }
    
    /**
     * ウェーブエフェクトの生成
     * 観客のウェーブやペンライトの動きの同期
     */
    triggerWave() {
      if (this.penlightInstances.length === 0 || this.paused) return;
      
      const waveDelay = 0.05; // 遅延時間（秒）
      
      // 各ペンライトにウェーブ効果のフラグを設定
      for (let i = 0; i < this.penlightInstances.length; i++) {
        const penlight = this.penlightInstances[i];
        
        // X座標に応じた遅延
        const x = penlight.mesh.position.x;
        const delayTime = Math.abs(x) * waveDelay;
        
        setTimeout(() => {
          penlight.waveActive = true;
          penlight.waveTime = 0;
          
          // 2秒後にウェーブ効果を終了
          setTimeout(() => {
            penlight.waveActive = false;
          }, 2000);
        }, delayTime * 1000);
      }
    }
    
    /**
     * ペンライトの更新
     * @param {number} deltaTime - 前フレームからの経過時間
     */
    updatePenlights(deltaTime) {
      for (const penlight of this.penlightInstances) {
        // 通常の揺れアニメーション
        const time = this.time * penlight.speed + penlight.offset;
        const newRotationX = penlight.baseRotation.x + Math.sin(time) * penlight.amplitude;
        const newRotationZ = penlight.baseRotation.z + Math.cos(time * 1.3) * penlight.amplitude;
        
        // ウェーブ効果が有効な場合
        if (penlight.waveActive) {
          penlight.waveTime += deltaTime;
          const wavePhase = Math.min(penlight.waveTime * 5, Math.PI);
          const waveAmount = Math.sin(wavePhase) * 0.5;
          
          penlight.mesh.rotation.x = newRotationX + waveAmount;
          penlight.mesh.rotation.z = newRotationZ + waveAmount * 0.5;
        } else {
          penlight.mesh.rotation.x = newRotationX;
          penlight.mesh.rotation.z = newRotationZ;
        }
      }
    }
    
    /**
     * スポットライトの更新
     * @param {number} deltaTime - 前フレームからの経過時間
     */
    updateSpotlights(deltaTime) {
      for (const spotlight of this.spotlights) {
        const time = this.time * spotlight.speed + spotlight.offset;
        
        // スポットライトの揺れ
        const rotX = spotlight.baseRotation.x + Math.sin(time) * spotlight.amplitude;
        const rotY = spotlight.baseRotation.y + Math.cos(time * 0.7) * spotlight.amplitude;
        const rotZ = spotlight.baseRotation.z + Math.sin(time * 1.3) * spotlight.amplitude * 0.5;
        
        spotlight.mesh.rotation.set(rotX, rotY, rotZ);
        
        // マテリアルのユニフォーム変数を更新
        spotlight.material.uniforms.uTime.value = this.time;
      }
    }
    
    /**
     * ステージの光線効果更新
     * @param {number} deltaTime - 前フレームからの経過時間
     */
    updateStageBeams(deltaTime) {
      for (const beam of this.stageBeams) {
        const time = this.time * beam.speed + beam.offset;
        
        // 回転アニメーション
        const newRotationY = beam.baseRotation + Math.sin(time) * 0.1;
        beam.mesh.rotation.y = newRotationY;
        
        // マテリアルのユニフォーム変数を更新
        beam.material.uniforms.uTime.value = this.time;
      }
    }
    
    /**
     * カメラの更新
     * @param {number} deltaTime - 前フレームからの経過時間
     */
    updateCamera(deltaTime) {
      // カメラシェイク効果の更新
      if (this.cameraShake.intensity > 0.001) {
        this.cameraShake.intensity *= this.cameraShake.decay;
        
        // ランダムな揺れ
        this.cameraShake.offset.set(
          (Math.random() - 0.5) * this.cameraShake.intensity,
          (Math.random() - 0.5) * this.cameraShake.intensity,
          0
        );
        
        // カメラ位置に適用
        this.camera.position.copy(this.cameraShake.originalPosition).add(this.cameraShake.offset);
      } else if (this.cameraShake.intensity > 0) {
        // 揺れが小さくなったら元の位置に戻す
        this.cameraShake.intensity = 0;
        this.camera.position.copy(this.cameraShake.originalPosition);
      }
      
      // カメラの微妙な動き（ライブ感を出す）
      if (!this.paused) {
        const time = this.time * 0.3;
        const cameraX = Math.sin(time * 0.5) * 5;
        const cameraY = Math.cos(time * 0.4) * 3 + 150;
        
        // 元の位置を基準にした緩やかな動き
        this.camera.position.x = this.cameraShake.originalPosition.x + cameraX + this.cameraShake.offset.x;
        this.camera.position.y = this.cameraShake.originalPosition.y + cameraY + this.cameraShake.offset.y;
        
        // 常にステージの中心を見る
        this.camera.lookAt(0, 80, 0);
      }
    }
    
    /**
     * レンダリングのアニメーションループ
     */
    animate() {
      requestAnimationFrame(this.animate.bind(this));
      
      const now = Date.now() / 1000;
      const deltaTime = Math.min(0.1, now - (this.lastTime || now));
      this.lastTime = now;
      
      if (!this.paused) {
        this.time += deltaTime;
      }
      
      // 各ユニフォーム変数を更新
      this.updateUniforms();
      
      // 各種エフェクトの更新
      this.updateParticles(deltaTime);
      this.updatePenlights(deltaTime);
      this.updateSpotlights(deltaTime);
      this.updateStageBeams(deltaTime);
      this.updateCamera(deltaTime);
      
      // レンダリング
      if (this.composer && this.config.postprocessing.enabled) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    }
    
    /**
     * シェーダーのユニフォーム変数を更新
     */
    updateUniforms() {
      // 背景シェーダー
      if (this.skyMaterial) {
        this.skyMaterial.uniforms.uTime.value = this.time;
      }
      
      // 星空シェーダー
      if (this.starMaterial) {
        this.starMaterial.uniforms.uTime.value = this.time;
      }
      
      // ステージのライン
      if (this.lineMaterial) {
        this.lineMaterial.uniforms.uTime.value = this.time;
      }
      
      // ステージ中央の円
      if (this.centerMaterial) {
        this.centerMaterial.uniforms.uTime.value = this.time;
      }
      
      // ポストプロセッシングシェーダー
      if (this.finalPass) {
        this.finalPass.uniforms.uTime.value = this.time;
      }
    }
    
    /**
     * 再生状態の切り替え
     * @param {boolean} isPlaying - 再生中かどうか
     */
    setPlayingState(isPlaying) {
      this.isPlaying = isPlaying;
      this.paused = !isPlaying;
      
      // ブルームの強度を再生状態に応じて調整
      if (this.bloomPass) {
        this.bloomPass.strength = isPlaying ? 
          this.config.postprocessing.bloom.strength : 
          this.config.postprocessing.bloom.strength * 0.5;
      }
      
      // 中央の光の強さを調整
      if (this.centerLight) {
        this.centerLight.intensity = isPlaying ? 1.0 : 0.5;
      }
    }
    
    /**
     * ヒットエフェクトへの参照関数
     * GameManagerから呼び出される
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    hitEffect(x, y) {
      this.createLyricHitEffect(x, y);
    }
    
    /**
     * コンボエフェクトへの参照関数
     * @param {number} combo - 現在のコンボ数
     */
    comboEffect(combo) {
      // 一定コンボ数でウェーブエフェクトを発生
      if (combo % 10 === 0 && combo > 0) {
        this.triggerWave();
        
        // 強いコンボでカメラシェイク
        if (combo % 50 === 0) {
          this.applyCameraShake(1.5);
        } else if (combo % 20 === 0) {
          this.applyCameraShake(0.8);
        }
      }
    }
    
    /**
     * リソースの解放とクリーンアップ
     */
    dispose() {
      // イベントリスナーの削除
      window.removeEventListener('resize', this.onResize);
      
      // 各種リソースの破棄
      this.scene.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => this.disposeMaterial(material));
          } else {
            this.disposeMaterial(object.material);
          }
        }
      });
      
      // レンダラーの破棄
      if (this.renderer) {
        this.renderer.dispose();
        this.canvas.remove();
      }
      
      // コンポーザーの破棄
      if (this.composer) {
        this.composer.renderTarget1.dispose();
        this.composer.renderTarget2.dispose();
      }
    }
    
    /**
     * マテリアルのリソース解放ヘルパー
     * @param {THREE.Material} material - 破棄するマテリアル
     */
    disposeMaterial(material) {
      for (const key in material) {
        const value = material[key];
        if (value && typeof value.dispose === 'function') {
          value.dispose();
        }
      }
      material.dispose();
    }
  }