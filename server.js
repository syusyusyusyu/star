const express = require('express');
const axios = require('axios');
const { parseString } = require('xml2js');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 静的ファイルの提供
app.use(express.static(path.join(__dirname)));

/**
 * 字幕XMLをゲーム用のフォーマットに変換
 */
function formatCaptionsForGame(rawCaptions) {
    if (!rawCaptions || !Array.isArray(rawCaptions)) {
        return [];
    }
    
    return rawCaptions.map(item => {
        const start = parseFloat(item.$.start || 0);
        const duration = parseFloat(item.$.dur || 2);
        const text = (item._ || '').replace(/\n/g, ' ').trim();
        
        return {
            start: start,
            end: start + duration,
            duration: duration,
            text: text,
            words: text.split(' ').filter(word => word.length > 0)
        };
    }).filter(item => item.text.length > 0);
}

/**
 * デモ字幕を返すヘルパー関数
 */
function returnDemoCaptions(res, videoId, lang, errorMessage = null) {
    // より充実したデモ字幕を提供
    const demoCaptions = [
        { start: 0, end: 3, duration: 3, text: "♪ ようこそ Lyric Stage へ ♪", words: ["♪", "ようこそ", "Lyric", "Stage", "へ", "♪"] },
        { start: 3, end: 6, duration: 3, text: "音楽に合わせて歌詞をタッチ", words: ["音楽に", "合わせて", "歌詞を", "タッチ"] },
        { start: 6, end: 9, duration: 3, text: "リズムに乗って楽しもう", words: ["リズムに", "乗って", "楽しもう"] },
        { start: 9, end: 12, duration: 3, text: "スコアを上げてコンボを続けよう", words: ["スコアを", "上げて", "コンボを", "続けよう"] },
        { start: 12, end: 15, duration: 3, text: "みんなで一緒に盛り上がろう", words: ["みんなで", "一緒に", "盛り上がろう"] },
        { start: 15, end: 18, duration: 3, text: "Three.js ステージが光る", words: ["Three.js", "ステージが", "光る"] },
        { start: 18, end: 21, duration: 3, text: "MediaPipe で手を振ろう", words: ["MediaPipe", "で", "手を", "振ろう"] },
        { start: 21, end: 24, duration: 3, text: "YouTube と同期する魔法", words: ["YouTube", "と", "同期する", "魔法"] },
        { start: 24, end: 27, duration: 3, text: "Lyric Stage の世界へ", words: ["Lyric", "Stage", "の", "世界へ"] },
        { start: 27, end: 30, duration: 3, text: "♪ 音楽と共に踊ろう ♪", words: ["♪", "音楽と", "共に", "踊ろう", "♪"] },
        { start: 30, end: 33, duration: 3, text: "最高のスコアを目指して", words: ["最高の", "スコアを", "目指して"] },
        { start: 33, end: 36, duration: 3, text: "新しい音楽体験の始まり", words: ["新しい", "音楽体験の", "始まり"] }
    ];
    
    res.json({
        videoId: videoId,
        language: lang,
        captions: demoCaptions,
        count: demoCaptions.length,
        demo: true,
        error: errorMessage ? 'API_UNAVAILABLE' : 'NO_CAPTIONS_FOUND',
        message: errorMessage 
            ? "YouTube字幕APIが制限されているため、拡張デモ字幕を表示しています" 
            : "字幕が見つからないため、デモ字幕を表示しています"
    });
}

/**
 * YouTube字幕を複数の方法で取得を試行（改良版）
 * @param {string} videoId - YouTubeビデオID
 * @param {string} lang - 言語コード
 * @return {Promise<Object>} 字幕データ
 */
