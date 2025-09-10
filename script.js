
/**
 * Lyric Stage - YouTube IFrame API Version
 *
 * This script manages the game logic for a rhythm game that uses the
 * YouTube IFrame API to sync lyrics with a video. It handles video playback,
 * subtitle fetching and parsing, user interactions (cursor, hands, body),
 * scoring, and 3D visuals.
 */

// This function is called by the YouTube IFrame API when it's ready.
function onYouTubeIframeAPIReady() {
  // The GameManager instance is created in game-loader.js,
  // so we call its player initialization method here.
  if (window.gameManager) {
    window.gameManager.initPlayer();
  }
}

class GameManager {
  /**
   * Initializes the game manager.
   * Sets up game state, DOM elements, and event listeners.
   */
  constructor() {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.player = null;
    this.lyricsData = [];
    this.currentLyricIndex = 0;
    this.isPlaying = false;
    this.isPaused = true;
    this.resultsDisplayed = false;
    this.videoId = new URLSearchParams(window.location.search).get('v');
    this.currentMode = new URLSearchParams(window.location.search).get('mode') || 'cursor';

    this.setupDOMReferences();
    this.setupEventListeners();
    this.initVisuals();
    this.updateInstructions();

    // Hide the player element initially
    if (this.playerContainer) {
      this.playerContainer.style.display = 'none';
    }
  }

  /**
   * Gets references to essential DOM elements.
   */
  setupDOMReferences() {
    this.gameContainer = document.getElementById('game-container');
    this.playerContainer = document.getElementById('player');
    this.scoreEl = document.getElementById('score');
    this.comboEl = document.getElementById('combo');
    this.playPauseBtn = document.getElementById('play-pause');
    this.restartBtn = document.getElementById('restart');
    this.loadingEl = document.getElementById('loading');
    this.instructionsEl = document.getElementById('instructions');
    this.resultsScreen = document.getElementById('results-screen');
  }

  /**
   * Sets up event listeners for UI controls and user interactions.
   */
  setupEventListeners() {
    this.playPauseBtn.addEventListener('click', () => this.togglePlay());
    this.restartBtn.addEventListener('click', () => this.restartGame());

    // Interaction listeners
    this.gameContainer.addEventListener('mousemove', e => {
      if (this.currentMode === 'cursor' && !this.isPaused) {
        this.checkLyrics(e.clientX, e.clientY);
      }
    });
    this.gameContainer.addEventListener('click', e => {
        if (this.currentMode === 'cursor' && !this.isPaused) {
          this.checkLyrics(e.clientX, e.clientY, 40); // Larger radius for clicks
        }
    });
    this.gameContainer.addEventListener('touchstart', e => {
        if (this.currentMode === 'cursor' && !this.isPaused && e.touches[0]) {
            this.checkLyrics(e.touches[0].clientX, e.touches[0].clientY, 45);
        }
    }, { passive: true });
    this.gameContainer.addEventListener('touchmove', e => {
        if (this.currentMode === 'cursor' && !this.isPaused && e.touches[0]) {
            this.checkLyrics(e.touches[0].clientX, e.touches[0].clientY, 45);
        }
    }, { passive: true });


    // Results screen buttons
    document.getElementById('back-to-title').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    document.getElementById('replay-song').addEventListener('click', () => {
        this.resultsScreen.classList.add('hidden');
        this.restartGame();
    });
  }

  /**
   * Initializes 3D visuals and camera controls based on the selected mode.
   */
  initVisuals() {
    this.visuals = new LiveStageVisuals(this.gameContainer);
    if (this.currentMode === 'hand' || this.currentMode === 'body') {
      this.initCamera();
    }
  }

  /**
   * Initializes the YouTube player using the IFrame API.
   * This is called by the `onYouTubeIframeAPIReady` global function.
   */
  initPlayer() {
    if (!this.videoId) {
      this.loadingEl.textContent = 'Error: No video ID provided.';
      return;
    }
    this.loadingEl.textContent = 'Loading player...';
    this.player = new YT.Player('player-div', {
      height: '195', // Smaller player size
      width: '320',
      videoId: this.videoId,
      playerVars: {
        playsinline: 1,
        controls: 0, // Hide YouTube's default controls
        disablekb: 1,
        modestbranding: 1,
      },
      events: {
        'onReady': (event) => this.onPlayerReady(event),
        'onStateChange': (event) => this.onPlayerStateChange(event)
      }
    });
  }

  /**
   * Handles the 'onReady' event from the YouTube player.
   * Fetches subtitles and prepares the game for playback.
   */
  async onPlayerReady(event) {
    this.loadingEl.textContent = 'Loading subtitles...';
    try {
      await this.loadSubtitles(this.videoId);
      this.loadingEl.textContent = 'Ready! Press Play.';
      this.playPauseBtn.disabled = false;
    } catch (error) {
      console.error('Subtitle loading failed:', error);
      this.loadingEl.textContent = `Failed to load subtitles. Please try another video.`;
    }
  }

