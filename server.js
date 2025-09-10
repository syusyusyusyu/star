const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = 8080;

app.use(cors());

app.get('/subtitles', async (req, res) => {
  const videoId = req.query.v;
  if (!videoId) {
    return res.status(400).send('Video ID (v) is required');
  }

  try {
    // First, get the video page to find the captions URL
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const videoPageResponse = await axios.get(videoPageUrl);
    const videoPageHtml = videoPageResponse.data;

    // Extract the player response JSON from the HTML
    const playerResponseRegex = /ytInitialPlayerResponse\s*=\s*({.+?});/;
    const playerResponseMatch = videoPageHtml.match(playerResponseRegex);
    if (!playerResponseMatch || !playerResponseMatch[1]) {
      return res.status(404).send('Could not find player response. Subtitles may not exist or are disabled.');
    }
    
    const playerResponse = JSON.parse(playerResponseMatch[1]);
    const captionTracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    // --- DEBUG LOG ---
    console.log('--- Available Caption Tracks ---');
    console.log(JSON.stringify(captionTracks, null, 2));
    // -------------------

    if (!captionTracks || captionTracks.length === 0) {
      return res.status(404).send('No caption tracks found for this video.');
    }

    // Find the English auto-generated captions (or any language)
    const asrTrack = captionTracks.find(track => track.kind === 'asr');
    const subtitleTrack = asrTrack || captionTracks[0]; // Fallback to the first available track

    if (!subtitleTrack || !subtitleTrack.baseUrl) {
      return res.status(404).send('Could not find a valid subtitle track URL.');
    }
    
    // Fetch the subtitles XML
    const subtitlesResponse = await axios.get(`${subtitleTrack.baseUrl}&fmt=xml`);
    res.header('Content-Type', 'text/xml');
    res.send(subtitlesResponse.data);

  } catch (error) {
    console.error('Error proxying subtitles:', error.message);
    res.status(500).send('Failed to retrieve subtitles.');
  }
});

app.listen(port, () => {
  console.log(`Subtitle proxy server listening at http://localhost:${port}`);
});
