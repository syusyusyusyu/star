const express = require('express');
const cors = require('cors');
const path = require('path');
const ytdl = require('ytdl-core');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS設定
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// JSON解析
app.use(express.json());

// 静的ファイルの配信
app.use(express.static(path.join(__dirname)));

// デフォルトルート
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// YouTube字幕を取得する関数
async function getYouTubeTranscript(videoId, lang = 'ja') {
  try {
    // ytdl-coreを使用して動画情報を取得
    const info = await ytdl.getInfo(videoId);
    
    if (!info.player_response || !info.player_response.captions) {
      throw new Error('No captions available for this video');
    }
    
    const captionTracks = info.player_response.captions.playerCaptionsTracklistRenderer.captionTracks;
    
    if (!captionTracks || captionTracks.length === 0) {
      throw new Error('No caption tracks found');
    }
    
    // 指定された言語の字幕を探す
    let captionTrack = captionTracks.find(track => 
      track.languageCode === lang || 
      track.languageCode.startsWith(lang)
    );
    
    // 指定言語がない場合は英語を試す
    if (!captionTrack && lang !== 'en') {
      captionTrack = captionTracks.find(track => 
        track.languageCode === 'en' || 
        track.languageCode.startsWith('en')
      );
    }
    
    // それでもない場合は最初の字幕を使用
    if (!captionTrack) {
      captionTrack = captionTracks[0];
    }
    
    // 字幕URLを取得
    const captionUrl = captionTrack.baseUrl;
    
    // 字幕XMLを取得
    const response = await fetch(captionUrl);
    const xmlText = await response.text();
    
    // XMLを解析してJSON形式に変換
    const captions = parseTranscriptXML(xmlText);
    
    return {
      captions,
      language: captionTrack.languageCode,
      videoTitle: info.videoDetails.title
    };
    
  } catch (error) {
    console.error('Error fetching YouTube transcript:', error);
    throw error;
  }
}

// XML字幕をJSONに変換する関数
function parseTranscriptXML(xmlText) {
  const captions = [];
  
  // 正規表現でXMLの<text>タグを解析
  const textRegex = /<text start="([^"]*)" dur="([^"]*)"[^>]*>([^<]*)<\/text>/g;
  let match;
  
  while ((match = textRegex.exec(xmlText)) !== null) {
    const start = parseFloat(match[1]);
    const duration = parseFloat(match[2]);
    const text = decodeHTMLEntities(match[3]).trim();
    
    if (text && text.length > 0) {
      captions.push({
        start: start,
        end: start + duration,
        text: text
      });
    }
  }
  
  return captions;
}

// HTMLエンティティをデコードする関数
function decodeHTMLEntities(text) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '='
  };
  
  return text.replace(/&[#\w]+;/g, (entity) => {
    return entities[entity] || entity;
  });
}

// 字幕取得API
app.get('/captions', async (req, res) => {
  try {
    const { v: videoId, lang = 'ja' } = req.query;
    
    if (!videoId) {
      return res.status(400).json({ 
        error: 'Video ID is required',
        message: 'パラメータ v (YouTube動画ID) が必要です'
      });
    }

    console.log(`Fetching captions for video: ${videoId}, language: ${lang}`);
    
    // 実際のYouTube字幕を取得
    const transcriptData = await getYouTubeTranscript(videoId, lang);
    
    res.json({
      captions: transcriptData.captions,
      language: transcriptData.language,
      videoId: videoId,
      videoTitle: transcriptData.videoTitle,
      message: `字幕を正常に取得しました (${transcriptData.captions.length}件)`
    });
    
  } catch (error) {
    console.error('Error fetching captions:', error);
    
    // エラーの種類に応じたメッセージ
    let errorMessage = 'システムエラーが発生しました';
    let statusCode = 500;
    
    if (error.message.includes('Video unavailable') || 
        error.message.includes('not available')) {
      errorMessage = 'この動画は利用できません';
      statusCode = 404;
    } else if (error.message.includes('No captions') || 
               error.message.includes('No caption tracks')) {
      errorMessage = 'この動画には字幕が設定されていません';
      statusCode = 404;
    } else if (error.message.includes('Private video')) {
      errorMessage = 'この動画はプライベート動画です';
      statusCode = 403;
    } else if (error.message.includes('restricted')) {
      errorMessage = 'この動画は地域制限により利用できません';
      statusCode = 403;
    }
    
    // エラーの場合、テスト用のモックデータを提供
    const mockCaptions = [
      {
        start: 0.0,
        end: 2.5,
        text: "字幕取得エラーのため、テストデータを表示中"
      },
      {
        start: 2.5,
        end: 5.0,
        text: "Lyric Stage へようこそ"
      },
      {
        start: 5.0,
        end: 7.5,
        text: "リズムに合わせて"
      },
      {
        start: 7.5,
        end: 10.0,
        text: "歌詞をタップしよう"
      },
      {
        start: 10.0,
        end: 12.5,
        text: "スコアを稼いで"
      },
      {
        start: 12.5,
        end: 15.0,
        text: "高いランクを目指そう"
      }
    ];
    
    res.status(statusCode).json({ 
      error: error.message,
      message: errorMessage,
      videoId: req.query.v,
      fallback: true,
      captions: mockCaptions,
      language: 'ja'
    });
  }
});

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// APIエンドポイント情報
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Lyric Stage API Server',
    version: '1.0.0',
    endpoints: {
      'GET /': 'タイトル画面を表示',
      'GET /captions?v={videoId}&lang={language}': '指定されたYouTube動画の字幕を取得',
      'GET /test-captions?v={videoId}': '字幕取得のテスト（詳細情報付き）',
      'GET /health': 'サーバーのヘルスチェック',
      'GET /api/info': 'APIエンドポイント情報'
    },
    supportedLanguages: ['ja', 'en', 'auto'],
    description: 'YouTube動画の字幕を取得してLyric Stageゲームで使用するためのAPIサーバー'
  });
});

// テスト用字幕取得エンドポイント
app.get('/test-captions', async (req, res) => {
  try {
    const { v: videoId, lang = 'ja' } = req.query;
    
    if (!videoId) {
      return res.status(400).json({ 
        error: 'Video ID is required',
        message: 'パラメータ v (YouTube動画ID) が必要です'
      });
    }

    console.log(`Testing caption fetch for video: ${videoId}, language: ${lang}`);
    
    // 動画情報の基本チェック
    const info = await ytdl.getBasicInfo(videoId);
    
    res.json({
      success: true,
      videoId: videoId,
      videoTitle: info.videoDetails.title,
      videoLength: info.videoDetails.lengthSeconds,
      videoUrl: info.videoDetails.video_url,
      message: 'YouTube動画の基本情報を正常に取得しました。字幕機能は実装済みです。',
      note: '実際の字幕取得は /captions エンドポイントをご利用ください。'
    });
    
  } catch (error) {
    console.error('Error in test-captions:', error);
    
    res.status(500).json({ 
      error: error.message,
      message: 'テストでエラーが発生しました',
      videoId: req.query.v,
      suggestion: 'VideoIDが正しいか、動画が公開されているかを確認してください。'
    });
  }
});

// 404ハンドラー
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'リクエストされたエンドポイントが見つかりません',
    path: req.path
  });
});

// エラーハンドラー
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: '内部サーバーエラーが発生しました'
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 Lyric Stage Server is running on port ${PORT}`);
  console.log(`📱 Game available at: http://localhost:${PORT}`);
  console.log(`📖 API docs available at: http://localhost:${PORT}/api/info`);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});
