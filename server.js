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

// 字幕取得API（既存のエンドポイントと互換性維持）
app.get('/captions', async (req, res) => {
  const videoId = req.query.v;
  if (!videoId) {
    return res.status(400).json({ error: 'Missing video ID (v parameter)' });
  }

  const lang = req.query.lang || 'ja'; // デフォルトを日本語に変更

  try {
    console.log(`Fetching captions for video: ${videoId}, language: ${lang}`);
    
    const response = await axios.get(`https://video.google.com/timedtext`, {
      params: {
        v: videoId,
        lang: lang,
        fmt: 'xml'
      },
      timeout: 10000, // 10秒タイムアウト
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.status !== 200 || !response.data) {
      throw new Error(`HTTP ${response.status}: Captions not found`);
    }

    parseString(response.data, (err, result) => {
      if (err) {
        console.error('Error parsing XML:', err);
        return res.status(500).json({ error: 'Error parsing caption XML' });
      }
      if (!result || !result.transcript || !result.transcript.text) {
        console.log('No captions found in response, trying fallback...');
        
        // フォールバック: デモ用の字幕を返す
        const demoCaptions = [
          { start: 0, end: 3, duration: 3, text: "ようこそ Lyric Stage へ", words: ["ようこそ", "Lyric", "Stage", "へ"] },
          { start: 3, end: 6, duration: 3, text: "音楽に合わせて歌詞をタッチしよう", words: ["音楽に合わせて", "歌詞を", "タッチしよう"] },
          { start: 6, end: 9, duration: 3, text: "リズムに乗って楽しもう！", words: ["リズムに乗って", "楽しもう！"] }
        ];
        
        return res.json({
          videoId: videoId,
          language: lang,
          captions: demoCaptions,
          count: demoCaptions.length,
          fallback: true,
          message: "字幕が見つからないため、デモ字幕を表示しています"
        });
      }
      
      const formattedCaptions = formatCaptionsForGame(result.transcript.text);
      
      res.json({
        videoId: videoId,
        language: lang,
        captions: formattedCaptions,
        count: formattedCaptions.length,
        raw: result.transcript.text // 互換性のため生データも含める
      });
      
      console.log(`Successfully processed ${formattedCaptions.length} captions`);
    });
  } catch (error) {
    console.error('Error fetching captions:', error.message);
    
    // レート制限やその他のエラーの場合は、デモ字幕を返す
    console.log('API error occurred, returning demo captions...');
    
    const demoCaptions = [
      { start: 0, end: 4, duration: 4, text: "ようこそ Lyric Stage へ！", words: ["ようこそ", "Lyric", "Stage", "へ！"] },
      { start: 4, end: 8, duration: 4, text: "音楽に合わせて歌詞をタッチしよう", words: ["音楽に合わせて", "歌詞を", "タッチしよう"] },
      { start: 8, end: 12, duration: 4, text: "リズムに乗って楽しもう！", words: ["リズムに乗って", "楽しもう！"] },
      { start: 12, end: 16, duration: 4, text: "スコアを上げてコンボを続けよう", words: ["スコアを上げて", "コンボを", "続けよう"] },
      { start: 16, end: 20, duration: 4, text: "みんなでいっしょに盛り上がろう", words: ["みんなで", "いっしょに", "盛り上がろう"] },
      { start: 20, end: 24, duration: 4, text: "Lyric Stage で音楽体験", words: ["Lyric", "Stage", "で", "音楽体験"] }
    ];
    
    res.json({
      videoId: videoId,
      language: lang,
      captions: demoCaptions,
      count: demoCaptions.length,
      demo: true,
      error: 'API_UNAVAILABLE',
      message: "YouTube字幕APIが利用できないため、デモ字幕を表示しています"
    });
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
