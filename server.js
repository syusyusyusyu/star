const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// CORS設定
app.use(cors({
  origin: ['http://localhost:8000', 'http://127.0.0.1:8000'],
  credentials: true
}));

app.use(express.json());

// 字幕プロキシエンドポイント
app.get('/api/subtitles', async (req, res) => {
  try {
    const { videoId, lang = 'ja' } = req.query;
    
    if (!videoId) {
      return res.status(400).json({ error: 'videoId parameter is required' });
    }

    // YouTube字幕URLの構築
    const subtitleUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&kind=asr&fmt=json3`;
    
    console.log(`Fetching subtitles for video: ${videoId}, language: ${lang}`);
    console.log(`URL: ${subtitleUrl}`);
    
    const response = await axios.get(subtitleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    if (response.data && response.data.events) {
      // 字幕データを処理して返す
      const subtitles = response.data.events
        .filter(event => event.segs) // テキストセグメントがあるもののみ
        .map(event => ({
          startTime: event.tStartMs || 0,
          endTime: (event.tStartMs || 0) + (event.dDurationMs || 0),
          text: event.segs.map(seg => seg.utf8 || '').join('').trim()
        }))
        .filter(subtitle => subtitle.text.length > 0); // 空のテキストを除外

      console.log(`Successfully fetched ${subtitles.length} subtitle entries`);
      res.json({ subtitles });
    } else {
      console.log('No subtitle data found in response');
      res.status(404).json({ error: 'No subtitles found for this video' });
    }
  } catch (error) {
    console.error('Subtitle fetch error:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch subtitles',
      details: error.message 
    });
  }
});

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Subtitle proxy server is running' });
});

// 静的ファイルのサーブ（開発用）
app.use(express.static('.'));

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Subtitle proxy server listening at http://localhost:${PORT}`);
  console.log('Frontend should be served at http://localhost:8000');
});