  /**
   * Handles the 'onStateChange' event from the YouTube player.
   * Manages game state based on player status (playing, paused, ended).
   */
  onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
      this.isPlaying = true;
      this.isPaused = false;
      this.playPauseBtn.textContent = 'Pause';
      this.startLyricUpdater();
    } else if (event.data === YT.PlayerState.PAUSED) {
      this.isPlaying = false;
      this.isPaused = true;
      this.playPauseBtn.textContent = 'Play';
      this.stopLyricUpdater();
    } else if (event.data === YT.PlayerState.ENDED) {
      this.isPlaying = false;
      this.isPaused = true;
      this.stopLyricUpdater();
      this.showResults();
    }
  }

  /**
   * Fetches and parses YouTube's automatic subtitles.
   * @param {string} videoId - The ID of the YouTube video.
   */
  async loadSubtitles(videoId) {
    // This is a proxy URL to bypass CORS issues when fetching subtitles.
    // A simple server-side script is needed to forward the request.
    // For local development, a local proxy server can be used.
    // Example proxy: `https://your-proxy-server.com/subtitles?v=${videoId}`
    // For this project, we assume a local proxy is running.
    const proxyUrl = `http://localhost:8080/subtitles?v=${videoId}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const xmlText = await response.text();
        this.parseSubtitles(xmlText);
    } catch (e) {
        console.error("Could not fetch subtitles. A proxy might be required.", e);
        this.loadingEl.textContent = "Subtitle fetch failed. A proxy may be needed.";
        // As a fallback, we will try to fetch directly, which may fail in a browser
        try {
            const directUrl = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&fmt=xml`;
            const directResponse = await fetch(directUrl, { mode: 'no-cors' });
            const directXmlText = await directResponse.text();
            this.parseSubtitles(directXmlText);
        } catch (directError) {
             console.error("Direct subtitle fetch also failed.", directError);
             throw new Error("Failed to fetch subtitles directly and via proxy.");
        }
    }
  }

  /**
   * Parses the XML subtitle data into a usable format.
   * @param {string} xmlText - The XML content of the subtitles.
   */
  parseSubtitles(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const textNodes = xmlDoc.getElementsByTagName('text');
    this.lyricsData = [];
    for (const node of textNodes) {
      const text = node.textContent.replace(/&amp;#39;/g, "'").replace(/\n/g, ' ').trim();
      const start = parseFloat(node.getAttribute('start'));
      const duration = parseFloat(node.getAttribute('dur'));
      if (text) {
        // Break down phrases into individual characters for the game
        for (let i = 0; i < text.length; i++) {
          this.lyricsData.push({
            text: text[i],
            time: start + (i * (duration / text.length)),
            endTime: start + ((i + 1) * (duration / text.length)),
            id: `${start}-${i}`
          });
        }
      }
    }
    console.log(`Processed ${this.lyricsData.length} lyric characters.`);
  }

  /**
   * Toggles video playback between play and pause.
   */
  togglePlay() {
    if (!this.player || !this.player.getPlayerState) return;

    if (this.isPaused) {
      this.player.playVideo();
    } else {
      this.player.pauseVideo();
    }
  }

  /**
   * Restarts the game from the beginning.
   */
  restartGame() {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.currentLyricIndex = 0;
    this.resultsDisplayed = false;
    this.scoreEl.textContent = '0';
    this.comboEl.textContent = 'Combo: 0';
    document.querySelectorAll('.lyric-bubble').forEach(el => el.remove());
    this.resultsScreen.classList.add('hidden');
    this.player.seekTo(0);
    this.player.playVideo();
  }

  /**
   * Starts the interval for updating lyrics on screen.
   */
  startLyricUpdater() {
    if (this.lyricUpdater) clearInterval(this.lyricUpdater);
    this.lyricUpdater = setInterval(() => this.updateLyrics(), 100);
  }

  /**
   * Stops the lyric update interval.
   */
  stopLyricUpdater() {
    clearInterval(this.lyricUpdater);
  }

  /**
   * Updates the lyrics display based on the current video time.
   */
  updateLyrics() {
    if (!this.player || !this.player.getCurrentTime || this.isPaused) return;

    const currentTime = this.player.getCurrentTime();
    while (
      this.currentLyricIndex < this.lyricsData.length &&
      this.lyricsData[this.currentLyricIndex].time <= currentTime
    ) {
      const lyric = this.lyricsData[this.currentLyricIndex];
      this.displayLyric(lyric);
      this.currentLyricIndex++;
    }
  }

  /**
   * Creates and displays a single lyric character on the screen.
   * @param {object} lyric - The lyric object with text, time, etc.
   */
  displayLyric(lyric) {
    const bubble = document.createElement('div');
    bubble.className = 'lyric-bubble';
    bubble.textContent = lyric.text;
    bubble.dataset.id = lyric.id;

    // Position the bubble randomly
    const x = Math.random() * (window.innerWidth - 100) + 50;
    const y = Math.random() * (window.innerHeight * 0.6) + (window.innerHeight * 0.2);
    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;

    this.gameContainer.appendChild(bubble);

    // Remove the bubble after a certain time
    setTimeout(() => {
      if (bubble.parentNode) {
        // If bubble still exists (wasn't hit), reset combo
        if (bubble.style.pointerEvents !== 'none') {
            this.combo = 0;
            this.comboEl.textContent = `Combo: 0`;
        }
        bubble.remove();
      }
    }, 5000); // Lyric stays on screen for 5 seconds
  }

  /**
   * Checks if user interaction (mouse, touch, etc.) hits a lyric.
   * @param {number} x - The x-coordinate of the interaction.
   * @param {number} y - The y-coordinate of the interaction.
   * @param {number} radius - The hit detection radius.
   */
  checkLyrics(x, y, radius = 35) {
    const lyrics = document.querySelectorAll('.lyric-bubble');
    for (const el of lyrics) {
      if (el.style.pointerEvents === 'none') continue;

      const rect = el.getBoundingClientRect();
      const elX = rect.left + rect.width / 2;
      const elY = rect.top + rect.height / 2;

      const dx = x - elX;
      const dy = y - elY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < radius + rect.width / 2) {
        this.hitLyric(el);
      }
    }
  }

  /**
   * Handles the logic when a lyric is successfully hit.
   * @param {HTMLElement} element - The lyric bubble element that was hit.
   */
  hitLyric(element) {
    // Prevent re-hitting
    element.style.pointerEvents = 'none';

    // Update score and combo
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const points = 100 + (this.combo * 10);
    this.score += points;

    this.scoreEl.textContent = this.score;
    this.comboEl.textContent = `Combo: ${this.combo}`;

    // Visual feedback
    element.classList.add('hit');
    
    // Create a score popup
    const pointDisplay = document.createElement('div');
    pointDisplay.className = 'point-popup';
    pointDisplay.textContent = `+${points}`;
    const rect = element.getBoundingClientRect();
    pointDisplay.style.left = `${rect.left}px`;
    pointDisplay.style.top = `${rect.top - 20}px`;
    this.gameContainer.appendChild(pointDisplay);

    // Remove the bubble and score popup after animation
    setTimeout(() => {
      element.remove();
      pointDisplay.remove();
    }, 500);
  }

  /**
   * Displays the final results screen.
   */
  showResults() {
    if (this.resultsDisplayed) return;
    this.resultsDisplayed = true;

    document.getElementById('final-score-display').textContent = this.score;
    document.getElementById('final-combo-display').textContent = `Max Combo: ${this.maxCombo}`;
    document.getElementById('rank-display').textContent = `Rank: ${this.getRank()}`;

    this.resultsScreen.classList.remove('hidden');
  }

  /**
   * Calculates the final rank based on the score.
   * @returns {string} The calculated rank (S, A, B, or C).
   */
  getRank() {
    if (this.score >= 20000) return 'S';
    if (this.score >= 10000) return 'A';
    if (this.score >= 5000) return 'B';
    return 'C';
  }

  /**
   * Updates the instruction text based on the current mode.
   */
  updateInstructions() {
    let text = '';
    switch (this.currentMode) {
      case 'cursor':
        text = 'Use your mouse to hit the lyrics!';
        break;
      case 'hand':
        text = 'Use your hands to hit the lyrics! (Webcam required)';
        break;
      case 'body':
        text = 'Use your body to hit the lyrics! (Webcam required)';
        break;
    }
    this.instructionsEl.textContent = text;
  }

  /**
   * Initializes the camera and MediaPipe for hand/body tracking.
   */
  initCamera() {
    const videoElement = document.getElementById('camera-video');
    const segmentationCanvas = document.getElementById('segmentation-canvas');
    const segmentationCtx = segmentationCanvas.getContext('2d');
    segmentationCanvas.classList.remove('hidden');

    const onResults = (results) => {
        // Draw segmentation mask
        segmentationCtx.save();
        segmentationCtx.clearRect(0, 0, segmentationCanvas.width, segmentationCanvas.height);
        segmentationCtx.translate(segmentationCanvas.width, 0);
        segmentationCtx.scale(-1, 1);
        segmentationCtx.drawImage(results.segmentationMask, 0, 0, segmentationCanvas.width, segmentationCanvas.height);
        segmentationCtx.globalCompositeOperation = 'source-in';
        segmentationCtx.drawImage(results.image, 0, 0, segmentationCanvas.width, segmentationCanvas.height);
        segmentationCtx.restore();

        // Process landmarks for the current mode
        if (this.currentMode === 'hand' && results.multiHandLandmarks) {
            this.visuals.updateHandLandmarks(results);
            for (const landmarks of results.multiHandLandmarks) {
                const indexFingerTip = landmarks[8]; // Index finger tip
                const x = (1 - indexFingerTip.x) * window.innerWidth;
                const y = indexFingerTip.y * window.innerHeight;
                this.checkLyrics(x, y, 50);
            }
        } else if (this.currentMode === 'body' && results.poseLandmarks) {
            const flippedLandmarks = results.poseLandmarks.map(landmark => ({ ...landmark, x: 1 - landmark.x }));
            this.visuals.updatePlayerAvatar(flippedLandmarks);
            const rightHand = flippedLandmarks[20]; // Right wrist
            const leftHand = flippedLandmarks[19]; // Left wrist
            if (rightHand && rightHand.visibility > 0.5) {
                this.checkLyrics(rightHand.x * window.innerWidth, rightHand.y * window.innerHeight, 60);
            }
            if (leftHand && leftHand.visibility > 0.5) {
                this.checkLyrics(leftHand.x * window.innerWidth, leftHand.y * window.innerHeight, 60);
            }
        }
    };
    
    // Common Selfie Segmentation
    const selfieSegmentation = new SelfieSegmentation({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`});
    selfieSegmentation.setOptions({ modelSelection: 0 });
    selfieSegmentation.onResults(onResults);

    // Mode-specific MediaPipe setup
    let mediaPipeSolution = null;
    if (this.currentMode === 'hand') {
        mediaPipeSolution = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
        mediaPipeSolution.setOptions({ maxNumHands: 2, minDetectionConfidence: 0.5 });
    } else if (this.currentMode === 'body') {
        mediaPipeSolution = new Pose({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`});
        mediaPipeSolution.setOptions({ modelComplexity: 1, minDetectionConfidence: 0.5 });
    }
    if(mediaPipeSolution) mediaPipeSolution.onResults(onResults);


    // Start the camera
    const camera = new Camera(videoElement, {
        onFrame: async () => {
            segmentationCanvas.width = videoElement.videoWidth;
            segmentationCanvas.height = videoElement.videoHeight;
            await selfieSegmentation.send({ image: videoElement });
            if (mediaPipeSolution) {
                await mediaPipeSolution.send({ image: videoElement });
            }
        },
        width: 640,
        height: 480
    });
    camera.start();
  }
}


