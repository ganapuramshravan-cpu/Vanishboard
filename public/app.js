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
  const btnRoomCode = document.getElementById('btn-room-code');
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
  const closeRoomModalBtn = document.getElementById('close-room-modal-btn');
  const roomModalSubtitle = document.getElementById('room-modal-subtitle');
  const changeRoomActions = document.getElementById('change-room-actions');
  const cancelChangeRoomBtn = document.getElementById('cancel-change-room-btn');
  const leaveRoomConfirmBtn = document.getElementById('leave-room-confirm-btn');

  // Tool Dock Inputs (5 User-Requested Tools: Pen, Eraser, Colour Wheel, Selection, Keyboard)
  const toolBtns = document.querySelectorAll('.tool-btn[data-tool]');
  const brushSizeInput = document.getElementById('brush-size');
  const sizeDot = document.getElementById('size-dot');

  // Pen Line Thickness Popover Elements
  const penThicknessPopover = document.getElementById('pen-thickness-popover');
  const lineThicknessVal = document.getElementById('line-thickness-val');
  const thicknessPreviewDot = document.getElementById('thickness-preview-dot');
  const thicknessPresetChips = document.querySelectorAll('.preset-chip');

  // Eraser Size Popover Elements
  const eraserSizePopover = document.getElementById('eraser-size-popover');
  const eraserSizeSlider = document.getElementById('eraser-size-slider');
  const eraserSizeVal = document.getElementById('eraser-size-val');
  const eraserPreviewRing = document.getElementById('eraser-preview-ring');
  const eraserPresetChips = document.querySelectorAll('.eraser-preset-chip');
  let currentEraserSize = 24;

  // Colour Wheel Popover
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
    const displayStr = typeof sizePx === 'number'
      ? `${sizePx}px`
      : (String(sizePx).includes('px') || String(sizePx).includes('%') || String(sizePx).includes('°')
          ? String(sizePx)
          : `${sizePx}px`);
    textZoomSizeEl.textContent = displayStr;
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

  // Floating Resize & Transform Controller Elements
  const resizeController = document.getElementById('resize-controller');
  const resizeScaleVal = document.getElementById('resize-scale-val');
  const btnScaleDown = document.getElementById('btn-scale-down');
  const btnScaleUp = document.getElementById('btn-scale-up');
  const resizeSlider = document.getElementById('resize-slider');
  const btnRotateLeft = document.getElementById('btn-rotate-left');
  const btnRotateRight = document.getElementById('btn-rotate-right');
  const btnSelectAll = document.getElementById('btn-select-all');
  const btnDeleteSelected = document.getElementById('btn-delete-selected');
  const btnCloseResize = document.getElementById('btn-close-resize');

  const selectedStrokeIds = new Set();
  let resizeDragState = null;
  let currentSelectionScale = 100;

  function updateResizeUI() {
    if (resizeScaleVal) {
      resizeScaleVal.textContent = `${currentSelectionScale}%`;
    }
    if (resizeSlider) {
      resizeSlider.value = currentSelectionScale;
    }
    if (btnDeleteSelected) {
      btnDeleteSelected.disabled = (selectedStrokeIds.size === 0);
    }
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
  const CLOUD_URL = 'https://vanishboard-jmx2.vercel.app';
  const PUBLIC_URL = CLOUD_URL;
  const DEFAULT_SERVER = isWebProtocol ? window.location.origin : PUBLIC_URL;
  let savedUrl = localStorage.getItem('vb_server_url');
  // Auto-upgrade from broken Render, outdated Cloudflare tunnels, or private Wi-Fi IPs to official Vercel cloud URL
  if (!isWebProtocol || !savedUrl ||
      savedUrl.includes('render.com') || savedUrl.includes('onrender.com') ||
      savedUrl.includes('trycloudflare.com') ||
      savedUrl.includes('192.168.') || savedUrl.includes('10.') ||
      savedUrl.includes('172.') || savedUrl.includes('localhost') ||
      savedUrl.includes('127.0.0.1') ||
      savedUrl.includes('expanding-relationships-parker-baghdad') ||
      savedUrl.includes('dealing-vote-language-catch') ||
      savedUrl.includes('attorneys-donors-eminem-hobby') ||
      savedUrl.includes('manuals-essay-express-sheet') ||
      savedUrl.includes('tap-interference-represent-meals')) {
    savedUrl = CLOUD_URL;
    localStorage.setItem('vb_server_url', CLOUD_URL);
  }
  let activeServerUrl = savedUrl || DEFAULT_SERVER;

  // Immediately inform Android Bridge of active server URL
  if (window.AndroidBridge && typeof window.AndroidBridge.setServerUrl === 'function') {
    try { window.AndroidBridge.setServerUrl(activeServerUrl); } catch (e) {}
  }

  // Persistent Unique Device ID to prevent phantom duplicate users on widget/app resume
  let deviceId = localStorage.getItem('vb_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('vb_device_id', deviceId);
  }

  // Socket.IO Setup with reliable fallback transports (WebSockets & Long-polling for Wi-Fi & Cellular 4G/5G)
  let socket = io(activeServerUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 3000
  });

  // Seamless Wi-Fi <-> Mobile Data Network Switch Handler
  window.addEventListener('online', () => {
    console.log('[Network] Internet reconnected (Wi-Fi/Cellular Data). Syncing...');
    if (socket && !socket.connected) {
      socket.connect();
    }
    if (currentRoom) {
      socket.emit('join-room', { roomCode: currentRoom, userName: currentUser?.name, deviceId });
      if (activeServerUrl) {
        fetch(`${activeServerUrl}/api/room/${encodeURIComponent(currentRoom)}`)
          .then(r => r.json())
          .then(data => {
            if (data && Array.isArray(data.strokes)) {
              const existingIds = new Set(completedStrokes.map(s => s.id));
              let added = false;
              data.strokes.forEach(s => {
                if (!existingIds.has(s.id) && isStrokeAllowed(s)) {
                  completedStrokes.push(s);
                  existingIds.add(s.id);
                  added = true;
                }
              });
              if (added) {
                saveStrokesToLocalStorage();
                syncWidgetCanvas(true);
              }
            }
          })
          .catch(() => {});
      }
    }
  });

  window.addEventListener('offline', () => {
    console.warn('[Network] Device network offline.');
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
      .replace(/[\s_–—]+/g, '-')
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
      socket.emit('join-room', { roomCode: currentRoom, userName: currentUser?.name, deviceId }, (res) => {
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
  const deletedStrokeIds = new Set();
  const pageClearedTimestamps = {};

  function loadDeletedState(roomCode) {
    deletedStrokeIds.clear();
    for (let p = 1; p <= 5; p++) {
      delete pageClearedTimestamps[p];
    }
    if (!roomCode) return;
    try {
      const raw = localStorage.getItem(`vb_deleted_${roomCode}`);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.forEach(id => deletedStrokeIds.add(id));
        }
      }
      for (let p = 1; p <= 5; p++) {
        const t = parseInt(localStorage.getItem(`vb_cleared_p${p}_${roomCode}`), 10);
        if (t) pageClearedTimestamps[p] = t;
      }
    } catch (e) {}
  }

  function saveDeletedState(roomCode) {
    if (!roomCode) return;
    try {
      localStorage.setItem(`vb_deleted_${roomCode}`, JSON.stringify(Array.from(deletedStrokeIds)));
    } catch (e) {}
  }

  function isStrokeAllowed(s) {
    if (!s || !s.id) return false;
    if (s.type === 'presence' || String(s.id).startsWith('__presence__')) return false;
    if (s.mode === 'eraser') return false;
    if (deletedStrokeIds.has(s.id)) return false;
    const page = s.page || 1;
    const clearedAt = pageClearedTimestamps[page] || 0;
    const strokeTime = s.createdAt || s.endedAt || 0;
    if (clearedAt > 0 && strokeTime > 0 && strokeTime <= clearedAt) {
      return false;
    }
    return true;
  }

  function saveStrokesToLocalStorage() {
    if (!currentRoom) return;
    try {
      const valid = completedStrokes.filter(s => isStrokeAllowed(s));
      localStorage.setItem(`vb_strokes_${currentRoom}`, JSON.stringify(valid));
    } catch (e) {}
  }

  function loadStrokesFromLocalStorage(roomCode) {
    if (!roomCode) return [];
    try {
      loadDeletedState(roomCode);
      const raw = localStorage.getItem(`vb_strokes_${roomCode}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter(s => isStrokeAllowed(s));
        }
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

  // Toast System (Disabled as requested: "manam edina click chesinapudu kinda popup vastundi adi rakunda chey")
  function showToast(text) {
    return;
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
    loadDeletedState(cleanCode);
    sendPresenceHeartbeat();

    // Immediately restore cached strokes from localStorage for this specific room
    completedStrokes = loadStrokesFromLocalStorage(cleanCode) || [];
    remoteActiveStrokes.clear();

    // Connect SSE for instant live updates
    connectRoomSSE(cleanCode);

    if (currentRoomCodeEl) currentRoomCodeEl.textContent = cleanCode;
    updateUserCount(1);

    // Immediately reveal UI so user can draw right away without waiting or blank screens!
    resetModalHeader();
    if (roomModal) roomModal.classList.add('hidden');
    if (topBar) topBar.classList.remove('hidden');
    if (toolDock) toolDock.classList.remove('hidden');
    if (pageDock) pageDock.classList.remove('hidden');

    // Restore last page or default to 1 (Preserve user's manual page choice)
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
      socket.emit('join-room', { roomCode: cleanCode, userName, deviceId }, (res) => {
        if (res && res.error) {
          showToast(`Note: ${res.error}`);
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
            handleRemoteRoomData(data);
            if (data.activePage && data.activePage >= 1 && data.activePage <= 5) {
              switchPage(data.activePage, false);
            }
          }
        })
        .catch(() => {});
    }
  }

  function resetModalHeader() {
    if (roomModalTitle) roomModalTitle.innerHTML = 'Change <span>Room</span>';
    if (closeRoomModalBtn) closeRoomModalBtn.style.display = currentRoom ? 'flex' : 'none';
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

    if (roomModalTitle) roomModalTitle.innerHTML = 'Change <span>Room</span>';
    if (closeRoomModalBtn) closeRoomModalBtn.style.display = currentRoom ? 'flex' : 'none';
    if (joinRoomBtn) {
      joinRoomBtn.disabled = false;
      joinRoomBtn.textContent = 'Join';
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
        window.AndroidBridge.updateRoomInfo(currentRoom, data.totalCount || data.users.length);
      }
      if (typeof window.AndroidBridge.setServerUrl === 'function') {
        window.AndroidBridge.setServerUrl(activeServerUrl);
      }
    }

    currentRoomCodeEl.textContent = currentRoom;
    updateUserCount(data.totalCount || data.users.length);

    // Merge server deletedStrokeIds if provided
    if (Array.isArray(data.deletedStrokeIds)) {
      data.deletedStrokeIds.forEach(id => deletedStrokeIds.add(id));
      saveDeletedState(currentRoom);
    }

    // Populate active strokes safely without wiping or shuffling local strokes
    if (Array.isArray(data.activeStrokes)) {
      const localIds = new Set(completedStrokes.map(s => s.id));
      let added = false;
      for (const s of data.activeStrokes) {
        if (!localIds.has(s.id) && isStrokeAllowed(s)) {
          completedStrokes.push({
            ...s,
            endedAt: s.endedAt || s.createdAt || Date.now()
          });
          localIds.add(s.id);
          added = true;
        }
      }
      if (added) {
        saveStrokesToLocalStorage();
      }
    }

    // Immediately sync loaded room content to home screen widget
    syncWidgetCanvas(true);

    // Reveal UI
    resetModalHeader();
    roomModal.classList.add('hidden');
    topBar.classList.remove('hidden');
    toolDock.classList.remove('hidden');
    if (pageDock) pageDock.classList.remove('hidden');

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

  socket.on('user-count-updated', (data) => {
    if (data && typeof data.totalCount === 'number') {
      updateUserCount(data.totalCount);
    }
  });

  window.addEventListener('beforeunload', () => {
    if (socket && isSocketConnected) {
      socket.disconnect();
    }
  });

  function updateUserCount(count) {
    const validCount = Math.max(1, count || 1);
    if (validCount <= 1) {
      userCountEl.textContent = '1 Online';
    } else {
      userCountEl.textContent = `${validCount} Online`;
    }
    if (window.AndroidBridge && typeof window.AndroidBridge.updateRoomInfo === 'function') {
      window.AndroidBridge.updateRoomInfo(currentRoom || '', validCount);
    }
  }

  // Remote Drawing Events
  socket.on('stroke-start', (strokeData) => {
    if (!strokeData || !strokeData.id || !isStrokeAllowed(strokeData)) return;
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
    if (deletedStrokeIds.has(data.strokeId)) return;
    let stroke = remoteActiveStrokes.get(data.strokeId);
    if (!stroke) {
      if (!isStrokeAllowed(data)) return;
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
    if (deletedStrokeIds.has(data.strokeId)) return;
    let stroke = remoteActiveStrokes.get(data.strokeId);
    if (data.fullStroke) {
      if (!isStrokeAllowed(data.fullStroke)) return;
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
    if (stroke && isStrokeAllowed(stroke)) {
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
    const clearedTime = Date.now();
    if (data && data.page) {
      pageClearedTimestamps[data.page] = clearedTime;
      localStorage.setItem(`vb_cleared_p${data.page}_${currentRoom}`, clearedTime.toString());
      completedStrokes.forEach(s => {
        if ((s.page || 1) === data.page) deletedStrokeIds.add(s.id);
      });
      saveDeletedState(currentRoom);

      completedStrokes = completedStrokes.filter(s => (s.page || 1) !== data.page);
      remoteActiveStrokes.forEach((s, k) => {
        if ((s.page || 1) === data.page) remoteActiveStrokes.delete(k);
      });
      showToast(data.byUser ? `${data.byUser} cleared Page ${data.page}` : `Page ${data.page} cleared`);
    } else {
      for (let p = 1; p <= 5; p++) {
        pageClearedTimestamps[p] = clearedTime;
        localStorage.setItem(`vb_cleared_p${p}_${currentRoom}`, clearedTime.toString());
      }
      completedStrokes.forEach(s => deletedStrokeIds.add(s.id));
      saveDeletedState(currentRoom);

      completedStrokes = [];
      remoteActiveStrokes.clear();
      showToast(data && data.byUser ? `${data.byUser} cleared the board` : 'Board cleared');
    }
    saveStrokesToLocalStorage();
    syncWidgetCanvas(true);
    playClearWhoosh();
  });

  socket.on('stroke-deleted', (data) => {
    if (data && data.strokeId) {
      deletedStrokeIds.add(data.strokeId);
      saveDeletedState(currentRoom);
      completedStrokes = completedStrokes.filter(s => s.id !== data.strokeId);
      remoteActiveStrokes.delete(data.strokeId);
      saveStrokesToLocalStorage();
      syncWidgetCanvas(true);
    }
  });

  socket.on('page-changed', (data) => {
    if (data && data.page) {
      // Do NOT hijack active screen - only show notification
      if (data.userName) {
        showToast(`${data.userName} is on Page ${data.page}`);
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

  // Sizing, Bounding Box & Resizing Engine
  let isPinching = false;
  let pinchInitialDist = 0;
  let pinchInitialAngle = 0;
  let pinchInitialSnapshot = null;
  let pinchAnchorX = 0;
  let pinchAnchorY = 0;
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

  function getStrokeBounds(s) {
    if (!s) return null;
    const bw = canvasWidth;
    const bh = canvasHeight;

    if (s.type === 'text') {
      const sx = (s.x || 0.15) * bw;
      const sy = (s.y || 0.25) * bh;
      const lines = (s.text || '').split('\n');
      const fs = s.fontSize || 26;
      const h = Math.max(fs, lines.length * fs * 1.35);
      let maxLen = 1;
      for (const l of lines) if (l.length > maxLen) maxLen = l.length;
      const w = Math.max(40, maxLen * fs * 0.65);
      const cx = sx + w / 2;
      const cy = sy + h / 2;
      if (s.rotation) {
        const cos = Math.abs(Math.cos(s.rotation));
        const sin = Math.abs(Math.sin(s.rotation));
        const bbW = w * cos + h * sin;
        const bbH = w * sin + h * cos;
        return {
          minX: cx - bbW / 2,
          minY: cy - bbH / 2,
          maxX: cx + bbW / 2,
          maxY: cy + bbH / 2,
          width: bbW,
          height: bbH,
          cx,
          cy
        };
      }
      return { minX: sx, minY: sy, maxX: sx + w, maxY: sy + h, width: w, height: h, cx, cy };
    }

    if (s.type === 'doodle') {
      const sx = (s.x || 0.5) * bw;
      const sy = (s.y || 0.45) * bh;
      const half = (s.size || 56) / 2;
      const w = half * 2;
      const h = half * 2;
      if (s.rotation) {
        const cos = Math.abs(Math.cos(s.rotation));
        const sin = Math.abs(Math.sin(s.rotation));
        const bbW = w * cos + h * sin;
        const bbH = w * sin + h * cos;
        return {
          minX: sx - bbW / 2,
          minY: sy - bbH / 2,
          maxX: sx + bbW / 2,
          maxY: sy + bbH / 2,
          width: bbW,
          height: bbH,
          cx: sx,
          cy: sy
        };
      }
      return { minX: sx - half, minY: sy - half, maxX: sx + half, maxY: sy + half, width: w, height: h, cx: sx, cy: sy };
    }

    if (s.type === 'gif_sticker') {
      const sx = (s.x || 0.5) * bw;
      const sy = (s.y || 0.45) * bh;
      const aspect = (s.height || 150) / (s.width || 130);
      const drawW = Math.max(70, Math.min(135, bw * 0.28));
      const drawH = drawW * aspect;
      if (s.rotation) {
        const cos = Math.abs(Math.cos(s.rotation));
        const sin = Math.abs(Math.sin(s.rotation));
        const bbW = drawW * cos + drawH * sin;
        const bbH = drawW * sin + drawH * cos;
        return {
          minX: sx - bbW / 2,
          minY: sy - bbH / 2,
          maxX: sx + bbW / 2,
          maxY: sy + bbH / 2,
          width: bbW,
          height: bbH,
          cx: sx,
          cy: sy
        };
      }
      return { minX: sx - drawW / 2, minY: sy - drawH / 2, maxX: sx + drawW / 2, maxY: sy + drawH / 2, width: drawW, height: drawH, cx: sx, cy: sy };
    }

    if (s.points && s.points.length > 0) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      const extra = Math.max(6, (s.width || 3) / 2);
      for (let i = 0; i < s.points.length; i++) {
        const px = s.points[i].x * bw;
        const py = s.points[i].y * bh;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
      minX = Math.max(0, minX - extra);
      maxX = Math.min(bw, maxX + extra);
      minY = Math.max(0, minY - extra);
      maxY = Math.min(bh, maxY + extra);
      const w = Math.max(16, maxX - minX);
      const h = Math.max(16, maxY - minY);
      return { minX, minY, maxX, maxY, width: w, height: h, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
    }

    return null;
  }

  function getSelectedGroupBounds() {
    if (selectedStrokeIds.size === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let count = 0;
    for (let i = 0; i < completedStrokes.length; i++) {
      const s = completedStrokes[i];
      if ((s.page || 1) !== currentPage) continue;
      if (selectedStrokeIds.has(s.id)) {
        const b = getStrokeBounds(s);
        if (b) {
          if (b.minX < minX) minX = b.minX;
          if (b.minY < minY) minY = b.minY;
          if (b.maxX > maxX) maxX = b.maxX;
          if (b.maxY > maxY) maxY = b.maxY;
          count++;
        }
      }
    }
    if (count === 0 || minX === Infinity) return null;
    const padding = 10;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    return {
      minX, minY, maxX, maxY,
      width: maxX - minX,
      height: maxY - minY,
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2
    };
  }

  function getHandleAtPoint(clientX, clientY, bounds) {
    if (!bounds) return null;

    // 1. Top Rotation Handle (stem placed 28px above top-center)
    const rotX = bounds.cx;
    const rotY = bounds.minY - 28;
    if (Math.hypot(clientX - rotX, clientY - rotY) <= 24) {
      return 'rotate';
    }

    // 2. Corner Scaling Handles
    const corners = [
      { id: 'tl', x: bounds.minX, y: bounds.minY },
      { id: 'tr', x: bounds.maxX, y: bounds.minY },
      { id: 'br', x: bounds.maxX, y: bounds.maxY },
      { id: 'bl', x: bounds.minX, y: bounds.maxY }
    ];
    const touchTolerance = 26;
    for (const c of corners) {
      if (Math.hypot(clientX - c.x, clientY - c.y) <= touchTolerance) {
        return c.id;
      }
    }
    return null;
  }

  function snapshotStroke(s) {
    if (s.type === 'text') {
      return { id: s.id, type: 'text', text: s.text, x: s.x, y: s.y, fontSize: s.fontSize || 26, rotation: s.rotation || 0 };
    }
    if (s.type === 'doodle') {
      return { id: s.id, type: 'doodle', x: s.x, y: s.y, size: s.size || 56, rotation: s.rotation || 0 };
    }
    if (s.type === 'gif_sticker') {
      return { id: s.id, type: 'gif_sticker', x: s.x, y: s.y, width: s.width || 130, height: s.height || 150, rotation: s.rotation || 0 };
    }
    if (s.points) {
      return {
        id: s.id,
        type: 'drawing',
        width: s.width || 3,
        points: s.points.map(pt => ({ x: pt.x, y: pt.y }))
      };
    }
    return null;
  }

  function snapshotSelectedStrokes() {
    const list = [];
    for (let i = 0; i < completedStrokes.length; i++) {
      const s = completedStrokes[i];
      if ((s.page || 1) === currentPage && selectedStrokeIds.has(s.id)) {
        const snap = snapshotStroke(s);
        if (snap) list.push(snap);
      }
    }
    return list;
  }

  function applySnapshotWithTransform(snapshots, scaleFactor, angleDelta, anchorPxX, anchorPxY) {
    const snapMap = new Map();
    snapshots.forEach(sn => snapMap.set(sn.id, sn));
    const cos = Math.cos(angleDelta);
    const sin = Math.sin(angleDelta);

    for (let i = 0; i < completedStrokes.length; i++) {
      const s = completedStrokes[i];
      const sn = snapMap.get(s.id);
      if (!sn) continue;

      if (sn.type === 'text') {
        const lines = (sn.text || '').split('\n');
        let maxLen = 1;
        for (const l of lines) if (l.length > maxLen) maxLen = l.length;
        const baseFs = sn.fontSize || 26;
        const newFs = Math.round(Math.max(12, Math.min(220, baseFs * scaleFactor)));
        s.fontSize = newFs;

        const origW = Math.max(40, maxLen * baseFs * 0.65);
        const origH = Math.max(baseFs, lines.length * baseFs * 1.35);
        const origCx = sn.x * canvasWidth + origW / 2;
        const origCy = sn.y * canvasHeight + origH / 2;

        const dx = (origCx - anchorPxX) * scaleFactor;
        const dy = (origCy - anchorPxY) * scaleFactor;
        const newCx = anchorPxX + (dx * cos - dy * sin);
        const newCy = anchorPxY + (dx * sin + dy * cos);

        const newW = Math.max(40, maxLen * newFs * 0.65);
        const newH = Math.max(newFs, lines.length * newFs * 1.35);

        s.x = Math.max(0.01, Math.min(0.96, (newCx - newW / 2) / canvasWidth));
        s.y = Math.max(0.01, Math.min(0.96, (newCy - newH / 2) / canvasHeight));
        s.rotation = ((sn.rotation || 0) + angleDelta) % (2 * Math.PI);
      } else if (sn.type === 'doodle') {
        s.size = Math.round(Math.max(18, Math.min(260, sn.size * scaleFactor)));
        const origPx = sn.x * canvasWidth;
        const origPy = sn.y * canvasHeight;
        const dx = (origPx - anchorPxX) * scaleFactor;
        const dy = (origPy - anchorPxY) * scaleFactor;
        const newCx = anchorPxX + (dx * cos - dy * sin);
        const newCy = anchorPxY + (dx * sin + dy * cos);
        s.x = Math.max(0.01, Math.min(0.96, newCx / canvasWidth));
        s.y = Math.max(0.01, Math.min(0.96, newCy / canvasHeight));
        s.rotation = ((sn.rotation || 0) + angleDelta) % (2 * Math.PI);
      } else if (sn.type === 'gif_sticker') {
        const aspect = (sn.height || 150) / (sn.width || 130);
        s.width = Math.round(Math.max(35, Math.min(450, sn.width * scaleFactor)));
        s.height = Math.round(s.width * aspect);
        const origPx = sn.x * canvasWidth;
        const origPy = sn.y * canvasHeight;
        const dx = (origPx - anchorPxX) * scaleFactor;
        const dy = (origPy - anchorPxY) * scaleFactor;
        const newCx = anchorPxX + (dx * cos - dy * sin);
        const newCy = anchorPxY + (dx * sin + dy * cos);
        s.x = Math.max(0.01, Math.min(0.96, newCx / canvasWidth));
        s.y = Math.max(0.01, Math.min(0.96, newCy / canvasHeight));
        s.rotation = ((sn.rotation || 0) + angleDelta) % (2 * Math.PI);
      } else if (sn.type === 'drawing') {
        s.width = Math.max(1, Math.min(60, Math.round(sn.width * Math.sqrt(scaleFactor))));
        s.points = sn.points.map(pt => {
          const origPx = pt.x * canvasWidth;
          const origPy = pt.y * canvasHeight;
          const dx = (origPx - anchorPxX) * scaleFactor;
          const dy = (origPy - anchorPxY) * scaleFactor;
          const rx = anchorPxX + (dx * cos - dy * sin);
          const ry = anchorPxY + (dx * sin + dy * cos);
          return {
            x: Math.max(0, Math.min(1, rx / canvasWidth)),
            y: Math.max(0, Math.min(1, ry / canvasHeight))
          };
        });
      }
    }
  }

  function applySnapshotWithScale(snapshots, factor, anchorPxX, anchorPxY) {
    applySnapshotWithTransform(snapshots, factor, 0, anchorPxX, anchorPxY);
  }

  function rotateSelectionByDegrees(deg) {
    if (selectedStrokeIds.size === 0) {
      const pageStrokes = completedStrokes.filter(s => (s.page || 1) === currentPage);
      if (pageStrokes.length === 0) {
        showToast('No drawings on this page');
        return;
      }
      selectedStrokeIds.add(pageStrokes[pageStrokes.length - 1].id);
      updateResizeUI();
    }
    const bounds = getSelectedGroupBounds();
    if (!bounds) return;
    const snaps = snapshotSelectedStrokes();
    const angleRad = (deg * Math.PI) / 180;
    applySnapshotWithTransform(snaps, 1.0, angleRad, bounds.cx, bounds.cy);
    commitSelectedStrokesChange();
    playTone(540 + (deg > 0 ? 80 : -80), 'sine', 0.05, 0.03);
    showToast(deg > 0 ? `Rotated ↷ +${deg}°` : `Rotated ↶ ${Math.abs(deg)}°`);
  }

  function moveSelectedStrokes(dxPx, dyPx) {
    const normDx = dxPx / canvasWidth;
    const normDy = dyPx / canvasHeight;
    for (let i = 0; i < completedStrokes.length; i++) {
      const s = completedStrokes[i];
      if ((s.page || 1) !== currentPage || !selectedStrokeIds.has(s.id)) continue;
      if (s.type === 'text' || s.type === 'doodle' || s.type === 'gif_sticker') {
        s.x = Math.max(0.01, Math.min(0.98, (s.x || 0.5) + normDx));
        s.y = Math.max(0.01, Math.min(0.98, (s.y || 0.5) + normDy));
      } else if (s.points) {
        for (const pt of s.points) {
          pt.x = Math.max(0, Math.min(1, pt.x + normDx));
          pt.y = Math.max(0, Math.min(1, pt.y + normDy));
        }
      }
    }
  }

  function commitSelectedStrokesChange() {
    saveStrokesToLocalStorage();
    syncWidgetCanvas(true);
    for (let i = 0; i < completedStrokes.length; i++) {
      const s = completedStrokes[i];
      if ((s.page || 1) === currentPage && selectedStrokeIds.has(s.id)) {
        socket.emit('stroke-end', {
          strokeId: s.id,
          fullStroke: s
        });
        if (activeServerUrl && currentRoom) {
          try {
            fetch(`${activeServerUrl}/api/room/${encodeURIComponent(currentRoom)}/stroke`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(s)
            }).catch(() => {});
          } catch (e) {}
        }
      }
    }
  }

  function applyRelativeScaleToSelection(factor) {
    if (selectedStrokeIds.size === 0) {
      const pageStrokes = completedStrokes.filter(s => (s.page || 1) === currentPage);
      if (pageStrokes.length === 0) {
        showToast('No drawings on this page');
        return;
      }
      pageStrokes.forEach(s => selectedStrokeIds.add(s.id));
    }
    const bounds = getSelectedGroupBounds();
    if (!bounds) return;
    const snaps = snapshotSelectedStrokes();
    applySnapshotWithScale(snaps, factor, bounds.cx, bounds.cy);
    currentSelectionScale = Math.round(Math.max(25, Math.min(300, currentSelectionScale * factor)));
    updateResizeUI();
    commitSelectedStrokesChange();
    playTone(480 + (currentSelectionScale * 1.5), 'sine', 0.05, 0.03);
    showToast(`Size: ${currentSelectionScale}%`);
  }

  function findStrokeAtPoint(clientX, clientY) {
    const radiusPx = 24; // Generous hit target for effortless tapping on mobile
    for (let i = completedStrokes.length - 1; i >= 0; i--) {
      const s = completedStrokes[i];
      if ((s.page || 1) !== currentPage) continue;

      if (s.type === 'text') {
        const sx = (s.x || 0.15) * canvasWidth;
        const sy = (s.y || 0.25) * canvasHeight;
        const lines = (s.text || '').split('\n');
        const fs = s.fontSize || 26;
        const h = Math.max(fs, lines.length * fs * 1.35);
        let maxW = 0;
        for (const l of lines) if (l.length > maxW) maxW = l.length;
        const w = Math.max(maxW * fs * 0.65, 40);
        const cx = sx + w / 2;
        const cy = sy + h / 2;

        // Un-rotate touch coordinate around text center for 100% accurate hit-testing
        const rot = s.rotation || 0;
        const cos = Math.cos(-rot);
        const sin = Math.sin(-rot);
        const dx = clientX - cx;
        const dy = clientY - cy;
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        if (Math.abs(localX) <= w / 2 + radiusPx && Math.abs(localY) <= h / 2 + radiusPx) {
          return s;
        }
      } else if (s.type === 'doodle') {
        const sx = (s.x || 0.5) * canvasWidth;
        const sy = (s.y || 0.45) * canvasHeight;
        const distSq = (clientX - sx) ** 2 + (clientY - sy) ** 2;
        const sz = (s.size || 56) / 2 + radiusPx;
        if (distSq <= sz * sz) return s;
      } else if (s.type === 'gif_sticker') {
        const sx = (s.x || 0.5) * canvasWidth;
        const sy = (s.y || 0.45) * canvasHeight;
        const drawW = Math.max(70, Math.min(135, canvasWidth * 0.28));
        const aspect = (s.height || 150) / (s.width || 130);
        const drawH = drawW * aspect;
        const rot = s.rotation || 0;
        const cos = Math.cos(-rot);
        const sin = Math.sin(-rot);
        const dx = clientX - sx;
        const dy = clientY - sy;
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;
        if (Math.abs(localX) <= drawW / 2 + radiusPx && Math.abs(localY) <= drawH / 2 + radiusPx) {
          return s;
        }
      } else if (s.points && s.points.length > 0) {
        const effectiveRadius = (s.width || 3) / 2 + radiusPx;
        const effRadiusSq = effectiveRadius * effectiveRadius;
        if (s.points.length === 1) {
          const px = s.points[0].x * canvasWidth;
          const py = s.points[0].y * canvasHeight;
          if ((clientX - px) ** 2 + (clientY - py) ** 2 <= effRadiusSq) return s;
        } else {
          for (let j = 0; j < s.points.length - 1; j++) {
            const p1x = s.points[j].x * canvasWidth;
            const p1y = s.points[j].y * canvasHeight;
            const p2x = s.points[j + 1].x * canvasWidth;
            const p2y = s.points[j + 1].y * canvasHeight;
            if (distToSegmentSquared(clientX, clientY, p1x, p1y, p2x, p2y) <= effRadiusSq) {
              return s;
            }
          }
        }
      }
    }
    return null;
  }

  function findClosestStroke(normX, normY) {
    let closest = null;
    let minDist = Infinity;
    const px = normX * canvasWidth;
    const py = normY * canvasHeight;
    for (let i = completedStrokes.length - 1; i >= 0; i--) {
      const s = completedStrokes[i];
      if ((s.page || 1) !== currentPage) continue;
      const b = getStrokeBounds(s);
      if (!b) continue;
      const dist = Math.hypot(px - b.cx, py - b.cy);
      if (dist < minDist) {
        minDist = dist;
        closest = s;
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

    let targetStroke = null;
    if (selectedStrokeIds.size > 0) {
      const b = getSelectedGroupBounds();
      if (!b || midPxX < b.minX - 50 || midPxX > b.maxX + 50 || midPxY < b.minY - 50 || midPxY > b.maxY + 50) {
        targetStroke = findClosestStroke(normMidX, normMidY);
      }
    } else {
      targetStroke = findClosestStroke(normMidX, normMidY);
    }

    if (targetStroke) {
      selectedStrokeIds.clear();
      selectedStrokeIds.add(targetStroke.id);
      currentSelectionScale = 100;
      updateResizeUI();
    }

    if (selectedStrokeIds.size > 0) {
      const b = getSelectedGroupBounds();
      if (b) {
        isPinching = true;
        pinchInitialDist = Math.max(15, dist);
        pinchInitialAngle = Math.atan2(y2 - y1, x2 - x1);
        pinchAnchorX = b.cx;
        pinchAnchorY = b.cy;
        pinchInitialSnapshot = snapshotSelectedStrokes();
        showTextZoomHUD(midPxX, midPxY - 50, `${currentSelectionScale}%`);
        playTone(520, 'sine', 0.05, 0.03);
      }
    }
  }

  function updatePinchGesture(x1, y1, x2, y2) {
    if (!isPinching || !pinchInitialSnapshot) return;
    cancelAccidentalDrawing();

    const dist = Math.hypot(x2 - x1, y2 - y1);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const angleDelta = angle - (pinchInitialAngle || 0);
    const midPxX = (x1 + x2) / 2;
    const midPxY = (y1 + y2) / 2;

    if (pinchInitialDist > 10) {
      const factor = Math.max(0.25, Math.min(3.5, dist / pinchInitialDist));
      applySnapshotWithTransform(pinchInitialSnapshot, factor, angleDelta, pinchAnchorX, pinchAnchorY);
      currentSelectionScale = Math.round(factor * 100);
      updateResizeUI();
      const deg = Math.round((angleDelta * 180 / Math.PI) % 360);
      showTextZoomHUD(midPxX, midPxY - 50, `${currentSelectionScale}% ${Math.abs(deg) > 3 ? `🔄${deg}°` : ''}`);

      const now = Date.now();
      if (now - lastPinchSoundTime > 130) {
        lastPinchSoundTime = now;
        playTone(380 + factor * 150, 'sine', 0.03, 0.02);
      }
    }
  }

  function endPinchGesture() {
    if (!isPinching) return;
    isPinching = false;
    pinchInitialSnapshot = null;
    commitSelectedStrokesChange();
    showToast(`Size: ${currentSelectionScale}%`);
    playTone(680, 'sine', 0.08, 0.04);
    hideTextZoomHUD(500);
  }

  // Canvas Touch Listeners to prevent Android WebView from cancelling drawing gestures
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      e.preventDefault();
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
      e.preventDefault();
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
      e.preventDefault();
    }
  }, { passive: false });

  canvas.addEventListener('touchcancel', (e) => {
    if (e.touches.length === 0) {
      e.preventDefault();
    }
  }, { passive: false });

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
    if (e.touches.length === 2 && isPinching) {
      e.preventDefault();
      updatePinchGesture(
        e.touches[0].clientX, e.touches[0].clientY,
        e.touches[1].clientX, e.touches[1].clientY
      );
    }
  }, { passive: false });

  window.addEventListener('touchend', (e) => {
    if (e.touches.length < 2 && isPinching) {
      endPinchGesture();
    }
  });

  window.addEventListener('touchcancel', (e) => {
    if (isPinching) {
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

      if (selectedStrokeIds.size === 0) {
        const closest = findClosestStroke(normX, normY);
        if (closest) {
          selectedStrokeIds.add(closest.id);
          updateResizeUI();
        }
      }

      if (selectedStrokeIds.size > 0) {
        const bounds = getSelectedGroupBounds();
        if (bounds) {
          const factor = e.deltaY < 0 ? 1.08 : 0.92;
          const snaps = snapshotSelectedStrokes();
          applySnapshotWithScale(snaps, factor, bounds.cx, bounds.cy);
          currentSelectionScale = Math.round(Math.max(25, Math.min(300, currentSelectionScale * factor)));
          updateResizeUI();
          showTextZoomHUD(e.clientX, e.clientY - 45, `${currentSelectionScale}%`);
          hideTextZoomHUD(600);

          clearTimeout(wheelZoomTimeout);
          wheelZoomTimeout = setTimeout(() => {
            commitSelectedStrokesChange();
          }, 150);
        }
      }
    }
  }, { passive: false });

  // Real-Time Eraser and Stroke Deletion System
  let lastLocalActionTime = 0;
  let isErasing = false;
  let eraserIndicatorPos = null;

  function distToSegmentSquared(px, py, vx, vy, wx, wy) {
    const l2 = (vx - wx) * (vx - wx) + (vy - wy) * (vy - wy);
    if (l2 === 0) return (px - vx) * (px - vx) + (py - vy) * (py - vy);
    let t = ((px - vx) * (wx - vx) + (py - vy) * (wy - wy)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = vx + t * (wx - vx);
    const projY = vy + t * (wy - vy);
    return (px - projX) * (px - projX) + (py - projY) * (py - projY);
  }

  function deleteStrokeById(strokeId, broadcast = true) {
    if (!strokeId) return;
    lastLocalActionTime = Date.now();
    deletedStrokeIds.add(strokeId);
    saveDeletedState(currentRoom);
    const initialLen = completedStrokes.length;
    completedStrokes = completedStrokes.filter(s => s.id !== strokeId);
    remoteActiveStrokes.delete(strokeId);
    if (completedStrokes.length !== initialLen) {
      saveStrokesToLocalStorage();
      syncWidgetCanvas(true);
      if (broadcast && currentRoom) {
        socket.emit('stroke-delete', { strokeId });
        if (activeServerUrl) {
          try {
            fetch(`${activeServerUrl}/api/room/${encodeURIComponent(currentRoom)}/stroke/delete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ strokeId })
            }).catch(() => {});
          } catch (e) {}
        }
      }
    }
  }

  function eraseAtPoint(clientX, clientY) {
    if (!currentRoom) return;
    const radiusPx = currentEraserSize || 24;
    const toDelete = [];

    for (let i = completedStrokes.length - 1; i >= 0; i--) {
      const s = completedStrokes[i];
      if ((s.page || 1) !== currentPage) continue;

      // 1. Text notes
      if (s.type === 'text') {
        const sx = s.x * canvasWidth;
        const sy = s.y * canvasHeight;
        const lines = (s.text || '').split('\n');
        const h = lines.length * (s.fontSize || 26) * 1.35;
        let maxW = 0;
        for (const l of lines) {
          if (l.length > maxW) maxW = l.length;
        }
        const w = Math.max(maxW * (s.fontSize || 26) * 0.65, 40);
        if (clientX >= sx - radiusPx && clientX <= sx + w + radiusPx &&
            clientY >= sy - radiusPx && clientY <= sy + h + radiusPx) {
          toDelete.push(s.id);
        }
        continue;
      }

      // 2. Doodle Stickers
      if (s.type === 'doodle') {
        const sx = s.x * canvasWidth;
        const sy = s.y * canvasHeight;
        const distSq = (clientX - sx) ** 2 + (clientY - sy) ** 2;
        const sz = (s.size || 56) / 2 + radiusPx;
        if (distSq <= sz * sz) {
          toDelete.push(s.id);
        }
        continue;
      }

      // 3. GIF Stickers
      if (s.type === 'gif_sticker') {
        const sx = s.x * canvasWidth;
        const sy = s.y * canvasHeight;
        const drawW = Math.max(70, Math.min(135, canvasWidth * 0.28));
        const aspect = (s.height || 150) / (s.width || 130);
        const drawH = drawW * aspect;
        if (clientX >= sx - drawW / 2 - radiusPx && clientX <= sx + drawW / 2 + radiusPx &&
            clientY >= sy - drawH / 2 - radiusPx && clientY <= sy + drawH / 2 + radiusPx) {
          toDelete.push(s.id);
        }
        continue;
      }

      // 4. Freehand strokes (Pen, Glow, etc.)
      if (s.points && s.points.length > 0) {
        let hit = false;
        const effectiveRadius = (s.width || 3) / 2 + radiusPx;
        const effRadiusSq = effectiveRadius * effectiveRadius;

        if (s.points.length === 1) {
          const px = s.points[0].x * canvasWidth;
          const py = s.points[0].y * canvasHeight;
          const dSq = (clientX - px) ** 2 + (clientY - py) ** 2;
          if (dSq <= effRadiusSq) hit = true;
        } else {
          for (let j = 0; j < s.points.length - 1; j++) {
            const p1x = s.points[j].x * canvasWidth;
            const p1y = s.points[j].y * canvasHeight;
            const p2x = s.points[j + 1].x * canvasWidth;
            const p2y = s.points[j + 1].y * canvasHeight;
            if (distToSegmentSquared(clientX, clientY, p1x, p1y, p2x, p2y) <= effRadiusSq) {
              hit = true;
              break;
            }
          }
        }

        if (hit) {
          toDelete.push(s.id);
        }
      }
    }

    if (toDelete.length > 0) {
      toDelete.forEach(id => deleteStrokeById(id, true));
      playTone(320, 'sine', 0.04, 0.02);
    }
  }

  function closeAllPopovers() {
    if (penThicknessPopover) penThicknessPopover.classList.add('hidden');
    if (eraserSizePopover) eraserSizePopover.classList.add('hidden');
    if (penColorsPopover) penColorsPopover.classList.add('hidden');
    if (boardColorsPopover) boardColorsPopover.classList.add('hidden');
    if (doodlesPopover) doodlesPopover.classList.add('hidden');
    if (gifStickersPopover) gifStickersPopover.classList.add('hidden');
  }

  // Pointer Event Listeners
  window.addEventListener('pointerdown', (e) => {
    // Ignore clicks on UI overlays, popovers, and text modal
    if (e.target && typeof e.target.closest === 'function') {
      if (e.target.closest('#top-bar, #tool-dock, #room-modal, #pen-thickness-popover, #eraser-size-popover, #pen-colors-popover, #board-colors-popover, #doodles-popover, #gif-stickers-popover, #text-input-overlay, #resize-controller, .toast')) return;
    }
    if (!currentRoom) return;

    if (e.pointerType === 'touch') {
      activeTouchPointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      if (activeTouchPointers.size >= 2) {
        const pts = Array.from(activeTouchPointers.values());
        startPinchGesture(pts[0].clientX, pts[0].clientY, pts[1].clientX, pts[1].clientY);
        return;
      }
    }

    // Dismiss any open popovers when clicking on canvas
    closeAllPopovers();

    // If Resize tool is active, handle selecting, moving, scaling, and rotating
    if (currentTool === 'resize') {
      const bounds = getSelectedGroupBounds();
      const handle = getHandleAtPoint(e.clientX, e.clientY, bounds);

      // 1. Rotation handle dragged
      if (handle === 'rotate' && bounds) {
        resizeDragState = {
          mode: 'rotate',
          anchorX: bounds.cx,
          anchorY: bounds.cy,
          startAngle: Math.atan2(e.clientY - bounds.cy, e.clientX - bounds.cx),
          origStrokes: snapshotSelectedStrokes()
        };
        playTone(620, 'sine', 0.04, 0.02);
        return;
      }

      // 2. Corner scale handle dragged
      if (handle && bounds) {
        resizeDragState = {
          mode: 'scale',
          handle,
          startX: e.clientX,
          startY: e.clientY,
          initialBounds: { ...bounds },
          origStrokes: snapshotSelectedStrokes()
        };
        playTone(600, 'sine', 0.03, 0.02);
        return;
      }

      // 3. Tapping directly on ANY stroke or word on the board selects it immediately!
      const hitStroke = findStrokeAtPoint(e.clientX, e.clientY);
      if (hitStroke) {
        if (!e.shiftKey) {
          if (!selectedStrokeIds.has(hitStroke.id)) {
            selectedStrokeIds.clear();
            selectedStrokeIds.add(hitStroke.id);
            currentSelectionScale = 100;
            updateResizeUI();
          }
        } else {
          if (selectedStrokeIds.has(hitStroke.id)) {
            selectedStrokeIds.delete(hitStroke.id);
          } else {
            selectedStrokeIds.add(hitStroke.id);
          }
          updateResizeUI();
        }
        playTone(560, 'sine', 0.04, 0.02);
        resizeDragState = {
          mode: 'move',
          startX: e.clientX,
          startY: e.clientY,
          lastX: e.clientX,
          lastY: e.clientY
        };
        return;
      }

      // 4. Moving inside bounding box of current selection
      if (bounds && e.clientX >= bounds.minX && e.clientX <= bounds.maxX &&
          e.clientY >= bounds.minY && e.clientY <= bounds.maxY) {
        resizeDragState = {
          mode: 'move',
          startX: e.clientX,
          startY: e.clientY,
          lastX: e.clientX,
          lastY: e.clientY
        };
        playTone(520, 'sine', 0.03, 0.02);
        return;
      }

      // 5. Tapped empty space: clear selection and return to pen
      selectedStrokeIds.clear();
      currentSelectionScale = 100;
      updateResizeUI();
      if (resizeController) resizeController.classList.add('hidden');
      currentTool = 'pen';
      toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === 'pen'));
      return;
    }

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

    // If Eraser tool is active, delete any stroke/item under pointer without creating fake ink
    if (currentTool === 'eraser') {
      isErasing = true;
      eraserIndicatorPos = { x: e.clientX, y: e.clientY };
      eraseAtPoint(e.clientX, e.clientY);
      emitCursorPosition(e.clientX, e.clientY);
      return;
    }

    if (isPinching) return;

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
      color: currentColor,
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

    if (currentTool === 'resize' && resizeDragState) {
      if (resizeDragState.mode === 'move') {
        const dx = e.clientX - resizeDragState.lastX;
        const dy = e.clientY - resizeDragState.lastY;
        resizeDragState.lastX = e.clientX;
        resizeDragState.lastY = e.clientY;
        moveSelectedStrokes(dx, dy);
      } else if (resizeDragState.mode === 'scale') {
        const ib = resizeDragState.initialBounds;
        const initialDist = Math.hypot(resizeDragState.startX - ib.cx, resizeDragState.startY - ib.cy);
        const currentDist = Math.hypot(e.clientX - ib.cx, e.clientY - ib.cy);
        if (initialDist > 8) {
          const factor = Math.max(0.2, Math.min(4.0, currentDist / initialDist));
          applySnapshotWithScale(resizeDragState.origStrokes, factor, ib.cx, ib.cy);
          currentSelectionScale = Math.round(factor * 100);
          updateResizeUI();
        }
      } else if (resizeDragState.mode === 'rotate') {
        const currentAngle = Math.atan2(e.clientY - resizeDragState.anchorY, e.clientX - resizeDragState.anchorX);
        const angleDelta = currentAngle - resizeDragState.startAngle;
        applySnapshotWithTransform(resizeDragState.origStrokes, 1.0, angleDelta, resizeDragState.anchorX, resizeDragState.anchorY);
        const deg = Math.round((angleDelta * 180 / Math.PI) % 360);
        showTextZoomHUD(e.clientX, e.clientY - 45, `🔄 ${deg >= 0 ? '+' : ''}${deg}°`);
      }
      return;
    }

    if (currentTool === 'eraser') {
      if (isErasing) {
        eraserIndicatorPos = { x: e.clientX, y: e.clientY };
        eraseAtPoint(e.clientX, e.clientY);
      }
      return;
    }

    if (e.pointerType === 'touch' && activeTouchPointers.has(e.pointerId)) {
      activeTouchPointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      if (activeTouchPointers.size >= 2 && isPinching) {
        const pts = Array.from(activeTouchPointers.values());
        updatePinchGesture(pts[0].clientX, pts[0].clientY, pts[1].clientX, pts[1].clientY);
        return;
      }
    }

    if (isPinching) return;
    if (!isDrawing || !currentStroke) return;

    const pt = getCanvasCoords(e);
    currentStroke.points.push(pt);

    socket.emit('stroke-point', {
      strokeId: currentStroke.id,
      point: pt
    });
  });

  function stopDrawing(e) {
    if (currentTool === 'resize' && resizeDragState) {
      if (resizeDragState.mode === 'rotate') {
        hideTextZoomHUD(300);
      }
      resizeDragState = null;
      commitSelectedStrokesChange();
      return;
    }

    if (isErasing) {
      isErasing = false;
      eraserIndicatorPos = null;
      return;
    }

    if (e && e.pointerType === 'touch') {
      activeTouchPointers.delete(e.pointerId);
      if (activeTouchPointers.size < 2 && isPinching) {
        endPinchGesture();
      }
    }

    if (isPinching) {
      endPinchGesture();
      return;
    }

    if (!isDrawing || !currentStroke) return;

    isDrawing = false;

    if (canvas.releasePointerCapture && e && e.pointerId !== undefined) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    }

    const strokeToSave = {
      ...currentStroke,
      endedAt: Date.now()
    };
    completedStrokes.push(strokeToSave);
    saveStrokesToLocalStorage();

    socket.emit('stroke-end', {
      strokeId: strokeToSave.id,
      fullStroke: strokeToSave
    });

    if (activeServerUrl && currentRoom) {
      try {
        fetch(`${activeServerUrl}/api/room/${encodeURIComponent(currentRoom)}/stroke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(strokeToSave)
        }).catch(() => {});
      } catch (e) {}
    }

    currentStroke = null;
    syncWidgetCanvas(true);
  }

  window.addEventListener('pointerup', stopDrawing);
  window.addEventListener('pointercancel', (e) => {
    if (isDrawing && currentStroke && currentStroke.points && currentStroke.points.length > 0) {
      stopDrawing(e);
    } else {
      isDrawing = false;
      currentStroke = null;
    }
  });

  // Render Engine: Draws strokes & computes ephemeral fading
  function renderStroke(s, opacity) {
    if (!s || opacity <= 0 || s.type === 'presence' || String(s.id).startsWith('__presence__')) return;

    // Render Typed Text Notes
    if (s.type === 'text') {
      if (!s.text) return;
      ctx.save();
      ctx.globalAlpha = opacity;
      const x = (s.x || 0.15) * canvasWidth;
      const y = (s.y || 0.25) * canvasHeight;
      const lines = s.text.split('\n');
      const fs = s.fontSize || 26;
      const lineHeight = fs * 1.35;
      let maxLen = 1;
      for (const l of lines) if (l.length > maxLen) maxLen = l.length;
      const w = Math.max(maxLen * fs * 0.65, 40);
      const h = Math.max(fs, lines.length * lineHeight);
      const cx = x + w / 2;
      const cy = y + h / 2;

      ctx.translate(cx, cy);
      if (s.rotation) {
        ctx.rotate(s.rotation);
      }
      ctx.font = `600 ${fs}px Outfit, -apple-system, sans-serif`;
      ctx.fillStyle = s.color || '#18181b';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 2;
      lines.forEach((line, idx) => {
        ctx.fillText(line, -w / 2, -h / 2 + idx * lineHeight);
      });
      ctx.restore();
      return;
    }

    // Render Doodle Sticker
    if (s.type === 'doodle') {
      if (!s.icon) return;
      ctx.save();
      ctx.globalAlpha = opacity;
      const cx = (s.x || 0.5) * canvasWidth;
      const cy = (s.y || 0.45) * canvasHeight;
      ctx.translate(cx, cy);
      if (s.rotation) {
        ctx.rotate(s.rotation);
      }
      const sz = s.size || 56;
      ctx.font = `${sz}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;
      ctx.fillText(s.icon, 0, 0);
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

      const cx = (s.x || 0.5) * canvasWidth;
      const cy = (s.y || 0.45) * canvasHeight;
      const aspect = (s.height || 150) / (s.width || 130);
      const drawW = Math.max(70, Math.min(135, canvasWidth * 0.28));
      const drawH = drawW * aspect;

      // Subtle dynamic cartoon bounce & tilt so stickers feel intensely alive
      const elapsedSec = (Date.now() - (s.createdAt || 0)) / 1000;
      const bounce = 1.0 + 0.025 * Math.sin(elapsedSec * 4 * Math.PI);
      const tilt = 0.02 * Math.sin(elapsedSec * 2 * Math.PI);

      ctx.translate(cx, cy);
      ctx.rotate((s.rotation || 0) + tilt);
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

    // 4. Render selection bounding box, corner handles, and center dot
    if (selectedStrokeIds.size > 0) {
      const bounds = getSelectedGroupBounds();
      if (bounds) {
        ctx.save();
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
        ctx.setLineDash([]);

        // Rotation stem line from top-center to rotation handle
        const rotX = bounds.cx;
        const rotY = bounds.minY - 28;
        ctx.beginPath();
        ctx.moveTo(bounds.cx, bounds.minY);
        ctx.lineTo(rotX, rotY);
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Rotation circular handle at (rotX, rotY)
        ctx.beginPath();
        ctx.arc(rotX, rotY, 11, 0, Math.PI * 2);
        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 5;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw ↻ symbol inside rotation handle
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↻', rotX, rotY);

        const corners = [
          { x: bounds.minX, y: bounds.minY },
          { x: bounds.maxX, y: bounds.minY },
          { x: bounds.maxX, y: bounds.maxY },
          { x: bounds.minX, y: bounds.maxY }
        ];

        for (const c of corners) {
          ctx.beginPath();
          ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#00f5d4';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 4;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Center move handle
        ctx.beginPath();
        ctx.arc(bounds.cx, bounds.cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 245, 212, 0.9)';
        ctx.fill();
        ctx.restore();
      }
    }

    // 5. Render visual eraser indicator ring if erasing
    if (isErasing && eraserIndicatorPos) {
      ctx.save();
      ctx.beginPath();
      const r = currentEraserSize || 24;
      ctx.arc(eraserIndicatorPos.x, eraserIndicatorPos.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 6. Sync to Android Home Screen Widget ONLY while actively drawing
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

    const allStrokes = [...completedStrokes, ...remoteActiveStrokes.values()].filter(s => s && s.type !== 'presence' && !String(s.id).startsWith('__presence__'));
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
      hasActiveStrokesLastCheck = false;
      const emptyPayload = JSON.stringify({
        boardWidth: bw,
        boardHeight: bh,
        activePage: currentPage,
        strokes: []
      });
      if (typeof window.AndroidBridge.updateWidgetStrokes === 'function') {
        window.AndroidBridge.updateWidgetStrokes(emptyPayload);
      } else if (typeof window.AndroidBridge.updateWidgetPreview === 'function') {
        widgetCtx.clearRect(0, 0, WIDGET_SIZE, WIDGET_SIZE);
        window.AndroidBridge.updateWidgetPreview('');
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
            const tcx = sx + estW / 2;
            const tcy = sy + estH / 2;
            if (s.rotation) {
              const cos = Math.abs(Math.cos(s.rotation));
              const sin = Math.abs(Math.sin(s.rotation));
              const bbW = estW * cos + estH * sin;
              const bbH = estW * sin + estH * cos;
              minX = Math.min(minX, tcx - bbW / 2);
              maxX = Math.max(maxX, tcx + bbW / 2);
              minY = Math.min(minY, tcy - bbH / 2);
              maxY = Math.max(maxY, tcy + bbH / 2);
            } else {
              minX = Math.min(minX, sx);
              maxX = Math.max(maxX, sx + estW);
              minY = Math.min(minY, sy);
              maxY = Math.max(maxY, sy + estH);
            }
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

          const sx = (s.x || 0.1) * bw;
          const sy = (s.y || 0.2) * bh;
          const lines = s.text.split('\n');
          const lineHeight = scaledFontSize * 1.28;
          let maxLen = 1;
          for (const l of lines) if (l.length > maxLen) maxLen = l.length;
          const estW = Math.min(bw * 0.90, maxLen * baseSize * 0.60);
          const tcx = (sx + estW / 2) * S + offsetX;
          const tcy = (sy + (lines.length * baseSize * 1.30) / 2) * S + offsetY;

          widgetCtx.translate(tcx, tcy);
          if (s.rotation) widgetCtx.rotate(s.rotation);

          const totalH = lines.length * lineHeight;
          lines.forEach((line, idx) => {
            widgetCtx.fillText(line, -(estW * S) / 2, -(totalH / 2) + idx * lineHeight);
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
          const px = ((s.x || 0.5) * bw) * S + offsetX;
          const py = ((s.y || 0.45) * bh) * S + offsetY;
          widgetCtx.translate(px, py);
          if (s.rotation) widgetCtx.rotate(s.rotation);
          widgetCtx.fillText(s.icon, 0, 0);
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
            const px = ((s.x || 0.5) * bw) * S + offsetX;
            const py = ((s.y || 0.45) * bh) * S + offsetY;
            const aspect = (s.height || 150) / (s.width || 130);
            const targetW = Math.max(48, Math.round(90 * Math.min(1.4, Math.max(0.9, S))));
            const targetH = targetW * aspect;
            widgetCtx.translate(px, py);
            if (s.rotation) widgetCtx.rotate(s.rotation);
            widgetCtx.drawImage(imgToDraw, -targetW / 2, -targetH / 2, targetW, targetH);
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

  // Real-Time Room Synchronization Engine (SSE + Ultra-Fast 350ms Non-Blocking Polling + Cloud Presence Heartbeat)
  let liveEventSource = null;
  let isSyncingRoom = false;

  function sendPresenceHeartbeat() {
    if (!currentRoom || !activeServerUrl) return;
    const presencePayload = {
      id: `__presence__${deviceId}`,
      type: 'presence',
      deviceId,
      userName: currentUser?.name || 'User',
      lastSeen: Date.now(),
      page: currentPage || 1
    };
    try {
      fetch(`${activeServerUrl}/api/room/${encodeURIComponent(currentRoom)}/stroke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(presencePayload)
      }).catch(() => {});
    } catch (e) {}
  }

  setInterval(sendPresenceHeartbeat, 3000);

  function connectRoomSSE(roomCode) {
    if (!roomCode || !activeServerUrl) return;
    try {
      if (liveEventSource) {
        liveEventSource.close();
        liveEventSource = null;
      }
      const sseUrl = `${activeServerUrl}/api/room/${encodeURIComponent(roomCode)}/live`;
      liveEventSource = new EventSource(sseUrl);

      liveEventSource.onmessage = (event) => {
        try {
          if (!event.data || event.data.startsWith(':')) return;
          const data = JSON.parse(event.data);
          handleRemoteRoomData(data);
        } catch (err) {}
      };

      liveEventSource.onerror = () => {
        // SSE silent fallback - the 350ms rapid polling loop below guarantees sync across all networks
      };
    } catch (e) {}
  }

  function handleRemoteRoomData(data) {
    if (!data || !currentRoom) return;

    let changed = false;

    // 1. Process server-side deleted strokes (Tombstones)
    if (Array.isArray(data.deletedStrokeIds) && data.deletedStrokeIds.length > 0) {
      let hadNewDeletes = false;
      data.deletedStrokeIds.forEach(id => {
        if (!deletedStrokeIds.has(id)) {
          deletedStrokeIds.add(id);
          hadNewDeletes = true;
        }
      });
      if (hadNewDeletes) {
        saveDeletedState(currentRoom);
        const prevLen = completedStrokes.length;
        completedStrokes = completedStrokes.filter(s => isStrokeAllowed(s));
        if (completedStrokes.length !== prevLen) {
          changed = true;
        }
      }
    }

    // 2. Process incoming remote strokes without disturbing local drawing
    if (Array.isArray(data.strokes)) {
      // 2a. Real-time active devices presence tracking across serverless lambdas
      const now = Date.now();
      const activeDevices = new Set();
      if (deviceId) activeDevices.add(deviceId);

      data.strokes.forEach(s => {
        if (s && (s.type === 'presence' || String(s.id).startsWith('__presence__'))) {
          if (s.deviceId && (now - (s.lastSeen || 0)) < 15000) {
            activeDevices.add(s.deviceId);
          }
        }
      });

      const serverCount = typeof data.userCount === 'number' ? data.userCount : 0;
      const onlineCount = Math.max(1, Math.max(activeDevices.size, serverCount));
      updateUserCount(onlineCount);

      // 2b. Merge strokes
      const localMap = new Map();
      completedStrokes.forEach((s, idx) => localMap.set(s.id, idx));

      for (const s of data.strokes) {
        if (!s || !s.id || !isStrokeAllowed(s)) continue;

        if (localMap.has(s.id)) {
          const idx = localMap.get(s.id);
          const existing = completedStrokes[idx];
          if (s.updatedAt && (!existing.updatedAt || s.updatedAt > existing.updatedAt)) {
            completedStrokes[idx] = { ...existing, ...s };
            changed = true;
          }
        } else {
          // New stroke from room peer: append cleanly without disturbing existing strokes
          completedStrokes.push({
            ...s,
            endedAt: s.endedAt || s.createdAt || Date.now(),
            fadeDuration: 999999999
          });
          localMap.set(s.id, completedStrokes.length - 1);
          changed = true;
        }
      }

      // If remote room cleared Page or Board, remove vanished strokes
      if (data.clearedPage) {
        const prevLen = completedStrokes.length;
        completedStrokes = completedStrokes.filter(s => (s.page || 1) !== data.clearedPage);
        if (completedStrokes.length !== prevLen) changed = true;
      }
    } else if (typeof data.userCount === 'number' && userCountEl) {
      updateUserCount(data.userCount);
    }

    if (changed) {
      saveStrokesToLocalStorage();
      syncWidgetCanvas(true);
    }
  }

  // Ultra-Fast 350ms Polling Loop for instantaneous cross-device sync
  setInterval(async () => {
    if (!currentRoom || !activeServerUrl || isSyncingRoom) return;
    isSyncingRoom = true;
    try {
      const res = await fetch(`${activeServerUrl}/api/room/${encodeURIComponent(currentRoom)}?t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        handleRemoteRoomData(data);
      }
    } catch (e) {
      // Network silent fallback
    } finally {
      isSyncingRoom = false;
    }
  }, 350);

  requestAnimationFrame(animationLoop);

  // UI Event Bindings
  // Tool Modes (5 Tools: Pen, Eraser, Colour Wheel, Selection/Resize, Keyboard/Text)
  toolBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const selectedTool = btn.dataset.tool;
      activeDoodle = null;
      activeGifSticker = null;

      if (selectedTool === 'pen') {
        const wasAlreadyPen = (currentTool === 'pen');
        currentTool = 'pen';
        toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === 'pen'));
        if (resizeController) resizeController.classList.add('hidden');
        if (eraserSizePopover) eraserSizePopover.classList.add('hidden');
        if (penColorsPopover) penColorsPopover.classList.add('hidden');
        if (penThicknessPopover) {
          if (wasAlreadyPen) {
            penThicknessPopover.classList.toggle('hidden');
          } else {
            penThicknessPopover.classList.remove('hidden');
          }
          updateBrushSize(currentBrushSize);
        }
        playTone(460, 'triangle', 0.05, 0.03);
        return;
      }

      if (selectedTool === 'eraser') {
        const wasAlreadyEraser = (currentTool === 'eraser');
        currentTool = 'eraser';
        toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === 'eraser'));
        if (resizeController) resizeController.classList.add('hidden');
        if (penThicknessPopover) penThicknessPopover.classList.add('hidden');
        if (penColorsPopover) penColorsPopover.classList.add('hidden');
        if (eraserSizePopover) {
          if (wasAlreadyEraser) {
            eraserSizePopover.classList.toggle('hidden');
          } else {
            eraserSizePopover.classList.remove('hidden');
          }
          updateEraserSize(currentEraserSize);
        }
        playTone(400, 'sine', 0.05, 0.03);
        return;
      }

      if (selectedTool === 'resize') {
        closeAllPopovers();
        currentTool = 'resize';
        toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === 'resize'));
        if (resizeController) resizeController.classList.remove('hidden');
        if (selectedStrokeIds.size === 0) {
          const pageStrokes = completedStrokes.filter(s => (s.page || 1) === currentPage);
          if (pageStrokes.length > 0) {
            selectedStrokeIds.add(pageStrokes[pageStrokes.length - 1].id);
          }
        }
        currentSelectionScale = 100;
        updateResizeUI();
        playTone(480, 'triangle', 0.05, 0.03);
        showToast('Tap drawing or drag corner handles to resize');
        return;
      }

      if (selectedTool === 'text') {
        closeAllPopovers();
        currentTool = 'text';
        toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === 'text'));
        if (resizeController) resizeController.classList.add('hidden');
        playTone(520, 'triangle', 0.05, 0.03);
        textTargetPosition = { x: 0.18, y: 0.30 };
        if (textInputOverlay) {
          textInputOverlay.classList.remove('hidden');
          if (canvasTextInput) {
            canvasTextInput.value = '';
            canvasTextInput.style.fontSize = `${currentFontSize}px`;
            setTimeout(() => canvasTextInput.focus(), 60);
          }
        }
        showToast('Type text note for board');
        return;
      }

      // Default fallback
      closeAllPopovers();
      toolBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = selectedTool;
      if (resizeController) resizeController.classList.add('hidden');
      playTone(440, 'triangle', 0.05, 0.03);
    });
  });

  // Floating Resize & Transform Controller Controls
  let sliderBaseSnaps = null;
  let sliderBaseBounds = null;
  if (resizeSlider) {
    const initSliderTracking = () => {
      if (selectedStrokeIds.size === 0) {
        completedStrokes.filter(s => (s.page || 1) === currentPage).forEach(s => selectedStrokeIds.add(s.id));
        updateResizeUI();
      }
      sliderBaseBounds = getSelectedGroupBounds();
      sliderBaseSnaps = snapshotSelectedStrokes();
    };
    resizeSlider.addEventListener('mousedown', initSliderTracking);
    resizeSlider.addEventListener('touchstart', initSliderTracking, { passive: true });
    resizeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) || 100;
      currentSelectionScale = val;
      if (resizeScaleVal) resizeScaleVal.textContent = `${val}%`;
      if (!sliderBaseSnaps || !sliderBaseBounds) {
        sliderBaseBounds = getSelectedGroupBounds();
        sliderBaseSnaps = snapshotSelectedStrokes();
      }
      if (sliderBaseSnaps && sliderBaseBounds) {
        applySnapshotWithScale(sliderBaseSnaps, val / 100, sliderBaseBounds.cx, sliderBaseBounds.cy);
      }
    });
    const finishSlider = () => {
      sliderBaseSnaps = null;
      sliderBaseBounds = null;
      commitSelectedStrokesChange();
    };
    resizeSlider.addEventListener('mouseup', finishSlider);
    resizeSlider.addEventListener('touchend', finishSlider);
  }

  if (btnScaleDown) {
    btnScaleDown.addEventListener('click', (e) => {
      e.stopPropagation();
      applyRelativeScaleToSelection(0.85);
    });
  }

  if (btnScaleUp) {
    btnScaleUp.addEventListener('click', (e) => {
      e.stopPropagation();
      applyRelativeScaleToSelection(1.18);
    });
  }

  if (btnRotateLeft) {
    btnRotateLeft.addEventListener('click', (e) => {
      e.stopPropagation();
      rotateSelectionByDegrees(-45);
    });
  }

  if (btnRotateRight) {
    btnRotateRight.addEventListener('click', (e) => {
      e.stopPropagation();
      rotateSelectionByDegrees(45);
    });
  }

  if (btnSelectAll) {
    btnSelectAll.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedStrokeIds.clear();
      const pageStrokes = completedStrokes.filter(s => (s.page || 1) === currentPage);
      pageStrokes.forEach(s => selectedStrokeIds.add(s.id));
      currentSelectionScale = 100;
      updateResizeUI();
      playTone(560, 'sine', 0.05, 0.03);
      showToast(pageStrokes.length > 0 ? `Selected all ${pageStrokes.length} items` : 'No drawings on this page');
    });
  }

  if (btnDeleteSelected) {
    btnDeleteSelected.addEventListener('click', (e) => {
      e.stopPropagation();
      if (selectedStrokeIds.size === 0) return;
      const ids = Array.from(selectedStrokeIds);
      ids.forEach(id => deleteStrokeById(id, true));
      selectedStrokeIds.clear();
      currentSelectionScale = 100;
      updateResizeUI();
      playTone(320, 'sine', 0.05, 0.03);
      showToast('Deleted selected items');
    });
  }

  if (btnCloseResize) {
    btnCloseResize.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedStrokeIds.clear();
      if (resizeController) resizeController.classList.add('hidden');
      const penBtn = document.getElementById('tool-pen');
      if (penBtn) penBtn.click();
      else {
        currentTool = 'pen';
        toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === 'pen'));
      }
    });
  }

  // Line Thickness Helper & Controls
  function updateBrushSize(size) {
    currentBrushSize = Math.max(1, Math.min(40, parseInt(size, 10) || 6));
    if (brushSizeInput) brushSizeInput.value = currentBrushSize;
    if (lineThicknessVal) lineThicknessVal.textContent = `${currentBrushSize}px`;
    if (thicknessPreviewDot) {
      thicknessPreviewDot.style.width = `${Math.min(currentBrushSize, 28)}px`;
      thicknessPreviewDot.style.height = `${Math.min(currentBrushSize, 28)}px`;
      thicknessPreviewDot.style.backgroundColor = currentColor;
    }
    if (sizeDot) {
      sizeDot.style.width = `${currentBrushSize}px`;
      sizeDot.style.height = `${currentBrushSize}px`;
      sizeDot.style.backgroundColor = currentColor;
    }
    thicknessPresetChips.forEach(chip => {
      chip.classList.toggle('active', parseInt(chip.dataset.size, 10) === currentBrushSize);
    });
  }

  if (brushSizeInput) {
    brushSizeInput.addEventListener('input', (e) => {
      updateBrushSize(e.target.value);
    });
  }

  const btnClosePenThickness = document.getElementById('btn-close-pen-thickness');
  if (btnClosePenThickness && penThicknessPopover) {
    btnClosePenThickness.addEventListener('click', (e) => {
      e.stopPropagation();
      penThicknessPopover.classList.add('hidden');
    });
  }

  thicknessPresetChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const sz = parseInt(chip.dataset.size, 10);
      updateBrushSize(sz);
      playTone(520, 'sine', 0.04, 0.02);
      if (penThicknessPopover) penThicknessPopover.classList.add('hidden');
    });
  });

  // Eraser Size Helper & Controls
  function updateEraserSize(size) {
    currentEraserSize = Math.max(10, Math.min(80, parseInt(size, 10) || 24));
    if (eraserSizeSlider) eraserSizeSlider.value = currentEraserSize;
    if (eraserSizeVal) eraserSizeVal.textContent = `${currentEraserSize}px`;
    if (eraserPreviewRing) {
      eraserPreviewRing.style.width = `${Math.min(currentEraserSize, 36)}px`;
      eraserPreviewRing.style.height = `${Math.min(currentEraserSize, 36)}px`;
    }
    eraserPresetChips.forEach(chip => {
      chip.classList.toggle('active', parseInt(chip.dataset.size, 10) === currentEraserSize);
    });
  }

  if (eraserSizeSlider) {
    eraserSizeSlider.addEventListener('input', (e) => {
      updateEraserSize(e.target.value);
    });
  }

  const btnCloseEraserSize = document.getElementById('btn-close-eraser-size');
  if (btnCloseEraserSize && eraserSizePopover) {
    btnCloseEraserSize.addEventListener('click', (e) => {
      e.stopPropagation();
      eraserSizePopover.classList.add('hidden');
    });
  }

  eraserPresetChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const sz = parseInt(chip.dataset.size, 10);
      updateEraserSize(sz);
      playTone(480, 'sine', 0.04, 0.02);
      if (eraserSizePopover) eraserSizePopover.classList.add('hidden');
    });
  });

  // Pen Colors Popover Toggle
  if (btnPenColors && penColorsPopover) {
    btnPenColors.addEventListener('click', (e) => {
      e.stopPropagation();
      if (penThicknessPopover) penThicknessPopover.classList.add('hidden');
      if (eraserSizePopover) eraserSizePopover.classList.add('hidden');
      if (boardColorsPopover) boardColorsPopover.classList.add('hidden');
      if (doodlesPopover) doodlesPopover.classList.add('hidden');
      if (gifStickersPopover) gifStickersPopover.classList.add('hidden');
      penColorsPopover.classList.toggle('hidden');
      playTone(500, 'sine', 0.04, 0.02);
    });
  }

  // Board Color Palette Popover Toggle
  if (btnBoardPalette && boardColorsPopover) {
    btnBoardPalette.addEventListener('click', (e) => {
      e.stopPropagation();
      if (penThicknessPopover) penThicknessPopover.classList.add('hidden');
      if (eraserSizePopover) eraserSizePopover.classList.add('hidden');
      if (penColorsPopover) penColorsPopover.classList.add('hidden');
      if (doodlesPopover) doodlesPopover.classList.add('hidden');
      if (gifStickersPopover) gifStickersPopover.classList.add('hidden');
      boardColorsPopover.classList.toggle('hidden');
      playTone(500, 'sine', 0.04, 0.02);
    });
  }

  // Doodles & Stickers Popover Toggle
  if (btnDoodles && doodlesPopover) {
    btnDoodles.addEventListener('click', (e) => {
      e.stopPropagation();
      doodlesPopover.classList.toggle('hidden');
      if (penThicknessPopover) penThicknessPopover.classList.add('hidden');
      if (eraserSizePopover) eraserSizePopover.classList.add('hidden');
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
      if (penThicknessPopover) penThicknessPopover.classList.add('hidden');
      if (eraserSizePopover) eraserSizePopover.classList.add('hidden');
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
      document.documentElement.style.setProperty('--current-pen-color', currentColor);
      if (customColorInput) customColorInput.value = currentColor;
      if (sizeDot) sizeDot.style.backgroundColor = currentColor;
      if (thicknessPreviewDot) thicknessPreviewDot.style.backgroundColor = currentColor;
      if (activePenColorDot) activePenColorDot.style.backgroundColor = currentColor;
      // Automatically switch to pen if currently eraser or resize
      if (currentTool === 'eraser' || currentTool === 'resize') {
        currentTool = 'pen';
        toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === 'pen'));
        if (resizeController) resizeController.classList.add('hidden');
      }
      if (penColorsPopover) penColorsPopover.classList.add('hidden');
      playTone(520, 'sine', 0.05, 0.03);
    });
  });

  if (customColorInput) {
    customColorInput.addEventListener('input', (e) => {
      currentColor = e.target.value;
      document.documentElement.style.setProperty('--current-pen-color', currentColor);
      colorSwatches.forEach(s => s.classList.remove('active'));
      if (sizeDot) sizeDot.style.backgroundColor = currentColor;
      if (thicknessPreviewDot) thicknessPreviewDot.style.backgroundColor = currentColor;
      if (activePenColorDot) activePenColorDot.style.backgroundColor = currentColor;
      if (currentTool === 'eraser' || currentTool === 'resize') {
        currentTool = 'pen';
        toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === 'pen'));
        if (resizeController) resizeController.classList.add('hidden');
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

  // Duster Button (Wipe Active Page Clean Instantly)
  if (btnDuster) {
    btnDuster.addEventListener('click', () => {
      if (!currentRoom) return;
      lastLocalActionTime = Date.now();
      const clearedTime = Date.now();
      pageClearedTimestamps[currentPage] = clearedTime;
      localStorage.setItem(`vb_cleared_p${currentPage}_${currentRoom}`, clearedTime.toString());
      completedStrokes.forEach(s => {
        if ((s.page || 1) === currentPage) deletedStrokeIds.add(s.id);
      });
      saveDeletedState(currentRoom);

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

  // Tapping room code button opens room modal to switch or enter new room code
  const roomPillEl = document.getElementById('btn-room-code') || document.querySelector('.room-pill, .room-pill-btn');
  if (roomPillEl) {
    roomPillEl.style.cursor = 'pointer';
    roomPillEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openRoomSwitchModal();
    });
  }

  // Active Users Badge tap shows toast
  const usersBadgeEl = document.getElementById('users-badge');
  if (usersBadgeEl) {
    usersBadgeEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const countText = userCountEl ? userCountEl.textContent : '1 Online';
      showToast(`👥 Room ${currentRoom || ''}: ${countText}`);
      playTone(580, 'sine', 0.05, 0.03);
    });
  }

  // Leave / Change Room Button (if present)
  if (leaveRoomBtn) {
    leaveRoomBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openRoomSwitchModal();
    });
  }

  // Close Room Modal Button
  if (closeRoomModalBtn) {
    closeRoomModalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentRoom) {
        if (roomModal) roomModal.classList.add('hidden');
      }
    });
  }

  // Dismiss modal if user clicks backdrop while in an active room
  if (roomModal) {
    roomModal.addEventListener('click', (e) => {
      if (e.target === roomModal && currentRoom) {
        roomModal.classList.add('hidden');
      }
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
