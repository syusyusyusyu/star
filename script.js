/**
 * Miku Network 
 */

// ===== 定数定義 =====
const Constants = {
    SONGS_DATA: [
        { 
            id: 1, 
            title: "ストリートライト", 
            artist: "加賀(ネギシャワーP)", 
            apiToken: "HmfsoBVch26BmLCm", 
            songUrl: "https://piapro.jp/t/ULcJ/20250205120202",
            beatId: 4694275,
            chordId: 2830730,
            repetitiveSegmentId: 2946478,
            lyricId: 67810,
            lyricDiffId: 20654
        },
        { 
            id: 2, 
            title: "アリフレーション", 
            artist: "雨良 Amala", 
            apiToken: "rdja5JxMEtcYmyKP", 
            songUrl: "https://piapro.jp/t/SuQO/20250127235813",
            beatId: 4694276,
            chordId: 2830731,
            repetitiveSegmentId: 2946479,
            lyricId: 67811,
            lyricDiffId: 20655
        },
        { 
            id: 3, 
            title: "インフォーマルダイブ", 
            artist: "99piano", 
            apiToken: "CqbpJNJHwoGvXhlD", 
            songUrl: "https://piapro.jp/t/Ppc9/20241224135843",
            beatId: 4694277,
            chordId: 2830732,
            repetitiveSegmentId: 2946480,
            lyricId: 67812,
            lyricDiffId: 20656
        },
        { 
            id: 4, 
            title: "ハローフェルミ。", 
            artist: "ど～ぱみん", 
            apiToken: "o1B1ZygOqyhK5B3D", 
            songUrl: "https://piapro.jp/t/oTaJ/20250204234235",
            beatId: 4694278,
            chordId: 2830733,
            repetitiveSegmentId: 2946481,
            lyricId: 67813,
            lyricDiffId: 20657
        },
        { 
            id: 5, 
            title: "パレードレコード", 
            artist: "きさら", 
            apiToken: "G8MU8Wf87RotH8OR", 
            songUrl: "https://piapro.jp/t/GCgy/20250202202635",
            beatId: 4694279,
            chordId: 2830734,
            repetitiveSegmentId: 2946482,
            lyricId: 67814,
            lyricDiffId: 20658
        },
        { 
            id: 6, 
            title: "ロンリーラン", 
            artist: "海風太陽", 
            apiToken: "fI0SyBEEBzlB2f5C", 
            songUrl: "https://piapro.jp/t/CyPO/20250128183915",
            beatId: 4694280,
            chordId: 2830735,
            repetitiveSegmentId: 2946483,
            lyricId: 67815,
            lyricDiffId: 20659
        }
    ],
    
    DESTINATION_DECORATIONS: {
        A: {
            images: ['./images/32DCE92A-2B24-450E-A5A5-4436CBFED2E9.png'],
            position: { x: 50, y: 75 },
            zIndex: -1,
            responsive: true,
            baseSize: { width: 600, height: 600 }
        },
        B: {
            images: ['./images/96264743-DD75-4440-90C7-B98002205897.png'],
            position: { x: 50, y: 75 },
            zIndex: -1,
            responsive: true,
            baseSize: { width: 600, height: 600 }
        },
        C: {
            images: ['./images/0AF919FC-E312-4961-831C-B99CBA6AA4A2.png'],
            position: { x: 53.5, y: 75 },
            zIndex: -1,
            responsive: true,
            baseSize: { width: 540, height: 540 }
        },
        D: {
            images: ['./images/FEC72499-FDFD-47A2-9D80-4CC295F7AD20.png'],
            position: { x: 53.5, y: 75 },
            zIndex: -1,
            responsive: true,
            baseSize: { width: 540, height: 540 }
        }
    },
    
    NETWORK: {
        BASE_WIDTH: 800,
        BASE_HEIGHT: 700,
        MAX_LOG_ENTRIES: 100,
        LOG_UPDATE_INTERVAL: 250,
        ANIMATION_DURATION: 1000,
        HOP_DELAY: 100,
        LOAD_INCREASE: 3,
        LOAD_DECREASE: 0.5,
        LOAD_DECREASE_INTERVAL: 50,
        MAX_LOAD: 100,
        MIN_PLAYBACK_TIME: 5000
    },
    
    TEXTALIVE: {
        APP_TOKEN: "vP37NoaGGtVq40se",
        APP_NAME: "歌詞シミュレーター",
        SCRIPT_URL: "https://unpkg.com/textalive-app-api/dist/index.js",
        LOAD_TIMEOUT: 10000,
        RETRY_INTERVAL: 100,
        MAX_RETRIES: 50
    }
};

// ===== デバイスユーティリティ =====
class DeviceUtils {
    static getDeviceType() {
        if (window.innerWidth <= 640) return 'smartphone';
        if (window.innerWidth <= 768) return 'mobile';
        if (window.innerWidth <= 1024) return 'tablet';
        if (window.innerWidth <= 1200) return 'medium-desktop';
        return 'desktop';
    }
    
    static isMobile() {
        return window.innerWidth <= 768;
    }
}

// ===== DOM操作ユーティリティ =====
class DOMUtils {
    static removeElement(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }
    
    static fadeOutAndRemove(element, duration = 300) {
        if (!element) return;
        element.classList.add('animate-fadeOut');
        setTimeout(() => DOMUtils.removeElement(element), duration);
    }
    
    static createLoadingOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="text-center">
                <div class="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-miku-400 mb-4"></div>
                <p class="loading-text text-white text-xl font-medium mb-2">TextAlive API と画像を読み込み中...</p>
                <p class="text-miku-300">ライセンス情報がコンソールに表示されるまでお待ちください</p>
            </div>
        `;
        return overlay;
    }
}

// ===== レスポンシブサイズ計算 =====
class ResponsiveSizeCalculator {
    static calculate(baseSize, scaleFactor) {
        const deviceType = DeviceUtils.getDeviceType();
        let scaleMultiplier = 1;
        
        switch (deviceType) {
            case 'smartphone':
                scaleMultiplier = 1.3;
                break;
            case 'mobile':
                scaleMultiplier = 1.3;
                break;
            case 'tablet':
                scaleMultiplier = 1.3;
                break;
            case 'medium-desktop':
                scaleMultiplier = 1.2;
                break;
            default:
                scaleMultiplier = 1.2;
                break;
        }
        
        const finalScale = scaleMultiplier * (scaleFactor || 1);
        
        return {
            width: Math.round(baseSize.width * finalScale),
            height: Math.round(baseSize.height * finalScale)
        };
    }
}

// ===== 画像プリローダー =====
class ImagePreloader {
    static async preloadImages(imagePaths) {
        const loadPromises = imagePaths.map(path => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    console.log(`画像読み込み完了: ${path}`);
                    // DecorationElementFactoryのキャッシュにも登録
                    if (typeof DecorationElementFactory !== 'undefined' && DecorationElementFactory._imageCache) {
                        DecorationElementFactory._imageCache.set(path, true);
                    }
                    resolve(img);
                };
                img.onerror = (error) => {
                    console.warn(`画像読み込み失敗: ${path}`, error);
                    resolve(null);
                };
                img.src = path;
            });
        });
        
        const results = await Promise.all(loadPromises);
        const successCount = results.filter(img => img !== null).length;
        console.log(`画像プリロード完了: ${successCount}/${imagePaths.length}`);
        return results;
    }
    
    // 装飾画像専用のプリロード
    static async preloadDecorationImages() {
        const decorationPaths = [];
        Object.values(Constants.DESTINATION_DECORATIONS).forEach(decoration => {
            if (decoration.images) {
                decorationPaths.push(...decoration.images);
            }
        });
        
        console.log('装飾画像のプリロード開始:', decorationPaths);
        return await this.preloadImages([...new Set(decorationPaths)]);
    }
    
    static getAllDecorationImagePaths() {
        const allPaths = [];
        Object.values(Constants.DESTINATION_DECORATIONS).forEach(decoration => {
            if (decoration.images) {
                allPaths.push(...decoration.images);
            }
        });
        
        const additionalImages = [
            './images/008955FF-B160-46B7-983C-45A2A8A99706.png',
            './images/32DCE92A-2B24-450E-A5A5-4436CBFED2E9.png',
            './images/1796B171-4B27-462B-9E8D-2BE33243ED8F - コピー.png',
            './images/1796B171-4B27-462B-9E8D-2BE33243ED8F.png',
            './images/2E4BA6E2-3E20-4534-9C9D-C00CE40A56E5.png',
            './images/54475F85-D858-4D12-9F11-AE35D883F9BA.png',
            './images/54F75B51-169C-4AAC-B781-D459DFE38F65.png',
            './images/96264743-DD75-4440-90C7-B98002205897.png',
            './images/F39E3BF7-B81F-4E50-B640-61D14DFAA17D - コピー.png',
            './images/F39E3BF7-B81F-4E50-B640-61D14DFAA17D.png',
            './images/0AF919FC-E312-4961-831C-B99CBA6AA4A2.png',
            './images/FEC72499-FDFD-47A2-9D80-4CC295F7AD20.png',
            './images/favicon.ico'
        ];
        
        allPaths.push(...additionalImages);
        return [...new Set(allPaths)];
    }
}

// ===== ネットワークデータモデル =====
class NetworkModel {
    constructor() {
        this._nodes = {};
        this._connections = [];
        this._initializeNetwork();
    }
    
    _initializeNetwork() {
        const baseScale = 1.2;
        
        this._nodes = {
            A: { x: -35 * baseScale, y: 70 * baseScale, type: 'terminal', label: 'A', direction: 'right' },
            B: { x: -35 * baseScale, y: 430 * baseScale, type: 'terminal', label: 'B', direction: 'right' },
            C: { x: 705 * baseScale, y: 70 * baseScale, type: 'terminal', label: 'C', direction: 'left' },
            D: { x: 705 * baseScale, y: 430 * baseScale, type: 'terminal', label: 'D', direction: 'left' },
            X: { x: 190 * baseScale, y: 250 * baseScale, type: 'router', label: 'X' },
            Y: { x: 480 * baseScale, y: 250 * baseScale, type: 'router', label: 'Y' }
        };
        
        this._connections = [
            { from: 'A', to: 'X', fromPort: null, toPort: 1, portLabel: 1, id: 'A-X' },
            { from: 'B', to: 'X', fromPort: null, toPort: 2, portLabel: 2, id: 'B-X' },
            { from: 'C', to: 'Y', fromPort: null, toPort: 3, portLabel: 3, id: 'C-Y' },
            { from: 'D', to: 'Y', fromPort: null, toPort: 4, portLabel: 4, id: 'D-Y' },
            { from: 'X', to: 'Y', fromPort: 5, toPort: 5, portLabel: 5, id: 'X-Y' }
        ];
    }
    
    getNodes() {
        return this._nodes;
    }
    
    getConnections() {
        return this._connections;
    }
    
    getTerminalNodes() {
        return Object.entries(this._nodes)
            .filter(([_, node]) => node.type === 'terminal')
            .map(([id, _]) => id);
    }
    
    getNextHop(currentNode, destination) {
        if (currentNode === 'A' || currentNode === 'B') return 'X';
        if (currentNode === 'C' || currentNode === 'D') return 'Y';
        if (currentNode === 'X') {
            if (destination === 'A' || destination === 'B') return destination;
            return 'Y';
        }
        if (currentNode === 'Y') {
            if (destination === 'C' || destination === 'D') return destination;
            return 'X';
        }
        return null;
    }
    
    getConnectionId(fromNode, toNode) {
        const conn = this._connections.find(c => c.from === fromNode && c.to === toNode);
        return conn ? conn.id : null;
    }
    
    getPortNumber(fromNode, toNode) {
        const conn = this._connections.find(c => c.from === fromNode && c.to === toNode);
        return conn ? conn.fromPort : null;
    }
}

// ===== ログエントリ管理 =====
class LogEntryManager {
    constructor(containerId, maxEntries = 100) {
        this._container = document.getElementById(containerId);
        this._maxEntries = maxEntries;
    }
    
    addEntry(entry) {
        if (!this._container) return;
        
        const logEntry = this._createLogEntryElement(entry);
        this._container.appendChild(logEntry);
        this._limitLogEntries();
        this._scrollToBottom();
    }
    
    clear() {
        if (this._container) {
            this._container.innerHTML = '';
        }
    }
    
    _createLogEntryElement(entry) {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${entry.type} flex items-start`;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'log-message';
        messageDiv.textContent = entry.message;
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'log-timestamp text-xs whitespace-nowrap ml-2';
        timeSpan.textContent = entry.timestamp.toLocaleTimeString('ja-JP', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        
        logEntry.appendChild(messageDiv);
        logEntry.appendChild(timeSpan);
        
        return logEntry;
    }
    
    _limitLogEntries() {
        while (this._container.children.length > this._maxEntries) {
            this._container.removeChild(this._container.firstChild);
        }
    }
    
    _scrollToBottom() {
        const logContainer = this._container.parentElement;
        if (logContainer) {
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }
}

// ===== ログマネージャー =====
class LogManager {
    constructor() {
        this._desktopManager = new LogEntryManager('log-entries');
        this._mobileManager = new LogEntryManager('mobile-log-entries');
        this._pendingEntries = [];
        this._updateInterval = setInterval(() => this._flushEntries(), Constants.NETWORK.LOG_UPDATE_INTERVAL);
    }
    
    addEntry(message, type = 'info') {
        this._pendingEntries.push({ message, type, timestamp: new Date() });
    }
    
    clear() {
        this._pendingEntries = [];
        this._desktopManager.clear();
        this._mobileManager.clear();
    }
    
    dispose() {
        if (this._updateInterval) {
            clearInterval(this._updateInterval);
            this._updateInterval = null;
        }
    }
    
    _flushEntries() {
        if (!this._pendingEntries.length) return;
        
        this._pendingEntries.forEach(entry => {
            if (window.innerWidth > 1200) {
                this._desktopManager.addEntry(entry);
            } else {
                this._mobileManager.addEntry(entry);
            }
        });
        
        this._pendingEntries = [];
    }
}

// ===== TextAlive APIローダー =====
class TextAliveAPILoader {
    static async loadScript() {
        if (typeof window.TextAliveApp !== 'undefined') return;
        
        const existingScript = document.querySelector('script[src*="textalive-app-api"]');
        if (!existingScript) {
            const script = document.createElement('script');
            script.src = Constants.TEXTALIVE.SCRIPT_URL;
            script.async = true;
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                setTimeout(() => reject(new Error('TextAlive APIスクリプトのロードがタイムアウトしました')), Constants.TEXTALIVE.LOAD_TIMEOUT);
                document.head.appendChild(script);
            });
        }
        
        for (let i = 0; i < Constants.TEXTALIVE.MAX_RETRIES; i++) {
            if (typeof window.TextAliveApp !== 'undefined') break;
            await new Promise(resolve => setTimeout(resolve, Constants.TEXTALIVE.RETRY_INTERVAL));
        }
        
        if (typeof window.TextAliveApp === 'undefined') {
            throw new Error('TextAliveAppが見つかりません。');
        }
    }
}

// ===== TextAlive Playerラッパー =====
class TextAlivePlayerWrapper {
    constructor(onReady, onVideoReady, onTimeUpdate, onPlay, onPause, onStop) {
        this._player = null;
        this._onReady = onReady;
        this._onVideoReady = onVideoReady;
        this._onTimeUpdate = onTimeUpdate;
        this._onPlay = onPlay;
        this._onPause = onPause;
        this._onStop = onStop;
    }
    
    async initialize() {
        const { Player } = window.TextAliveApp;
        
        this._player = new Player({
            app: {
                token: Constants.TEXTALIVE.APP_TOKEN,
                name: Constants.TEXTALIVE.APP_NAME
            },
            player: {
                mediaElement: document.createElement("audio"),
                mediaBannerPosition: "bottom right",
                defaultFontSize: "25px"
            }
        });
        
        this._player.addListener({
            onAppReady: (app) => {
                console.log('TextAlive App準備完了:', app);
                this._onReady(app);
            },
            onVideoReady: (v) => this._onVideoReady(v),
            onTimeUpdate: (position) => this._onTimeUpdate(position),
            onPlay: () => this._onPlay(),
            onPause: () => this._onPause(),
            onStop: () => this._onStop(),
            onSeek: (position) => console.log('シーク位置:', position),
            onMediaSeek: (position) => console.log('メディアシーク位置:', position),
            onEnded: () => {
                console.log('🎵 onEndedイベント発火');
                this._onStop();
            },
            onFinish: () => {
                console.log('🎵 onFinishイベント発火');
                this._onStop();
            }
        });
    }
    
    getPlayer() {
        return this._player;
    }
    
    dispose() {
        if (this._player) {
            this._player.dispose();
        }
    }
}

// ===== 歌詞処理状態管理 =====
class LyricStateManager {
    static resetLyricState(player) {
        try {
            console.log('🔄 歌詞処理状態強制リセット開始');
            let resetCount = 0;
            
            const resetMethods = [
                () => this._resetVideoPhrasesWords(player),
                () => this._resetDataPhrasesWords(player),
                () => this._resetVideoWords(player),
                () => this._resetDataWords(player)
            ];
            
            resetMethods.forEach((method, index) => {
                try {
                    const count = method();
                    resetCount += count;
                    console.log(`リセット方法${index + 1}: ${count}個の単語をリセット`);
                } catch (e) {
                    console.log(`リセット方法${index + 1}でエラー:`, e.message);
                }
            });
            
            console.log(`✅ 歌詞処理状態強制リセット完了: ${resetCount}個の歌詞単語をリセット`);
        } catch (e) {
            console.error('❌ 歌詞データ処理エラー:', e);
        }
    }
    
    static _resetVideoPhrasesWords(player) {
        let count = 0;
        if (player?.video?.phrases) {
            player.video.phrases.forEach(phrase => {
                if (phrase?.words) {
                    phrase.words.forEach(word => {
                        if (word) {
                            word.processed = false;
                            count++;
                        }
                    });
                }
            });
        }
        return count;
    }
    
