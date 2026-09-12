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

  // Keyboard Text Typing Tool Elements
  const textInputOverlay = document.getElementById('text-input-overlay');
  const canvasTextInput = document.getElementById('canvas-text-input');
  const submitTextBtn = document.getElementById('submit-text-btn');
  const cancelTextBtn = document.getElementById('cancel-text-btn');
  const fontSizeChips = document.querySelectorAll('.font-size-chip');

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
  const CLOUD_URL = 'https://vanishboard.onrender.com';
  const PUBLIC_URL = CLOUD_URL;
  const DEFAULT_SERVER = isWebProtocol ? window.location.origin : PUBLIC_URL;
  let savedUrl = localStorage.getItem('vb_server_url');
  // Auto-upgrade from temporary trycloudflare URL to permanent 24/7 Render Cloud URL
  if (savedUrl && savedUrl.includes('trycloudflare.com')) {
    savedUrl = CLOUD_URL;
    localStorage.setItem('vb_server_url', CLOUD_URL);
  }
  let activeServerUrl = savedUrl || DEFAULT_SERVER;

  // Socket.IO Setup with reliable fallback transports
  let socket = io(activeServerUrl, {
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 25,
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
  let currentTool = 'pen'; // 'pen' | 'text' | 'doodle' | 'glow' | 'eraser'
  let currentColor = '#18181b';
  let currentBrushSize = 3;
  let currentFadeDuration = 999999999; // Sticky board stays permanent until Duster is used
  let currentFontSize = 26;
  let textTargetPosition = null;
  let activeDoodle = null;
  let currentStroke = null;

  function stampDoodle(icon, x = 0.5, y = 0.45) {
    if (!currentRoom) return;
    const doodleStroke = {
      id: `doodle-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'doodle',
      icon: icon,
      x: x,
      y: y,
      size: 56,
      createdAt: Date.now(),
      endedAt: Date.now(),
      fadeDuration: currentFadeDuration
    };
    completedStrokes.push(doodleStroke);
    socket.emit('stroke-end', {
      strokeId: doodleStroke.id,
      fullStroke: doodleStroke
    });
    syncWidgetCanvas(true);
    playTone(660, 'sine', 0.08, 0.04);
  }

  // Stroke Storage
  // Each stroke: { id, points: [{x, y}], color, width, mode, fadeDuration, createdAt, endedAt }
  let completedStrokes = [];
  const remoteActiveStrokes = new Map(); // strokeId -> stroke
  const remoteCursors = new Map(); // userId -> DOM element

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

  // Room Navigation
  let joinTimeout = null;

  function joinRoom(roomCode) {
    if (!roomCode) return;
    const cleanCode = sanitizeRoomCode(roomCode);
    if (!cleanCode) return;
    const userName = (usernameInput && usernameInput.value.trim()) || undefined;

    getAudioContext(); // Unlock audio on user action

    // Update UI button state
    if (joinRoomBtn) {
      joinRoomBtn.disabled = true;
      joinRoomBtn.textContent = 'Joining...';
    }

    if (!isSocketConnected) {
      joinPendingCode = cleanCode;
      showToast('Connecting to server... please wait a moment.');
      return;
    }

    // Safety timeout in case server doesn't respond
    clearTimeout(joinTimeout);
    joinTimeout = setTimeout(() => {
      if (joinRoomBtn) {
        joinRoomBtn.disabled = false;
        joinRoomBtn.textContent = 'Join';
      }
      showToast('Could not reach server. Please check your network or server URL.');
    }, 6000);

    socket.emit('join-room', { roomCode: cleanCode, userName }, (res) => {
      if (res && res.error) {
        clearTimeout(joinTimeout);
        if (joinRoomBtn) {
          joinRoomBtn.disabled = false;
          joinRoomBtn.textContent = 'Join';
        }
        showToast(`Error: ${res.error}`);
      }
    });

    // Update URL without page reload
    try {
      const url = new URL(window.location);
      url.searchParams.set('room', cleanCode);
      window.history.pushState({}, '', url);
    } catch (e) {}
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
      completedStrokes.push(stroke);
      remoteActiveStrokes.delete(data.strokeId);
      syncWidgetCanvas(true);
    }
  });

  socket.on('canvas-cleared', (data) => {
    completedStrokes = [];
    remoteActiveStrokes.clear();
    syncWidgetCanvas(true);
    playClearWhoosh();
    showToast(data.byUser ? `${data.byUser} cleared the board` : 'Board cleared');
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

  // Pointer Event Listeners
  window.addEventListener('pointerdown', (e) => {
    // Ignore clicks on UI overlays, popovers, and text modal
    if (e.target.closest('#top-bar, #tool-dock, #room-modal, #pen-colors-popover, #board-colors-popover, #doodles-popover, #text-input-overlay, .toast')) return;
    if (!currentRoom) return;

    // Dismiss open color and doodle popovers when clicking on canvas
    if (penColorsPopover) penColorsPopover.classList.add('hidden');
    if (boardColorsPopover) boardColorsPopover.classList.add('hidden');
    if (doodlesPopover) doodlesPopover.classList.add('hidden');

    // If Doodle stamp tool is active, stamp doodle at tapped spot
    if (currentTool === 'doodle' && activeDoodle) {
      const pt = getCanvasCoords(e);
      stampDoodle(activeDoodle, pt.x, pt.y);
      showToast(`Stamped ${activeDoodle}`);
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
          setTimeout(() => canvasTextInput.focus(), 50);
        }
      }
      return;
    }

    if (canvas.setPointerCapture && e.pointerId !== undefined) {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }

    isDrawing = true;
    const pt = getCanvasCoords(e);
    const strokeId = `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    currentStroke = {
      id: strokeId,
      points: [pt],
      color: currentTool === 'eraser' ? '#fef9c3' : currentColor,
      width: currentBrushSize,
      mode: currentTool,
      fadeDuration: currentFadeDuration,
      createdAt: Date.now(),
      endedAt: null
    };

    socket.emit('stroke-start', currentStroke);
    emitCursorPosition(e.clientX, e.clientY);
  });

  window.addEventListener('pointermove', (e) => {
    if (!currentRoom) return;
    emitCursorPosition(e.clientX, e.clientY);

    if (!isDrawing || !currentStroke) return;

    const pt = getCanvasCoords(e);
    currentStroke.points.push(pt);

    socket.emit('stroke-point', {
      strokeId: currentStroke.id,
      point: pt
    });
  });

  function stopDrawing(e) {
    if (!isDrawing || !currentStroke) return;
    isDrawing = false;

    if (canvas.releasePointerCapture && e && e.pointerId !== undefined) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    }

    currentStroke.endedAt = Date.now();
    completedStrokes.push(currentStroke);

    socket.emit('stroke-end', {
      strokeId: currentStroke.id,
      fullStroke: currentStroke
    });
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

    const now = Date.now();

    // 1. Filter out expired strokes
    completedStrokes = completedStrokes.filter(s => {
      const end = s.endedAt || s.localReceivedAt || s.createdAt || now;
      const elapsed = (now - end) / 1000;
      return elapsed < s.fadeDuration;
    });

    // 2. Render completed strokes with smooth opacity decay
    for (let i = 0; i < completedStrokes.length; i++) {
      const s = completedStrokes[i];
      const end = s.endedAt || s.localReceivedAt || s.createdAt || now;
      const elapsed = (now - end) / 1000;
      const progress = elapsed / s.fadeDuration;

      // Opacity Curve: stays 100% solid for the first 35% of time, then smoothly fades to 0
      let opacity = 1.0;
      if (progress > 0.35) {
        opacity = Math.max(0, 1.0 - (progress - 0.35) / 0.65);
      }

      renderStroke(s, opacity);
    }

    // 3. Render active remote strokes (100% opacity)
    remoteActiveStrokes.forEach(s => {
      renderStroke(s, 1.0);
    });

    // 4. Render active local stroke (100% opacity)
    if (currentStroke) {
      renderStroke(currentStroke, 1.0);
    }

    // 5. Sync to Android Home Screen Widget
    if (completedStrokes.length > 0 || remoteActiveStrokes.size > 0 || currentStroke !== null) {
      syncWidgetCanvas(false);
    } else if (hasActiveStrokesLastCheck) {
      syncWidgetCanvas(true);
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

  function syncWidgetCanvas(force = false) {
    if (!window.AndroidBridge) {
      return;
    }

    const now = Date.now();
    // Force updates execute immediately (0ms delay); continuous strokes throttled to 80ms
    if (!force && now - lastWidgetSyncTime < 80) {
      return;
    }
    lastWidgetSyncTime = now;

    const allStrokes = [...completedStrokes, ...remoteActiveStrokes.values()];
    if (currentStroke) allStrokes.push(currentStroke);

    if (allStrokes.length === 0) {
      if (hasActiveStrokesLastCheck) {
        hasActiveStrokesLastCheck = false;
        if (typeof window.AndroidBridge.updateWidgetPreview === 'function') {
          window.AndroidBridge.updateWidgetPreview('');
        }
        if (typeof window.AndroidBridge.updateWidgetStrokes === 'function') {
          window.AndroidBridge.updateWidgetStrokes('[]');
        }
      }
      return;
    }

    hasActiveStrokesLastCheck = true;

    // 1. Instant Native Android Canvas Rendering (Ultra fast, sub-millisecond, zero Base64 overhead)
    if (typeof window.AndroidBridge.updateWidgetStrokes === 'function') {
      try {
        window.AndroidBridge.updateWidgetStrokes(JSON.stringify(allStrokes));
      } catch (err) {
        console.warn('[NativeWidgetSync] Error:', err);
      }
    }

    // 2. HTML5 Canvas Fallback Rendering
    if (typeof window.AndroidBridge.updateWidgetPreview === 'function') {
    try {
      widgetCtx.clearRect(0, 0, WIDGET_SIZE, WIDGET_SIZE);

      // Cropped sticky note paper writable area:
      // Below the red pushpin (top 16%) and above the curled bottom corner
      const paperLeft = WIDGET_SIZE * 0.10;
      const paperTop = WIDGET_SIZE * 0.16;
      const paperWidth = WIDGET_SIZE * 0.82;
      const paperHeight = WIDGET_SIZE * 0.74;

      // Smart Content Centering: Calculate content bounds to fill paper naturally
      let minX = 1.0, maxX = 0.0, minY = 1.0, maxY = 0.0;
      let hasContent = false;

      for (let i = 0; i < allStrokes.length; i++) {
        const s = allStrokes[i];
        if (s.type === 'text') {
          hasContent = true;
          const sx = s.x || 0.1;
          const sy = s.y || 0.2;
          const charCount = (s.text || '').length;
          const lineCount = (s.text || '').split('\n').length;
          const estW = Math.min(0.85, (charCount * 22) / canvasWidth);
          const estH = Math.min(0.6, (lineCount * 36) / canvasHeight);
          minX = Math.min(minX, sx);
          maxX = Math.max(maxX, sx + estW);
          minY = Math.min(minY, sy);
          maxY = Math.max(maxY, sy + estH);
        } else if (s.type === 'doodle') {
          hasContent = true;
          const sx = s.x || 0.5;
          const sy = s.y || 0.45;
          const estHalf = 0.08;
          minX = Math.min(minX, sx - estHalf);
          maxX = Math.max(maxX, sx + estHalf);
          minY = Math.min(minY, sy - estHalf);
          maxY = Math.max(maxY, sy + estHalf);
        } else if (s.points && s.points.length > 0) {
          hasContent = true;
          for (let p = 0; p < s.points.length; p++) {
            const pt = s.points[p];
            minX = Math.min(minX, pt.x);
            maxX = Math.max(maxX, pt.x);
            minY = Math.min(minY, pt.y);
            maxY = Math.max(maxY, pt.y);
          }
        }
      }

      if (!hasContent) {
        minX = 0; maxX = 1; minY = 0; maxY = 1;
      }

      // Safe content dimensions with minimum baseline bounds to avoid jumpiness
      const spanX = Math.max(0.35, maxX - minX);
      const spanY = Math.max(0.35, maxY - minY);
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;

      const cw = canvasWidth || window.innerWidth || 360;
      const ch = canvasHeight || window.innerHeight || 640;

      // Uniform aspect ratio scaling: ensures circles never stretch into ellipses
      const contentPxW = spanX * cw;
      const contentPxH = spanY * ch;
      const S = Math.min((paperWidth * 0.88) / contentPxW, (paperHeight * 0.88) / contentPxH);

      // Center the content right onto the paper area
      const paperCenterX = paperLeft + paperWidth / 2;
      const paperCenterY = paperTop + paperHeight / 2;
      const offsetX = paperCenterX - (midX * cw) * S;
      const offsetY = paperCenterY - (midY * ch) * S;

      // Draw each stroke or text note directly onto the sticky note with crisp lines
      for (let sIdx = 0; sIdx < allStrokes.length; sIdx++) {
        const s = allStrokes[sIdx];

        // Render typed text note on widget (Large, bold, highly legible)
        if (s.type === 'text') {
          if (!s.text) continue;
          widgetCtx.save();
          widgetCtx.globalAlpha = 1.0;
          let baseSize = s.fontSize || 26;
          if (baseSize <= 20) baseSize = 26;
          else if (baseSize <= 30) baseSize = 36;
          else baseSize = 48;
          const scaledFontSize = Math.max(24, Math.round(baseSize * Math.min(1.4, Math.max(0.9, S))));
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

        const dataUrl = widgetOffscreenCanvas.toDataURL('image/png');
        window.AndroidBridge.updateWidgetPreview(dataUrl);
      } catch (err) {
        console.warn('[WidgetSync] Error:', err);
      }
    }
  }

  // Periodic background sync: ensures widget stays updated within seconds even when app is in background
  setInterval(() => {
    if (window.AndroidBridge && (completedStrokes.length > 0 || remoteActiveStrokes.size > 0 || hasActiveStrokesLastCheck)) {
      syncWidgetCanvas(false);
    }
  }, 1000);

  // Dual-channel background sync: Poll server for remote updates every 1 second
  setInterval(async () => {
    if (!currentRoom || !activeServerUrl) return;
    try {
      const res = await fetch(`${activeServerUrl}/api/room/${encodeURIComponent(currentRoom)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.strokes)) {
        if (data.strokes.length === 0 && completedStrokes.length > 0) {
          completedStrokes = [];
          remoteActiveStrokes.clear();
          syncWidgetCanvas(true);
        } else if (data.strokes.length > 0) {
          const remoteLen = data.strokes.length;
          const localLen = completedStrokes.length;
          const remotePtCount = data.strokes.reduce((acc, s) => acc + (s.points ? s.points.length : 1), 0);
          const localPtCount = completedStrokes.reduce((acc, s) => acc + (s.points ? s.points.length : 1), 0);

          if (remoteLen !== localLen || remotePtCount !== localPtCount) {
            completedStrokes = data.strokes.map(s => ({
              ...s,
              fadeDuration: 999999999,
              endedAt: s.endedAt || Date.now()
            }));
            syncWidgetCanvas(true);
          }
        }
      }
    } catch (e) {
      // Network silent fallback
    }
  }, 1000);

  requestAnimationFrame(animationLoop);

  // UI Event Bindings
  // Tool Modes (Pen, Text, Glow, Eraser)
  toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toolBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.dataset.tool;
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
      playTone(520, 'sine', 0.04, 0.02);
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

  // Duster Button (Wipe Board Clean Instantly)
  if (btnDuster) {
    btnDuster.addEventListener('click', () => {
      if (!currentRoom) return;
      completedStrokes = [];
      remoteActiveStrokes.clear();
      currentStroke = null;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      socket.emit('clear-canvas');
      syncWidgetCanvas(true);
      playClearWhoosh();
      showToast('Board wiped clean!');
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
        text: text,
        x: textTargetPosition ? textTargetPosition.x : 0.15,
        y: textTargetPosition ? textTargetPosition.y : 0.25,
        color: currentColor,
        fontSize: currentFontSize,
        fadeDuration: currentFadeDuration,
        createdAt: Date.now(),
        endedAt: Date.now()
      };
      completedStrokes.push(textStroke);
      socket.emit('stroke-end', {
        strokeId: textStroke.id,
        fullStroke: textStroke
      });
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

  // Copy Room Link Button
  copyLinkBtn.addEventListener('click', async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      showToast('Room link copied to clipboard!');
      playTone(700, 'sine', 0.08, 0.04);
    } catch (err) {
      // Fallback
      prompt('Copy this room URL:', window.location.href);
    }
  });

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
        roomModal.classList.add('hidden');
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
  createRoomBtn.addEventListener('click', () => {
    const code = generateRoomCode();
    joinRoom(code);
  });

  if (joinRoomForm) {
    joinRoomForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = roomCodeInput.value.trim();
      if (!code) {
        roomCodeInput.focus();
        return;
      }
      joinRoom(code);
    });
  } else if (joinRoomBtn) {
    joinRoomBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const code = roomCodeInput.value.trim();
      if (!code) {
        roomCodeInput.focus();
        return;
      }
      joinRoom(code);
    });
  }

  roomCodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      if (joinRoomForm) {
        joinRoomForm.requestSubmit ? joinRoomForm.requestSubmit() : joinRoomBtn.click();
      } else {
        joinRoomBtn.click();
      }
    }
  });

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
      showToast('Connecting to ' + newUrl + '...');
      setTimeout(() => {
        window.location.reload();
      }, 400);
    });
  }

  // Widget Direct Tap Handler
  window.onWidgetTapDraw = function() {
    if (currentRoom) {
      // Already connected to a room, ensure canvas is visible
      roomModal.classList.add('hidden');
      topBar.classList.remove('hidden');
      toolDock.classList.remove('hidden');
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
  const savedRoom = localStorage.getItem('vb_last_room');

  if (roomParam) {
    roomCodeInput.value = roomParam.toUpperCase();
    joinRoom(roomParam);
  } else if (savedRoom) {
    roomCodeInput.value = savedRoom;
    joinRoom(savedRoom);
  } else if (!isWebProtocol || window.AndroidBridge) {
    // In Android App, automatically create room so user can draw instantly!
    const initialCode = generateRoomCode();
    roomCodeInput.value = initialCode;
    joinRoom(initialCode);
  }
})();