async function fetchYouTubeCaptionsMultipleMethods(videoId, lang) {
    // まず様々なURLパターンを試行
    const baseUrls = [
        'https://video.google.com/timedtext',
        'https://www.youtube.com/api/timedtext'
    ];
    
    const methods = [];
    
    // 各ベースURLに対して複数の方法を試行
    for (const baseUrl of baseUrls) {
        methods.push(
            // 手動字幕
            { 
                url: baseUrl,
                params: { v: videoId, lang: lang, fmt: 'xml' },
                description: `手動字幕 (${lang}) - ${baseUrl}`
            },
            // 自動生成字幕
            { 
                url: baseUrl,
                params: { v: videoId, lang: lang, fmt: 'xml', kind: 'asr' },
                description: `自動生成字幕 (${lang}) - ${baseUrl}`
            }
        );
    }
    
    // 英語フォールバック
    if (lang !== 'en') {
        for (const baseUrl of baseUrls) {
            methods.push(
                { 
                    url: baseUrl,
                    params: { v: videoId, lang: 'en', fmt: 'xml' },
                    description: `手動字幕 (en) - ${baseUrl}`
                },
                { 
                    url: baseUrl,
                    params: { v: videoId, lang: 'en', fmt: 'xml', kind: 'asr' },
                    description: `自動生成字幕 (en) - ${baseUrl}`
                }
            );
        }
    }

    // 各方法を試行（遅延付き）
    for (let i = 0; i < methods.length; i++) {
        const method = methods[i];
        try {
            console.log(`Trying: ${method.description}...`);
            
            // 429エラー対策: リクエスト間に遅延を挿入
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000)); // 1-3秒の遅延
            }
            
            const response = await axios.get(method.url, {
                params: method.params,
                timeout: 15000, // タイムアウトを延長
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/xml,application/xml,*/*',
                    'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8',
                    'Referer': 'https://www.youtube.com/',
                    'Origin': 'https://www.youtube.com'
                }
            });

            if (response.status === 200 && response.data && response.data.trim().length > 0) {
                // XMLの妥当性をチェック
                if (response.data.includes('<transcript') || response.data.includes('<text')) {
                    console.log(`✅ Success with: ${method.description}`);
                    return {
                        success: true,
                        data: response.data,
                        method: method.description,
                        language: method.params.lang,
                        isAutoGenerated: method.params.kind === 'asr'
                    };
                } else {
                    console.log(`❌ Invalid XML format from: ${method.description}`);
                }
            } else {
                console.log(`❌ Empty response from: ${method.description}`);
            }
        } catch (error) {
            const statusCode = error.response?.status;
            if (statusCode === 429) {
                console.log(`❌ Rate limited ${method.description}: waiting longer...`);
                // 429エラーの場合はより長く待機
                await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 5000));
            } else {
                console.log(`❌ Failed ${method.description}: ${error.message}`);
            }
        }
    }

    throw new Error('All caption fetching methods failed');
}

// 字幕取得API（既存のエンドポイントと互換性維持）
app.get('/captions', async (req, res) => {
  const videoId = req.query.v;
  if (!videoId) {
    return res.status(400).json({ error: 'Missing video ID (v parameter)' });
  }

  const lang = req.query.lang || 'ja'; // デフォルトを日本語に変更

  try {
    console.log(`\n🎵 Fetching captions for video: ${videoId}, preferred language: ${lang}`);
    
    const captionResult = await fetchYouTubeCaptionsMultipleMethods(videoId, lang);
    
    parseString(captionResult.data, (err, result) => {
      if (err) {
        console.error('Error parsing XML:', err);
        return res.status(500).json({ error: 'Error parsing caption XML' });
      }
      if (!result || !result.transcript || !result.transcript.text) {
        console.log('No captions found in response, using demo captions...');
        return returnDemoCaptions(res, videoId, lang);
      }
      
      const formattedCaptions = formatCaptionsForGame(result.transcript.text);
      
      res.json({
        videoId: videoId,
        language: captionResult.language,
        captions: formattedCaptions,
        count: formattedCaptions.length,
        method: captionResult.method,
        isAutoGenerated: captionResult.isAutoGenerated,
        raw: result.transcript.text // 互換性のため生データも含める
      });
      
      console.log(`✅ Successfully processed ${formattedCaptions.length} captions using: ${captionResult.method}`);
    });
  } catch (error) {
    console.error('❌ All caption methods failed:', error.message);
    
    // 最終フォールバック: デモ字幕を返す
    console.log('🎭 Using demo captions as final fallback...');
    returnDemoCaptions(res, videoId, lang, error.message);
  }
});
// RESTfulな字幕取得API（新しいエンドポイント）
app.get('/captions/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const lang = req.query.lang || 'ja';
  
  // 既存のエンドポイントを再利用
  req.query.v = videoId;
  req.query.lang = lang;
  
  // 既存のハンドラーを呼び出し
  return app._router.stack[app._router.stack.length - 2].route.stack[0].handle(req, res);
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Lyric Stage Caption Server is running',
        timestamp: new Date().toISOString()
    });
});

// ルートページ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Favicon対応
app.get('/favicon.ico', (req, res) => {
    res.status(204).send(); // No Content レスポンス
});

app.listen(port, () => {
  console.log(`🎵 Lyric Stage Caption Server is running on port ${port}`);
  console.log(`📝 Caption API: http://localhost:${port}/captions?v={videoId}&lang={lang}`);
  console.log(`📝 RESTful API: http://localhost:${port}/captions/{videoId}?lang={lang}`);
  console.log(`🏠 Frontend: http://localhost:${port}`);
  console.log(`❤️ Health Check: http://localhost:${port}/health`);
});