    static _resetDataPhrasesWords(player) {
        let count = 0;
        if (player?.data?.phrases) {
            player.data.phrases.forEach(phrase => {
                if (phrase?.words) {
                    phrase.words.forEach(word => {
                        if (word) {
                            word.processed = false;
                            count++;
                        }
                    });
                }
            });
        }
        return count;
    }
    
    static _resetVideoWords(player) {
        let count = 0;
        if (player?.video?.words) {
            player.video.words.forEach(word => {
                if (word) {
                    word.processed = false;
                    count++;
                }
            });
        }
        return count;
    }
    
    static _resetDataWords(player) {
        let count = 0;
        if (player?.data?.words) {
            player.data.words.forEach(word => {
                if (word) {
                    word.processed = false;
                    count++;
                }
            });
        }
        return count;
    }
}

// ===== TextAlive再生制御 =====
class TextAlivePlaybackController {
    constructor(playerWrapper) {
        this._playerWrapper = playerWrapper;
        this._currentPlayController = null; // 現在の再生制御用AbortController
    }
    
    async requestPlay(seekPosition = null) {
        const player = this._playerWrapper.getPlayer();
        if (!player) return false;
        
        // 前の再生リクエストをキャンセル
        if (this._currentPlayController) {
            this._currentPlayController.abort();
        }
        
        // 新しいAbortControllerを作成
        this._currentPlayController = new AbortController();
        const signal = this._currentPlayController.signal;
        
        try {
            // キャンセルチェック
            if (signal.aborted) return false;
            
            
            if (seekPosition !== null && seekPosition > 0) {
                console.log('🔄 指定位置にシーク:', seekPosition);
                this._seekToPosition(player, seekPosition);
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // キャンセルチェック
                if (signal.aborted) return false;
            }
            
            // 最終的な再生前にもう一度キャンセルチェック
            if (signal.aborted) return false;
            
            try {
                await player.requestPlay();
            } catch (playError) {
                if (playError.name === 'AbortError') {
                    console.log('再生リクエストがキャンセルされました');
                    return false;
                }
                throw playError;
            }
            return true;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('再生リクエストがキャンセルされました');
                return false;
            }
            console.error('TextAlive Player再生エラー:', error);
            return false;
        } finally {
            // リクエスト完了時にコントローラーをクリア
            if (this._currentPlayController === signal.controller) {
                this._currentPlayController = null;
            }
        }
    }
      async requestPause() {
        // 進行中の再生リクエストをキャンセル
        if (this._currentPlayController) {
            this._currentPlayController.abort();
            this._currentPlayController = null;
        }
        
        const player = this._playerWrapper.getPlayer();
        if (!player) return;
        
        try {
            console.log('🛑 TextAlive Player 停止処理開始');
            
            if (player.isPlaying) {
                console.log('⏸️ プレイヤーを一時停止中...');
                await player.requestPause();
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            if (player.requestStop) {
                console.log('🛑 プレイヤーを停止中...');
                player.requestStop();
            } else if (player.timer && player.timer.seek) {
                console.log('🔄 プレイヤーを先頭に戻して停止...');
                player.timer.seek(0);
                player.requestPause();
            }
            
            console.log('✅ TextAlive Player 停止処理完了');
        } catch (e) {
            // AbortErrorは正常なキャンセルなので無視
            if (e.name !== 'AbortError') {
                console.error('❌ TextAlive Player一時停止エラー:', e);
                try {
                    if (player.requestStop) {
                        player.requestStop();
                    }
                } catch (stopError) {
                    console.error('❌ 強制停止も失敗:', stopError);
                }
            }
        } finally {
        }
    }
      async requestRestart() {
        // 進行中の再生リクエストをキャンセル
        if (this._currentPlayController) {
            this._currentPlayController.abort();
            this._currentPlayController = null;
        }
        
        const player = this._playerWrapper.getPlayer();
        if (!player) return false;
        
        try {
            console.log('スタート開始');
            
            if (player.isPlaying) {
                await player.requestPause();
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            if (!this._seekToPosition(player, 0)) {
                console.log('シーク機能が使用できないため、曲を再読み込みします');
                return false;
            }
            
            LyricStateManager.resetLyricState(player);
            console.log('歌詞処理状態をリセットしました');
            
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // requestPlay()を呼び出さずに、内部のrequestPlay()メソッドを使用
            return await this.requestPlay(0);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('スタートがキャンセルされました');
                return false;
            }
            console.error('TextAlive Player最初から再生エラー:', error);
            return false;
        }
    }
    
    _seekToPosition(player, position) {
        let seekSuccess = false;
        
        const seekMethods = [
            () => player.timer && player.timer.seek && (player.timer.seek(position), true),
            () => player.requestSeek && (player.requestSeek(position), true),
            () => player.seekTo && (player.seekTo(position), true),
            () => player.video && player.video.seekTo && (player.video.seekTo(position), true)
        ];
        
        for (const method of seekMethods) {
            try {
                if (method()) {
                    seekSuccess = true;
                    console.log('シーク成功');
                    break;
                }
            } catch (e) {
                console.log('シーク失敗:', e.message);
            }
        }
        
        if (!seekSuccess) {
            console.warn('⚠️ すべてのシークメソッドが失敗しました');
        }
        
        return seekSuccess;
    }
}

// ===== TextAlive楽曲管理 =====
class TextAliveSongManager {
    constructor(playerWrapper) {
        this._playerWrapper = playerWrapper;
        this._selectedSongIndex = 0;
        this._isReady = false;
    }
    
    async createFromSong(songIndex) {
        const player = this._playerWrapper.getPlayer();
        if (!player) return;
        
        this._isReady = false;
        this._selectedSongIndex = songIndex;
        
        const selectedSong = Constants.SONGS_DATA[songIndex];
        await player.createFromSongUrl(selectedSong.songUrl, {
            video: {
                apiKey: selectedSong.apiToken,
                beatId: selectedSong.beatId,
                chordId: selectedSong.chordId,
                repetitiveSegmentId: selectedSong.repetitiveSegmentId,
                lyricId: selectedSong.lyricId,
                lyricDiffId: selectedSong.lyricDiffId
            }
        });
    }
    
    getCurrentSongInfo() {
        const player = this._playerWrapper.getPlayer();
        if (player && player.data && player.data.song) {
            return {
                name: player.data.song.name,
                license: player.data.song.license
            };
        }
        return null;
    }
    
    getSongDuration() {
        const player = this._playerWrapper.getPlayer();
        let duration = 0;
        
        if (player) {
            if (player.video && player.video.duration) {
                duration = player.video.duration;
            } else if (player.data && player.data.song && player.data.song.length) {
                duration = player.data.song.length;
            } else if (player.data && player.data.songInfo && player.data.songInfo.length) {
                duration = player.data.songInfo.length;
            } else if (player.video && typeof player.video.length === 'number') {
                duration = player.video.length;
            }
        }
        
        return duration;
    }
    
    getSelectedSongIndex() {
        return this._selectedSongIndex;
    }
    
    setReady(ready) {
        this._isReady = ready;
    }
    
    isReady() {
        return this._isReady;
    }
}

// ===== TextAlive歌詞検索 =====
class TextAliveLyricFinder {
    constructor(playerWrapper) {
        this._playerWrapper = playerWrapper;
        this._sentWords = new Set(); // 送信済み歌詞を追跡
        this._lastPosition = 0; // 前回の更新位置を記録
    }
    
    clearSentWords() {
        this._sentWords.clear();
        this._lastPosition = 0;
        console.log('送信済み歌詞履歴と前回位置をクリア');
    }
    
    processWordsInRange(currentPosition) {
        const player = this._playerWrapper.getPlayer();
        if (!player || !player.video) return [];
        
        const processedWords = [];
        
        try {
            // 前回位置から現在位置までの範囲を確定
            let startPos = this._lastPosition;
            const endPos = currentPosition;
            
            // 初回の場合、現在位置の歌詞のみを処理して複数歌詞の同時処理を防ぐ
            if (startPos === 0 && endPos > 0) {
                // 初回は現在位置の歌詞のみ取得
                const currentWord = player.video.findWord(endPos);
                if (currentWord) {
                    // 歌詞の適切なタイミングチェック（歌詞開始時刻付近でのみ送信）
                    const wordStart = currentWord.startTime;
                    const timingMargin = 200; // 200ms前後の許容範囲
                    
                    if (endPos >= wordStart - timingMargin && endPos <= wordStart + timingMargin) {
                        const wordId = `${currentWord.startTime}-${currentWord.endTime}-${currentWord.text}`;
                        if (!this._sentWords.has(wordId)) {
                            this._sentWords.add(wordId);
                            processedWords.push(currentWord);
                            console.log('初回歌詞送信:', currentWord.text, 'at position:', endPos, 'word start:', wordStart);
                        }
                    } else {
                        console.log('初回歌詞タイミング外:', currentWord.text, 'position:', endPos, 'word start:', wordStart);
                    }
                }
                this._lastPosition = endPos;
                return processedWords;
            }
            
            console.log(`範囲処理: ${startPos}ms → ${endPos}ms`);
            
            // 範囲内のすべての単語を取得して処理
            let word = player.video.firstWord;
            while (word) {
                const wordId = `${word.startTime}-${word.endTime}-${word.text}`;
                
                // まだ送信していない単語で、範囲内にある単語を処理
                if (!this._sentWords.has(wordId)) {
                    // 単語が範囲内にあるかチェック
                    if (this._isWordInRange(word, startPos, endPos)) {
                        this._sentWords.add(wordId);
                        processedWords.push(word);
                        console.log('範囲内歌詞送信:', word.text, 'word time:', word.startTime, '-', word.endTime);
                    }
                }
                
                word = word.next;
            }
            
            // 前回位置を更新
            this._lastPosition = currentPosition;
            
        } catch (e) {
            console.error('範囲処理エラー:', e);
        }
        
        return processedWords;
    }
    
    _isWordInRange(word, startPos, endPos) {
        // シークや再生開始時の飛ばした時間帯も含めて処理
        // 単語の開始時刻が範囲内にあるか、または範囲が単語の時間帯を跨いでいるかチェック
        const wordStart = word.startTime;
        const wordEnd = word.endTime;
        
        // 基本的な範囲チェック
        const isInRange = (wordStart >= startPos && wordStart <= endPos) ||
                         (startPos >= wordStart && startPos <= wordEnd) ||
                         (endPos >= wordStart && endPos <= wordEnd) ||
                         (wordStart <= startPos && wordEnd >= endPos);
        
        if (!isInRange) return false;
        
        // 範囲内でも歌詞の開始時刻付近でのみ送信を許可
        const timingMargin = 200; // 200ms前後の許容範囲
        const isNearWordStart = endPos >= wordStart - timingMargin && endPos <= wordStart + timingMargin;
        
        if (!isNearWordStart) {
            console.log('歌詞タイミング外:', word.text, 'endPos:', endPos, 'word start:', wordStart);
            return false;
        }
        
        return true;
    }
    
    findCurrentLyric(position) {
        const player = this._playerWrapper.getPlayer();
        if (!player || !player.video) return null;
        
        try {
            // TextAlive API標準のfindWord使用
            return player.video.findWord(position);
        } catch (e) {
            console.error('歌詞取得エラー:', e);
            return null;
        }
    }
    
    getCurrentPosition() {
        const player = this._playerWrapper.getPlayer();
        let position = 0;
        
        if (player && player.timer) {
            position = player.timer.position || 0;
        }
        
        if (position === 0 && player) {
            if (player.video && typeof player.video.position === 'number') {
                position = player.video.position;
            } else if (player.data && typeof player.data.position === 'number') {
                position = player.data.position;
            }
        }
        
        return position;
    }
    
    isPlaying() {
        const player = this._playerWrapper.getPlayer();
        return player && player.isPlaying;
    }
}

// ===== TextAliveマネージャー =====
class TextAliveManager {
    constructor(onReady, onTimeUpdate, onPlay, onPause, onStop) {
        this._isTextAliveLoaded = false;
        this._onReady = onReady;
        this._isInitialized = false;
        this._isInitialSongLoading = false;
        this._isSongChanging = false; // 曲変更中フラグを追加
        
        this._playerWrapper = new TextAlivePlayerWrapper(
            () => this._handleAppReady(),
            (v) => this._handleVideoReady(v),
            (position) => onTimeUpdate(position),
            () => this._handlePlay(onPlay),
            () => this._handlePause(onPause),
            () => this._handleStop(onStop)
        );
        
        this._playbackController = new TextAlivePlaybackController(this._playerWrapper);
        this._songManager = new TextAliveSongManager(this._playerWrapper);
        this._lyricFinder = new TextAliveLyricFinder(this._playerWrapper);
    }
    
    async initialize() {
        try {
            await TextAliveAPILoader.loadScript();
            this._isTextAliveLoaded = true;
            await this._playerWrapper.initialize();
            
            this._isInitialSongLoading = true;
            const initialSong = Constants.SONGS_DATA[0];
            await this._songManager.createFromSong(0);
            this._isInitialSongLoading = false;
            
            return true;
        } catch (error) {
            console.error('TextAlive API初期化エラー:', error);
            throw error;
        }
    }
    
    async changeSong(songIndex) {
        if (songIndex === this._songManager.getSelectedSongIndex()) return;
        
        console.log('曲変更開始:', songIndex);
        
        // 曲変更中フラグを設定
        this._isInitialSongLoading = false;
        this._isSongChanging = true;
        
        // 現在再生中の場合は停止
        if (this._lyricFinder.isPlaying()) {
            console.log('再生中のため一時停止します');
            await this._playbackController.requestPause();
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        this._songManager.setReady(false);
        await this._songManager.createFromSong(songIndex);
    }
    
    async requestPlay(seekPosition = null) {
        if (!this._songManager.isReady()) return false;
        try {
            return await this._playbackController.requestPlay(seekPosition);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('TextAliveManager: 再生リクエストがキャンセルされました');
                return false;
            }
            console.error('TextAliveManager: 再生エラー:', error);
            return false;
        }
    }
    
    async requestPause() {
        try {
            await this._playbackController.requestPause();
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('TextAliveManager: 一時停止リクエストがキャンセルされました');
            } else {
                console.error('TextAliveManager: 一時停止エラー:', error);
            }
        }
    }
    
    async requestRestart() {
        try {
            const success = await this._playbackController.requestRestart();
            if (!success) {
                const currentSongIndex = this._songManager.getSelectedSongIndex();
                await this.changeSong(currentSongIndex);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            return success;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('TextAliveManager: スタートリクエストがキャンセルされました');
                return false;
            }
            console.error('TextAliveManager: スタートエラー:', error);
            return false;
        }
    }
    
    getCurrentSongInfo() {
        return this._songManager.getCurrentSongInfo();
    }
    
    getCurrentPosition() {
        return this._lyricFinder.getCurrentPosition();
    }
    
    getSongDuration() {
        return this._songManager.getSongDuration();
    }
    
    findCurrentLyric(position) {
        return this._lyricFinder.findCurrentLyric(position);
    }
    
    processWordsInRange(currentPosition) {
        return this._lyricFinder.processWordsInRange(currentPosition);
    }
    
    clearSentWords() {
        this._lyricFinder.clearSentWords();
    }
    
    isReady() {
        return this._songManager.isReady();
    }
    
    isPlaying() {
        return this._lyricFinder.isPlaying();
    }
    
    getSelectedSongIndex() {
        return this._songManager.getSelectedSongIndex();
    }
    
    forceResetLyricState() {
        LyricStateManager.resetLyricState(this._playerWrapper.getPlayer());
    }
    
    dispose() {
        this._playerWrapper.dispose();
    }
    
    _handleAppReady() {
        console.log('TextAlive App準備完了');
        if (!this._isInitialized) {
            this._isInitialized = true;
            // 初期ロード時は楽曲読み込み完了まで待機（_handleVideoReadyで処理）
        }
    }
    
    _handleVideoReady(v) {
        console.log('楽曲準備完了:', v);
        this._songManager.setReady(true);
        
        // 範囲処理方式: 曲変更時に前回位置をリセット
        this._lyricFinder.clearSentWords();
        console.log('曲変更により前回位置と送信済み歌詞をリセット');
        
        // 曲変更完了フラグをリセット
        if (this._isSongChanging) {
            console.log('曲変更完了');
            this._isSongChanging = false;
        }
        
        // 初期ロード完了または曲変更完了時にUI更新
        if (this._isInitialized) {
            if (this._isInitialSongLoading) {
                // 初期ロード完了
                console.log('初期ロード完了 - 初回楽曲準備完了');
                this._isInitialSongLoading = false;
            }
            this._onReady();
        }
    }
    
    _handlePlay(onPlay) {
        console.log('TextAliveManager._handlePlay() 呼び出し');
        
        onPlay();
    }
    
    _handlePause(onPause) {
        console.log('TextAliveManager._handlePause() 呼び出し');
        onPause();
    }
    
    _handleStop(onStop) {
        console.log('TextAliveManager._handleStop() 呼び出し');
        
        // 楽曲終了時の追加チェック
        const position = this.getCurrentPosition();
        const duration = this.getSongDuration();
        
        if (duration > 0 && position > 0) {
            const progress = (position / duration) * 100;
            console.log('_handleStop での進行状況:', { position, duration, progress: Math.floor(progress) + '%' });
            
            // 楽曲の80%以上再生されていればゲームクリアとみなす
            if (progress >= 80 && position >= 5000) {
                console.log('🎵 _handleStopで楽曲終了を検出 (進行率80%以上)');
                // onStopを先に呼び出してからゲームクリア画面を表示
                setTimeout(() => {
                    if (window.simulation && !window.simulation._loadBalanceManager.isGameOver()) {
                        window.simulation._showGameClearScreen();
                    }
                }, 100);
            }
        }
        
        onStop();
    }
}

// ===== スケールファクター計算機 =====
class ScaleFactorCalculator {
    constructor(baseWidth, baseHeight) {
        this._baseWidth = baseWidth;
        this._baseHeight = baseHeight;
        this._scaleFactor = 1;
        this._offsetX = 0;
        this._offsetY = 0;
    }
    
