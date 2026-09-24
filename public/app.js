// VanishBoard - Real-time Ephemeral Drawing Canvas
(() => {
  // DOM Elements
  const canvas = document.getElementById('drawing-canvas');
  const ctx = canvas.getContext('2d');
  const cursorsLayer = document.getElementById('cursors-layer');
  const topBar = document.getElementById('top-bar');
  const toolDock = document.getElementById('tool-dock');
  const roomModal = document.getElementById('room-modal');
  const currentRoomCodeEl = document.getElementById('current-room-code');
  const userCountEl = document.getElementById('user-count');
  const copyLinkBtn = document.getElementById('copy-link-btn');
  const leaveRoomBtn = document.getElementById('leave-room-btn');
  const btnDuster = document.getElementById('btn-duster');
  const toastContainer = document.getElementById('toast-container');

  // Multi-Page Switcher Elements (5 Pages)
  const pageDock = document.getElementById('page-dock');
  const btnPrevPage = document.getElementById('btn-prev-page');
  const btnNextPage = document.getElementById('btn-next-page');
  const pagePills = document.querySelectorAll('.page-pill');
  const pageLabel = document.getElementById('page-label');
  let currentPage = 1;

  // Modal Inputs
  const usernameInput = document.getElementById('username-input');
  const roomCodeInput = document.getElementById('room-code-input');
  const joinRoomBtn = document.getElementById('join-room-btn');
  const createRoomBtn = document.getElementById('create-room-btn');
  const joinRoomForm = document.getElementById('join-room-form');
  const connectionStatusPill = document.getElementById('connection-status-pill');
  const connectionStatusText = document.getElementById('connection-status-text');
  const roomModalTitle = document.getElementById('room-modal-title');
  const roomModalSubtitle = document.getElementById('room-modal-subtitle');
  const changeRoomActions = document.getElementById('change-room-actions');
  const cancelChangeRoomBtn = document.getElementById('cancel-change-room-btn');
  const leaveRoomConfirmBtn = document.getElementById('leave-room-confirm-btn');

  // Tool Dock Inputs
  const toolBtns = document.querySelectorAll('.tool-btn[data-tool]');
  const brushSizeInput = document.getElementById('brush-size');
  const sizeDot = document.getElementById('size-dot');

  // Pen Colors Popover
  const btnPenColors = document.getElementById('btn-pen-colors');
  const penColorsPopover = document.getElementById('pen-colors-popover');
  const activePenColorDot = document.getElementById('active-pen-color-dot');
  const colorSwatches = document.querySelectorAll('.color-swatch');
  const customColorInput = document.getElementById('custom-color-input');

  // Board Background Palette Popover
  const btnBoardPalette = document.getElementById('btn-board-palette');
  const boardColorsPopover = document.getElementById('board-colors-popover');
  const activeBoardColorDot = document.getElementById('active-board-color-dot');
  const boardSwatches = document.querySelectorAll('.board-swatch');

  // Doodles & Stickers Popover
  const btnDoodles = document.getElementById('btn-doodles');
  const doodlesPopover = document.getElementById('doodles-popover');
  const doodleItems = document.querySelectorAll('.doodle-item');

  // Animated GIF Stickers Popover
  const btnGifStickers = document.getElementById('btn-gif-stickers');
  const gifStickersPopover = document.getElementById('gif-stickers-popover');
  const gifStickersGrid = document.getElementById('gif-stickers-grid');

  // Keyboard Text Typing Tool Elements
  const textInputOverlay = document.getElementById('text-input-overlay');
  const canvasTextInput = document.getElementById('canvas-text-input');
  const submitTextBtn = document.getElementById('submit-text-btn');
  const cancelTextBtn = document.getElementById('cancel-text-btn');
  const fontSizeChips = document.querySelectorAll('.font-size-chip');

  // Floating Text Zoom HUD Elements
  const textZoomHud = document.getElementById('text-zoom-hud');
  const textZoomSizeEl = document.getElementById('text-zoom-size');
  let hudHideTimeout = null;

  function showTextZoomHUD(clientX, clientY, sizePx) {
    if (!textZoomHud || !textZoomSizeEl) return;
    clearTimeout(hudHideTimeout);
    textZoomSizeEl.textContent = `${sizePx}px`;
    const hudX = Math.max(80, Math.min(window.innerWidth - 80, clientX));
    const hudY = Math.max(50, Math.min(window.innerHeight - 50, clientY));
    textZoomHud.style.left = `${hudX}px`;
    textZoomHud.style.top = `${hudY}px`;
    textZoomHud.classList.remove('hidden');
  }

  function hideTextZoomHUD(delay = 600) {
    if (!textZoomHud) return;
    clearTimeout(hudHideTimeout);
    hudHideTimeout = setTimeout(() => {
      textZoomHud.classList.add('hidden');
    }, delay);
  }

  // Audio Synth (Web Audio API)
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.05) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio not supported or blocked
    }
  }

  function playJoinChime() {
    playTone(587.33, 'sine', 0.12, 0.04);
    setTimeout(() => playTone(880, 'sine', 0.18, 0.04), 100);
  }

  function playClearWhoosh() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  }

  // Server URL Configuration (Supports Web & Android APK environments)
  const isWebProtocol = window.location.protocol.startsWith('http');
  const CLOUD_URL = 'https://tap-interference-represent-meals.trycloudflare.com';
  const PUBLIC_URL = CLOUD_URL;
  const DEFAULT_SERVER = isWebProtocol ? window.location.origin : PUBLIC_URL;
  let savedUrl = localStorage.getItem('vb_server_url');
  // Auto-upgrade from broken Render or outdated tunnel URLs to current active URL
  if (savedUrl && (savedUrl.includes('render.com') || savedUrl.includes('onrender.com') ||
      savedUrl.includes('trycloudflare.com') && !savedUrl.includes('tap-interference-represent-meals') ||
      savedUrl.includes('expanding-relationships-parker-baghdad') ||
      savedUrl.includes('dealing-vote-language-catch') ||
      savedUrl.includes('attorneys-donors-eminem-hobby') ||
      savedUrl.includes('manuals-essay-express-sheet'))) {
    savedUrl = CLOUD_URL;
    localStorage.setItem('vb_server_url', CLOUD_URL);
  }
  let activeServerUrl = savedUrl || DEFAULT_SERVER;

  // Immediately inform Android Bridge of active server URL
  if (window.AndroidBridge && typeof window.AndroidBridge.setServerUrl === 'function') {
    try { window.AndroidBridge.setServerUrl(activeServerUrl); } catch (e) {}
  }

  // Socket.IO Setup with reliable fallback transports (WebSockets prioritized for Vercel)
  let socket = io(activeServerUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000
  });
  let currentRoom = null;
  let currentUser = null;
  let timeOffset = 0; // Server time offset
  let isSocketConnected = false;
  let joinPendingCode = null;

  function sanitizeRoomCode(raw) {
    if (!raw) return '';
    return String(raw)
      .toUpperCase()
      .trim()
      .replace(/['"`]/g, '-')
      .replace(/[–—_]/g, '-')
      .replace(/[^A-Z0-9-]/g, '');
  }

  const modalServerStatus = document.getElementById('modal-server-status');
  const modalServerStatusText = document.getElementById('modal-server-status-text');

  function updateConnectionUI(status, message) {
    if (connectionStatusPill && connectionStatusText) {
      connectionStatusPill.className = `connection-pill ${status}`;
      connectionStatusText.textContent = message;
    }
    if (modalServerStatus && modalServerStatusText) {
      modalServerStatus.className = `connection-pill ${status}`;
      modalServerStatusText.textContent = message;
    }
  }

  socket.on('connect', () => {
    isSocketConnected = true;
    updateConnectionUI('connected', 'Connected to server');
    console.log('[Socket] Connected to server successfully:', socket.id);

    // If already in a room and reconnected (e.g. mobile cellular handoff), auto-rejoin immediately
    if (currentRoom) {
      console.log('[Socket] Reconnected! Auto-rejoining room:', currentRoom);
      socket.emit('join-room', { roomCode: currentRoom, userName: currentUser?.name }, (res) => {
        console.log('[Socket] Rejoined room successfully:', res);
      });
    } else if (joinPendingCode) {
      const pending = joinPendingCode;
      joinPendingCode = null;
      joinRoom(pending);
    }
  });

  socket.on('disconnect', (reason) => {
    isSocketConnected = false;
    updateConnectionUI('connecting', 'Reconnecting to server...');
    console.warn('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    isSocketConnected = false;
    updateConnectionUI('error', `Connection error (Click to check URL)`);
    console.error('[Socket] Connection error:', err.message);
  });

  if (connectionStatusPill) {
    connectionStatusPill.addEventListener('click', () => {
      const serverPanel = document.getElementById('server-settings-panel');
      if (serverPanel) serverPanel.classList.toggle('hidden');
    });
  }

  // Drawing State
  let isDrawing = false;
  let currentTool = 'pen'; // 'pen' | 'text' | 'doodle' | 'gif_sticker' | 'glow' | 'eraser'
  let currentColor = '#18181b';
  let currentBrushSize = 3;
  let currentFadeDuration = 999999999; // Sticky board stays permanent until Duster is used
  let currentFontSize = 26;
  let textTargetPosition = null;
  let activeDoodle = null;
  let activeGifSticker = null;
  let currentStroke = null;

  // 30 Hand-Drawn Animated Emoji Stickers
  const STICKER_LIST = [
    { id: 'dance', label: 'Dancing ♪', file: 'stickers/sticker_dance.png', gif: 'stickers/sticker_dance.gif', width: 120, height: 146 },
    { id: 'panic', label: 'Panic!', file: 'stickers/sticker_panic.png', gif: 'stickers/sticker_panic.gif', width: 146, height: 148 },
    { id: 'idunno', label: 'I Dunno?', file: 'stickers/sticker_idunno.png', gif: 'stickers/sticker_idunno.gif', width: 147, height: 144 },
    { id: 'yay', label: 'Yay! ★', file: 'stickers/sticker_yay.png', gif: 'stickers/sticker_yay.gif', width: 146, height: 149 },
    { id: 'boohoo', label: 'Boo Hoo!', file: 'stickers/sticker_boohoo.png', gif: 'stickers/sticker_boohoo.gif', width: 115, height: 145 },
    { id: 'angry', label: 'Angry!', file: 'stickers/sticker_angry.png', gif: 'stickers/sticker_angry.gif', width: 119, height: 163 },
    { id: 'omg', label: 'OMG! ❗', file: 'stickers/sticker_omg.png', gif: 'stickers/sticker_omg.gif', width: 146, height: 163 },
    { id: 'haha', label: 'Haha! 🤣', file: 'stickers/sticker_haha.png', gif: 'stickers/sticker_haha.gif', width: 147, height: 163 },
    { id: 'nooo', label: 'Facepalm', file: 'stickers/sticker_nooo.png', gif: 'stickers/sticker_nooo.gif', width: 146, height: 163 },
    { id: 'sleep', label: 'Sleeping zZ', file: 'stickers/sticker_sleep.png', gif: 'stickers/sticker_sleep.gif', width: 133, height: 158 },
    { id: 'eep', label: 'Eep! 💦', file: 'stickers/sticker_eep.png', gif: 'stickers/sticker_eep.gif', width: 117, height: 164 },
    { id: 'thumbsup', label: 'Yes! 👍', file: 'stickers/sticker_thumbsup.png', gif: 'stickers/sticker_thumbsup.gif', width: 146, height: 164 },
    { id: 'huh', label: 'Huh? ❓', file: 'stickers/sticker_huh.png', gif: 'stickers/sticker_huh.gif', width: 147, height: 164 },
    { id: 'nom', label: 'Nom Nom 🍔', file: 'stickers/sticker_nom.png', gif: 'stickers/sticker_nom.gif', width: 146, height: 158 },
    { id: 'wooo', label: 'Wooo!', file: 'stickers/sticker_wooo.png', gif: 'stickers/sticker_wooo.gif', width: 137, height: 157 },
    { id: 'cheer', label: 'Cheer! 📣', file: 'stickers/sticker_cheer.png', gif: 'stickers/sticker_cheer.gif', width: 129, height: 151 },
    { id: 'sigh', label: 'Sigh 💨', file: 'stickers/sticker_sigh.png', gif: 'stickers/sticker_sigh.gif', width: 146, height: 163 },
    { id: 'oops', label: 'Oops! 💥', file: 'stickers/sticker_oops.png', gif: 'stickers/sticker_oops.gif', width: 147, height: 163 },
    { id: 'scared', label: 'Scared 😱', file: 'stickers/sticker_scared.png', gif: 'stickers/sticker_scared.gif', width: 146, height: 163 },
    { id: 'ugh', label: 'Ugh! 💢', file: 'stickers/sticker_ugh.png', gif: 'stickers/sticker_ugh.gif', width: 137, height: 161 },
    { id: 'crying', label: 'Crying 😭', file: 'stickers/sticker_crying.png', gif: 'stickers/sticker_crying.gif', width: 122, height: 163 },
    { id: 'groove', label: 'Groove! 🕺', file: 'stickers/sticker_groove.png', gif: 'stickers/sticker_groove.gif', width: 146, height: 158 },
    { id: 'sad', label: 'Sad 🌧️', file: 'stickers/sticker_sad.png', gif: 'stickers/sticker_sad.gif', width: 147, height: 161 },
    { id: 'wah', label: 'Wah! 😲', file: 'stickers/sticker_wah.png', gif: 'stickers/sticker_wah.gif', width: 146, height: 158 },
    { id: 'strong', label: 'Strong! 💪', file: 'stickers/sticker_strong.png', gif: 'stickers/sticker_strong.gif', width: 129, height: 160 },
    { id: 'shy', label: 'Shy ☺️', file: 'stickers/sticker_shy.png', gif: 'stickers/sticker_shy.gif', width: 116, height: 147 },
    { id: 'love', label: 'Love! ❤️', file: 'stickers/sticker_love.png', gif: 'stickers/sticker_love.gif', width: 116, height: 146 },
    { id: 'devil', label: 'Devil 😈', file: 'stickers/sticker_devil.png', gif: 'stickers/sticker_devil.gif', width: 133, height: 138 },
    { id: 'running', label: 'Running! 🏃', file: 'stickers/sticker_running.png', gif: 'stickers/sticker_running.gif', width: 133, height: 148 },
    { id: 'party', label: 'Party! 🎉', file: 'stickers/sticker_party.png', gif: 'stickers/sticker_party.gif', width: 130, height: 151 }
  ];

  // Preload and Cache Animated GIFs and PNGs in DOM for continuous 60fps frame updating
  const stickerImages = new Map(); // id -> HTMLImageElement (GIF)
  const stickerPngs = new Map();   // id -> HTMLImageElement (PNG)
  const hiddenGifContainer = document.createElement('div');
  hiddenGifContainer.id = 'gif-preload-cache';
  hiddenGifContainer.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.01;pointer-events:none;overflow:hidden;z-index:-999;';
  document.body.appendChild(hiddenGifContainer);

  STICKER_LIST.forEach(item => {
    const gifImg = new Image();
    gifImg.src = item.gif;
    hiddenGifContainer.appendChild(gifImg);
    stickerImages.set(item.id, gifImg);

    const pngImg = new Image();
    pngImg.src = item.file;
    stickerPngs.set(item.id, pngImg);
  });

  function stampDoodle(icon, x = 0.5, y = 0.45) {
    if (!currentRoom) return;
    const doodleStroke = {
      id: `doodle-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'doodle',
      page: currentPage,
      icon: icon,
      x: x,
      y: y,
      size: 56,
      createdAt: Date.now(),
      endedAt: Date.now(),
      fadeDuration: currentFadeDuration,
      boardW: Math.round(canvasWidth || window.innerWidth || 360),
      boardH: Math.round(canvasHeight || window.innerHeight || 780)
    };
    completedStrokes.push(doodleStroke);
    saveStrokesToLocalStorage();
    socket.emit('stroke-end', {
      strokeId: doodleStroke.id,
      fullStroke: doodleStroke
    });
    if (activeServerUrl && currentRoom) {
      try {
        fetch(`${activeServerUrl}/api/room/${encodeURIComponent(currentRoom)}/stroke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(doodleStroke)
        }).catch(() => {});
      } catch (e) {}
    }
    syncWidgetCanvas(true);
    playTone(660, 'sine', 0.08, 0.04);
  }

  function stampGifSticker(stickerId, x = 0.5, y = 0.45) {
    if (!currentRoom) return;
    const meta = STICKER_LIST.find(s => s.id === stickerId) || { width: 130, height: 150 };
    const stickerStroke = {
      id: `sticker-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'gif_sticker',
      page: currentPage,
      stickerId: stickerId,
      x: x,
      y: y,
      width: meta.width || 130,
      height: meta.height || 150,
      createdAt: Date.now(),
      endedAt: Date.now(),
      fadeDuration: currentFadeDuration,
      boardW: Math.round(canvasWidth || window.innerWidth || 360),
      boardH: Math.round(canvasHeight || window.innerHeight || 780)
    };
    completedStrokes.push(stickerStroke);
    saveStrokesToLocalStorage();
    socket.emit('stroke-end', {
      strokeId: stickerStroke.id,
      fullStroke: stickerStroke
    });
    if (activeServerUrl && currentRoom) {
      try {
        fetch(`${activeServerUrl}/api/room/${encodeURIComponent(currentRoom)}/stroke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stickerStroke)
        }).catch(() => {});
      } catch (e) {}
    }
    syncWidgetCanvas(true);
    playTone(720, 'sine', 0.1, 0.04);
  }

  // Stroke Storage & Permanent Local Storage
  // Each stroke: { id, page, points: [{x, y}], color, width, mode, createdAt, endedAt }
  let completedStrokes = [];
  const remoteActiveStrokes = new Map(); // strokeId -> stroke
  const remoteCursors = new Map(); // userId -> DOM element

  function saveStrokesToLocalStorage() {
    if (!currentRoom) return;
    try {
      localStorage.setItem(`vb_strokes_${currentRoom}`, JSON.stringify(completedStrokes));
    } catch (e) {}
  }

  function loadStrokesFromLocalStorage(roomCode) {
    if (!roomCode) return [];
    try {
      const raw = localStorage.getItem(`vb_strokes_${roomCode}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  }

  // Window Sizing & DPR
  let canvasWidth = window.innerWidth;
  let canvasHeight = window.innerHeight;
  let dpr = window.devicePixelRatio || 1;

  function resizeCanvas() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    dpr = window.devicePixelRatio || 1;

    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    if (window.AndroidBridge && typeof window.AndroidBridge.updateBoardDimensions === 'function') {
      try {
        window.AndroidBridge.updateBoardDimensions(Math.round(canvasWidth), Math.round(canvasHeight));
      } catch (e) {}
    }

    // DPR scaling is handled inside the animation frame render loop
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Toast System
  function showToast(text) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = text;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2500);
  }

  // Generate Fun Room Codes
  const CODE_ADJECTIVES = ['NEON', 'CYBER', 'MAGIC', 'GLOW', 'SWIFT', 'VIVID', 'SOLAR', 'LUNAR', 'ECHO', 'CHRONO'];
  function generateRoomCode() {
    const adj = CODE_ADJECTIVES[Math.floor(Math.random() * CODE_ADJECTIVES.length)];
    const num = Math.floor(10 + Math.random() * 90);
    return `${adj}-${num}`;
  }

  // 5-Page Multi-Board Navigation
  function switchPage(pageNumber, syncToServer = true) {
    const targetPage = Math.max(1, Math.min(5, parseInt(pageNumber, 10) || 1));
    currentPage = targetPage;
    localStorage.setItem('vb_last_page', currentPage);

    // Update Pills
    if (pagePills) {
      pagePills.forEach(pill => {
        const p = parseInt(pill.getAttribute('data-page'), 10);
        pill.classList.toggle('active', p === currentPage);
      });
    }
    if (pageLabel) {
      pageLabel.textContent = `Page ${currentPage}/5`;
    }

    // Dismiss any open popovers when changing page
    if (penColorsPopover) penColorsPopover.classList.add('hidden');
    if (boardColorsPopover) boardColorsPopover.classList.add('hidden');
    if (doodlesPopover) doodlesPopover.classList.add('hidden');
    if (gifStickersPopover) gifStickersPopover.classList.add('hidden');
    if (textInputOverlay) textInputOverlay.classList.add('hidden');

    // Notify Android widget
    if (window.AndroidBridge && typeof window.AndroidBridge.updateActivePage === 'function') {
      window.AndroidBridge.updateActivePage(currentPage);
    }

    // Immediately re-render widget preview for the new page
    syncWidgetCanvas(true);

    // Audio cue
    playTone(440 + (currentPage * 60), 'sine', 0.06, 0.03);

    // Sync to peers and cloud server
    if (syncToServer && currentRoom) {
      socket.emit('page-change', { page: currentPage });
      if (activeServerUrl) {
        try {
          fetch(`${activeServerUrl}/api/room/${encodeURIComponent(currentRoom)}/page`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page: currentPage, byUser: currentUser?.name || 'User' })
          }).catch(() => {});
        } catch (e) {}
      }
    }
  }

  // Bind page buttons
  if (pagePills) {
    pagePills.forEach(pill => {
      pill.addEventListener('click', () => {
        const p = parseInt(pill.getAttribute('data-page'), 10);
        switchPage(p, true);
        showToast(`Page ${currentPage}`);
      });
    });
  }

  if (btnPrevPage) {
    btnPrevPage.addEventListener('click', () => {
      const next = currentPage > 1 ? currentPage - 1 : 5;
      switchPage(next, true);
      showToast(`Page ${currentPage}`);
    });
  }

  if (btnNextPage) {
    btnNextPage.addEventListener('click', () => {
      const next = currentPage < 5 ? currentPage + 1 : 1;
      switchPage(next, true);
      showToast(`Page ${currentPage}`);
    });
  }

  window.onWidgetOpenPage = function(p) {
    switchPage(p, true);
  };

  // Room Navigation
  let joinTimeout = null;

  function joinRoom(roomCode) {
    if (!roomCode) return;
    const cleanCode = sanitizeRoomCode(roomCode);
    if (!cleanCode) return;
    const userName = (usernameInput && usernameInput.value.trim()) || undefined;

    getAudioContext(); // Unlock audio on user action

    currentRoom = cleanCode;
    currentUser = { name: userName || 'User' };
    localStorage.setItem('vb_last_room', cleanCode);

    // Immediately restore cached strokes from localStorage so nothing is lost or blank
    const localStrokes = loadStrokesFromLocalStorage(cleanCode);
    if (localStrokes.length > 0) {
      completedStrokes = localStrokes;
    }

    if (currentRoomCodeEl) currentRoomCodeEl.textContent = cleanCode;
    updateUserCount(1);

    // Immediately reveal UI so user can draw right away without waiting or blank screens!
    resetModalHeader();
    if (roomModal) roomModal.classList.add('hidden');
    if (topBar) topBar.classList.remove('hidden');
    if (toolDock) toolDock.classList.remove('hidden');
    if (pageDock) pageDock.classList.remove('hidden');

    // Restore last page or default to 1
    const savedPage = parseInt(localStorage.getItem('vb_last_page'), 10) || 1;
    switchPage(savedPage, false);

    if (window.AndroidBridge) {
      if (typeof window.AndroidBridge.updateRoomInfo === 'function') {
        window.AndroidBridge.updateRoomInfo(cleanCode, 1);
      }
      if (typeof window.AndroidBridge.setServerUrl === 'function') {
        window.AndroidBridge.setServerUrl(activeServerUrl);
      }
      if (typeof window.AndroidBridge.updateActivePage === 'function') {
        window.AndroidBridge.updateActivePage(currentPage);
      }
    }

    // Immediately sync widget canvas
    syncWidgetCanvas(true);

    // Update URL without page reload
    try {
      const url = new URL(window.location);
      url.searchParams.set('room', cleanCode);
      window.history.pushState({}, '', url);
    } catch (e) {}

    // If socket is connected, emit join-room
    if (isSocketConnected) {
      socket.emit('join-room', { roomCode: cleanCode, userName }, (res) => {
        if (res && res.error) {
          showToast(`Note: ${res.error}`);
        }
        if (res && res.activePage) {
          switchPage(res.activePage, false);
        }
      });
    } else {
      joinPendingCode = cleanCode;
      updateConnectionUI('connecting', 'Connecting...');
    }

    // Fetch existing room strokes via REST in case socket is connecting
    if (activeServerUrl) {
      fetch(`${activeServerUrl}/api/room/${encodeURIComponent(cleanCode)}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            if (data.activePage) {
              switchPage(data.activePage, false);
            }
            if (Array.isArray(data.strokes) && data.strokes.length > 0) {
              const strokeMap = new Map();
              completedStrokes.forEach(s => strokeMap.set(s.id, s));
              data.strokes.forEach(s => strokeMap.set(s.id, {
                ...s,
                endedAt: s.endedAt || s.createdAt
              }));
              completedStrokes = Array.from(strokeMap.values());
              saveStrokesToLocalStorage();
              syncWidgetCanvas(true);
            } else if (completedStrokes.length > 0) {
              // Server has 0 strokes, upload local strokes to server so they are saved
              for (const s of completedStrokes) {
                fetch(`${activeServerUrl}/api/room/${encodeURIComponent(cleanCode)}/stroke`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(s)
                }).catch(() => {});
              }
            }
          }
        })
        .catch(() => {});
    }
  }

  function resetModalHeader() {
    if (roomModalTitle) roomModalTitle.innerHTML = 'Vanish<span>Board</span>';
    if (roomModalSubtitle) roomModalSubtitle.textContent = 'Shared real-time canvas with temporary, disappearing ink.';
    if (changeRoomActions) changeRoomActions.classList.add('hidden');
    if (joinRoomBtn) {
      joinRoomBtn.disabled = false;
      joinRoomBtn.textContent = 'Join';
    }
  }

  function openRoomSwitchModal() {
    // Dismiss any open popovers
    if (penColorsPopover) penColorsPopover.classList.add('hidden');
    if (boardColorsPopover) boardColorsPopover.classList.add('hidden');
    if (doodlesPopover) doodlesPopover.classList.add('hidden');
    if (gifStickersPopover) gifStickersPopover.classList.add('hidden');
    if (textInputOverlay) textInputOverlay.classList.add('hidden');

    if (currentRoom) {
      if (roomModalTitle) roomModalTitle.innerHTML = 'Change <span>Room</span>';
      if (roomModalSubtitle) {
        roomModalSubtitle.innerHTML = `Current Room: <strong style="color:var(--accent-cyan); letter-spacing:1px;">${currentRoom}</strong>. Enter a new code or create a new board:`;
      }
      if (changeRoomActions) changeRoomActions.classList.remove('hidden');
      if (joinRoomBtn) {
        joinRoomBtn.disabled = false;
        joinRoomBtn.textContent = 'Switch Room';
      }
    } else {
      resetModalHeader();
    }

    if (roomCodeInput) {
      roomCodeInput.value = '';
      setTimeout(() => {
        try {
          roomCodeInput.focus();
        } catch (e) {}
      }, 120);
    }

    roomModal.classList.remove('hidden');
  }

  function leaveRoom() {
    currentRoom = null;
    completedStrokes = [];
    remoteActiveStrokes.clear();
    remoteCursors.forEach(el => el.remove());
    remoteCursors.clear();
    localStorage.removeItem('vb_last_room');

    // Clean URL query
    try {
      const url = new URL(window.location);
      url.searchParams.delete('room');
      window.history.pushState({}, '', url);
    } catch (e) {}

    resetModalHeader();

    // Toggle UI: show room modal, hide toolbar
    topBar.classList.add('hidden');
    toolDock.classList.add('hidden');
    if (pageDock) pageDock.classList.add('hidden');
    roomModal.classList.remove('hidden');

    if (currentRoomCodeEl) currentRoomCodeEl.textContent = '------';
    if (roomCodeInput) {
      roomCodeInput.value = '';
      setTimeout(() => {
        try {
          roomCodeInput.focus();
        } catch (e) {}
      }, 120);
    }

    socket.emit('join-room', { roomCode: '' }); // Leave room on server

    // Reset widget badge & preview
    if (window.AndroidBridge && typeof window.AndroidBridge.updateRoomInfo === 'function') {
      window.AndroidBridge.updateRoomInfo('', 1);
    }
    syncWidgetCanvas(true);

    playClearWhoosh();
    showToast('Left board. Join or create a new room!');
  }

  // Socket Event Handlers
  socket.on('joined-room-success', (data) => {
    clearTimeout(joinTimeout);
    if (joinRoomBtn) {
      joinRoomBtn.disabled = false;
      joinRoomBtn.textContent = 'Join';
    }

    currentRoom = data.roomCode;
    currentUser = data.user;
    timeOffset = data.serverTime - Date.now();
    localStorage.setItem('vb_last_room', currentRoom);
    if (window.AndroidBridge) {
      if (typeof window.AndroidBridge.updateRoomInfo === 'function') {
        window.AndroidBridge.updateRoomInfo(currentRoom, data.users.length);
      }
      if (typeof window.AndroidBridge.setServerUrl === 'function') {
        window.AndroidBridge.setServerUrl(activeServerUrl);
      }
    }

    currentRoomCodeEl.textContent = currentRoom;
    updateUserCount(data.users.length);

    // Populate active strokes
    if (Array.isArray(data.activeStrokes)) {
      completedStrokes = data.activeStrokes.map(s => ({
        ...s,
        endedAt: s.endedAt || s.createdAt
      }));
    }

    // Immediately sync loaded room content to home screen widget
    syncWidgetCanvas(true);

    // Reveal UI
    resetModalHeader();
    roomModal.classList.add('hidden');
    topBar.classList.remove('hidden');
    toolDock.classList.remove('hidden');
    if (pageDock) pageDock.classList.remove('hidden');
    if (data && data.activePage) {
      switchPage(data.activePage, false);
    }

    playJoinChime();
    showToast(`Joined Room ${currentRoom}`);
  });

  socket.on('user-joined', (data) => {
    updateUserCount(data.totalCount);
    playTone(660, 'sine', 0.15, 0.04);
    showToast(`${data.user.name} connected!`);
  });

  socket.on('user-left', (data) => {
    updateUserCount(data.remainingCount);
    // Remove remote cursor
    if (remoteCursors.has(data.socketId)) {
      remoteCursors.get(data.socketId).remove();
      remoteCursors.delete(data.socketId);
    }
    if (data.userName) {
      showToast(`${data.userName} disconnected.`);
    }
  });

  function updateUserCount(count) {
    if (count <= 1) {
      userCountEl.textContent = '1 Online';
    } else {
      userCountEl.textContent = `${count} Online`;
    }
    if (window.AndroidBridge && typeof window.AndroidBridge.updateRoomInfo === 'function') {
      window.AndroidBridge.updateRoomInfo(currentRoom || '', count);
    }
  }

  // Remote Drawing Events
  socket.on('stroke-start', (strokeData) => {
    if (!strokeData || !strokeData.id) return;
    const s = {
      ...strokeData,
      color: strokeData.color || '#18181b',
      fadeDuration: 999999999,
      localReceivedAt: Date.now(),
      endedAt: null
    };
    remoteActiveStrokes.set(strokeData.id, s);
    syncWidgetCanvas(false);
  });

  socket.on('stroke-point', (data) => {
    if (!data || !data.strokeId) return;
    let stroke = remoteActiveStrokes.get(data.strokeId);
    if (!stroke) {
      // Create fallback stroke if stroke-start packet arrived late or out of order
      stroke = {
        id: data.strokeId,
        points: [],
        color: '#18181b',
        width: 3,
        mode: 'pen',
        fadeDuration: 999999999,
        localReceivedAt: Date.now(),
        endedAt: null
      };
      remoteActiveStrokes.set(data.strokeId, stroke);
    }
    if (data.point) {
      stroke.points.push(data.point);
      syncWidgetCanvas(false);
    }
  });

  socket.on('stroke-end', (data) => {
    if (!data || !data.strokeId) return;
    let stroke = remoteActiveStrokes.get(data.strokeId);
    if (data.fullStroke) {
      stroke = {
        ...data.fullStroke,
        color: data.fullStroke.color || '#18181b',
        fadeDuration: 999999999,
        endedAt: Date.now()
      };
    } else if (stroke) {
      stroke.endedAt = Date.now();
      stroke.fadeDuration = 999999999;
    }
    if (stroke) {
      stroke.fadeDuration = 999999999;
      const existingIdx = completedStrokes.findIndex(s => s.id === data.strokeId);
      if (existingIdx >= 0) {
        completedStrokes[existingIdx] = stroke;
      } else {
        completedStrokes.push(stroke);
      }
      remoteActiveStrokes.delete(data.strokeId);
      saveStrokesToLocalStorage();
      syncWidgetCanvas(true);
    }
  });

  socket.on('canvas-cleared', (data) => {
    if (data && data.page) {
      completedStrokes = completedStrokes.filter(s => (s.page || 1) !== data.page);
      remoteActiveStrokes.forEach((s, k) => {
        if ((s.page || 1) === data.page) remoteActiveStrokes.delete(k);
      });
      showToast(data.byUser ? `${data.byUser} cleared Page ${data.page}` : `Page ${data.page} cleared`);
    } else {
      completedStrokes = [];
      remoteActiveStrokes.clear();
      showToast(data && data.byUser ? `${data.byUser} cleared the board` : 'Board cleared');
    }
    saveStrokesToLocalStorage();
    syncWidgetCanvas(true);
    playClearWhoosh();
  });

  socket.on('page-changed', (data) => {
    if (data && data.page) {
      switchPage(data.page, false);
      if (data.userName) {
        showToast(`${data.userName} switched to Page ${data.page}`);
      }
    }
  });

  // Remote Cursor Tracking
  socket.on('cursor-update', (data) => {
    let cursorEl = remoteCursors.get(data.userId);
    if (!cursorEl) {
      cursorEl = document.createElement('div');
      cursorEl.className = 'remote-cursor';
      cursorEl.innerHTML = `
        <div class="cursor-pointer"></div>
        <div class="cursor-tag">${data.name}</div>
      `;
      cursorEl.style.setProperty('--cursor-color', data.color);
      cursorsLayer.appendChild(cursorEl);
      remoteCursors.set(data.userId, cursorEl);
    }

    // Position based on normalized coordinates
    const px = data.x * canvasWidth;
    const py = data.y * canvasHeight;
    cursorEl.style.transform = `translate3d(${px}px, ${py}px, 0)`;
  });

  // Cursor broadcast throttle
  let lastCursorEmit = 0;
  function emitCursorPosition(clientX, clientY) {
    if (!currentRoom || !currentUser) return;
    const now = performance.now();
    if (now - lastCursorEmit > 30) { // ~33fps
      lastCursorEmit = now;
      socket.emit('cursor-move', {
        x: clientX / canvasWidth,
        y: clientY / canvasHeight
      });
    }
  }

  // Drawing Coordinate Helpers
  function getCanvasCoords(e) {
    return {
      x: e.clientX / canvasWidth,
      y: e.clientY / canvasHeight
    };
  }

  // Two-Finger Text Zoom & Pinch Engine
  let isPinchingText = false;
  let activePinchText = null;
  let initialPinchDistance = 0;
  let initialPinchFontSize = 26;
  let initialPinchMidX = 0;
  let initialPinchMidY = 0;
  let initialPinchStrokeX = 0;
  let initialPinchStrokeY = 0;
  let lastPinchSoundTime = 0;
  const activeTouchPointers = new Map(); // pointerId -> { clientX, clientY }

  function cancelAccidentalDrawing() {
    if (isDrawing && currentStroke) {
      if (currentStroke.points.length <= 8 || (Date.now() - currentStroke.createdAt) < 500) {
        isDrawing = false;
        currentStroke = null;
      }
    }
  }

  function findClosestTextStroke(normX, normY) {
    let closest = null;
    let minDist = Infinity;
    for (let i = completedStrokes.length - 1; i >= 0; i--) {
      const s = completedStrokes[i];
      if (s.type === 'text' && (s.page || 1) === currentPage) {
        const dist = Math.hypot((s.x || 0.15) - normX, (s.y || 0.25) - normY);
        if (dist < minDist) {
          minDist = dist;
          closest = s;
        }
      }
    }
    return closest;
  }

  function startPinchGesture(x1, y1, x2, y2) {
    cancelAccidentalDrawing();
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const midPxX = (x1 + x2) / 2;
    const midPxY = (y1 + y2) / 2;
    const normMidX = midPxX / canvasWidth;
    const normMidY = midPxY / canvasHeight;

    const targetText = findClosestTextStroke(normMidX, normMidY);

    if (targetText) {
      activePinchText = targetText;
      initialPinchDistance = Math.max(15, dist);
      initialPinchFontSize = targetText.fontSize || 26;
      initialPinchMidX = normMidX;
      initialPinchMidY = normMidY;
      initialPinchStrokeX = targetText.x || 0.15;
      initialPinchStrokeY = targetText.y || 0.25;
      isPinchingText = true;

      showTextZoomHUD(midPxX, midPxY - 50, initialPinchFontSize);
      playTone(520, 'sine', 0.05, 0.03);
    } else {
      activePinchText = null;
      initialPinchDistance = Math.max(15, dist);
      initialPinchFontSize = currentFontSize || 26;
      isPinchingText = true;
      showTextZoomHUD(midPxX, midPxY - 50, initialPinchFontSize);
    }
  }

  function updatePinchGesture(x1, y1, x2, y2) {
    if (!isPinchingText) return;
    cancelAccidentalDrawing();

    const dist = Math.hypot(x2 - x1, y2 - y1);
    const midPxX = (x1 + x2) / 2;
    const midPxY = (y1 + y2) / 2;

    if (initialPinchDistance > 10) {
      const scale = dist / initialPinchDistance;
      const newSize = Math.round(Math.max(12, Math.min(180, initialPinchFontSize * scale)));

      if (activePinchText) {
        activePinchText.fontSize = newSize;

        // Two-finger repositioning: drag text note with fingers
        const normCurX = midPxX / canvasWidth;
        const normCurY = midPxY / canvasHeight;
        const dx = normCurX - initialPinchMidX;
        const dy = normCurY - initialPinchMidY;
        activePinchText.x = Math.max(0.02, Math.min(0.92, initialPinchStrokeX + dx));
        activePinchText.y = Math.max(0.02, Math.min(0.92, initialPinchStrokeY + dy));

        showTextZoomHUD(midPxX, midPxY - 50, newSize);
      } else {
        currentFontSize = newSize;
        if (canvasTextInput) canvasTextInput.style.fontSize = `${newSize}px`;
        showTextZoomHUD(midPxX, midPxY - 50, newSize);
      }

      const now = Date.now();
      if (now - lastPinchSoundTime > 130) {
        lastPinchSoundTime = now;
        playTone(380 + newSize * 3.5, 'sine', 0.03, 0.02);
      }
    }
  }

  function endPinchGesture() {
    if (!isPinchingText) return;
    isPinchingText = false;

    if (activePinchText) {
      socket.emit('stroke-end', {
        strokeId: activePinchText.id,
        fullStroke: activePinchText
      });

      if (activeServerUrl && currentRoom) {
        try {
          fetch(`${activeServerUrl}/api/room/${encodeURIComponent(currentRoom)}/stroke`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(activePinchText)
          }).catch(() => {});
        } catch (e) {}
      }

      syncWidgetCanvas(true);
      showToast(`Text size: ${activePinchText.fontSize}px`);
      playTone(680, 'sine', 0.08, 0.04);
      activePinchText = null;
    }

    hideTextZoomHUD(500);
  }

  // Native Touch API Listeners (Android / iOS Multi-touch Pinch)
  window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      startPinchGesture(
        e.touches[0].clientX, e.touches[0].clientY,
        e.touches[1].clientX, e.touches[1].clientY
      );
    }
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && isPinchingText) {
      e.preventDefault();
      updatePinchGesture(
        e.touches[0].clientX, e.touches[0].clientY,
        e.touches[1].clientX, e.touches[1].clientY
      );
    }
  }, { passive: false });

  window.addEventListener('touchend', (e) => {
    if (e.touches.length < 2 && isPinchingText) {
      endPinchGesture();
    }
  });

  window.addEventListener('touchcancel', (e) => {
    if (isPinchingText) {
      endPinchGesture();
    }
  });

  // Trackpad / Mouse Wheel Zoom on Desktop
  let wheelZoomTimeout = null;
  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const normX = e.clientX / canvasWidth;
      const normY = e.clientY / canvasHeight;
      const targetText = findClosestTextStroke(normX, normY);

      if (targetText) {
        const delta = e.deltaY < 0 ? 3 : -3;
        const newSize = Math.max(12, Math.min(180, (targetText.fontSize || 26) + delta));
        targetText.fontSize = newSize;
        currentFontSize = newSize;

        showTextZoomHUD(e.clientX, e.clientY - 45, newSize);
        hideTextZoomHUD(600);

        clearTimeout(wheelZoomTimeout);
        wheelZoomTimeout = setTimeout(() => {
          socket.emit('stroke-end', {
            strokeId: targetText.id,
            fullStroke: targetText
          });
          if (activeServerUrl && currentRoom) {
            try {
              fetch(`${activeServerUrl}/api/room/${encodeURIComponent(currentRoom)}/stroke`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(targetText)
              }).catch(() => {});
            } catch (err) {}
          }
          syncWidgetCanvas(true);
        }, 150);
      }
    }
  }, { passive: false });

  // Pointer Event Listeners
  window.addEventListener('pointerdown', (e) => {
    // Ignore clicks on UI overlays, popovers, and text modal
    if (e.target.closest('#top-bar, #tool-dock, #room-modal, #pen-colors-popover, #board-colors-popover, #doodles-popover, #gif-stickers-popover, #text-input-overlay, .toast')) return;
    if (!currentRoom) return;

    if (e.pointerType === 'touch') {
      activeTouchPointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      if (activeTouchPointers.size >= 2) {
        const pts = Array.from(activeTouchPointers.values());
        startPinchGesture(pts[0].clientX, pts[0].clientY, pts[1].clientX, pts[1].clientY);
        return;
      }
    }

    // Dismiss open color, doodle, and sticker popovers when clicking on canvas
    if (penColorsPopover) penColorsPopover.classList.add('hidden');
    if (boardColorsPopover) boardColorsPopover.classList.add('hidden');
    if (doodlesPopover) doodlesPopover.classList.add('hidden');
    if (gifStickersPopover) gifStickersPopover.classList.add('hidden');

    // If Doodle stamp tool is active, stamp doodle at tapped spot
    if (currentTool === 'doodle' && activeDoodle) {
      const pt = getCanvasCoords(e);
      stampDoodle(activeDoodle, pt.x, pt.y);
      showToast(`Stamped ${activeDoodle}`);
      return;
    }

    // If Animated GIF Sticker stamp tool is active, stamp sticker at tapped spot
    if (currentTool === 'gif_sticker' && activeGifSticker) {
      const pt = getCanvasCoords(e);
      stampGifSticker(activeGifSticker, pt.x, pt.y);
      const meta = STICKER_LIST.find(s => s.id === activeGifSticker);
      showToast(`Stamped ${meta ? meta.label : 'Sticker'}!`);
      return;
    }

    // If Text typing tool is active, open text typing modal at tapped spot
    if (currentTool === 'text') {
      const pt = getCanvasCoords(e);
      textTargetPosition = pt;
      if (textInputOverlay) {
        textInputOverlay.classList.remove('hidden');
        if (canvasTextInput) {
          canvasTextInput.value = '';
          canvasTextInput.style.fontSize = `${currentFontSize}px`;
          setTimeout(() => canvasTextInput.focus(), 50);
        }
      }
      return;
    }

    if (isPinchingText) return;

    if (canvas.setPointerCapture && e.pointerId !== undefined) {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }

    isDrawing = true;
    const pt = getCanvasCoords(e);
    const strokeId = `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    currentStroke = {
      id: strokeId,
      page: currentPage,
      points: [pt],
      color: currentTool === 'eraser' ? '#fef9c3' : currentColor,
      width: currentBrushSize,
      mode: currentTool,
      fadeDuration: currentFadeDuration,
      createdAt: Date.now(),
      endedAt: null,
      boardW: Math.round(canvasWidth || window.innerWidth || 360),
      boardH: Math.round(canvasHeight || window.innerHeight || 780)
    };

    socket.emit('stroke-start', currentStroke);
    emitCursorPosition(e.clientX, e.clientY);
  });

  window.addEventListener('pointermove', (e) => {
    if (!currentRoom) return;
    emitCursorPosition(e.clientX, e.clientY);

    if (e.pointerType === 'touch' && activeTouchPointers.has(e.pointerId)) {
      activeTouchPointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      if (activeTouchPointers.size >= 2 && isPinchingText) {
        const pts = Array.from(activeTouchPointers.values());
        updatePinchGesture(pts[0].clientX, pts[0].clientY, pts[1].clientX, pts[1].clientY);
        return;
      }
    }

    if (isPinchingText) return;
    if (!isDrawing || !currentStroke) return;

    const pt = getCanvasCoords(e);
    currentStroke.points.push(pt);

    socket.emit('stroke-point', {
      strokeId: currentStroke.id,
      point: pt
    });
  });

  function stopDrawing(e) {
    if (e && e.pointerType === 'touch') {
      activeTouchPointers.delete(e.pointerId);
      if (activeTouchPointers.size < 2 && isPinchingText) {
        endPinchGesture();
      }
    }

    if (isPinchingText) {
      endPinchGesture();
      return;
    }

    if (!isDrawing || !currentStroke) return;
    isDrawing = false;

    if (canvas.releasePointerCapture && e && e.pointerId !== undefined) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    }

    currentStroke.endedAt = Date.now();
    completedStrokes.push(currentStroke);
    saveStrokesToLocalStorage();

    socket.emit('stroke-end', {
      strokeId: currentStroke.id,
      fullStroke: currentStroke
    });

    if (activeServerUrl && currentRoom) {
      try {
        fetch(`${activeServerUrl}/api/room/${encodeURIComponent(currentRoom)}/stroke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentStroke)
        }).catch(() => {});
      } catch (e) {}
    }

    currentStroke = null;
    syncWidgetCanvas(true);
  }

  window.addEventListener('pointerup', stopDrawing);
  window.addEventListener('pointercancel', stopDrawing);

  // Render Engine: Draws strokes & computes ephemeral fading
  function renderStroke(s, opacity) {
    if (opacity <= 0) return;

    // Render Typed Text Notes
    if (s.type === 'text') {
      if (!s.text) return;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.font = `600 ${s.fontSize || 26}px Outfit, -apple-system, sans-serif`;
      ctx.fillStyle = s.color || '#18181b';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 2;
      const x = s.x * canvasWidth;
      const y = s.y * canvasHeight;
      const lines = s.text.split('\n');
      const lineHeight = (s.fontSize || 26) * 1.35;
      lines.forEach((line, idx) => {
        ctx.fillText(line, x, y + idx * lineHeight);
      });

      // Visual dashed outline with corner grips when this text note is actively being zoomed with two fingers
      if (isPinchingText && activePinchText && activePinchText.id === s.id) {
        let maxW = 0;
        lines.forEach(l => {
          const w = ctx.measureText(l).width;
          if (w > maxW) maxW = w;
        });
        const totalH = lines.length * lineHeight;
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.85)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(x - 6, y - 4, maxW + 12, totalH + 8);
        ctx.fillStyle = '#00f5d4';
        ctx.setLineDash([]);
        // 4 corner dots
        ctx.fillRect(x - 9, y - 7, 6, 6);
        ctx.fillRect(x + maxW + 3, y - 7, 6, 6);
        ctx.fillRect(x - 9, y + totalH + 1, 6, 6);
        ctx.fillRect(x + maxW + 3, y + totalH + 1, 6, 6);
        ctx.restore();
      }

      ctx.restore();
      return;
    }

    // Render Doodle Sticker
    if (s.type === 'doodle') {
      if (!s.icon) return;
      ctx.save();
      ctx.globalAlpha = opacity;
      const sz = s.size || 56;
      ctx.font = `${sz}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;
      ctx.fillText(s.icon, s.x * canvasWidth, s.y * canvasHeight);
      ctx.restore();
      return;
    }

    // Render Animated GIF Sticker
    if (s.type === 'gif_sticker') {
      if (!s.stickerId) return;
      let img = stickerImages.get(s.stickerId);
      if (!img) {
        img = new Image();
        img.src = `stickers/sticker_${s.stickerId}.gif`;
        stickerImages.set(s.stickerId, img);
      }
      ctx.save();
      ctx.globalAlpha = opacity;

      const cx = s.x * canvasWidth;
      const cy = s.y * canvasHeight;
      const aspect = (s.height || 150) / (s.width || 130);
      const drawW = Math.max(70, Math.min(135, canvasWidth * 0.28));
      const drawH = drawW * aspect;

      // Subtle dynamic cartoon bounce & tilt so stickers feel intensely alive
      const elapsedSec = (Date.now() - (s.createdAt || 0)) / 1000;
      const bounce = 1.0 + 0.025 * Math.sin(elapsedSec * 4 * Math.PI);
      const tilt = 0.02 * Math.sin(elapsedSec * 2 * Math.PI);

      ctx.translate(cx, cy);
      ctx.rotate(tilt);
      ctx.scale(bounce, bounce);

      // Cartoon drop shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 4;

      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      } else {
        const png = stickerPngs.get(s.stickerId);
        if (png && png.complete && png.naturalWidth > 0) {
          ctx.drawImage(png, -drawW / 2, -drawH / 2, drawW, drawH);
        }
      }

      ctx.restore();
      return;
    }

    if (!s.points || s.points.length === 0) return;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = s.width;

    if (s.mode === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.shadowBlur = 0;
    } else if (s.mode === 'glow') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = s.width * 2.2;
    } else {
      // Solid pen
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = Math.min(s.width, 4);
    }

    const pts = s.points;
    if (pts.length === 1) {
      // Single click dot
      const x = pts[0].x * canvasWidth;
      const y = pts[0].y * canvasHeight;
      ctx.beginPath();
      ctx.arc(x, y, s.width / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Smooth Bezier line interpolation
      ctx.beginPath();
      const p0x = pts[0].x * canvasWidth;
      const p0y = pts[0].y * canvasHeight;
      ctx.moveTo(p0x, p0y);

      for (let i = 1; i < pts.length - 1; i++) {
        const xc = ((pts[i].x + pts[i + 1].x) / 2) * canvasWidth;
        const yc = ((pts[i].y + pts[i + 1].y) / 2) * canvasHeight;
        ctx.quadraticCurveTo(pts[i].x * canvasWidth, pts[i].y * canvasHeight, xc, yc);
      }

      const last = pts[pts.length - 1];
      ctx.lineTo(last.x * canvasWidth, last.y * canvasHeight);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Animation Frame Loop
  function animationLoop() {
    // Clear and apply DPR transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 1. Render completed strokes with 100% solid permanent opacity (filtered by active page)
    for (let i = 0; i < completedStrokes.length; i++) {
      const s = completedStrokes[i];
      if ((s.page || 1) !== currentPage) continue;
      renderStroke(s, 1.0);
    }

    // 2. Render active remote strokes (filtered by active page)
    remoteActiveStrokes.forEach(s => {
      if ((s.page || 1) !== currentPage) return;
      renderStroke(s, 1.0);
    });

    // 3. Render active local stroke (100% opacity)
    if (currentStroke && (currentStroke.page || 1) === currentPage) {
      renderStroke(currentStroke, 1.0);
    }

    // 4. Sync to Android Home Screen Widget ONLY while actively drawing
    if (currentStroke !== null) {
      syncWidgetCanvas(false);
    }

    requestAnimationFrame(animationLoop);
  }

  // Android Home Screen Widget Synchronizer (Ultra-fast sub-second rendering)
  const WIDGET_SIZE = 384;
  const widgetOffscreenCanvas = document.createElement('canvas');
  widgetOffscreenCanvas.width = WIDGET_SIZE;
  widgetOffscreenCanvas.height = WIDGET_SIZE;
  const widgetCtx = widgetOffscreenCanvas.getContext('2d');
  let lastWidgetSyncTime = 0;
  let hasActiveStrokesLastCheck = false;
  let lastSyncedWidgetHash = '';

  function syncWidgetCanvas(force = false) {
    if (!window.AndroidBridge) {
      return;
    }

    const now = Date.now();
    // Force updates execute immediately (0ms delay); continuous strokes throttled to 120ms to prevent jitter
    if (!force && now - lastWidgetSyncTime < 120) {
      return;
    }
    lastWidgetSyncTime = now;

    const allStrokes = [...completedStrokes, ...remoteActiveStrokes.values()];
    if (currentStroke) allStrokes.push(currentStroke);
    const pageStrokes = allStrokes.filter(s => (s.page || 1) === currentPage);

    const bw = Math.round(canvasWidth || window.innerWidth || 360);
    const bh = Math.round(canvasHeight || window.innerHeight || 780);
    const serializedStrokes = JSON.stringify(pageStrokes);
    const widgetHash = `${currentPage}_${bw}x${bh}_${serializedStrokes}`;
    if (!force && widgetHash === lastSyncedWidgetHash) {
      return;
    }
    lastSyncedWidgetHash = widgetHash;

    // Always keep widget active page synced
    if (typeof window.AndroidBridge.updateActivePage === 'function') {
      try { window.AndroidBridge.updateActivePage(currentPage); } catch (e) {}
    }

    if (pageStrokes.length === 0) {
      if (hasActiveStrokesLastCheck) {
        hasActiveStrokesLastCheck = false;
        if (typeof window.AndroidBridge.updateWidgetStrokes === 'function') {
          window.AndroidBridge.updateWidgetStrokes('[]');
        } else if (typeof window.AndroidBridge.updateWidgetPreview === 'function') {
          widgetCtx.clearRect(0, 0, WIDGET_SIZE, WIDGET_SIZE);
          window.AndroidBridge.updateWidgetPreview('');
        }
      }
      return;
    }

    hasActiveStrokesLastCheck = true;

    // 1. Instant Native Android Canvas Rendering (Ultra fast, sub-millisecond, zero Base64 overhead)
    if (typeof window.AndroidBridge.updateWidgetStrokes === 'function') {
      try {
        const payload = JSON.stringify({
          boardWidth: bw,
          boardHeight: bh,
          activePage: currentPage,
          strokes: pageStrokes
        });
        window.AndroidBridge.updateWidgetStrokes(payload);
      } catch (err) {
        console.warn('[NativeWidgetSync] Error:', err);
      }
      return; // IMPORTANT: Always return here so HTML5 canvas fallback never runs concurrently!
    }

    // 2. HTML5 Canvas Fallback Rendering
    if (typeof window.AndroidBridge.updateWidgetPreview === 'function') {
      try {
        widgetCtx.clearRect(0, 0, WIDGET_SIZE, WIDGET_SIZE);

        // Fixed writable area of sticky note graphic (avoids red pushpin and curled corner)
        const paperLeft = WIDGET_SIZE * 0.10;
        const paperTop = WIDGET_SIZE * 0.17;
        const paperWidth = WIDGET_SIZE * 0.80;
        const paperHeight = WIDGET_SIZE * 0.70;
        const paperCenterX = paperLeft + paperWidth / 2.0;
        const paperCenterY = paperTop + paperHeight / 2.0;

        const availW = paperWidth * 0.90;
        const availH = paperHeight * 0.90;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        let hasContent = false;

        for (let i = 0; i < pageStrokes.length; i++) {
          const s = pageStrokes[i];
          if (s.type === 'text') {
            if (!s.text) continue;
            hasContent = true;
            const sx = (s.x || 0.1) * bw;
            const sy = (s.y || 0.2) * bh;
            const fontSz = s.fontSize || 26;
            const charCount = (s.text || '').length;
            const lineCount = (s.text || '').split('\n').length;
            const estW = Math.min(bw * 0.90, charCount * fontSz * 0.60);
            const estH = lineCount * fontSz * 1.30;
            minX = Math.min(minX, sx);
            maxX = Math.max(maxX, sx + estW);
            minY = Math.min(minY, sy);
            maxY = Math.max(maxY, sy + estH);
          } else if (s.type === 'doodle' || s.type === 'gif_sticker') {
            hasContent = true;
            const sx = (s.x || 0.5) * bw;
            const sy = (s.y || 0.45) * bh;
            const halfSize = 36;
            minX = Math.min(minX, sx - halfSize);
            maxX = Math.max(maxX, sx + halfSize);
            minY = Math.min(minY, sy - halfSize);
            maxY = Math.max(maxY, sy + halfSize);
          } else if (s.points && s.points.length > 0) {
            hasContent = true;
            for (let p = 0; p < s.points.length; p++) {
              const pt = s.points[p];
              const px = pt.x * bw;
              const py = pt.y * bh;
              minX = Math.min(minX, px);
              maxX = Math.max(maxX, px);
              minY = Math.min(minY, py);
              maxY = Math.max(maxY, py);
            }
          }
        }

        if (!hasContent) {
          minX = 0; maxX = bw; minY = 0; maxY = bh;
        }

        const minSpanW = Math.max(160, bw * 0.45);
        const minSpanH = Math.max(160, bh * 0.35);
        const effectiveW = Math.max(maxX - minX, minSpanW);
        const effectiveH = Math.max(maxY - minY, minSpanH);
        const S = Math.min(1.05, Math.min(availW / effectiveW, availH / effectiveH));

        const contentMidX = (minX + maxX) / 2.0;
        const contentMidY = (minY + maxY) / 2.0;
        const offsetX = paperCenterX - contentMidX * S;
        const offsetY = paperCenterY - contentMidY * S;

        widgetCtx.save();
        widgetCtx.beginPath();
        widgetCtx.rect(paperLeft, paperTop, paperWidth, paperHeight);
        widgetCtx.clip();

      // Draw each stroke or text note directly onto the sticky note with crisp lines
      for (let sIdx = 0; sIdx < pageStrokes.length; sIdx++) {
        const s = pageStrokes[sIdx];

        // Render typed text note on widget (Large, bold, highly legible)
        if (s.type === 'text') {
          if (!s.text) continue;
          widgetCtx.save();
          widgetCtx.globalAlpha = 1.0;
          const baseSize = s.fontSize || 26;
          const scaledFontSize = Math.max(16, Math.round(baseSize * Math.min(1.4, Math.max(0.85, S))));
          widgetCtx.font = `bold ${scaledFontSize}px Outfit, -apple-system, sans-serif`;
          widgetCtx.fillStyle = s.color || '#18181b';
          widgetCtx.textBaseline = 'top';
          const px = (s.x * cw) * S + offsetX;
          const py = (s.y * ch) * S + offsetY;
          const lines = s.text.split('\n');
          const lineHeight = scaledFontSize * 1.28;
          lines.forEach((line, idx) => {
            widgetCtx.fillText(line, px, py + idx * lineHeight);
          });
          widgetCtx.restore();
          continue;
        }

        // Render doodle sticker on widget
        if (s.type === 'doodle') {
          if (!s.icon) continue;
          widgetCtx.save();
          widgetCtx.globalAlpha = 1.0;
          const widgetDoodleSize = Math.max(38, Math.round((s.size || 56) * Math.min(1.4, Math.max(0.9, S))));
          widgetCtx.font = `${widgetDoodleSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
          widgetCtx.textAlign = 'center';
          widgetCtx.textBaseline = 'middle';
          const px = (s.x * cw) * S + offsetX;
          const py = (s.y * ch) * S + offsetY;
          widgetCtx.fillText(s.icon, px, py);
          widgetCtx.restore();
          continue;
        }

        // Render animated GIF sticker character on widget
        if (s.type === 'gif_sticker') {
          if (!s.stickerId) continue;
          const png = stickerPngs.get(s.stickerId);
          const imgToDraw = (png && png.complete && png.naturalWidth > 0) ? png : stickerImages.get(s.stickerId);
          if (imgToDraw && imgToDraw.complete && imgToDraw.naturalWidth > 0) {
            widgetCtx.save();
            widgetCtx.globalAlpha = 1.0;
            const px = (s.x * cw) * S + offsetX;
            const py = (s.y * ch) * S + offsetY;
            const aspect = (s.height || 150) / (s.width || 130);
            const targetW = Math.max(48, Math.round(90 * Math.min(1.4, Math.max(0.9, S))));
            const targetH = targetW * aspect;
            widgetCtx.drawImage(imgToDraw, px - targetW / 2, py - targetH / 2, targetW, targetH);
            widgetCtx.restore();
          }
          continue;
        }

        if (!s.points || s.points.length === 0) continue;

        widgetCtx.save();
        widgetCtx.globalAlpha = 1.0;
        widgetCtx.lineCap = 'round';
        widgetCtx.lineJoin = 'round';
        // Bold, clear handwriting line width
        widgetCtx.lineWidth = Math.max(3.2, Math.min(s.width * S * 1.3, 6.8));

        if (s.mode === 'eraser') {
          widgetCtx.globalCompositeOperation = 'destination-out';
          widgetCtx.strokeStyle = 'rgba(0,0,0,1)';
          widgetCtx.fillStyle = 'rgba(0,0,0,1)';
        } else {
          widgetCtx.globalCompositeOperation = 'source-over';
          widgetCtx.strokeStyle = s.color || '#18181b';
          widgetCtx.fillStyle = s.color || '#18181b';
          widgetCtx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          widgetCtx.shadowBlur = 1.5;
          widgetCtx.shadowOffsetX = 0.5;
          widgetCtx.shadowOffsetY = 0.5;
        }

        const pts = s.points;
        if (pts.length === 1) {
          const px = (pts[0].x * cw) * S + offsetX;
          const py = (pts[0].y * ch) * S + offsetY;
          widgetCtx.beginPath();
          widgetCtx.arc(px, py, widgetCtx.lineWidth / 2, 0, Math.PI * 2);
          widgetCtx.fill();
        } else {
          widgetCtx.beginPath();
          const p0x = (pts[0].x * cw) * S + offsetX;
          const p0y = (pts[0].y * ch) * S + offsetY;
          widgetCtx.moveTo(p0x, p0y);

          for (let i = 1; i < pts.length - 1; i++) {
            const p1x = (pts[i].x * cw) * S + offsetX;
            const p1y = (pts[i].y * ch) * S + offsetY;
            const p2x = (pts[i + 1].x * cw) * S + offsetX;
            const p2y = (pts[i + 1].y * ch) * S + offsetY;
            const xc = (p1x + p2x) / 2;
            const yc = (p1y + p2y) / 2;
            widgetCtx.quadraticCurveTo(p1x, p1y, xc, yc);
          }

          const last = pts[pts.length - 1];
          widgetCtx.lineTo(
            (last.x * cw) * S + offsetX,
            (last.y * ch) * S + offsetY
          );
          widgetCtx.stroke();
        }

        widgetCtx.restore();
      }

        widgetCtx.restore();

        const dataUrl = widgetOffscreenCanvas.toDataURL('image/png');
        window.AndroidBridge.updateWidgetPreview(dataUrl);
      } catch (err) {
        console.warn('[WidgetSync] Error:', err);
      }
    }
  }

  // Dual-channel background sync: Poll server for remote updates every 2 seconds
  setInterval(async () => {
    if (!currentRoom || !activeServerUrl) return;
    try {
      const res = await fetch(`${activeServerUrl}/api/room/${encodeURIComponent(currentRoom)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.strokes)) {
        if (data.strokes.length === 0 && completedStrokes.length > 0) {
          // DO NOT WIPE LOCAL STROKES! Upload local strokes to server
          for (const s of completedStrokes) {
            fetch(`${activeServerUrl}/api/room/${encodeURIComponent(currentRoom)}/stroke`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(s)
            }).catch(() => {});
          }
        } else if (data.strokes.length > 0) {
          let changed = false;
          const strokeMap = new Map();
          completedStrokes.forEach(s => strokeMap.set(s.id, s));
          data.strokes.forEach(remoteStroke => {
            if (!strokeMap.has(remoteStroke.id)) {
              strokeMap.set(remoteStroke.id, remoteStroke);
              changed = true;
            }
          });

          if (changed) {
            completedStrokes = Array.from(strokeMap.values());
            saveStrokesToLocalStorage();
            syncWidgetCanvas(true);
          }
        }
      }
    } catch (e) {
      // Network silent fallback
    }
  }, 2000);

  requestAnimationFrame(animationLoop);

  // UI Event Bindings
  // Tool Modes (Pen, Text, Glow, Eraser)
  toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toolBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.dataset.tool;
      activeDoodle = null;
      activeGifSticker = null;
      playTone(440, 'triangle', 0.05, 0.03);
      if (currentTool === 'text') {
        showToast('Tap on board to type text');
      }
    });
  });

  // Pen Colors Popover Toggle
  if (btnPenColors && penColorsPopover) {
    btnPenColors.addEventListener('click', (e) => {
      e.stopPropagation();
      penColorsPopover.classList.toggle('hidden');
      if (boardColorsPopover) boardColorsPopover.classList.add('hidden');
      if (doodlesPopover) doodlesPopover.classList.add('hidden');
      if (gifStickersPopover) gifStickersPopover.classList.add('hidden');
      playTone(500, 'sine', 0.04, 0.02);
    });
  }

  // Board Color Palette Popover Toggle
  if (btnBoardPalette && boardColorsPopover) {
    btnBoardPalette.addEventListener('click', (e) => {
      e.stopPropagation();
      boardColorsPopover.classList.toggle('hidden');
      if (penColorsPopover) penColorsPopover.classList.add('hidden');
      if (doodlesPopover) doodlesPopover.classList.add('hidden');
      if (gifStickersPopover) gifStickersPopover.classList.add('hidden');
      playTone(500, 'sine', 0.04, 0.02);
    });
  }

  // Doodles & Stickers Popover Toggle
  if (btnDoodles && doodlesPopover) {
    btnDoodles.addEventListener('click', (e) => {
      e.stopPropagation();
      doodlesPopover.classList.toggle('hidden');
      if (penColorsPopover) penColorsPopover.classList.add('hidden');
      if (boardColorsPopover) boardColorsPopover.classList.add('hidden');
      if (gifStickersPopover) gifStickersPopover.classList.add('hidden');
      playTone(520, 'sine', 0.04, 0.02);
    });
  }

  // Animated GIF Stickers Popover Toggle
  if (btnGifStickers && gifStickersPopover) {
    btnGifStickers.addEventListener('click', (e) => {
      e.stopPropagation();
      gifStickersPopover.classList.toggle('hidden');
      if (penColorsPopover) penColorsPopover.classList.add('hidden');
      if (boardColorsPopover) boardColorsPopover.classList.add('hidden');
      if (doodlesPopover) doodlesPopover.classList.add('hidden');
      playTone(540, 'sine', 0.04, 0.02);
    });
  }

  // Populate Animated GIF Stickers Grid Dynamically
  if (gifStickersGrid) {
    gifStickersGrid.innerHTML = '';
    STICKER_LIST.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gif-sticker-item';
      btn.dataset.sticker = item.id;
      btn.title = item.label;

      const img = document.createElement('img');
      img.src = item.gif;
      img.alt = item.label;
      img.loading = 'lazy';

      const label = document.createElement('span');
      label.className = 'sticker-label';
      label.textContent = item.label;

      btn.appendChild(img);
      btn.appendChild(label);

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        activeGifSticker = item.id;
        currentTool = 'gif_sticker';
        toolBtns.forEach(b => b.classList.remove('active'));
        stampGifSticker(item.id, 0.5, 0.45);
        if (gifStickersPopover) gifStickersPopover.classList.add('hidden');
        showToast(`Stamped ${item.label}! Tap board to stamp more`);
      });

      gifStickersGrid.appendChild(btn);
    });
  }

  // Doodle Item Selection & Instant Stamping
  doodleItems.forEach(item => {
    item.addEventListener('click', () => {
      const doodle = item.dataset.doodle;
      activeDoodle = doodle;
      currentTool = 'doodle';
      // Deselect other tool buttons
      toolBtns.forEach(b => b.classList.remove('active'));
      // Stamp immediately at center of board
      stampDoodle(doodle, 0.5, 0.45);
      if (doodlesPopover) doodlesPopover.classList.add('hidden');
      showToast(`Stamped ${doodle}! Tap board to stamp more`);
    });
  });

  // Pen Color Swatches
  colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      colorSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      currentColor = swatch.dataset.color;
      if (customColorInput) customColorInput.value = currentColor;
      if (sizeDot) sizeDot.style.backgroundColor = currentColor;
      if (activePenColorDot) activePenColorDot.style.backgroundColor = currentColor;
      // Automatically switch to pen if currently eraser
      if (currentTool === 'eraser') {
        const penBtn = document.getElementById('tool-pen');
        if (penBtn) penBtn.click();
      }
      if (penColorsPopover) penColorsPopover.classList.add('hidden');
      playTone(520, 'sine', 0.05, 0.03);
    });
  });

  if (customColorInput) {
    customColorInput.addEventListener('input', (e) => {
      currentColor = e.target.value;
      colorSwatches.forEach(s => s.classList.remove('active'));
      if (sizeDot) sizeDot.style.backgroundColor = currentColor;
      if (activePenColorDot) activePenColorDot.style.backgroundColor = currentColor;
      if (currentTool === 'eraser') {
        const penBtn = document.getElementById('tool-pen');
        if (penBtn) penBtn.click();
      }
    });
  }

  // Board Background Color Swatches
  boardSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      boardSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const bg = swatch.dataset.bg;
      document.documentElement.style.setProperty('--bg-color', bg);
      localStorage.setItem('vb_board_color', bg);
      if (activeBoardColorDot) activeBoardColorDot.style.backgroundColor = bg;
      if (boardColorsPopover) boardColorsPopover.classList.add('hidden');
      playTone(620, 'sine', 0.06, 0.03);
      showToast('Board color changed');
    });
  });

  // Restore saved board color on load
  const savedBg = localStorage.getItem('vb_board_color') || '#fef9c3';
  document.documentElement.style.setProperty('--bg-color', savedBg);
  if (activeBoardColorDot) activeBoardColorDot.style.backgroundColor = savedBg;
  boardSwatches.forEach(s => {
    if (s.dataset.bg === savedBg) s.classList.add('active');
    else s.classList.remove('active');
  });

  // Brush Size
  if (brushSizeInput) {
    brushSizeInput.addEventListener('input', (e) => {
      currentBrushSize = parseInt(e.target.value, 10);
      if (sizeDot) {
        sizeDot.style.width = `${currentBrushSize}px`;
        sizeDot.style.height = `${currentBrushSize}px`;
      }
    });
  }

  // Duster Button (Wipe Active Page Clean Instantly)
  if (btnDuster) {
    btnDuster.addEventListener('click', () => {
      if (!currentRoom) return;
      completedStrokes = completedStrokes.filter(s => (s.page || 1) !== currentPage);
      remoteActiveStrokes.forEach((s, k) => {
        if ((s.page || 1) === currentPage) remoteActiveStrokes.delete(k);
      });
      saveStrokesToLocalStorage();
      currentStroke = null;
      socket.emit('clear-canvas', { page: currentPage });
      if (activeServerUrl && currentRoom) {
        try {
          fetch(`${activeServerUrl}/api/room/${encodeURIComponent(currentRoom)}/clear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ byUser: currentUser?.name || 'User', page: currentPage })
          }).catch(() => {});
        } catch (e) {}
      }
      syncWidgetCanvas(true);
      playClearWhoosh();
      showToast(`Page ${currentPage} cleared!`);
    });
  }

  // Keyboard Text Note Modal Controls
  fontSizeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      fontSizeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFontSize = parseInt(chip.dataset.size, 10) || 26;
      playTone(550, 'sine', 0.04, 0.02);
    });
  });

  function submitTextNote() {
    if (!canvasTextInput) return;
    const text = canvasTextInput.value.trim();
    if (text) {
      const textStroke = {
        id: `txt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: 'text',
        page: currentPage,
        text: text,
        x: textTargetPosition ? textTargetPosition.x : 0.15,
        y: textTargetPosition ? textTargetPosition.y : 0.25,
        color: currentColor,
        fontSize: currentFontSize,
        fadeDuration: currentFadeDuration,
        createdAt: Date.now(),
        endedAt: Date.now(),
        boardW: Math.round(canvasWidth || window.innerWidth || 360),
        boardH: Math.round(canvasHeight || window.innerHeight || 780)
      };
      completedStrokes.push(textStroke);
      saveStrokesToLocalStorage();
      socket.emit('stroke-end', {
        strokeId: textStroke.id,
        fullStroke: textStroke
      });
      if (activeServerUrl && currentRoom) {
        try {
          fetch(`${activeServerUrl}/api/room/${encodeURIComponent(currentRoom)}/stroke`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(textStroke)
          }).catch(() => {});
        } catch (e) {}
      }
      syncWidgetCanvas(true);
      playTone(600, 'sine', 0.08, 0.04);
      showToast('Note added to board');
    }
    if (textInputOverlay) textInputOverlay.classList.add('hidden');
    canvasTextInput.value = '';
  }

  if (submitTextBtn) {
    submitTextBtn.addEventListener('click', submitTextNote);
  }

  if (cancelTextBtn) {
    cancelTextBtn.addEventListener('click', () => {
      if (textInputOverlay) textInputOverlay.classList.add('hidden');
      if (canvasTextInput) canvasTextInput.value = '';
    });
  }

  if (canvasTextInput) {
    canvasTextInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitTextNote();
      }
    });
  }

  // Copy Room Link / Code Button
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!currentRoom) return;
      const base = isWebProtocol ? window.location.origin : activeServerUrl;
      const shareUrl = `${base}/?room=${encodeURIComponent(currentRoom)}`;
      const shareText = `Join my VanishBoard room: ${currentRoom}\nLink: ${shareUrl}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: `VanishBoard Room: ${currentRoom}`,
            text: shareText,
            url: shareUrl
          });
          playTone(700, 'sine', 0.08, 0.04);
          return;
        } catch (err) {}
      }

      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast(`Room code copied: ${currentRoom}`);
        playTone(700, 'sine', 0.08, 0.04);
      } catch (err) {
        prompt('Copy Room Code & Link:', `${currentRoom} - ${shareUrl}`);
      }
    });
  }

  // Tapping room pill opens room modal to switch or view room code
  const roomPillEl = document.querySelector('.room-pill');
  if (roomPillEl) {
    roomPillEl.style.cursor = 'pointer';
    roomPillEl.addEventListener('click', (e) => {
      if (e.target.closest('#copy-link-btn')) return;
      openRoomSwitchModal();
    });
  }

  // Leave / Change Room Button
  if (leaveRoomBtn) {
    leaveRoomBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openRoomSwitchModal();
    });
  }

  // Cancel Change Room Button (Stay in current room)
  if (cancelChangeRoomBtn) {
    cancelChangeRoomBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentRoom) {
        if (roomModal) roomModal.classList.add('hidden');
        resetModalHeader();
      } else {
        leaveRoom();
      }
    });
  }

  // Confirm Exit Board Button
  if (leaveRoomConfirmBtn) {
    leaveRoomConfirmBtn.addEventListener('click', (e) => {
      e.preventDefault();
      leaveRoom();
    });
  }

  // Modal Actions
  if (createRoomBtn) {
    createRoomBtn.addEventListener('click', () => {
      const code = generateRoomCode();
      joinRoom(code);
    });
  }

  if (joinRoomForm) {
    joinRoomForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = roomCodeInput ? roomCodeInput.value.trim() : '';
      if (!code) {
        if (roomCodeInput) roomCodeInput.focus();
        return;
      }
      joinRoom(code);
    });
  } else if (joinRoomBtn) {
    joinRoomBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const code = roomCodeInput ? roomCodeInput.value.trim() : '';
      if (!code) {
        if (roomCodeInput) roomCodeInput.focus();
        return;
      }
      joinRoom(code);
    });
  }

  if (roomCodeInput) {
    roomCodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        if (joinRoomForm) {
          joinRoomForm.requestSubmit ? joinRoomForm.requestSubmit() : (joinRoomBtn && joinRoomBtn.click());
        } else if (joinRoomBtn) {
          joinRoomBtn.click();
        }
      }
    });
  }

  // Server Settings UI Bindings
  const toggleServerSettings = document.getElementById('toggle-server-settings');
  const serverSettingsPanel = document.getElementById('server-settings-panel');
  const serverUrlInput = document.getElementById('server-url-input');
  const saveServerBtn = document.getElementById('save-server-btn');

  if (serverUrlInput) {
    serverUrlInput.value = activeServerUrl;
  }

  if (toggleServerSettings && serverSettingsPanel) {
    toggleServerSettings.addEventListener('click', () => {
      serverSettingsPanel.classList.toggle('hidden');
    });
  }

  if (saveServerBtn && serverUrlInput) {
    saveServerBtn.addEventListener('click', () => {
      let newUrl = serverUrlInput.value.trim();
      if (!newUrl) return;
      if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
        newUrl = 'https://' + newUrl;
      }
      localStorage.setItem('vb_server_url', newUrl);
      showToast('Server URL saved! Connecting...');
      setTimeout(() => {
        window.location.reload();
      }, 400);
    });
  }

  // Top Bar Settings Button & Dedicated Settings Modal
  const btnTopSettings = document.getElementById('btn-top-settings');
  const settingsModal = document.getElementById('settings-modal');
  const settingsServerUrl = document.getElementById('settings-server-url');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');

  if (settingsServerUrl) {
    settingsServerUrl.value = activeServerUrl;
  }

  if (btnTopSettings && settingsModal) {
    btnTopSettings.addEventListener('click', () => {
      if (settingsServerUrl) settingsServerUrl.value = activeServerUrl;
      settingsModal.classList.remove('hidden');
    });
  }

  if (btnCloseSettings && settingsModal) {
    btnCloseSettings.addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });
  }

  if (btnSaveSettings && settingsServerUrl) {
    btnSaveSettings.addEventListener('click', () => {
      let newUrl = settingsServerUrl.value.trim();
      if (!newUrl) return;
      if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
        newUrl = 'https://' + newUrl;
      }
      localStorage.setItem('vb_server_url', newUrl);
      if (window.AndroidBridge && typeof window.AndroidBridge.setServerUrl === 'function') {
        try { window.AndroidBridge.setServerUrl(newUrl); } catch (e) {}
      }
      showToast('Connecting to ' + newUrl + '...');
      setTimeout(() => {
        window.location.reload();
      }, 400);
    });
  }

  // Widget Direct Tap Handler
  window.onWidgetTapDraw = function(pageNumber) {
    if (pageNumber) {
      switchPage(pageNumber, false);
    }
    if (currentRoom) {
      // Already connected to a room, ensure canvas is visible
      if (roomModal) roomModal.classList.add('hidden');
      if (topBar) topBar.classList.remove('hidden');
      if (toolDock) toolDock.classList.remove('hidden');
      if (pageDock) pageDock.classList.remove('hidden');
      return;
    }
    const saved = localStorage.getItem('vb_last_room');
    if (saved) {
      joinRoom(saved);
    } else {
      joinRoom(generateRoomCode());
    }
  };

  // Instant Auto-join: Ensure canvas is open immediately without modals
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  const pageParam = urlParams.get('page');
  const savedRoom = localStorage.getItem('vb_last_room');
  const savedPage = localStorage.getItem('vb_last_page');

  if (pageParam) {
    switchPage(parseInt(pageParam, 10) || 1, false);
  } else if (savedPage) {
    switchPage(parseInt(savedPage, 10) || 1, false);
  }

  if (roomParam) {
    roomCodeInput.value = roomParam.toUpperCase();
    joinRoom(roomParam);
  } else if (savedRoom) {
    roomCodeInput.value = savedRoom;
    joinRoom(savedRoom);
  } else {
    // Default shared pairing room so two devices instantly draw together out of the box!
    const initialCode = 'VANISH-1';
    if (roomCodeInput) roomCodeInput.value = initialCode;
    joinRoom(initialCode);
  }
})();