class LiveStageVisuals {
  constructor(container) {
    this.container = container;
    this.initThreeJS();
    this.animate();
  }

  initThreeJS() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 1.5, 5);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.domElement.style.position = 'fixed';
    this.renderer.domElement.style.top = 0;
    this.renderer.domElement.style.left = 0;
    this.renderer.domElement.style.zIndex = 1;
    this.container.appendChild(this.renderer.domElement);

    // Basic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    this.camera.add(pointLight);
    this.scene.add(this.camera);

    window.addEventListener('resize', () => this.onResize());
    
    this.playerAvatar = {};
    this.handJoints = [];
  }

  updatePlayerAvatar(landmarks) {
    // This is a simplified visualization. A full implementation would
    // create and update a skinned mesh or a set of connected joints.
    if (!this.playerAvatar.joints) {
        this.playerAvatar.joints = [];
        for (let i = 0; i < landmarks.length; i++) {
            const geometry = new THREE.SphereGeometry(0.05, 16, 16);
            const material = new THREE.MeshBasicMaterial({ color: 0x39C5BB });
            const joint = new THREE.Mesh(geometry, material);
            this.playerAvatar.joints.push(joint);
            this.scene.add(joint);
        }
    }

    landmarks.forEach((landmark, i) => {
        const joint = this.playerAvatar.joints[i];
        if (joint) {
            joint.position.x = (landmark.x - 0.5) * 10;
            joint.position.y = (1 - landmark.y) * 5;
            joint.position.z = landmark.z * -10;
        }
    });
  }

  updateHandLandmarks(handsResults) {
    if (this.handJoints) {
        this.handJoints.forEach(joint => this.scene.remove(joint));
    }
    this.handJoints = [];

    if (!handsResults.multiHandLandmarks) return;

    handsResults.multiHandLandmarks.forEach(landmarks => {
        landmarks.forEach(landmark => {
            const geometry = new THREE.SphereGeometry(0.03, 16, 16);
            const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const joint = new THREE.Mesh(geometry, material);
            
            joint.position.x = (0.5 - landmark.x) * 10;
            joint.position.y = (1 - landmark.y) * 5;
            joint.position.z = landmark.z * 10;

            this.scene.add(joint);
            this.handJoints.push(joint);
        });
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