    calculate(containerElement) {
        if (!containerElement) return;
        
        const containerWidth = containerElement.clientWidth;
        const containerHeight = containerElement.clientHeight;
        
        if (containerWidth === 0 || containerHeight === 0) return;
        
        const scaleX = containerWidth / this._baseWidth;
        const scaleY = containerHeight / this._baseHeight;
        
        this._scaleFactor = Math.min(scaleX, scaleY, 1);
        
        const deviceType = DeviceUtils.getDeviceType();
        switch (deviceType) {
            case 'smartphone':
                this._scaleFactor = Math.min(this._scaleFactor * 0.75, 0.6);
                break;
            case 'mobile':
                this._scaleFactor = Math.min(this._scaleFactor * 0.8, 0.7);
                break;
            case 'tablet':
                this._scaleFactor = Math.min(this._scaleFactor * 0.9, 0.85);
                break;
            case 'medium-desktop':
                this._scaleFactor = Math.min(this._scaleFactor * 0.80, 0.9);
                break;
            default:
                break;
        }
        
        this._offsetX = (containerWidth - (this._baseWidth * this._scaleFactor)) / 2;
        this._offsetY = (containerHeight - (this._baseHeight * this._scaleFactor)) / 2;
        
        if (DeviceUtils.isMobile()) {
            this._offsetY = Math.max(this._offsetY - 20, 10);
        }
    }
    
    scalePosition(x, y) {
        return {
            x: (x * this._scaleFactor) + this._offsetX,
            y: (y * this._scaleFactor) + this._offsetY
        };
    }
    
    getScaleFactor() {
        return this._scaleFactor;
    }
    
    getOffsets() {
        return { x: this._offsetX, y: this._offsetY };
    }
}

// ===== 装飾アニメーション管理 =====
class DecorationAnimationManager {
    constructor() {
        this._animationInterval = null;
        this._currentImageIndex = 0;
        this._isPlaying = false;
        this._pendingAnimation = null;
    }
    
    startAnimation(decoration, decorationElement) {
        if (!decoration.interval || !decoration.images || decoration.images.length <= 1) return;
        
        this._pendingAnimation = { decoration, decorationElement };
        
        if (this._isPlaying) {
            this._startImageAnimation();
        }
    }
    
    setPlayingState(isPlaying) {
        this._isPlaying = isPlaying;
        
        if (isPlaying && this._pendingAnimation) {
            this._startImageAnimation();
        } else if (!isPlaying) {
            this._pauseAnimation();
        }
    }
    
    clear() {
        this._pauseAnimation();
        this._currentImageIndex = 0;
        this._pendingAnimation = null;
    }
    
    _startImageAnimation() {
        if (!this._pendingAnimation) return;
        
        const { decoration, decorationElement } = this._pendingAnimation;
        
        if (decoration.blinking) {
            this._startBlinkingAnimation(decorationElement, decoration.interval);
        } else {
            this._animationInterval = setInterval(() => {
                this._currentImageIndex = (this._currentImageIndex + 1) % decoration.images.length;
                if (decorationElement) {
                    decorationElement.src = decoration.images[this._currentImageIndex];
                }
            }, decoration.interval);
        }
    }
    
    _startBlinkingAnimation(decorationElement, interval) {
        let visible = true;
        this._animationInterval = setInterval(() => {
            visible = !visible;
            if (decorationElement) {
                decorationElement.style.opacity = visible ? '1' : '0';
            }
        }, interval / 2);
    }
    
    _pauseAnimation() {
        if (this._animationInterval) {
            clearInterval(this._animationInterval);
            this._animationInterval = null;
        }
    }
}

// ===== 装飾要素作成 =====
class DecorationElementFactory {
    static _imageCache = new Map(); // 画像キャッシュ
    
    static create(decoration, position, scaleFactor = 1) {
        const element = document.createElement('img');
        element.className = 'decoration-image';
        element.style.position = 'absolute';
        element.style.left = position.x + 'px';
        element.style.bottom = '0px';
        element.style.transform = 'translateX(-50%)';
        element.style.zIndex = '2';
        
        this._applySize(element, decoration, scaleFactor);
        
        element.style.objectFit = 'cover';
        
        // キャッシュされた画像があるかチェック
        const imageSrc = decoration.images[0];
        if (this._imageCache.has(imageSrc)) {
            // キャッシュから設定（即座に表示）
            element.src = imageSrc;
        } else {
            // 新規読み込み時のみイベント設定
            element.onerror = () => {
                console.error('Failed to load decoration image:', imageSrc);
            };
            
            element.onload = () => {
                console.log('Decoration image loaded successfully:', imageSrc);
                // 読み込み完了時にキャッシュに追加
                this._imageCache.set(imageSrc, true);
            };
            
            element.src = imageSrc;
        }
        
        if (decoration.floating) {
            element.classList.add('floating');
        }
        
        return element;
    }
    
    // 既存要素のサイズのみ更新
    static updateSize(element, decoration, scaleFactor = 1) {
        if (!element) return;
        this._applySize(element, decoration, scaleFactor);
    }
      static _applySize(element, decoration, scaleFactor) {
        if (decoration.responsive && decoration.baseSize) {
            const responsiveSize = ResponsiveSizeCalculator.calculate(decoration.baseSize, scaleFactor);
            element.style.width = responsiveSize.width + 'px';
            element.style.height = responsiveSize.height + 'px';
            element.style.maxWidth = 'none';
            element.style.maxHeight = 'none';
        } else if (decoration.size) {
            element.style.width = decoration.size.width;
            element.style.height = decoration.size.height;
            element.style.maxWidth = 'none';
            element.style.maxHeight = 'none';
        } else {
            this._applyDefaultSize(element);
        }
    }
    
    static _applyDefaultSize(element) {
        const deviceType = DeviceUtils.getDeviceType();
        let maxWidth = '40%';
        let maxHeight = '30%';
        
        switch (deviceType) {
            case 'smartphone':
                maxWidth = '50%';
                maxHeight = '35%';
                break;
            case 'mobile':
                maxWidth = '45%';
                maxHeight = '32%';
                break;
            case 'tablet':
                maxWidth = '42%';
                maxHeight = '30%';
                break;
            default:
                maxWidth = '40%';
                maxHeight = '28%';
                break;
        }
        
        element.style.maxWidth = maxWidth;
        element.style.maxHeight = maxHeight;
    }
}

// ===== 装飾管理 =====
// 星のエフェクト管理クラス
class StarEffectManager {
    static createStarEffect(x, y, containerEl) {
        const star = document.createElement('div');
        star.className = 'star-effect';
        star.textContent = '★';
        star.style.left = x + 'px';
        star.style.top = y + 'px';
        
        // ランダムな方向に飛ばす
        const angle = Math.random() * Math.PI * 2;
        const distance = 50 + Math.random() * 50;
        const finalX = x + Math.cos(angle) * distance;
        const finalY = y + Math.sin(angle) * distance;
        
        star.style.setProperty('--final-x', finalX + 'px');
        star.style.setProperty('--final-y', finalY + 'px');
        
        containerEl.appendChild(star);
        
        // アニメーション終了後に削除
        setTimeout(() => {
            if (star.parentNode) {
                star.parentNode.removeChild(star);
            }
        }, 1000);
    }
    
    static createMultipleStars(x, y, containerEl, count = 5) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const offsetX = x + (Math.random() - 0.5) * 40;
                const offsetY = y + (Math.random() - 0.5) * 40;
                this.createStarEffect(offsetX, offsetY, containerEl);
            }, i * 100);
        }
    }
}

class DecorationManager {
    constructor() {
        this._currentDestination = null;
        this._decorationElement = null;
        this._animationManager = new DecorationAnimationManager();
        this._hasRendered = false;
        this._lastScaleFactor = null; // 前回のスケールファクターを記録
    }
    
    setDestination(destination) {
        if (this._currentDestination === destination) return;
        
        this._currentDestination = destination;
        this._animationManager.clear();
        this._hasRendered = false;
        this._lastScaleFactor = null; // 新しい装飾に変更時はスケールファクターをリセット
    }
    
    setPlayingState(isPlaying) {
        this._animationManager.setPlayingState(isPlaying);
    }
      render(networkEl, scaleFactor, offsetX, offsetY) {
        if (!this._currentDestination || !Constants.DESTINATION_DECORATIONS[this._currentDestination]) {
            this._removeDecoration();
            return;
        }
        
        const decoration = Constants.DESTINATION_DECORATIONS[this._currentDestination];
        const calculatedPosition = this._calculatePosition(decoration.position, networkEl);
        
        // 既存の装飾要素があり、スケールファクターのみが変更された場合
        if (this._decorationElement && this._lastScaleFactor !== null && this._lastScaleFactor !== scaleFactor) {
            console.log('レスポンシブ変更: サイズのみ更新', this._lastScaleFactor, '->', scaleFactor);
            
            // 位置とサイズのみ更新（画像は再読み込みしない）
            this._decorationElement.style.left = calculatedPosition.x + 'px';
            DecorationElementFactory.updateSize(this._decorationElement, decoration, scaleFactor);
            this._lastScaleFactor = scaleFactor;
            return;
        }
        
        // 新規作成時または装飾が変更された場合
        this._removeDecoration();
        
        this._decorationElement = DecorationElementFactory.create(decoration, calculatedPosition, scaleFactor);
        this._lastScaleFactor = scaleFactor;
        
        // ディゾルブ効果で表示 (初回レンダリング時のみ)
        if (!this._hasRendered) {
            this._decorationElement.style.opacity = '0';
            this._decorationElement.style.transition = 'opacity 0.5s ease-in-out';
        } else {
            this._decorationElement.style.opacity = '1'; // 既にレンダリング済みの場合は即時表示
        }
        
        this._animationManager.startAnimation(decoration, this._decorationElement);
        
        networkEl.appendChild(this._decorationElement);
        
        // 星のエフェクトは初回レンダリング時のみ生成
        if (!this._hasRendered) {
            const decorationRect = this._decorationElement.getBoundingClientRect();
            const networkRect = networkEl.getBoundingClientRect();
            const relativeX = decorationRect.left - networkRect.left + decorationRect.width * 0.8;
            const relativeY = decorationRect.top - networkRect.top + decorationRect.height * 0.5;
            
            StarEffectManager.createMultipleStars(relativeX, relativeY, networkEl, 3);
            this._hasRendered = true;
        }
        
        // フェードイン開始
        requestAnimationFrame(() => {
            if (this._decorationElement) {
                this._decorationElement.style.opacity = '1';
            }
        });
    }
    
    _calculatePosition(position, networkEl) {
        const containerWidth = networkEl.clientWidth;
        const x = (containerWidth * position.x) / 100;
        return { x, y: 0 };
    }
    
    _removeDecoration() {
        this._animationManager.clear();
        if (this._decorationElement && this._decorationElement.parentNode) {
            console.log('装飾要素を削除（新規作成のため）');
            this._decorationElement.parentNode.removeChild(this._decorationElement);
            this._decorationElement = null;
            this._lastScaleFactor = null; // スケールファクターもリセット
        }
    }
}

// ===== ネットワーク要素作成 =====
class NetworkElementFactory {
    static createConnection(connection, fromPos, toPos, isActive) {
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        const connectionEl = document.createElement('div');
        connectionEl.classList.add('connection');
        connectionEl.dataset.id = connection.id;
        
        if (isActive) {
            connectionEl.classList.add('active');
        }
        
        connectionEl.style.left = `${fromPos.x}px`;
        connectionEl.style.top = `${fromPos.y}px`;
        connectionEl.style.width = `${length}px`;
        connectionEl.style.transform = `rotate(${angle}rad)`;
        connectionEl.title = `接続: ${connection.from} → ${connection.to}`;
        
        const deviceType = DeviceUtils.getDeviceType();
        let connectionHeight = '3px';
        
        switch (deviceType) {
            case 'smartphone':
                connectionHeight = '4px';
                break;
            case 'mobile':
                connectionHeight = '5px';
                break;
            case 'tablet':
                connectionHeight = '4px';
                break;
            default:
                connectionHeight = '3px';
                break;
        }
        
        connectionEl.style.height = connectionHeight;
        
        return connectionEl;
    }
    
    static createPortLabel(connection, midX, midY, isActive) {
        const portLabelEl = document.createElement('div');
        portLabelEl.classList.add('port-label');
        portLabelEl.dataset.id = `port-${connection.id}`;
        portLabelEl.dataset.port = connection.portLabel;
        
        if (isActive) {
            portLabelEl.classList.add('active');
        }
        
        portLabelEl.style.left = `${midX}px`;
        portLabelEl.style.top = `${midY}px`;
        portLabelEl.title = `ポート ${connection.portLabel}: ${connection.from} → ${connection.to}`;
        
        const deviceType = DeviceUtils.getDeviceType();
        let portSize = '40px';
        let fontSize = '16px';
        
        switch (deviceType) {
            case 'smartphone':
                portSize = '24px';
                fontSize = '10px';
                break;
            case 'mobile':
                portSize = '28px';
                fontSize = '12px';
                break;
            case 'tablet':
                portSize = '32px';
                fontSize = '14px';
                break;
            case 'medium-desktop':
                portSize = '36px';
                fontSize = '15px';
                break;
            default:
                portSize = '40px';
                fontSize = '16px';
                break;
        }
        
        portLabelEl.style.setProperty('width', portSize, 'important');
        portLabelEl.style.setProperty('height', portSize, 'important');
        portLabelEl.style.setProperty('font-size', fontSize, 'important');
        
        return portLabelEl;
    }
    
    static createTerminalNode(id, node, pos, isActive, onTerminalClick) {
        const nodeEl = document.createElement('div');
        nodeEl.classList.add('node', 'terminal');
        nodeEl.dataset.id = id;
        
        if (isActive) {
            nodeEl.classList.add('active');
        }
        
        const pcIcon = document.createElement('img');
        pcIcon.src = './images/54F75B51-169C-4AAC-B781-D459DFE38F65.png';
        pcIcon.classList.add('pc-icon');
        
        const deviceType = DeviceUtils.getDeviceType();
        let iconSize = '70px';
        let labelSize = '16px';
        
        switch (deviceType) {
            case 'smartphone':
                iconSize = '50px';
                labelSize = '12px';
                break;
            case 'mobile':
                iconSize = '55px';
                labelSize = '14px';
                break;
            case 'tablet':
                iconSize = '60px';
                labelSize = '15px';
                break;
            case 'medium-desktop':
                iconSize = '60px';
                labelSize = '15px';
                break;
            default:
                // 1024px-1199px: 小さめ、1250px以上: 大きめ
                if (window.innerWidth >= 1250) {
                    iconSize = '100px';
                } else if (window.innerWidth >= 1024) {
                    iconSize = '70px';
                } else {
                    iconSize = '80px';
                }
                labelSize = '16px';
                break;
        }
        
        pcIcon.style.width = iconSize;
        pcIcon.style.height = iconSize;
        
        if (node.direction === 'right') {
            pcIcon.style.transform = 'scaleX(-1)';
        }
        
        nodeEl.appendChild(pcIcon);
        
        const label = document.createElement('div');
        label.textContent = `端末${node.label}`;
        label.classList.add('terminal-label');
        label.style.position = 'absolute';
        label.style.left = '50%';
        label.style.transform = 'translateX(-50%)';
        label.style.bottom = '-24px';
        label.style.fontSize = labelSize;
        label.style.fontWeight = 'bold';
        label.style.whiteSpace = 'nowrap';
        nodeEl.appendChild(label);
        
        // タッチイベントでスクロールと区別
        let touchStartY = 0;
        let touchMoved = false;
        let touchTimeout = null;
        
        nodeEl.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            touchMoved = false;
            
            // 既存のタイムアウトをクリア
            if (touchTimeout) {
                clearTimeout(touchTimeout);
                touchTimeout = null;
            }
        }, { passive: true });
        
        nodeEl.addEventListener('touchmove', (e) => {
            const touchCurrentY = e.touches[0].clientY;
            if (Math.abs(touchCurrentY - touchStartY) > 10) { // 閾値を10pxに増加
                touchMoved = true;
            }
        }, { passive: true });
        
        nodeEl.addEventListener('touchend', (e) => {
            if (!touchMoved) {
                e.preventDefault();
                
                // デバウンス処理：連続タップを防ぐ
                if (touchTimeout) return;
                
                touchTimeout = setTimeout(() => {
                    onTerminalClick(id);
                    touchTimeout = null;
                }, 50); // 50ms のデバウンス
            }
        });
        
        // デスクトップ用のクリックイベント（デバウンス付き）
        let clickTimeout = null;
        nodeEl.addEventListener('click', (e) => {
            if (!DeviceUtils.isMobile()) {
                if (clickTimeout) return;
                
                clickTimeout = setTimeout(() => {
                    onTerminalClick(id);
                    clickTimeout = null;
                }, 50);
            }
        });
        nodeEl.title = `端末 ${id}`;
        
        nodeEl.style.left = `${pos.x}px`;
        nodeEl.style.top = `${pos.y}px`;
        
        return nodeEl;
    }
    
    static createRouterNode(id, node, pos, isActive) {
        const nodeEl = document.createElement('div');
        nodeEl.classList.add('node', 'router');
        nodeEl.dataset.id = id;
        
        if (isActive) {
            nodeEl.classList.add('active');
        }
        
        const pcIcon = document.createElement('img');
        pcIcon.src = id === 'Y' 
            ? './images/2E4BA6E2-3E20-4534-9C9D-C00CE40A56E5.png'
            : './images/54475F85-D858-4D12-9F11-AE35D883F9BA.png';
        pcIcon.classList.add('pc-icon');
        
        const deviceType = DeviceUtils.getDeviceType();
        let iconSize = '70px';
        let labelSize = '18px';
        
        switch (deviceType) {
            case 'smartphone':
                iconSize = '35px';
                labelSize = '12px';
                break;
            case 'mobile':
                iconSize = '35px';
                labelSize = '13px';
                break;
            case 'tablet':
                iconSize = '40px';
                labelSize = '14px';
                break;
            case 'medium-desktop':
                iconSize = '40px';
                labelSize = '15px';
                break;
            default:
                // デスクトップ時（1024px以上）はさらに大きく
                iconSize = '60px';
                labelSize = '16px';
                break;
        }
        
        pcIcon.style.width = iconSize;
        pcIcon.style.height = iconSize;
        nodeEl.appendChild(pcIcon);
        
        const label = document.createElement('div');
        label.textContent = `ルータ${node.label}`;
        label.classList.add('terminal-label');
        label.style.position = 'absolute';
        label.style.left = '50%';
        label.style.transform = 'translateX(-50%)';
        label.style.bottom = '0px';
        label.style.fontSize = labelSize;
        label.style.fontWeight = 'bold';
        label.style.color = 'white';
        label.style.whiteSpace = 'nowrap';
        nodeEl.appendChild(label);
        
        nodeEl.title = `ルータ${node.label}`;
        
        nodeEl.style.left = `${pos.x}px`;
        nodeEl.style.top = `${pos.y}px`;
        
        return nodeEl;
    }
}

// ===== ネットワーク接続イベントハンドラー =====
class NetworkConnectionEventHandler {
    constructor(networkModel) {
        this._model = networkModel;
    }
    
    setupNodeEvents(nodeEl, nodeId) {
        const node = this._model.getNodes()[nodeId];
        if (node.type === 'router') return;
        
        nodeEl.addEventListener('mouseenter', () => this._highlightConnections(nodeId));
        nodeEl.addEventListener('mouseleave', () => this._unhighlightConnections(nodeId));
        nodeEl.addEventListener('touchstart', () => this._highlightConnections(nodeId));
        nodeEl.addEventListener('touchend', () => this._unhighlightConnections(nodeId));
    }
    
    _highlightConnections(nodeId) {
        const connections = this._model.getConnections();
        for (const conn of connections) {
            if (conn.from === nodeId || conn.to === nodeId) {
                const connEl = document.querySelector(`.connection[data-id="${conn.id}"]`);
                if (connEl) connEl.classList.add('active');
                
                const portEl = document.querySelector(`.port-label[data-id="port-${conn.id}"]`);
                if (portEl) portEl.classList.add('active');
            }
        }
    }
    
    _unhighlightConnections(nodeId) {
        const connections = this._model.getConnections();
        for (const conn of connections) {
            if (conn.from === nodeId || conn.to === nodeId) {
                const connEl = document.querySelector(`.connection[data-id="${conn.id}"]`);
                if (connEl && !connEl.classList.contains('permanently-active')) {
                    connEl.classList.remove('active');
                }
                
                const portEl = document.querySelector(`.port-label[data-id="port-${conn.id}"]`);
                if (portEl && !portEl.classList.contains('permanently-active')) {
                    portEl.classList.remove('active');
                }
            }
        }
    }
}

// ===== 水エフェクト管理 =====
class WaterEffectManager {
    constructor() {
        this._preservedWaterElements = {};
    }
    
    preserveWaterEffects(networkEl) {
        const terminals = networkEl.querySelectorAll('.terminal');
        terminals.forEach(terminal => {
            const nodeId = terminal.dataset.id;
            const waterContainer = terminal.querySelector('.water-container');
            if (waterContainer) {
                this._preservedWaterElements[nodeId] = waterContainer.cloneNode(true);
            }
        });
    }
    
    restoreWaterEffects(networkEl, loadBalanceManager) {
        Object.keys(this._preservedWaterElements).forEach(nodeId => {
            const terminal = networkEl.querySelector(`.terminal[data-id="${nodeId}"]`);
            if (terminal) {
                const waterContainer = this._preservedWaterElements[nodeId];
                terminal.appendChild(waterContainer);
                
                const pcIcon = terminal.querySelector('.pc-icon');
                if (pcIcon) {
                    pcIcon.style.position = 'relative';
                    pcIcon.style.zIndex = '2';
                }
                
                if (loadBalanceManager) {
                    const newWaterEl = terminal.querySelector('.load-water');
                    if (newWaterEl) {
                        loadBalanceManager._loadWaterElements[nodeId] = newWaterEl;
                        console.log(`水要素キャッシュ更新: ノード${nodeId}`);
                    }
                }
            }
        });
        
        this._preservedWaterElements = {};
    }
}

// ===== モバイルタッチエリア作成 =====
class MobileTouchAreaFactory {
    static create(terminals, onTerminalClick) {
        const touchAreas = [];
        
        terminals.forEach(terminal => {
            const touchArea = document.createElement('div');
            touchArea.className = 'mobile-touch-area';
            
            const deviceType = DeviceUtils.getDeviceType();
            let touchSize = '44px';
            
            switch (deviceType) {
                case 'smartphone':
                    touchSize = '48px';
                    break;
                case 'mobile':
                    touchSize = '46px';
                    break;
                case 'tablet':
                    touchSize = '44px';
                    break;
                default:
                    touchSize = '44px';
                    break;
            }
            
            touchArea.style.width = touchSize;
            touchArea.style.height = touchSize;
            touchArea.style.left = terminal.style.left;
            touchArea.style.top = terminal.style.top;
            touchArea.dataset.target = terminal.dataset.id;
            
            // タッチイベントでスクロールと区別
            let touchStartY = 0;
            let touchMoved = false;
            
            touchArea.addEventListener('touchstart', (e) => {
                touchStartY = e.touches[0].clientY;
                touchMoved = false;
            });
            
            touchArea.addEventListener('touchmove', (e) => {
                const touchCurrentY = e.touches[0].clientY;
                if (Math.abs(touchCurrentY - touchStartY) > 0.01) {
                    touchMoved = true;
                }
            });
            
            touchArea.addEventListener('touchend', (e) => {
                if (!touchMoved) {
                    e.preventDefault();
                    onTerminalClick(touchArea.dataset.target);
                }
            });
            
            // デスクトップ用のクリックイベント
            touchArea.addEventListener('click', (e) => {
                if (!DeviceUtils.isMobile()) {
                    onTerminalClick(touchArea.dataset.target);
                }
            });
            
            touchAreas.push(touchArea);
        });
        
        return touchAreas;
    }
}

// ===== ネットワークレンダラー =====
class NetworkRenderer {
    constructor(networkModel, onTerminalClick, loadBalanceManager = null) {
        this._model = networkModel;
        this._onTerminalClick = onTerminalClick;
        this._loadBalanceManager = loadBalanceManager;
        this._activeElements = new Set();
        this._decorationManager = new DecorationManager();
        this._scaleCalculator = new ScaleFactorCalculator(Constants.NETWORK.BASE_WIDTH, Constants.NETWORK.BASE_HEIGHT);
        this._eventHandler = new NetworkConnectionEventHandler(networkModel);
        this._waterEffectManager = new WaterEffectManager();
    }
    
    calculateScaleFactor() {
        const networkEl = document.getElementById('network');
        if (!networkEl) return;
        
        this._scaleCalculator.calculate(networkEl);
    }
    
    scalePosition(x, y) {
        return this._scaleCalculator.scalePosition(x, y);
    }
      render() {
        const networkEl = document.getElementById('network');
        if (!networkEl) return;

        this._waterEffectManager.preserveWaterEffects(networkEl);

        const zoomArea = networkEl.querySelector('.zoom-area');
        const zoomIndicator = networkEl.querySelector('.zoom-indicator');
        const lyricMeteorContainer = networkEl.querySelector('.lyric-meteor-container');
        
        networkEl.innerHTML = '';

        // zoom-areaとzoom-indicatorを再作成または復元
        if (zoomArea && zoomIndicator) {
            // 既存の要素のサイズを再調整
            this._ensureZoomAreaSize(zoomArea, networkEl);
            networkEl.appendChild(zoomArea);
            networkEl.appendChild(zoomIndicator);
        } else {
            // 要素が存在しない場合は新規作成
            this._createZoomElements(networkEl);
        }
        
        // 歌詞流れ星コンテナを背景の後、端末の前に配置
        if (lyricMeteorContainer) {
            networkEl.appendChild(lyricMeteorContainer);
        }

        this._renderConnections(networkEl);
        this._renderNodes(networkEl);

        this._waterEffectManager.restoreWaterEffects(networkEl, this._loadBalanceManager);

        const offsets = this._scaleCalculator.getOffsets();
        this._decorationManager.render(networkEl, this._scaleCalculator.getScaleFactor(), offsets.x, offsets.y);

        if (DeviceUtils.isMobile()) {
            this._setupTouchTargets(networkEl);
        }
    }
    
    _ensureZoomAreaSize(zoomArea, networkEl) {
        // zoom-areaのサイズをコンテナに合わせて調整
        zoomArea.style.width = '100%';
        zoomArea.style.height = '100%';
        zoomArea.style.position = 'absolute';
        zoomArea.style.top = '0';
        zoomArea.style.left = '0';
        zoomArea.style.zIndex = '5';
        
        // モバイルでスクロール可能、デスクトップでは制限
        const isMobile = DeviceUtils.isMobile() || window.innerWidth <= 1023;
        zoomArea.style.touchAction = isMobile ? 'pan-y' : 'none';
        
        // デスクトップ時は追加の調整
        if (window.innerWidth > 1023) {
            // コンテナの制約を確認して必要に応じて調整
            const networkContainer = document.getElementById('network-container');
            if (networkContainer) {
                const containerRect = networkContainer.getBoundingClientRect();
                const networkRect = networkEl.getBoundingClientRect();
                
                // コンテナとネットワーク要素の高さが異なる場合の調整
                if (containerRect.height !== networkRect.height) {
                    console.log('デスクトップレイアウト調整:', {
                        containerHeight: containerRect.height,
                        networkHeight: networkRect.height
                    });
                }
            }
        }
    }
    
    _createZoomElements(networkEl) {
        // zoom-areaを新規作成
        const zoomArea = document.createElement('div');
        zoomArea.className = 'zoom-area';
        this._ensureZoomAreaSize(zoomArea, networkEl);
        
        // zoom-indicatorを新規作成
        const zoomIndicator = document.createElement('div');
        zoomIndicator.className = 'zoom-indicator';
        zoomIndicator.style.position = 'absolute';
        zoomIndicator.style.width = '40px';
        zoomIndicator.style.height = '40px';
        zoomIndicator.style.borderRadius = '50%';
        zoomIndicator.style.backgroundColor = 'rgba(57, 240, 236, 0.3)';
        zoomIndicator.style.display = 'none';
        
        networkEl.appendChild(zoomArea);
        networkEl.appendChild(zoomIndicator);
    }
    
    updateDestinationDecoration(destination) {
        this._decorationManager.setDestination(destination);
        const networkEl = document.getElementById('network');
        if (networkEl) {
            const offsets = this._scaleCalculator.getOffsets();
            this._decorationManager.render(networkEl, this._scaleCalculator.getScaleFactor(), offsets.x, offsets.y);
        }
    }
    
    setPlayingState(isPlaying) {
        this._decorationManager.setPlayingState(isPlaying);
    }
    
    setActiveElements(elements) {
        this._activeElements = new Set(elements);
    }
    
    updateActiveConnections() {
        const connections = this._model.getConnections();
        const nodes = this._model.getNodes();
        
        for (const connection of connections) {
            const connEl = document.querySelector(`.connection[data-id="${connection.id}"]`);
            const portEl = document.querySelector(`.port-label[data-id="port-${connection.id}"]`);
            
            if (connEl) {
                if (this._activeElements.has(connection.id)) {
                    connEl.classList.add('active');
                } else {
                    connEl.classList.remove('active');
                }
            }
            
            if (portEl) {
                if (this._activeElements.has(`port-${connection.id}`)) {
                    portEl.classList.add('active');
                } else {
                    portEl.classList.remove('active');
                }
            }
        }
        
        for (const [id, node] of Object.entries(nodes)) {
            const nodeEl = document.querySelector(`.node[data-id="${id}"]`);
            if (nodeEl) {
                if (this._activeElements.has(id)) {
                    nodeEl.classList.add('active');
                } else {
                    nodeEl.classList.remove('active');
                }
            }
        }
    }
    
    _renderConnections(networkEl) {
        const nodes = this._model.getNodes();
        const connections = this._model.getConnections();
        
        for (const connection of connections) {
            const fromNode = nodes[connection.from];
            const toNode = nodes[connection.to];
            
            if (!fromNode || !toNode) continue;
            
            const fromPos = this.scalePosition(fromNode.x, fromNode.y);
            const toPos = this.scalePosition(toNode.x, toNode.y);
            
            const connectionEl = NetworkElementFactory.createConnection(
                connection, fromPos, toPos, this._activeElements.has(connection.id)
            );
            networkEl.appendChild(connectionEl);
            
            if (connection.portLabel) {
                const midX = fromPos.x + (toPos.x - fromPos.x) / 2;
                const midY = fromPos.y + (toPos.y - fromPos.y) / 2;
                
                const portLabelEl = NetworkElementFactory.createPortLabel(
                    connection, midX, midY, this._activeElements.has(`port-${connection.id}`)
                );
                networkEl.appendChild(portLabelEl);
            }
        }
    }
    
    _renderNodes(networkEl) {
        const nodes = this._model.getNodes();
        
        for (const [id, node] of Object.entries(nodes)) {
            const pos = this.scalePosition(node.x, node.y);
            
            let nodeEl;
            if (node.type === 'terminal') {
                nodeEl = NetworkElementFactory.createTerminalNode(
                    id, node, pos, this._activeElements.has(id), this._onTerminalClick
                );
            } else {
                nodeEl = NetworkElementFactory.createRouterNode(
                    id, node, pos, this._activeElements.has(id)
                );
            }
            
            this._eventHandler.setupNodeEvents(nodeEl, id);
            networkEl.appendChild(nodeEl);
        }
    }
    
    _setupTouchTargets(networkEl) {
        const terminals = networkEl.querySelectorAll('.terminal');
        const touchAreas = MobileTouchAreaFactory.create(terminals, this._onTerminalClick);
        touchAreas.forEach(area => networkEl.appendChild(area));
    }
}

// ===== 水エフェクト要素作成 =====
class WaterEffectElementFactory {
    static createWaterContainer() {
        const waterContainer = document.createElement('div');
        waterContainer.className = 'water-container';
        waterContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 50%;
            overflow: hidden;
            pointer-events: none;
            z-index: 1;
        `;
        return waterContainer;
    }
    
    static createWaterElement() {
        const waterEl = document.createElement('div');
        waterEl.className = 'load-water';
        waterEl.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 0%;
            background: linear-gradient(to top, rgba(57, 240, 236, 0.4), rgba(131, 252, 250, 0.6));
            border-radius: 0 0 50% 50%;
            transition: height 0.3s ease-out, background 0.3s ease-out;
            z-index: 1;
            pointer-events: none;
            overflow: hidden;
            box-sizing: border-box;
        `;
        return waterEl;
    }
}

// ===== 水エフェクト可視化 =====
class WaterEffectVisualizer {
    constructor() {
        this._loadWaterElements = {};
    }
    
    updateLoadVisual(nodeId, loadPercent) {
        const waterEl = this._getOrCreateWaterElement(nodeId);
        if (!waterEl) {
            console.warn(`水要素が見つかりません: ノード${nodeId}`);
            return;
        }
        
        if (!waterEl.parentElement) {
            console.warn(`水要素がDOMから切断されています: ノード${nodeId}`);
            delete this._loadWaterElements[nodeId];
            return this.updateLoadVisual(nodeId, loadPercent);
        }
        
        waterEl.style.height = `${loadPercent}%`;
        waterEl.className = 'load-water';
        
        if (loadPercent > 80) {
            waterEl.className = 'load-water high-load';
            waterEl.style.background = 'linear-gradient(to top, rgba(255, 0, 100, 0.8), rgba(255, 107, 203, 0.9))';
        } else if (loadPercent > 60) {
            waterEl.className = 'load-water medium-load';
            waterEl.style.background = 'linear-gradient(to top, rgba(57, 240, 236, 0.6), rgba(131, 252, 250, 0.8))';
        } else {
            waterEl.style.background = 'linear-gradient(to top, rgba(57, 240, 236, 0.4), rgba(131, 252, 250, 0.6))';
        }
        
        console.log(`水のレベル更新: ノード${nodeId}, サーバ負荷${loadPercent.toFixed(1)}%, 高さ${waterEl.style.height}`);
    }
    
    reset() {
        Object.keys(this._loadWaterElements).forEach(nodeId => {
            const waterEl = this._loadWaterElements[nodeId];
            if (waterEl) {
                const waterContainer = waterEl.parentElement;
                if (waterContainer) {
                    waterContainer.removeChild(waterEl);
                    if (waterContainer.parentElement) {
                        waterContainer.parentElement.removeChild(waterContainer);
                    }
                }
            }
        });
        this._loadWaterElements = {};
    }
    
    getWaterElement(nodeId) {
        return this._loadWaterElements[nodeId];
    }
    
    _getOrCreateWaterElement(nodeId) {
        if (this._loadWaterElements[nodeId]) {
            const existingWater = this._loadWaterElements[nodeId];
            if (existingWater.parentElement) {
                return existingWater;
            } else {
                delete this._loadWaterElements[nodeId];
            }
        }
        
        const nodeEl = document.querySelector(`.terminal[data-id="${nodeId}"]`);
        if (!nodeEl) return null;
        
        const existingWaterInDOM = nodeEl.querySelector('.load-water');
        if (existingWaterInDOM) {
            this._loadWaterElements[nodeId] = existingWaterInDOM;
            return existingWaterInDOM;
        }
        
        let waterContainer = nodeEl.querySelector('.water-container');
        if (!waterContainer) {
            waterContainer = WaterEffectElementFactory.createWaterContainer();
            nodeEl.appendChild(waterContainer);
        }
        
        const waterEl = WaterEffectElementFactory.createWaterElement();
        
        const pcIcon = nodeEl.querySelector('.pc-icon');
        if (pcIcon) {
            pcIcon.style.position = 'relative';
            pcIcon.style.zIndex = '2';
        }
        
        waterContainer.appendChild(waterEl);
        this._loadWaterElements[nodeId] = waterEl;
        
        console.log(`水要素作成: ノード${nodeId}`);
        
        return waterEl;
    }
}

// ===== ゲームオーバー画面作成 =====
class GameOverScreenFactory {
    static create(nodeId) {
        const gameOverModal = document.createElement('div');
        gameOverModal.className = 'fixed inset-0 bg-space-900 bg-opacity-90 flex items-center justify-center z-50 backdrop-blur-sm animate-fadeIn';
        gameOverModal.innerHTML = `
            <div class="bg-space-800 bg-opacity-90 rounded-xl p-6 max-w-md mx-auto text-center border-2 border-pink-400 shadow-glassy animate-scaleIn">
                <h2 class="text-2xl sm:text-4xl font-display font-bold text-pink-300 mb-4">GAME OVER</h2>
                <div class="mb-6">
                    <p class="text-lg sm:text-xl text-white mb-2">端末 ${nodeId} のサーバが</p>
                    <p class="text-xl sm:text-2xl text-pink-300 font-bold">負荷で停止しちゃった！</p>
                </div>
                <p class="text-miku-300 mb-6 text-sm sm:text-base">送信先を切り替えて負荷分散してね！<br> </p>
                <button onclick="location.reload()" class="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 border-2 border-transparent text-base sm:text-lg font-medium rounded-lg shadow-md text-white bg-gradient-to-r from-pink-400 to-pink-600 hover:from-pink-300 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all duration-200 transform hover:scale-105">
                    <svg xmlns='http://www.w3.org/2000/svg' class='h-5 w-5 sm:h-6 sm:w-6 mr-2' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                        <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
                    </svg>
                    もう一度プレイ
                </button>
            </div>
        `;
        return gameOverModal;
    }
}

// ===== 負荷バランス管理 =====
class LoadBalanceManager {
    constructor() {
        this._loadLevels = { A: 0, B: 0, C: 0, D: 0 };
        this._currentDestination = null;
        this._gameOver = false;
        this._loadDecreaseInterval = null;
        this._visualizer = new WaterEffectVisualizer();
    }
    
    startLoadDecrease() {
        if (this._loadDecreaseInterval) return;
        
        this._loadDecreaseInterval = setInterval(() => {
            if (this._gameOver) return;
            
            Object.keys(this._loadLevels).forEach(nodeId => {
                if (nodeId !== this._currentDestination && this._loadLevels[nodeId] > 0) {
                    this._loadLevels[nodeId] = Math.max(0, this._loadLevels[nodeId] - Constants.NETWORK.LOAD_DECREASE);
                    this._updateLoadVisual(nodeId);
                }
            });
        }, Constants.NETWORK.LOAD_DECREASE_INTERVAL);
    }
    
    stopLoadDecrease() {
        if (this._loadDecreaseInterval) {
            clearInterval(this._loadDecreaseInterval);
            this._loadDecreaseInterval = null;
        }
    }
    
    setCurrentDestination(destination) {
        this._currentDestination = destination;
    }
    
    addLoad(nodeId) {
        if (this._gameOver) return;
        
        this._loadLevels[nodeId] = Math.min(Constants.NETWORK.MAX_LOAD, this._loadLevels[nodeId] + Constants.NETWORK.LOAD_INCREASE);
        this._updateLoadVisual(nodeId);
        
        if (this._loadLevels[nodeId] >= Constants.NETWORK.MAX_LOAD) {
            this._triggerGameOver(nodeId);
        }
    }
    
    reset() {
        this._gameOver = false;
        Object.keys(this._loadLevels).forEach(nodeId => {
            this._loadLevels[nodeId] = 0;
        });
        this._visualizer.reset();
    }
    
    isGameOver() {
        return this._gameOver;
    }
    
    _updateLoadVisual(nodeId) {
        const loadPercent = (this._loadLevels[nodeId] / Constants.NETWORK.MAX_LOAD) * 100;
        this._visualizer.updateLoadVisual(nodeId, loadPercent);
    }
    
    _triggerGameOver(nodeId) {
        this._gameOver = true;
        this.stopLoadDecrease();
        
        console.log(`🔴 ゲームオーバー発生: 端末${nodeId}が満タンになりました`);
        
        if (window.simulation) {
            console.log('🛑 シミュレーション停止中...');
            window.simulation.stopSimulation();
        }
        
        setTimeout(() => {
            const gameOverModal = GameOverScreenFactory.create(nodeId);
            document.body.appendChild(gameOverModal);
            console.log('🔴 ゲームオーバー画面を表示しました');
        }, 100);
    }
    
    get _loadWaterElements() {
        return this._visualizer._loadWaterElements;
    }
}

// ===== 歌詞パケット要素作成 =====
class LyricPacketElementFactory {
    static create(lyric) {
        const lyricEl = document.createElement('div');
        lyricEl.classList.add('packet');
        lyricEl.textContent = lyric.text;
        lyricEl.dataset.id = `lyric-${lyric.id}`;
        lyricEl.title = `歌詞 #${lyric.id}: 「${lyric.text}」 ${lyric.source} → ${lyric.destination}`;
        
        // モバイルスクロール耐性のベーススタイル
        const isMobile = DeviceUtils.isMobile() || window.innerWidth <= 1023;
        lyricEl.style.position = isMobile ? 'fixed' : 'absolute';
        lyricEl.style.zIndex = '1000';
        lyricEl.style.pointerEvents = 'none';
        lyricEl.style.touchAction = isMobile ? 'none' : 'auto';
        lyricEl.style.userSelect = 'none';
        
        const deviceType = DeviceUtils.getDeviceType();
        let fontSize = '12px';
        let height = '24px';
        let padding = '2px 6px';
        
        switch (deviceType) {
            case 'smartphone':
                fontSize = '9px';
                height = '18px';
                padding = '1px 4px';
                break;
            case 'mobile':
                fontSize = '10px';
                height = '20px';
                padding = '2px 5px';
                break;
            case 'tablet':
                fontSize = '11px';
                height = '22px';
                padding = '2px 6px';
                break;
            default:
                fontSize = '12px';
                height = '24px';
                padding = '2px 6px';
                break;
        }
        
        if (lyric.text.length > 5) {
            lyricEl.style.fontSize = fontSize;
            lyricEl.style.width = 'auto';
            lyricEl.style.minWidth = deviceType === 'smartphone' ? '28px' : '36px';
            lyricEl.style.padding = '0 8px';
        }
        
        if (lyric.text.length > 3) {
            lyricEl.style.fontSize = fontSize;
            lyricEl.style.height = height;
            lyricEl.style.padding = padding;
        }
        
        return lyricEl;
    }
}

// ===== 歌詞アニメーション管理 =====
class LyricAnimationManager {
    constructor(networkModel, renderer) {
        this._model = networkModel;
        this._renderer = renderer;
        this._animationFrames = new Map();
        this._activeElements = new Set();
    }
    
    animateLyric(lyric, onComplete) {
        const nodes = this._model.getNodes();
        const fromNode = nodes[lyric.currentNode];
        const toNode = nodes[lyric.nextNode];
        
        if (!fromNode || !toNode) {
            onComplete(lyric);
            return;
        }
        
        const connectionId = this._model.getConnectionId(lyric.currentNode, lyric.nextNode);
        
        this._activeElements.add(lyric.currentNode);
        this._activeElements.add(lyric.nextNode);
        if (connectionId) {
            this._activeElements.add(connectionId);
            this._activeElements.add(`port-${connectionId}`);
        }
        
        this._renderer.setActiveElements(this._activeElements);
        this._renderer.updateActiveConnections();
        
        const networkEl = document.getElementById('network');
        if (!networkEl) {
            onComplete(lyric);
            return;
        }
        
        const lyricEl = LyricPacketElementFactory.create(lyric);
        const fromPos = this._renderer.scalePosition(fromNode.x, fromNode.y);
        lyricEl.style.left = `${fromPos.x}px`;
        lyricEl.style.top = `${fromPos.y}px`;
        
        // モバイルスクロール耐性を追加
        const isMobile = DeviceUtils.isMobile() || window.innerWidth <= 1023;
        lyricEl.style.position = isMobile ? 'fixed' : 'absolute';
        lyricEl.style.zIndex = '1000'; // 高いz-indexで前面表示
        lyricEl.style.pointerEvents = 'none'; // タッチイベントを無効化
        
        networkEl.appendChild(lyricEl);
        
        this._startAnimation(lyric, lyricEl, fromNode, toNode, () => {
            this._removeElement(lyricEl);
            this._cleanupActiveElements(lyric);
            this._renderer.setActiveElements(this._activeElements);
            this._renderer.updateActiveConnections();
            onComplete(lyric);
        });
    }
    
    clearAll() {
        for (const [id, frameId] of this._animationFrames.entries()) {
            cancelAnimationFrame(frameId);
        }
        this._animationFrames.clear();
        this._activeElements.clear();
        
        const networkEl = document.getElementById('network');
        if (!networkEl) return;
        
        const lyricEls = networkEl.querySelectorAll('.packet');
        lyricEls.forEach(el => {
            DOMUtils.fadeOutAndRemove(el);
        });
    }
    
    dispose() {
        this.clearAll();
    }
    
    _startAnimation(lyric, lyricEl, fromNode, toNode, onComplete) {
        const startTime = performance.now();
        const duration = Constants.NETWORK.ANIMATION_DURATION;
        
        const animate = (currentTime) => {
            if (lyric.completed) {
                this._animationFrames.delete(lyric.id);
                onComplete();
                return;
            }
            
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const fromPos = this._renderer.scalePosition(fromNode.x, fromNode.y);
            const toPos = this._renderer.scalePosition(toNode.x, toNode.y);
            
            const x = fromPos.x + (toPos.x - fromPos.x) * progress;
            const y = fromPos.y + (toPos.y - fromPos.y) * progress;
            
            try {
                lyricEl.style.left = `${x}px`;
                lyricEl.style.top = `${y}px`;
            } catch (e) {
                console.error('歌詞位置設定エラー:', e);
                this._animationFrames.delete(lyric.id);
                onComplete();
                return;
            }
            
            if (progress < 1) {
                const frameId = requestAnimationFrame(animate);
                this._animationFrames.set(lyric.id, frameId);
            } else {
                this._animationFrames.delete(lyric.id);
                onComplete();
            }
        };
        
        const frameId = requestAnimationFrame(animate);
        this._animationFrames.set(lyric.id, frameId);
    }
    
    _removeElement(element) {
        try {
            element.classList.add('animate-fadeOut');
            setTimeout(() => {
                try {
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                    }
                } catch (e) {
                    console.error('歌詞要素削除エラー:', e);
                }
            }, 300);
        } catch (e) {
            console.error('歌詞アニメーション終了エラー:', e);
        }
    }
    
    _cleanupActiveElements(lyric) {
        const oldConnectionId = this._model.getConnectionId(lyric.currentNode, lyric.nextNode);
        if (oldConnectionId) {
            let stillActive = false;
            
            for (const frameId of this._animationFrames.keys()) {
                if (frameId !== lyric.id) {
                    stillActive = true;
                    break;
                }
            }
            
            if (!stillActive) {
                this._activeElements.delete(oldConnectionId);
                this._activeElements.delete(`port-${oldConnectionId}`);
            }
        }
    }
}

// ===== 歌詞カウンター管理 =====
class LyricCounterManager {
    update(activeCount) {
        const counter = document.getElementById('packet-counter');
        if (counter) {
            counter.innerHTML = `アクティブな歌詞: <span class="font-bold text-miku-300">${activeCount}</span>`;
        }
    }
}

// ===== 歌詞統計管理 =====
class LyricStatsManager {
    constructor() {
        this.reset();
    }
    
    reset() {
        this._stats = {
            lyricsCreated: 0,
            lyricsDelivered: 0,
            totalHops: 0
        };
    }
    
    incrementCreated() {
        this._stats.lyricsCreated++;
    }
    
    incrementDelivered(hops) {
        this._stats.lyricsDelivered++;
        this._stats.totalHops += hops;
    }
    
    getStats() {
        return this._stats;
    }
}

// ===== 歌詞フロー管理 =====
class LyricFlowManager {
    constructor(networkModel, renderer, animationManager, logManager, loadBalanceManager) {
        this._model = networkModel;
        this._renderer = renderer;
        this._animationManager = animationManager;
        this._logManager = logManager;
        this._loadBalanceManager = loadBalanceManager;
        this._lyrics = [];
        this._lyricId = 0;
        this._statsManager = new LyricStatsManager();
        this._counterManager = new LyricCounterManager();
    }
    
    sendLyric(text, source, destination) {
        this._lyricId++;
        const id = this._lyricId;
        
        const lyric = {
            id,
            source,
            destination,
            text: text,
            currentNode: source,
            nextNode: this._model.getNextHop(source, destination),
            status: 'created',
            createdAt: Date.now(),
            completed: false,
            hops: 0
        };
        
        if (!lyric.nextNode) {
            this._logManager.addEntry(`歌詞 #${id}: 無効なルート設定です。`, 'error');
            return;
        }
        
        this._lyrics.push(lyric);
        this._statsManager.incrementCreated();
        this._logManager.addEntry(`歌詞 #${id}: 「${lyric.text}」を 端末 ${source} から 端末 ${destination} へ送信します。`, 'info');
        this._updateLyricCounter();
        this._moveLyric(lyric);
    }
    
    clearAll() {
        this._lyrics = [];
        this._updateLyricCounter();
        this._animationManager.clearAll();
    }
    
    getActivePacketCount() {
        return this._lyrics.filter(p => !p.completed).length;
    }
    
    hasActivePackets() {
        return this.getActivePacketCount() > 0;
    }
    
    resetStats() {
        this._statsManager.reset();
        this._lyricId = 0;
    }
    
    getStats() {
        return this._statsManager.getStats();
    }
    
    _moveLyric(lyric) {
        if (lyric.completed) return;
        
        lyric.hops++;
        const portNumber = this._model.getPortNumber(lyric.currentNode, lyric.nextNode);
        
        this._animationManager.animateLyric(lyric, (completedLyric) => {
            this._processNextHop(completedLyric);
        });
    }
    
    _processNextHop(lyric) {
        if (lyric.completed) return;
        
        lyric.currentNode = lyric.nextNode;
        
        if (lyric.currentNode === lyric.destination) {
            this._statsManager.incrementDelivered(lyric.hops);
            
            if (this._loadBalanceManager && !this._loadBalanceManager.isGameOver()) {
                this._loadBalanceManager.addLoad(lyric.destination);
            }
            
            lyric.completed = true;
            this._updateLyricCounter();
        } else {
            lyric.nextNode = this._model.getNextHop(lyric.currentNode, lyric.destination);
            
            if (!lyric.nextNode) {
                this._logManager.addEntry(`歌詞 #${lyric.id}: 次ホップが見つかりません。歌詞は破棄されます。`, 'error');
                lyric.completed = true;
                this._updateLyricCounter();
                return;
            }
            
            setTimeout(() => {
                if (!lyric.completed) {
                    this._moveLyric(lyric);
                }
            }, Constants.NETWORK.HOP_DELAY);
        }
    }
    
    _updateLyricCounter() {
        const activeCount = this._lyrics.filter(p => !p.completed).length;
        this._counterManager.update(activeCount);
    }
}

// ===== モーダル管理 =====
class ModalManager {
    showHelp() {
        const helpModal = document.getElementById('help-modal');
        if (helpModal) {
            helpModal.classList.remove('hidden');
            helpModal.classList.add('animate-fadeIn');
        }
    }
    
    hideHelp() {
        const helpModal = document.getElementById('help-modal');
        if (helpModal) {
            this._closeModal(helpModal);
        }
    }
    
    toggleHelp() {
        const helpModal = document.getElementById('help-modal');
        if (helpModal) {
            if (helpModal.classList.contains('hidden')) {
                this.showHelp();
            } else {
                this.hideHelp();
            }
        }
    }
    
    _closeModal(modal) {
        modal.classList.add('animate-fadeOut');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('animate-fadeOut');
        }, 300);
    }
}

// ===== ドロワー管理 =====
class DrawerManager {
    constructor() {
        this._drawer = document.getElementById('sidebar-drawer');
        this._backdrop = document.getElementById('drawer-backdrop');
        this._setupEventListeners();
    }
    
    open() {
        if (this._drawer) this._drawer.classList.add('open');
        if (this._backdrop) this._backdrop.classList.add('open');
    }
    
    close() {
        if (this._drawer) this._drawer.classList.remove('open');
        if (this._backdrop) this._backdrop.classList.remove('open');
    }
    
    isOpen() {
        return this._drawer && this._drawer.classList.contains('open');
    }
    
    _setupEventListeners() {
        const closeBtn = document.getElementById('close-drawer');
        const network = document.getElementById('network');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        if (this._backdrop) {
            this._backdrop.addEventListener('click', () => this.close());
        }
        
        if (network) {
            network.addEventListener('click', () => {
                if (this.isOpen()) {
                    this.close();
                }
            });
        }
        
        this._setupSwipeGestures();
    }
    
    _setupSwipeGestures() {
        if (!DeviceUtils.isMobile() || !this._drawer) return;
        
        const network = document.getElementById('network');
        if (!network) return;
        
        let startY = 0;
        let startTime = 0;
        
        network.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            startTime = Date.now();
        });
        
        network.addEventListener('touchend', (e) => {
            const endY = e.changedTouches[0].clientY;
            const deltaY = startY - endY;
            const deltaTime = Date.now() - startTime;
            
            if (deltaY > 50 && deltaTime < 300) {
                this.open();
            }
        });
        
        this._drawer.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            startTime = Date.now();
        });
        
        this._drawer.addEventListener('touchend', (e) => {
            const endY = e.changedTouches[0].clientY;
            const deltaY = endY - startY;
            const deltaTime = Date.now() - startTime;
            
            if (deltaY > 50 && deltaTime < 300) {
                this.close();
            }
        });
    }
}

// ===== タブ管理 =====
class TabManager {
    constructor() {
        this._setupDesktopTabs();
        this._setupMobileTabs();
    }
    
    _setupDesktopTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.getAttribute('data-tab');
                this._switchTab(targetId, tabButtons, '.tab-content');
            });
        });
    }
    
    _setupMobileTabs() {
        const mobileTabButtons = document.querySelectorAll('.mobile-tab-button');
        mobileTabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.getAttribute('data-tab');
                this._switchTab(targetId, mobileTabButtons, '#mobile-tabs-container .tab-content');
            });
        });
    }
    
    _switchTab(targetId, buttons, contentSelector) {
        buttons.forEach(btn => btn.classList.remove('active'));
        
        const activeButton = Array.from(buttons).find(btn => btn.getAttribute('data-tab') === targetId);
        if (activeButton) {
            activeButton.classList.add('active');
        }
        
        const tabContents = document.querySelectorAll(contentSelector);
        tabContents.forEach(content => {
            if (content.id === targetId) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    }
}

// ===== 歌詞表示管理 =====
class LyricsDisplayManager {
    constructor() {
        this._isVisible = localStorage.getItem('lyricsVisible') === 'true';
        this._displayArea = document.getElementById('lyrics-display-area');
        this._toggleBtn = document.getElementById('lyrics-toggle-btn');
        this._closeBtn = document.getElementById('close-lyrics-btn');
        
        this._setupEventListeners();
        this._updateVisibility();
    }
    
    toggle() {
        this._isVisible = !this._isVisible;
        this._updateVisibility();
        localStorage.setItem('lyricsVisible', this._isVisible);
    }
    
    close() {
        this._isVisible = false;
        this._updateVisibility();
        localStorage.setItem('lyricsVisible', 'false');
    }
    
    _setupEventListeners() {
        if (this._toggleBtn) {
            this._toggleBtn.addEventListener('click', () => this.toggle());
        }
        
        if (this._closeBtn) {
            this._closeBtn.addEventListener('click', () => this.close());
        }
    }
    
    _updateVisibility() {
        if (!this._displayArea) return;
        
        if (this._isVisible) {
            this._displayArea.classList.remove('lyrics-display-area-hidden');
            this._displayArea.classList.add('lyrics-display-area-visible');
            if (this._toggleBtn) this._toggleBtn.classList.add('active');
        } else {
            this._displayArea.classList.add('lyrics-display-area-hidden');
            this._displayArea.classList.remove('lyrics-display-area-visible');
            if (this._toggleBtn) this._toggleBtn.classList.remove('active');
        }
    }
}

// ===== タッチフィードバック管理 =====
class TouchFeedbackManager {
    static addFeedback(element) {
        if (!DeviceUtils.isMobile()) return;
        
        element.addEventListener('touchstart', () => {
            element.classList.add('scale-95', 'opacity-90');
        });
        
        element.addEventListener('touchend', () => {
            element.classList.remove('scale-95', 'opacity-90');
        });
    }
}


// ===== UI状態管理 =====
class UIStateManager {
    updateSimulationStatus(isRunning) {
        const statusEl = document.getElementById('simulation-status');
        if (!statusEl) return;
        
        if (isRunning) {
            statusEl.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-miku-500 bg-opacity-20 text-miku-300 shadow-sm transition-all duration-300';
            statusEl.innerHTML = '<span class="h-2.5 w-2.5 mr-1.5 rounded-full bg-miku-400 animate-pulse"></span>再生中';
        } else {
            statusEl.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-pink-500 bg-opacity-20 text-pink-300 shadow-sm transition-all duration-300';
            statusEl.innerHTML = '<span class="h-2.5 w-2.5 mr-1.5 rounded-full bg-pink-400"></span>停止中';
        }
    }
    
    updateSongSelection(selectedIndex) {
        const songSelect = document.getElementById('song-select');
        if (!songSelect) return;
        
        songSelect.innerHTML = '';
        
        Constants.SONGS_DATA.forEach((song, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${song.title} - ${song.artist}`;
            songSelect.appendChild(option);
        });
        
        songSelect.value = selectedIndex;
        
        if (DeviceUtils.isMobile()) {
            songSelect.classList.add('text-sm');
        }
    }
    
    updateTerminalSelection(terminals) {
        this._updateSelect('source', terminals, 0);
        this._updateSelect('destination', terminals, terminals.length > 1 ? 1 : 0);
    }
      enableButtons(enabled) {
        const buttons = ['send-btn', 'restart-btn', 'song-select', 'source', 'destination'];
        
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                if (id === 'send-btn' && enabled && this._executor && this._executor.isRunning()) {
                    return;
                }
                
                btn.disabled = !enabled;
                if (enabled) {
                    btn.classList.remove('opacity-50', 'cursor-not-allowed');
                    if (id === 'send-btn') {
                        btn.classList.add('hover:scale-105', 'hover:from-amber-300', 'hover:to-amber-500');
                    }
                } else {
                    btn.classList.add('opacity-50', 'cursor-not-allowed');
                    if (id === 'send-btn') {
                        btn.classList.remove('hover:scale-105', 'hover:from-amber-300', 'hover:to-amber-500');
                    }
                }
            }
        });
    }
    
    setLoadingState(isLoading, message = '読み込み中...') {
        const sendBtn = document.getElementById('send-btn');
        const restartBtn = document.getElementById('restart-btn');
        
        if (isLoading) {
            if (sendBtn) {
                const btnText = sendBtn.querySelector('.btn-text');
                const btnIcon = sendBtn.querySelector('.btn-icon');
                if (btnText) btnText.textContent = message;
                if (btnIcon) {
                    btnIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>';
                }
            }
            if (restartBtn) {
                const btnText = restartBtn.querySelector('.btn-text');
                if (btnText) btnText.textContent = message;
            }
            this.enableButtons(false);
        } else {
            if (sendBtn) {
                const btnText = sendBtn.querySelector('.btn-text');
                const btnIcon = sendBtn.querySelector('.btn-icon');
                if (btnText) btnText.textContent = '最初から';
                if (btnIcon) {
                    btnIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6.4-6.4a9 9 0 0112.8 0M3.6 16.4a9 9 0 0012.8 0"></path>';
                }
            }
            if (restartBtn) {
                const btnText = restartBtn.querySelector('.btn-text');
                if (btnText) btnText.textContent = '最初から';
            }
            this.enableButtons(true);
        }
    }
    
    _updateSelect(selectId, options, defaultIndex) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = '';
        
        options.forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `端末 ${id}`;
            select.appendChild(option);
        });
        
        if (options.length > 0) {
            select.value = options[defaultIndex];
        }
    }
}

// ===== 端末選択管理 =====
class TerminalSelectionManager {
    constructor(onDestinationChange) {
        this._onDestinationChange = onDestinationChange;
        this._setupEventListeners();
    }
    
    getSource() {
        const select = document.getElementById('source');
        return select ? select.value : null;
    }
    
    getDestination() {
        const select = document.getElementById('destination');
        return select ? select.value : null;
    }
    
    setDestination(nodeId) {
        const select = document.getElementById('destination');
        if (select) {
            select.value = nodeId;
            this._updateActiveTerminals();
            
            // 重い処理を次のフレームに遅延実行
            requestAnimationFrame(() => {
                this._onDestinationChange(nodeId);
            });
        }
    }
    
    _setupEventListeners() {
        const sourceSelect = document.getElementById('source');
        const destSelect = document.getElementById('destination');
        
        if (sourceSelect) {
            sourceSelect.addEventListener('change', () => this._updateActiveTerminals());
        }
        
        if (destSelect) {
            destSelect.addEventListener('change', () => {
                this._updateActiveTerminals();
                this._onDestinationChange(destSelect.value);
            });
        }
    }
    
    _updateActiveTerminals() {
        const source = this.getSource();
        const destination = this.getDestination();
        
        // 効率化：既存のactive要素のみクリア
        const activeTerminals = document.querySelectorAll('.terminal.active');
        activeTerminals.forEach(el => {
            el.classList.remove('active');
        });
        
        // 新しいactive要素を設定
        if (source) {
            const sourceEl = document.querySelector(`.terminal[data-id="${source}"]`);
            if (sourceEl) sourceEl.classList.add('active');
        }
        
        if (destination) {
            const destEl = document.querySelector(`.terminal[data-id="${destination}"]`);
            if (destEl) destEl.classList.add('active');
        }
    }
}

// ===== ユーザー操作検出 =====
class UserInteractionDetector {
    constructor() {
        this._interacted = false;
        this._setupEventListeners();
    }
    
    hasInteracted() {
        return this._interacted;
    }
    
    showInteractionMessage() {
        if (document.getElementById('user-interaction-message')) return;
        
        const messageEl = document.createElement('div');
        messageEl.id = 'user-interaction-message';
        messageEl.className = 'fixed top-0 left-0 right-0 bg-pink-500 text-white p-2 text-center z-50';
        messageEl.innerHTML = 'ページ上のどこかをクリックして再生を開始してください';
        
        document.body.appendChild(messageEl);
        
        const handleInteraction = () => {
            this._interacted = true;
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        };
        
        document.addEventListener('click', handleInteraction, { once: true });
        document.addEventListener('keydown', handleInteraction, { once: true });
        document.addEventListener('touchstart', handleInteraction, { once: true });
    }
    
    _setupEventListeners() {
        const interactionHandler = () => {
            this._interacted = true;
            
            const messageEl = document.getElementById('user-interaction-message');
            if (messageEl && messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        };
        
        document.addEventListener('click', interactionHandler, { once: true });
        document.addEventListener('keydown', interactionHandler, { once: true });
        document.addEventListener('touchstart', interactionHandler, { once: true });
    }
}

// ===== ゲームクリア画面作成 =====
class GameClearScreenFactory {
    static create() {
        const clearModal = document.createElement('div');
        clearModal.className = 'fixed inset-0 bg-space-900 bg-opacity-90 flex items-center justify-center z-50 backdrop-blur-sm animate-fadeIn game-clear-modal';
        clearModal.innerHTML = `
            <div class="bg-space-800 bg-opacity-90 rounded-xl p-6 max-w-md mx-auto text-center border-2 border-miku-400 shadow-glassy animate-scaleIn">
                <h2 class="text-2xl sm:text-4xl font-display font-bold text-miku-300 mb-4">GAME CLEAR!</h2>
                <div class="mb-6">
                    <p class="text-lg sm:text-xl text-white mb-2">全てのサーバが</p>
                    <p class="text-xl sm:text-2xl text-miku-300 font-bold">負荷分散に成功！</p>
                </div>
                <p class="text-miku-300 mb-6 text-sm sm:text-base">データ転送量を上手に分散できました！<br>おめでとうございます🎉</p>
                <button onclick="location.reload()" class="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 border-2 border-transparent text-base sm:text-lg font-medium rounded-lg shadow-md text-white bg-gradient-to-r from-miku-400 to-miku-600 hover:from-miku-300 hover:to-miku-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-miku-500 transition-all duration-200 transform hover:scale-105">
                    <svg xmlns='http://www.w3.org/2000/svg' class='h-5 w-5 sm:h-6 sm:w-6 mr-2' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                        <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
                    </svg>
                    もう一度プレイ
                </button>
            </div>
        `;
        return clearModal;
    }
}

// ===== ゲーム状態管理 =====
class GameStateManager {
    constructor() {
        this.reset();
    }
    
    reset() {
        this._songCompleted = false;
        this._gameClearShown = false;
        this._lastPosition = 0;
        this._songStartTime = 0;
    }
    
    setSongCompleted(completed) {
        this._songCompleted = completed;
    }
    
    setGameClearShown(shown) {
        this._gameClearShown = shown;
    }
    
    setLastPosition(position) {
        this._lastPosition = position;
    }
    
    setSongStartTime(time) {
        this._songStartTime = time;
    }
    
    isSongCompleted() {
        return this._songCompleted;
    }
    
    isGameClearShown() {
        return this._gameClearShown;
    }
    
    getLastPosition() {
        return this._lastPosition;
    }
    
    getSongStartTime() {
        return this._songStartTime;
    }
    
    getTimeSinceStart() {
        return Date.now() - this._songStartTime;
    }
}

// ===== シミュレーション実行管理 =====
class SimulationExecutor {
    constructor(textAliveManager, logManager, uiStateManager, renderer, loadBalanceManager, gameStateManager) {
        this._textAliveManager = textAliveManager;
        this._logManager = logManager;
        this._uiStateManager = uiStateManager;
        this._renderer = renderer;
        this._loadBalanceManager = loadBalanceManager;
        this._gameStateManager = gameStateManager;
        this._isRunning = false;
        this._isCleaningUp = false;
    }
    
    async start(seekPosition = null) {
        const isResuming = seekPosition !== null;
        
        if (isResuming) {
            console.log('🔄 一時停止位置から再開:', { lastPosition: seekPosition });
            this._logManager.addEntry('一時停止位置から再開します...', 'info');
        } else {
            console.log('🎵 最初から開始');
            this._gameStateManager.reset();
            this._gameStateManager.setSongStartTime(Date.now());
            this._logManager.addEntry('楽曲を最初から開始します...', 'info');
        }
        
        // 歌詞状態を確実にリセット
        this._textAliveManager.forceResetLyricState();
        await new Promise(resolve => setTimeout(resolve, 50));
        this._textAliveManager.forceResetLyricState();
        console.log('✅ 歌詞状態リセット完了');
        
        const success = await this._textAliveManager.requestPlay(seekPosition);
        
        if (success) {
            this._isRunning = true;
            this._uiStateManager.updateSimulationStatus(true);
            this._renderer.setPlayingState(true);
            this._loadBalanceManager.startLoadDecrease();
        }
    }
    
    async stop() {
        if (this._isCleaningUp) {
            console.log('⚠️ 既に一時停止処理中です');
            return;
        }
        
        console.log('⏸️ シミュレーション一時停止処理開始');
        this._isCleaningUp = true;
        
        try {
            await this._textAliveManager.requestPause();
            
            this._isRunning = false;
            console.log('一時停止時の位置を保存:', this._gameStateManager.getLastPosition());
            
            this._uiStateManager.updateSimulationStatus(false);
            this._renderer.setPlayingState(false);
            this._loadBalanceManager.stopLoadDecrease();
            
            console.log('✅ シミュレーション一時停止処理完了');
        } catch (error) {
            console.error('❌ シミュレーション一時停止処理でエラー:', error);
            this._isRunning = false;
            this._uiStateManager.updateSimulationStatus(false);
            this._renderer.setPlayingState(false);
            this._logManager.addEntry('一時停止処理でエラーが発生しましたが、状態をリセットしました。', 'error');
        } finally {
            this._isCleaningUp = false;
        }
    }
    
    async restart() {
        this._gameStateManager.reset();
        
        this._logManager.clear();
        this._logManager.addEntry('再生を最初から開始します...', 'info');
        
        const success = await this._textAliveManager.requestRestart();
        
        if (success) {
            this._logManager.addEntry('再生をスタートしました', 'success');
        } else {
            await this.stop();
            await new Promise(resolve => setTimeout(resolve, 200));
            this._isRunning = true;
            this._uiStateManager.updateSimulationStatus(true);
            this._renderer.setPlayingState(true);
            this._loadBalanceManager.startLoadDecrease();
            this._logManager.addEntry('フォールバックモードでスタートしました', 'info');
        }
    }
    
    setRunning(running) {
        this._isRunning = running;
    }
    
    isRunning() {
        return this._isRunning;
    }
}

// ===== イベントハンドラー管理 =====
class SimulationEventHandlers {
    constructor(simulation) {
        this._simulation = simulation;
    }
    
    handleTextAliveReady() {
        const songInfo = this._simulation._textAliveManager.getCurrentSongInfo();
        if (songInfo) {
            this._simulation._logManager.addEntry(`曲「${songInfo.name}」の準備完了`, 'success');
            if (songInfo.license) {
                console.log('ライセンス情報:', songInfo.license);
            }
        }
        
        // 楽曲準備完了と同時にローディングオーバーレイを更新・削除
        if (this._simulation._loadingOverlay) {
            const loadingText = this._simulation._loadingOverlay.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = '準備完了 - 「最初から」ボタンを押してね';
            }
            
            // ローディング画面をフェードアウトして削除
            setTimeout(() => {
                this._simulation._loadingOverlay.style.opacity = '0';
                setTimeout(() => {
                    DOMUtils.removeElement(this._simulation._loadingOverlay);
                    this._simulation._loadingOverlay = null;
                }, 1000);
            }, 1500);
        }
        
        // 読み込み完了状態に設定
        this._simulation._uiStateManager.setLoadingState(false);
        
        // 一時停止/再開ボタンの初期状態を設定
        this._simulation._uiController._updatePauseButton(false);
    }
    
    handleTimeUpdate(position) {
        if (!this._simulation._executor.isRunning()) {
            console.log('_handleTimeUpdate: シミュレーションが停止中なのでスキップ, position:', position);
            return;
        }
        
        // 再生開始直後の同期問題を回避（50ms未満のみスキップ）
        if (position < 50) {
            console.log('_handleTimeUpdate: 再生開始直後のためスキップ, position:', position);
            return;
        }
        
        this._simulation._gameStateManager.setLastPosition(position);
        
        const duration = this._simulation._textAliveManager.getSongDuration();
        
        if (position % 10000 < 100) {
            console.log('再生進捗:', {
                position: Math.floor(position / 1000) + '秒',
                duration: Math.floor(duration / 1000) + '秒',
                remaining: Math.floor((duration - position) / 1000) + '秒',
                progress: duration > 0 ? Math.floor((position / duration) * 100) + '%' : 'N/A'
            });
        }
        
        const timeSinceStart = this._simulation._gameStateManager.getTimeSinceStart();
        
        // 楽曲の95%以上再生された時点で終了フラグを設定
        if (duration > 0 && position >= duration * 0.95 && position >= Constants.NETWORK.MIN_PLAYBACK_TIME && timeSinceStart >= Constants.NETWORK.MIN_PLAYBACK_TIME) {
            console.log('🎵 曲がもうすぐ終了:', { position, duration, remaining: duration - position, progress: Math.floor((position / duration) * 100) + '%' });
            this._simulation._gameStateManager.setSongCompleted(true);
        }
        
        // より緩い条件でゲームクリア画面を表示
        if (duration > 0 && position >= duration * 0.995 && !this._simulation._loadBalanceManager.isGameOver()) {
            if (position >= 5000 && timeSinceStart >= 5000) { // 5秒に短縮
                console.log('🎵 曲が終了しました（TimeUpdateから検出）:', { position, duration, progress: Math.floor((position / duration) * 100) + '%' });
                this._simulation._showGameClearScreen();
            } else {
                console.log('⚠️ 楽曲開始から5秒未満のため、TimeUpdateでの終了処理をスキップします');
            }
        }
        
        // 前回位置から現在位置までの未処理単語をすべて処理
        const processedWords = this._simulation._textAliveManager.processWordsInRange(position);
        
        // シークや再生開始時の飛ばした時間帯も含めて漏れなく処理
        // 複数歌詞の同時送信を防ぐため、時間差をつけて個別送信
        processedWords.forEach((word, index) => {
            setTimeout(() => {
                // 歌詞送信前に楽曲との同期を再確認
                const currentPlayState = this._simulation._textAliveManager.isPlaying();
                if (currentPlayState) {
                    const sendResult = this._simulation._sendLyricWord(word);
                    if (sendResult !== false) {
                        this._simulation._lyricMeteorManager.createLyricMeteor(word.text);
                    }
                } else {
                    console.log('歌詞送信時に楽曲停止を検出、送信をスキップ:', word.text);
                }
            }, index * 150); // 150ms間隔で個別送信
        });
    }
    
    handlePlay() {
        console.log('_handlePlay イベント発生');
        
        // 参考.jsのようにローディング画面をフェードアウトして削除（まだ存在する場合のみ）
        if (this._simulation._loadingOverlay) {
            this._simulation._loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                if (this._simulation._loadingOverlay) {
                    DOMUtils.removeElement(this._simulation._loadingOverlay);
                    this._simulation._loadingOverlay = null;
                }
            }, 1000);
        }
        
        // 既存の歌詞流れ星とパケットをクリア
        this._simulation._lyricFlowManager.clearAll();
        this._simulation._lyricMeteorManager.clearAllMeteors();
        
        // 歌詞重複チェック用のMapをクリア
        if (this._simulation._lastSentLyrics) {
            this._simulation._lastSentLyrics.clear();
            console.log('歌詞重複チェック履歴をクリア');
        }
        
        // 範囲処理方式：送信済み歌詞履歴をクリア
        this._simulation._textAliveManager.clearSentWords();
        
        this._simulation._logManager.addEntry('再生開始', 'success');
        this._simulation._executor.setRunning(true);
        this._simulation._gameStateManager.setSongCompleted(false);
        this._simulation._gameStateManager.setGameClearShown(false);
        
        const wasResuming = this._simulation._gameStateManager.getLastPosition() > 0 && !this._simulation._gameStateManager.isSongCompleted();
        if (!wasResuming) {
            this._simulation._gameStateManager.setLastPosition(0);
            this._simulation._gameStateManager.setSongStartTime(Date.now());
            console.log('_handlePlay: 最初から開始');
            
            // TextAlive APIのanimate機能により歌詞処理を自動化
            console.log('_handlePlay: 最初から開始 - TextAlive APIのanimate機能で歌詞処理');
        } else {
            console.log('_handlePlay: 一時停止位置から再開');
        }
        
        this._simulation._uiStateManager.updateSimulationStatus(true);
        this._simulation._renderer.setPlayingState(true);
        this._simulation._loadBalanceManager.startLoadDecrease();
        
        this._simulation._uiController._updatePauseButton(true);
        
        const destination = this._simulation._terminalSelectionManager.getDestination();
        if (destination) {
            this._simulation._loadBalanceManager.setCurrentDestination(destination);
        }
    }
    
    handlePause() {
        console.log('🔄 _handlePause イベント発生');
        
        const position = this._simulation._textAliveManager.getCurrentPosition();
        const duration = this._simulation._textAliveManager.getSongDuration();
        const isNearEnd = duration > 0 && position > 0 && (duration - position) <= 2000;
        
        if (isNearEnd || this._simulation._gameStateManager.isSongCompleted()) {
            console.log('曲終了間近のため一時停止処理をスキップ');
            return;
        }
        
        console.log('通常の一時停止');
        this._simulation._logManager.addEntry('再生一時停止', 'info');
        this._simulation._executor.setRunning(false);
        this._simulation._uiStateManager.updateSimulationStatus(false);
        this._simulation._renderer.setPlayingState(false);
        this._simulation._loadBalanceManager.stopLoadDecrease();
        
        this._simulation._uiController._updatePauseButton(false);
    }
    
    handleStop() {
        console.log('🛑 _handleStop が呼ばれました');
        this._simulation._logManager.addEntry('再生停止', 'info');
        this._simulation._executor.setRunning(false);
        this._simulation._lyricFlowManager.clearAll();
        this._simulation._uiStateManager.updateSimulationStatus(false);
        this._simulation._uiStateManager.enableButtons(true);
        this._simulation._renderer.setPlayingState(false);
        this._simulation._loadBalanceManager.stopLoadDecrease();
        
        // 停止時は曲を再開ボタンに戻す
        this._simulation._uiController._updatePauseButton(false);
        
        if (this._simulation._textAliveManager.isPlaying()) {
            console.log('まだ再生中なのでリターン');
            return;
        }
        
        const position = this._simulation._textAliveManager.getCurrentPosition();
        const duration = this._simulation._textAliveManager.getSongDuration();
        const timeSinceStart = this._simulation._gameStateManager.getTimeSinceStart();
        
        if (position < 5000 || timeSinceStart < 5000) { // 10秒から5秒に短縮
            console.log('⚠️ 楽曲開始から5秒未満のため、終了処理をスキップします');
            return;
        }
        
        const isNearEnd = duration > 0 && position > 0 && (duration - position) < 10000; // 5秒から10秒に緩和
        const isSongCompleted = this._simulation._gameStateManager.isSongCompleted();
        const isPositionAtEnd = duration > 0 && position >= duration * 0.9; // 95%から90%に緩和
        
        if (isNearEnd || isSongCompleted || isPositionAtEnd) {
            console.log('✅ 曲の終了条件を満たしました:', { position, duration, remaining: duration - position, progress: Math.floor((position / duration) * 100) + '%' });
            if (!this._simulation._loadBalanceManager.isGameOver()) {
                this._simulation._showGameClearScreen();
                return;
            }
        }
        
        console.log('曲が途中で停止されました');
    }
}

// ===== UIコントローラー =====
class UIController {
    constructor(simulation) {
        this._simulation = simulation;
        this._modalManager = new ModalManager();
        this._drawerManager = new DrawerManager();
        this._tabManager = new TabManager();
        this._lyricsDisplayManager = new LyricsDisplayManager();
        
        this._setupEventListeners();
        
        setTimeout(() => this._modalManager.showHelp(), 500);
    }
    
    handleTerminalClick(id) {
        // 同じ端末タップの場合は無反応
        if (this._simulation._terminalSelectionManager.getDestination() === id) {
            return;
        }

        // 処理落ちを防ぐため、重い処理を非同期で実行
        requestAnimationFrame(() => {
            this._simulation._terminalSelectionManager.setDestination(id);
            console.log(`端末 ${id} がタッチされました。送信先を ${id} に設定しました。`);
        });
    }
    
    _setupEventListeners() {
        const sendBtn = document.getElementById('send-btn');
        const restartBtn = document.getElementById('restart-btn');
        const songSelect = document.getElementById('song-select');
        const helpBtn = document.getElementById('help-btn');
        const closeHelp = document.getElementById('close-help');
        const closeHelpBtn = document.getElementById('close-help-btn');
          // 一時停止/再開ボタンの処理
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                if (!sendBtn.disabled) {
                    if (this._simulation._textAliveManager.isPlaying()) {
                        // 再生中なら一時停止
                        this._simulation.stopSimulation();
                    } else {
                        // 停止中なら途中から再開
                        this._simulation.startPlayback();
                    }
                }
            });
            TouchFeedbackManager.addFeedback(sendBtn);
        }
        
        // 最初からボタンで再生開始
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this._simulation.restartPlayback();
            });
            TouchFeedbackManager.addFeedback(restartBtn);
        }
        
        if (songSelect) {
            songSelect.addEventListener('change', () => {
                const selectedIndex = parseInt(songSelect.value);
                this._simulation.changeSong(selectedIndex);
            });
        }
        
        if (helpBtn) {
            helpBtn.addEventListener('click', () => this._modalManager.showHelp());
        }
        
        if (closeHelp) {
            closeHelp.addEventListener('click', () => this._modalManager.hideHelp());
        }
        
        if (closeHelpBtn) {
            closeHelpBtn.addEventListener('click', () => this._modalManager.hideHelp());
        }
        
        const helpModal = document.getElementById('help-modal');
        if (helpModal) {
            helpModal.addEventListener('click', (e) => {
                if (e.target === helpModal) {
                    this._modalManager.hideHelp();
                }
            });
            
            helpModal.addEventListener('touchend', (e) => {
                if (e.target === helpModal) {
                    this._modalManager.hideHelp();
                }
            });
        }
        
        // Hキーでヘルプモーダルを表示/非表示
        document.addEventListener('keydown', (e) => {
            if (e.key === 'h' || e.key === 'H') {
                e.preventDefault();
                this._modalManager.toggleHelp();
            }
        });
        
        document.addEventListener('fullscreenchange', () => this._simulation.handleResize());
        document.addEventListener('webkitfullscreenchange', () => this._simulation.handleResize());
    }
    
    _updatePauseButton(isPlaying) {
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) {
            const btnText = sendBtn.querySelector('.btn-text');
            const btnIcon = sendBtn.querySelector('.btn-icon');
            
            // 既存のホバーエフェクトをクリア
            sendBtn.classList.remove('hover:from-miku-300', 'hover:to-miku-500', 'hover:from-amber-300', 'hover:to-amber-500');
            
            if (isPlaying) {
                // 再生中は一時停止ボタンとして表示
                if (btnText) btnText.textContent = '一時停止';
                if (btnIcon) {
                    btnIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>';
                }
                sendBtn.disabled = false;
                sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                sendBtn.classList.add('hover:scale-105', 'hover:from-amber-300', 'hover:to-amber-500');
            } else {
                // 停止中は再開ボタンとして表示（途中から再生可能な場合のみ）
                const hasProgress = this._simulation._gameStateManager.getLastPosition() > 0;
                if (hasProgress) {
                    if (btnText) btnText.textContent = '曲を再開';
                    if (btnIcon) {
                        btnIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6.4-6.4a9 9 0 0112.8 0M3.6 16.4a9 9 0 0012.8 0"></path>';
                    }
                    sendBtn.disabled = false;
                    sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    sendBtn.classList.add('hover:scale-105', 'hover:from-amber-300', 'hover:to-amber-500');
                } else {
                    // 進行状況がない場合は無効化
                    if (btnText) btnText.textContent = '一時停止';
                    if (btnIcon) {
                        btnIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>';
                    }
                    sendBtn.disabled = true;
                    sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
                    sendBtn.classList.remove('hover:scale-105', 'hover:from-amber-300', 'hover:to-amber-500');
                }
            }
        }
    }
}

// ===== メインシミュレーションクラス =====
class LyricsNetworkSimulation {
    constructor() {
        this._loadingOverlay = DOMUtils.createLoadingOverlay();
        document.body.appendChild(this._loadingOverlay);
        
        // パフォーマンス最適化用プロパティ
        this._decorationUpdateTimeout = null;
        
        // 各種マネージャーの初期化
        this._networkModel = new NetworkModel();
        this._logManager = new LogManager();
        this._loadBalanceManager = new LoadBalanceManager();
        this._renderer = new NetworkRenderer(
            this._networkModel,
            (id) => this._uiController.handleTerminalClick(id),
            this._loadBalanceManager
        );
        this._animationManager = new LyricAnimationManager(this._networkModel, this._renderer);
        this._lyricMeteorManager = new LyricMeteorManager();
        this._lyricFlowManager = new LyricFlowManager(
            this._networkModel,
            this._renderer,
            this._animationManager,
            this._logManager,
            this._loadBalanceManager
        );
        
        this._eventHandlers = new SimulationEventHandlers(this);
        
        this._textAliveManager = new TextAliveManager(
            () => this._eventHandlers.handleTextAliveReady(),
            (position) => this._eventHandlers.handleTimeUpdate(position),
            () => this._eventHandlers.handlePlay(),
            () => this._eventHandlers.handlePause(),
            () => this._eventHandlers.handleStop()
        );
        
        this._userInteractionDetector = new UserInteractionDetector();
        this._gameStateManager = new GameStateManager();
        this._uiStateManager = new UIStateManager();
        this._terminalSelectionManager = new TerminalSelectionManager((destination) => {
            this.updateDestinationDecoration(destination);
            this._loadBalanceManager.setCurrentDestination(destination);
        });
        
        this._executor = new SimulationExecutor(
            this._textAliveManager,
            this._logManager,
            this._uiStateManager,
            this._renderer,
            this._loadBalanceManager,
            this._gameStateManager
        );
        
        // UIStateManagerにexecutorの参照を設定
        this._uiStateManager._executor = this._executor;
        
        this._uiController = new UIController(this);
        
        // 初期化処理
        this._initialize();
    }
    
    async _initialize() {
        this._initUI();
        this._renderer.calculateScaleFactor();
        this._renderer.render();
        
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleResize(), 100);
        });
        window.addEventListener('beforeunload', () => this.dispose());
        
        // 装飾画像の事前読み込み（TextAlive初期化より先に実行）
        console.log('装飾画像の事前読み込みを開始...');
        await ImagePreloader.preloadDecorationImages();
        
        await this._textAliveManager.initialize();
        
        const allImagePaths = ImagePreloader.getAllDecorationImagePaths();
        await ImagePreloader.preloadImages(allImagePaths);
    }
    
    _initUI() {
        this._logManager.addEntry('シミュレーションを初期化しました。', 'system');
        this._logManager.addEntry('TextAlive APIを読み込み中です。', 'system');
        this._logManager.addEntry('「最初から」ボタンをクリックして再生を開始します。', 'system');
        this._logManager.addEntry('「H」キーを押すとヘルプが表示されます。', 'system');
        
        this._uiStateManager.updateSimulationStatus(false);
        this._uiStateManager.updateSongSelection(this._textAliveManager.getSelectedSongIndex());
        this._uiStateManager.updateTerminalSelection(this._networkModel.getTerminalNodes());
        this._uiStateManager.setLoadingState(true, 'API読み込み中...'); // API読み込み中状態に設定
        
        const destination = this._terminalSelectionManager.getDestination();
        if (destination) {
            this.updateDestinationDecoration(destination);
        }
    }
    
    async startPlayback() {
        if (!this._textAliveManager.isReady()) {
            this._logManager.addEntry('曲の準備ができていません。しばらくお待ちください。', 'error');
            this._uiStateManager.setLoadingState(true);
            return;
        }
        
        if (this._executor.isRunning()) {
            this.stopSimulation();
            return;
        }
        
        if (!this._userInteractionDetector.hasInteracted()) {
            this._userInteractionDetector.showInteractionMessage();
            this._logManager.addEntry('再生を開始するには、ページ上で操作してください。', 'info');
            
            const handleInteraction = () => {
                setTimeout(() => {
                    this._actuallyStartPlayback(false);
                }, 100);
            };
            
            document.addEventListener('click', handleInteraction, { once: true });
            document.addEventListener('keydown', handleInteraction, { once: true });
            document.addEventListener('touchstart', handleInteraction, { once: true });
            
            return;
        }
        
        const isResuming = this._gameStateManager.getLastPosition() > 0 && !this._gameStateManager.isSongCompleted();
        this._actuallyStartPlayback(isResuming);
    }
      async _actuallyStartPlayback(isResuming = false) {
        const seekPosition = isResuming ? this._gameStateManager.getLastPosition() : null;
        
        this._uiController._updatePauseButton(true);
        
        await this._executor.start(seekPosition);
    }
    
    async stopSimulation() {
        await this._executor.stop();
        this._uiStateManager.enableButtons(true);
        
        const activePackets = this._lyricFlowManager.getActivePacketCount();
        console.log('一時停止: パケット歌詞は配送完了まで継続します。アクティブパケット数:', activePackets);
        
        if (activePackets > 0) {
            this._monitorPacketCompletion();
        }
    }
    
    async restartPlayback() {
        if (!this._textAliveManager.isReady()) {
            this._logManager.addEntry('曲の準備ができていません。しばらくお待ちください。', 'error');
            this._uiStateManager.setLoadingState(true, '読み込み中...');
            return;
        }
        
        // 最初からボタンもローディング状態にする
        this._uiStateManager.setLoadingState(true, '読み込み中...');
        
        if (this._executor.isRunning()) {
            this._lyricFlowManager.clearAll();
            this._renderer.setActiveElements(new Set());
            this._renderer.render();
        }
        
        this._lyricFlowManager.resetStats();
        this._loadBalanceManager.reset();
        
        try {
            await this._executor.restart();
            
            // 再開完了後にローディング状態を解除し、一時停止ボタンに切り替え
            setTimeout(() => {
                this._uiStateManager.setLoadingState(false);
                this._uiController._updatePauseButton(true);
            }, 500);
        } catch (error) {
            console.error('スタートエラー:', error);
            this._uiStateManager.setLoadingState(false);
            this._uiController._updatePauseButton(false);
        }
    }
    
    async changeSong(songIndex) {
        await this.stopSimulation();
        await new Promise(resolve => setTimeout(resolve, 300));
        
        this._gameStateManager.reset();
        this._loadBalanceManager.reset();
        this._lyricFlowManager.clearAll();
        this._lyricFlowManager.resetStats();
        this._logManager.clear();
        
        this._uiStateManager.enableButtons(false);
        this._uiStateManager.setLoadingState(true, '楽曲読み込み中...');
        
        // ローディングオーバーレイを作成（既存のものが無効な場合）
        if (!this._loadingOverlay || !this._loadingOverlay.parentNode) {
            this._loadingOverlay = DOMUtils.createLoadingOverlay();
        }
        if (!this._loadingOverlay.parentNode) {
            document.body.appendChild(this._loadingOverlay);
        }
        
        try {
            const selectedSong = Constants.SONGS_DATA[songIndex];
            this._logManager.addEntry(`曲「${selectedSong.title}」を読み込み中...`, 'system');
            
            // 曲変更前に明示的に再生を停止
            if (this._textAliveManager.isPlaying()) {
                console.log('曲変更前に再生を停止します');
                await this._textAliveManager.requestPause();
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            await this._textAliveManager.changeSong(songIndex);
            
            // 楽曲準備完了まで待機（_handleVideoReadyで処理される）
        } catch (error) {
            console.error('曲変更エラー:', error);
            this._logManager.addEntry(`曲変更エラー: ${error.message}`, 'error');
            DOMUtils.removeElement(this._loadingOverlay);
            this._uiStateManager.enableButtons(true);
        }
    }
    
    handleResize() {
        // スクロール中はリサイズ処理をスキップ
        if (window.isScrolling) {
            console.log('スクロール中のためリサイズ処理をスキップ');
            return;
        }
        
        // モバイル高さ固定化を再実行
        fixMobileViewportHeight();
        
        // zoom-areaのサイズを強制的に更新
        this._updateZoomAreaSize();
        
        // レンダリング処理を遅延実行で安定化
        requestAnimationFrame(() => {
            this._renderer.calculateScaleFactor();
            this._renderer.render();
        });
    }
    
    _updateZoomAreaSize() {
        const networkEl = document.getElementById('network');
        const networkContainer = document.getElementById('network-container');
        const zoomArea = networkEl?.querySelector('.zoom-area');
        
        if (networkEl && zoomArea) {
            // コンテナのサイズを再取得
            const containerWidth = networkEl.clientWidth;
            const containerHeight = networkEl.clientHeight;
            
            // デバイスタイプに応じた調整
            if (window.innerWidth > 1023) {
                // デスクトップ: 自然なレイアウトを維持
                if (networkContainer) {
                    // 固定高さをリセット
                    networkContainer.style.height = '';
                    networkContainer.style.minHeight = '';
                    networkContainer.style.maxHeight = '';
                    networkContainer.style.flexShrink = '';
                }
            }
            
            // zoom-areaのサイズを強制更新
            zoomArea.style.width = '100%';
            zoomArea.style.height = '100%';
            zoomArea.style.position = 'absolute';
            zoomArea.style.top = '0';
            zoomArea.style.left = '0';
            
            console.log('zoom-area サイズ更新:', { 
                containerWidth, 
                containerHeight, 
                deviceWidth: window.innerWidth,
                isDesktop: window.innerWidth > 1023 
            });
        }
    }
    
    updateDestinationDecoration(destination) {
        // デバウンス処理：連続する装飾更新を防ぐ
        if (this._decorationUpdateTimeout) {
            clearTimeout(this._decorationUpdateTimeout);
        }
        
        this._decorationUpdateTimeout = setTimeout(() => {
            this._renderer.updateDestinationDecoration(destination);
            this._decorationUpdateTimeout = null;
        }, 100); // 100ms のデバウンス
    }
    
    isRunning() {
        return this._executor.isRunning();
    }
    
    getTerminalNodes() {
        return this._networkModel.getTerminalNodes();
    }
    
    getSelectedSongIndex() {
        return this._textAliveManager.getSelectedSongIndex();
    }
    
    dispose() {
        window.removeEventListener('resize', () => this.handleResize());
        this._animationManager.dispose();
        this._textAliveManager.dispose();
        this._logManager.dispose();
        this._lyricFlowManager.clearAll();
    }
    
    _sendLyricWord(word) {
        if (!this._executor.isRunning() || !word) return false;
        
        const source = this._terminalSelectionManager.getSource();
        const destination = this._terminalSelectionManager.getDestination();
        
        if (!source || !destination) return false;
        
        // 歌詞の重複送信チェック - 同じテキストが短時間内に送信されていないかチェック
        const currentTime = Date.now();
        if (!this._lastSentLyrics) this._lastSentLyrics = new Map();
        
        const lastSentTime = this._lastSentLyrics.get(word.text);
        if (lastSentTime && (currentTime - lastSentTime) < 1000) { // 1秒以内の重複を防ぐ
            console.log('歌詞重複送信をスキップ:', word.text);
            return false;
        }
        
        this._lastSentLyrics.set(word.text, currentTime);
        this._lyricFlowManager.sendLyric(word.text, source, destination);
        return true;
    }
    
    _showGameClearScreen() {
        if (document.querySelector('.game-clear-modal') || this._gameStateManager.isGameClearShown()) {
            console.log('⚠️ ゲームクリア画面は既に表示されています');
            return;
        }
        
        console.log('🎉 ゲームクリア画面を表示します');
        console.log('ゲームクリア時の状態:', {
            position: this._textAliveManager.getCurrentPosition(),
            duration: this._textAliveManager.getSongDuration(),
            isGameOver: this._loadBalanceManager.isGameOver(),
            songCompleted: this._gameStateManager.isSongCompleted(),
            gameClearShown: this._gameStateManager.isGameClearShown()
        });
        
        this._gameStateManager.setGameClearShown(true);
        this._logManager.addEntry('🎉 おめでとう！曲を最後まで乗り切りました！ 🎉', 'success');
        this._logManager.addEntry('サーバ負荷を上手くバランスできました！', 'success');
        
        const clearModal = GameClearScreenFactory.create();
        document.body.appendChild(clearModal);
        
        this.stopSimulation();
    }
    
    _monitorPacketCompletion() {
        const checkInterval = setInterval(() => {
            const activePackets = this._lyricFlowManager.getActivePacketCount();
            console.log('パケット完了監視: 残りパケット数', activePackets);
            
            if (activePackets === 0) {
                clearInterval(checkInterval);
                console.log('✅ すべてのパケットが配送完了しました');
            }
        }, 500);
        
        setTimeout(() => {
            clearInterval(checkInterval);
        }, 30000);
    }
}

// ===== 歌詞流れ星エフェクト管理 =====
class LyricMeteorManager {
    constructor() {
        this._meteors = [];
        this._meteorContainer = null;
        this._initContainer();
    }
    
    _initContainer() {
        // コンテナは初期化時に作成せず、必要時にネットワーク要素内に作成
        this._meteorContainer = null;
    }
    
    _ensureMeteorContainer() {
        const networkEl = document.getElementById('network');
        if (!networkEl) return null;
        
        // 既存のコンテナを探す
        let container = networkEl.querySelector('.lyric-meteor-container');
        if (!container) {
            // 新しいコンテナを作成
            container = document.createElement('div');
            container.className = 'lyric-meteor-container';
            container.style.position = 'absolute';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.pointerEvents = 'none';
            container.style.overflow = 'hidden';
            
            // zoom-areaの後、端末要素の前に挿入（z-indexを使わない自然な表示順序）
            const zoomArea = networkEl.querySelector('.zoom-area');
            if (zoomArea && zoomArea.nextSibling) {
                networkEl.insertBefore(container, zoomArea.nextSibling);
            } else {
                // zoom-areaがない場合は最初の子要素として追加
                if (networkEl.firstChild) {
                    networkEl.insertBefore(container, networkEl.firstChild);
                } else {
                    networkEl.appendChild(container);
                }
            }
        }
        
        this._meteorContainer = container;
        return container;
    }
    
    createLyricMeteor(text) {
        const container = this._ensureMeteorContainer();
        if (!container || !text) return;
        
        const meteor = document.createElement('div');
        meteor.className = 'lyric-meteor';
        meteor.textContent = text;
        
        // z-indexではなく、position設定のみ
        meteor.style.position = 'absolute';
        meteor.style.pointerEvents = 'none';
        
        // 端末ACと同じ高さ（中央付近）
        let randomY;
        if (window.innerWidth >= 768) {
            // タブレット以上: より広い範囲
            randomY = Math.random() * 80 + 0; 
        } else {
            // モバイル: 狭い範囲
            randomY = Math.random() * 40 + 0;
        }
        meteor.style.top = randomY + 'px';
        
        // フォントサイズをデバイスに応じて調整
        if (window.innerWidth <= 640) {
            meteor.style.fontSize = '14px';
        } else if (window.innerWidth <= 1024) {
            meteor.style.fontSize = '18px';
        } else {
            // デスクトップ用に大きなフォントサイズ
            meteor.style.fontSize = '30px';
        }
        
        // 長いテキストの場合は少し小さくする
        if (text.length > 8) {
            const currentSize = parseInt(meteor.style.fontSize);
            meteor.style.fontSize = (currentSize - 2) + 'px';
        }
        
        container.appendChild(meteor);
        this._meteors.push(meteor);
        
        // アニメーション終了後に削除
        setTimeout(() => {
            this._removeMeteor(meteor);
        }, 6000);
    }
    
    _removeMeteor(meteor) {
        if (meteor && meteor.parentNode) {
            meteor.parentNode.removeChild(meteor);
        }
        this._meteors = this._meteors.filter(m => m !== meteor);
    }
    
    clearAllMeteors() {
        this._meteors.forEach(meteor => this._removeMeteor(meteor));
        this._meteors = [];
        
        // コンテナ自体も削除
        const networkEl = document.getElementById('network');
        if (networkEl) {
            const container = networkEl.querySelector('.lyric-meteor-container');
            if (container) {
                container.remove();
            }
        }
        this._meteorContainer = null;
    }
}

// ===== モバイル viewport 高さ固定化 =====
function fixMobileViewportHeight() {
    if (window.innerWidth <= 768) {
        // 実際のviewport高さを取得
        const actualVh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${actualVh}px`);
        
        // ネットワークコンテナの高さを固定
        const networkContainer = document.getElementById('network-container');
        if (networkContainer) {
            networkContainer.style.height = '400px';
            networkContainer.style.minHeight = '320px';
            networkContainer.style.maxHeight = '400px';
            networkContainer.style.flexShrink = '0';
            // containを無効化して装飾画像を保護
            networkContainer.style.contain = 'none';
            networkContainer.style.overflow = 'hidden';
            // モバイル用タッチイベント制御を追加
            networkContainer.style.touchAction = 'none';
            networkContainer.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
            networkContainer.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
        }
        
        // ネットワーク要素自体も固定
        const network = document.getElementById('network');
        if (network) {
            network.style.position = 'fixed'; // absoluteからfixedに変更してスクロールを無効化
            network.style.top = '0';
            network.style.left = '0';
            network.style.width = '100%';
            network.style.height = '100%';
            network.style.overflow = 'hidden';
            // スクロール中の装飾画像消失を防ぐため、containを無効化
            network.style.contain = 'none';
            // 代わりにwill-changeで最適化
            network.style.willChange = 'transform';
            // モバイルでのタッチスクロールを無効化
            network.style.touchAction = 'none';
            network.style.userSelect = 'none';
            
            // zoom-areaのサイズも強制更新
            const zoomArea = network.querySelector('.zoom-area');
            if (zoomArea) {
                zoomArea.style.width = '100%';
                zoomArea.style.height = '100%';
                zoomArea.style.position = 'absolute';
                zoomArea.style.top = '0';
                zoomArea.style.left = '0';
                // zoom-areaのcontainも無効化して装飾画像を保護
                zoomArea.style.contain = 'none';
                zoomArea.style.willChange = 'transform';
                // モバイルでスクロール可能に変更
                const isMobile = DeviceUtils.isMobile() || window.innerWidth <= 1023;
                zoomArea.style.touchAction = isMobile ? 'pan-y' : 'none';
                zoomArea.style.userSelect = 'none';
                // パケット要素のイベント伝播を防ぐ（モバイル以外のみ）
                if (!isMobile) {
                    zoomArea.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
                    zoomArea.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
                }
            }
        }
    } else if (window.innerWidth <= 1023) {
        // タブレット用の設定
        const networkContainer = document.getElementById('network-container');
        if (networkContainer) {
            const height = window.innerWidth <= 900 ? '450px' : '500px';
            networkContainer.style.height = height;
            networkContainer.style.minHeight = window.innerWidth <= 900 ? '280px' : '350px';
            networkContainer.style.maxHeight = height;
            networkContainer.style.flexShrink = '0';
            // タブレットでもcontainを無効化して装飾画像を保護
            networkContainer.style.contain = 'none';
            networkContainer.style.overflow = 'hidden';
            // タブレット用タッチイベント制御を追加
            networkContainer.style.touchAction = 'none';
            networkContainer.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
            networkContainer.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
        }
        
        // タブレットでもzoom-areaのサイズを確認
        const network = document.getElementById('network');
        if (network) {
            network.style.position = 'fixed'; // タブレットでもfixedに変更
            network.style.top = '0';
            network.style.left = '0';
            network.style.width = '100%';
            network.style.height = '100%';
            network.style.overflow = 'hidden';
            // タブレットでも装飾画像保護のためcontainを無効化
            network.style.contain = 'none';
            network.style.willChange = 'transform';
            // タブレットでもタッチスクロールを無効化
            network.style.touchAction = 'none';
            network.style.userSelect = 'none';
            
            const zoomArea = network.querySelector('.zoom-area');
            if (zoomArea) {
                zoomArea.style.width = '100%';
                zoomArea.style.height = '100%';
                zoomArea.style.position = 'absolute';
                zoomArea.style.top = '0';
                zoomArea.style.left = '0';
                zoomArea.style.contain = 'none';
                zoomArea.style.willChange = 'transform';
                // タブレットでもスクロール可能に変更
                const isMobile = DeviceUtils.isMobile() || window.innerWidth <= 1023;
                zoomArea.style.touchAction = isMobile ? 'pan-y' : 'none';
                zoomArea.style.userSelect = 'none';
                // パケット要素のイベント伝播を防ぐ（モバイル以外のみ）
                if (!isMobile) {
                    zoomArea.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
                    zoomArea.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
                }
            }
            if (zoomArea) {
                zoomArea.style.width = '100%';
                zoomArea.style.height = '100%';
                zoomArea.style.position = 'absolute';
                zoomArea.style.top = '0';
                zoomArea.style.left = '0';
                zoomArea.style.contain = 'layout';
            }
        }
    } else {
        // デスクトップ: 固定高さをリセットして自然なレイアウトに戻す
        const networkContainer = document.getElementById('network-container');
        const network = document.getElementById('network');
        
        if (networkContainer) {
            // 固定高さを解除
            networkContainer.style.height = '';
            networkContainer.style.minHeight = '';
            networkContainer.style.maxHeight = '';
            networkContainer.style.flexShrink = '';
            networkContainer.style.contain = '';
            networkContainer.style.overflow = 'hidden'; // オーバーフローのみ維持
        }
        
        // デスクトップでもネットワーク要素とzoom-areaのサイズを確認
        if (network) {
            // position: absoluteは維持するが、containは解除
            network.style.position = 'absolute'; // デスクトップでは通常のabsolute
            network.style.top = '0';
            network.style.left = '0';
            network.style.width = '100%';
            network.style.height = '100%';
            network.style.overflow = 'hidden';
            // デスクトップでも装飾画像保護のためcontainを無効化
            network.style.contain = 'none';
            network.style.willChange = 'transform';
            // デスクトップではタッチアクションを初期化
            network.style.touchAction = 'auto';
            network.style.userSelect = 'auto';
            
            const zoomArea = network.querySelector('.zoom-area');
            if (zoomArea) {
                zoomArea.style.width = '100%';
                zoomArea.style.height = '100%';
                zoomArea.style.position = 'absolute';
                zoomArea.style.top = '0';
                zoomArea.style.left = '0';
                zoomArea.style.contain = 'none';
                zoomArea.style.willChange = 'transform';
                // デスクトップではタッチアクションを初期化
                zoomArea.style.touchAction = 'auto';
                zoomArea.style.userSelect = 'auto';
            }
        }
    }
}

// ===== エントリーポイント =====
document.addEventListener('DOMContentLoaded', () => {
    try {
        // モバイルviewport高さを固定化
        fixMobileViewportHeight();
        
        // リサイズイベントでも固定化を維持
        let resizeTimeout;
        window.addEventListener('resize', () => {
            // リサイズイベントも遅延実行で安定化
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                fixMobileViewportHeight();
                // シミュレーションが存在する場合は、リサイズ処理も実行
                if (window.simulation) {
                    setTimeout(() => {
                        window.simulation.handleResize();
                    }, 50);
                }
            }, 150); // 遅延を追加して安定化
        });
        
        // orientationchange イベントでも対応（iOS Safari対応）
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                fixMobileViewportHeight();
                // シミュレーションが存在する場合は、リサイズ処理も実行
                if (window.simulation) {
                    setTimeout(() => {
                        window.simulation.handleResize();
                    }, 100);
                }
            }, 500);
        });
        
        // スクロール中のサイズ変更を防ぐ（iOS Safari対応）
        let scrollTimeout;
        window.isScrolling = false; // グローバル変数として設定
        window.addEventListener('scroll', () => {
            if (window.innerWidth <= 1023) {
                window.isScrolling = true;
                if (scrollTimeout) clearTimeout(scrollTimeout);
                
                // スクロール中は装飾画像の保護を最優先に
                const network = document.getElementById('network');
                const zoomArea = network?.querySelector('.zoom-area');
                if (network) {
                    network.style.contain = 'none';
                    network.style.willChange = 'transform';
                }
                if (zoomArea) {
                    zoomArea.style.contain = 'none';
                    zoomArea.style.willChange = 'transform';
                }
                
                scrollTimeout = setTimeout(() => {
                    window.isScrolling = false;
                    console.log('スクロール終了 - 装飾画像の安定化完了');
                    // スクロール終了後のみviewport調整
                    if (!window.isScrolling) {
                        fixMobileViewportHeight();
                    }
                }, 150); // 150msに短縮してより敏感に反応
            }
        }, { passive: true });
        
        // viewport変更の監視（modern browsers）
        if (window.visualViewport) {
            let viewportTimeout;
            window.visualViewport.addEventListener('resize', () => {
                if (window.innerWidth <= 1023) {
                    // viewport変更も遅延実行で安定化
                    if (viewportTimeout) clearTimeout(viewportTimeout);
                    viewportTimeout = setTimeout(() => {
                        if (!window.isScrolling) { // グローバル変数を参照
                            fixMobileViewportHeight();
                        }
                    }, 100);
                }
            });
        }
        
        window.simulation = new LyricsNetworkSimulation();
        window.simulationInstance = window.simulation; // TextAlive APIのanimate機能からアクセス用
    } catch (e) {
        console.error('シミュレーションの初期化エラー:', e);
    }
});