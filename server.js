const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

// Global CORS and JSON body parser for Vercel and cross-origin mobile clients
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json({ limit: '10mb' }));

// Vercel KV / Upstash Redis support for 100% free serverless global state
async function saveRoomToKV(code, roomData) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  try {
    const payload = Array.isArray(roomData) ? { strokes: roomData, activePage: 1 } : roomData;
    await fetch(`${url}/set/room:${code}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
  } catch (e) {}
}

async function getRoomFromKV(code) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/get/room:${code}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data && data.result) {
      const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      if (Array.isArray(parsed)) {
        return { strokes: parsed, activePage: 1 };
      }
      return parsed;
    }
  } catch (e) {}
  return null;
}

function getUniqueUserCount(room) {
  if (!room || !room.users) return 0;
  const uniqueDevices = new Set();
  for (const user of room.users.values()) {
    uniqueDevices.add(user.deviceId || user.id);
  }
  return uniqueDevices.size;
}

// Health check endpoint for cloud uptime monitoring & pinging
app.get('/health', (req, res) => {
  res.json({ status: 'ok', platform: process.env.VERCEL ? 'vercel' : 'node', uptime: process.uptime(), timestamp: Date.now() });
});
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Dual-channel room sync API (HTTP Polling fallback & Vercel serverless support)
app.get('/api/room/:code', async (req, res) => {
  const code = sanitizeRoomCode(req.params.code);
  let room = rooms.get(code);
  if (!room) {
    const kvData = await getRoomFromKV(code);
    if (kvData) {
      room = getOrCreateRoom(code).room;
      if (Array.isArray(kvData.strokes)) room.strokes = kvData.strokes;
      if (kvData.activePage) room.activePage = kvData.activePage;
    }
  }
  if (!room) {
    return res.json({ roomCode: code, strokes: [], activePage: 1, userCount: 0, timestamp: Date.now() });
  }
  res.json({
    roomCode: code,
    strokes: room.strokes,
    activePage: room.activePage || 1,
    userCount: getUniqueUserCount(room),
    timestamp: Date.now()
  });
});

// HTTP REST stroke ingestion (100% reliable on Vercel Serverless)
app.post('/api/room/:code/stroke', (req, res) => {
  const code = sanitizeRoomCode(req.params.code);
  const stroke = req.body;
  if (!code || !stroke || !stroke.id) {
    return res.status(400).json({ error: 'Invalid stroke data' });
  }
  const { room } = getOrCreateRoom(code);
  if (!stroke.page) {
    stroke.page = room.activePage || 1;
  }
  stroke.fadeDuration = 999999999;
  stroke.createdAt = stroke.createdAt || Date.now();
  stroke.endedAt = stroke.endedAt || Date.now();

  const existingIdx = room.strokes.findIndex(s => s.id === stroke.id);
  if (existingIdx >= 0) {
    room.strokes[existingIdx] = stroke;
  } else {
    room.strokes.push(stroke);
  }
  saveRoomToKV(code, { strokes: room.strokes, activePage: room.activePage || 1 });
  saveRoomsToDisk();
  io.to(code).emit('stroke-end', { strokeId: stroke.id, fullStroke: stroke });
  broadcastRoomToSSE(code);
  res.json({ success: true, strokeCount: room.strokes.length, activePage: room.activePage || 1 });
});

// HTTP REST page change
app.post('/api/room/:code/page', (req, res) => {
  const code = sanitizeRoomCode(req.params.code);
  const page = Math.max(1, Math.min(5, parseInt(req.body?.page, 10) || 1));
  const { room } = getOrCreateRoom(code);
  room.activePage = page;
  saveRoomToKV(code, { strokes: room.strokes, activePage: page });
  saveRoomsToDisk();
  io.to(code).emit('page-changed', { page, byUser: req.body?.byUser || 'User' });
  broadcastRoomToSSE(code);
  res.json({ success: true, activePage: page });
});

// HTTP REST clear canvas (supports clearing only target page)
app.post('/api/room/:code/clear', (req, res) => {
  const code = sanitizeRoomCode(req.params.code);
  const { room } = getOrCreateRoom(code);
  const targetPage = req.body?.page ? parseInt(req.body.page, 10) : null;
  if (targetPage) {
    room.strokes = room.strokes.filter(s => (s.page || 1) !== targetPage);
  } else {
    room.strokes = [];
  }
  saveRoomToKV(code, { strokes: room.strokes, activePage: room.activePage || 1 });
  saveRoomsToDisk();
  io.to(code).emit('canvas-cleared', { byUser: req.body?.byUser || 'User', page: targetPage });
  broadcastRoomToSSE(code);
  res.json({ success: true, cleared: true, page: targetPage });
});

// HTTP REST delete single stroke
app.post('/api/room/:code/stroke/delete', (req, res) => {
  const code = sanitizeRoomCode(req.params.code);
  const strokeId = req.body?.strokeId;
  if (!code || !strokeId) return res.status(400).json({ error: 'Missing params' });
  const { room } = getOrCreateRoom(code);
  room.strokes = room.strokes.filter(s => s.id !== strokeId);
  saveRoomToKV(code, { strokes: room.strokes, activePage: room.activePage || 1 });
  saveRoomsToDisk();
  io.to(code).emit('stroke-deleted', { strokeId });
  broadcastRoomToSSE(code);
  res.json({ success: true, strokeId, remaining: room.strokes.length });
});

// Real-Time Server-Sent Events (SSE) Stream for 24/7 background widget sync
const sseClients = new Map(); // roomCode -> Set of res

app.get('/api/room/:code/live', (req, res) => {
  const code = sanitizeRoomCode(req.params.code);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  res.write(': connected\n\n');

  if (!sseClients.has(code)) {
    sseClients.set(code, new Set());
  }
  const set = sseClients.get(code);
  set.add(res);

  // Send current room strokes and activePage immediately on connect
  const room = rooms.get(code);
  const initialData = JSON.stringify({
    strokes: room ? room.strokes : [],
    activePage: room ? (room.activePage || 1) : 1,
    userCount: room ? room.users.size : 1
  });
  res.write(`data: ${initialData}\n\n`);

  // Heartbeat ping every 20s to keep connection open through cloud proxies
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (e) {}
  }, 20000);

  req.on('close', () => {
    clearInterval(pingInterval);
    set.delete(res);
    if (set.size === 0) sseClients.delete(code);
  });
});

function broadcastRoomToSSE(roomCode) {
  if (!roomCode) return;
  const set = sseClients.get(roomCode);
  if (!set || set.size === 0) return;
  const room = rooms.get(roomCode);
  const payload = JSON.stringify({
    strokes: room ? room.strokes : [],
    activePage: room ? (room.activePage || 1) : 1,
    userCount: room ? room.users.size : 1
  });
  const msg = `data: ${payload}\n\n`;
  for (const clientRes of set) {
    try {
      clientRes.write(msg);
    } catch (err) {
      set.delete(clientRes);
    }
  }
}

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// Palette of vibrant colors for participant cursors and user tags
const USER_COLORS = [
  '#00f5d4', // Bright cyan
  '#ff007f', // Hot pink
  '#fee440', // Bright yellow
  '#7000ff', // Vivid purple
  '#00bbf9', // Neon blue
  '#ff595e', // Coral red
  '#52b788', // Mint green
  '#ff9e00'  // Bright orange
];

const fs = require('fs');
const BACKUP_FILE = process.env.VERCEL ? path.join('/tmp', 'rooms_backup.json') : path.join(__dirname, 'rooms_backup.json');

// In-memory room tracking
// roomCode -> { users: Map(socketId => { id, name, color }), strokes: [], activePage: 1 }
const rooms = new Map();

function loadRoomsFromDisk() {
  try {
    if (fs.existsSync(BACKUP_FILE)) {
      const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
      const data = JSON.parse(raw);
      for (const [code, roomObj] of Object.entries(data)) {
        rooms.set(code, {
          users: new Map(),
          strokes: Array.isArray(roomObj.strokes) ? roomObj.strokes.filter(s => s && s.mode !== 'eraser') : [],
          activePage: roomObj.activePage || 1
        });
      }
      console.log(`[Persistence] Restored ${rooms.size} rooms from backup.`);
    }
  } catch (err) {
    console.warn('[Persistence] Could not load backup:', err.message);
  }
}

let saveBackupTimeout = null;
function saveRoomsToDisk() {
  clearTimeout(saveBackupTimeout);
  saveBackupTimeout = setTimeout(() => {
    try {
      const data = {};
      for (const [code, room] of rooms.entries()) {
        data[code] = {
          strokes: room.strokes,
          activePage: room.activePage || 1
        };
      }
      fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.warn('[Persistence] Could not save backup:', e.message);
    }
  }, 400);
}

// Load persisted room data immediately on startup
loadRoomsFromDisk();

function getRandomColor() {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

function sanitizeRoomCode(raw) {
  if (!raw) return '';
  return String(raw)
    .toUpperCase()
    .trim()
    .replace(/['"`]/g, '-')
    .replace(/[–—_]/g, '-')
    .replace(/[^A-Z0-9-]/g, '');
}

function getOrCreateRoom(roomCode) {
  const code = sanitizeRoomCode(roomCode);
  if (!rooms.has(code)) {
    rooms.set(code, {
      users: new Map(),
      strokes: [],
      activePage: 1
    });
  }
  return { code, room: rooms.get(code) };
}

// NOTE: Auto-expiration has been removed. Strokes across all 5 pages stay 100% permanent
// and are only removed if the user explicitly clears the page with the Duster button.

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentUser = null;
  console.log(`[Socket] Connected: ${socket.id}`);

  // Handle room joining
  socket.on('join-room', (payload, ack) => {
    if (!payload || !payload.roomCode) {
      if (typeof ack === 'function') ack({ success: false, error: 'Missing room code' });
      return;
    }
    const cleanCode = String(payload.roomCode).toUpperCase().trim();
    const userName = payload.userName;
    const deviceId = payload.deviceId || socket.id;

    // Leave any previous room
    if (currentRoom) {
      socket.leave(currentRoom);
      const prevRoomData = rooms.get(currentRoom);
      if (prevRoomData) {
        prevRoomData.users.delete(socket.id);
        const uniqueCount = getUniqueUserCount(prevRoomData);
        const hasOtherSocket = Array.from(prevRoomData.users.values()).some(u => u.deviceId === deviceId);
        if (!hasOtherSocket) {
          io.to(currentRoom).emit('user-left', {
            socketId: socket.id,
            userName: currentUser?.name,
            remainingCount: uniqueCount,
            users: Array.from(prevRoomData.users.values())
          });
        }
      }
    }

    // Join new room
    const { code, room } = getOrCreateRoom(cleanCode);
    currentRoom = code;
    socket.join(code);

    // DEDUPLICATE: Check if this room already has an active socket from the same deviceId
    let replacedExistingUser = false;
    for (const [existingSocketId, existingUser] of room.users.entries()) {
      if (existingUser.deviceId === deviceId && existingSocketId !== socket.id) {
        console.log(`[Socket] Replacing dangling socket ${existingSocketId} for device ${deviceId}`);
        const oldSocket = io.sockets.sockets.get(existingSocketId);
        if (oldSocket) {
          oldSocket.leave(code);
          oldSocket.disconnect(true);
        }
        room.users.delete(existingSocketId);
        replacedExistingUser = true;
      }
    }

    currentUser = {
      id: socket.id,
      deviceId: deviceId,
      name: (userName && userName.trim()) || `Artist #${Math.floor(100 + Math.random() * 900)}`,
      color: getRandomColor()
    };
    room.users.set(socket.id, currentUser);

    // Send the joiner their identity, active page, and all permanent strokes
    const now = Date.now();
    const activeStrokes = room.strokes;
    const uniqueCount = getUniqueUserCount(room);

    const responseData = {
      roomCode: code,
      user: currentUser,
      activeStrokes,
      activePage: room.activePage || 1,
      serverTime: now,
      totalCount: uniqueCount,
      users: Array.from(room.users.values())
    };

    socket.emit('joined-room-success', responseData);
    if (typeof ack === 'function') {
      ack({ success: true, roomCode: code, activePage: room.activePage || 1 });
    }
    console.log(`[Socket] User ${currentUser.name} (${socket.id}, dev:${deviceId}) joined room "${code}" (Online: ${uniqueCount})`);

    // Notify other peers in room
    if (!replacedExistingUser) {
      socket.to(code).emit('user-joined', {
        user: currentUser,
        totalCount: uniqueCount,
        users: Array.from(room.users.values())
      });
    } else {
      io.to(code).emit('user-count-updated', {
        totalCount: uniqueCount
      });
    }
  });

  // Stroke initiation
  socket.on('stroke-start', (strokeData) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    // Attach verified server timestamp, permanent lifespan, and page
    const fullStroke = {
      ...strokeData,
      page: strokeData.page || room.activePage || 1,
      userId: socket.id,
      fadeDuration: 999999999,
      createdAt: strokeData.createdAt || Date.now()
    };

    room.strokes.push(fullStroke);

    // Broadcast to everyone else in the room
    socket.to(currentRoom).emit('stroke-start', fullStroke);
    broadcastRoomToSSE(currentRoom);
  });

  let lastSseBroadcastTime = 0;

  // Stroke point appending (streaming live as drawing happens)
  socket.on('stroke-point', (data) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    // Append to server stroke history if exists
    const stroke = room.strokes.find(s => s.id === data.strokeId);
    if (stroke && data.point) {
      stroke.points.push(data.point);
    }

    socket.to(currentRoom).emit('stroke-point', data);

    const now = Date.now();
    if (now - lastSseBroadcastTime > 150) {
      lastSseBroadcastTime = now;
      broadcastRoomToSSE(currentRoom);
    }
  });

  // Stroke completed
  socket.on('stroke-end', (data) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (room && data && data.fullStroke) {
      const strokePage = data.fullStroke.page || room.activePage || 1;
      const existingIndex = room.strokes.findIndex(s => s.id === data.strokeId);
      const strokeObj = {
        ...data.fullStroke,
        page: strokePage,
        userId: socket.id,
        fadeDuration: 999999999,
        createdAt: data.fullStroke.createdAt || Date.now()
      };
      if (existingIndex !== -1) {
        room.strokes[existingIndex] = strokeObj;
      } else {
        room.strokes.push(strokeObj);
      }
      saveRoomToKV(currentRoom, { strokes: room.strokes, activePage: room.activePage || 1 });
      saveRoomsToDisk();
    }
    if (data && data.fullStroke) {
      data.fullStroke.fadeDuration = 999999999;
      if (!data.fullStroke.page && room) data.fullStroke.page = room.activePage || 1;
    }
    socket.to(currentRoom).emit('stroke-end', data);
    broadcastRoomToSSE(currentRoom);
  });

  // Handle multi-page switching
  socket.on('page-change', (data) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    const newPage = Math.max(1, Math.min(5, parseInt(data?.page, 10) || 1));
    room.activePage = newPage;
    saveRoomToKV(currentRoom, { strokes: room.strokes, activePage: newPage });
    saveRoomsToDisk();
    socket.to(currentRoom).emit('page-changed', {
      page: newPage,
      userId: socket.id,
      userName: currentUser?.name
    });
    broadcastRoomToSSE(currentRoom);
  });

  // Live remote cursor tracking
  socket.on('cursor-move', (coords) => {
    if (!currentRoom || !currentUser) return;
    socket.to(currentRoom).emit('cursor-update', {
      userId: socket.id,
      name: currentUser.name,
      color: currentUser.color,
      x: coords.x,
      y: coords.y
    });
  });

  // Manual canvas clear (supports target page)
  socket.on('clear-canvas', (data) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (room) {
      const targetPage = data?.page ? parseInt(data.page, 10) : (room.activePage || 1);
      room.strokes = room.strokes.filter(s => (s.page || 1) !== targetPage);
      saveRoomToKV(currentRoom, { strokes: room.strokes, activePage: room.activePage || 1 });
      saveRoomsToDisk();
      io.to(currentRoom).emit('canvas-cleared', { byUser: currentUser?.name, page: targetPage });
      broadcastRoomToSSE(currentRoom);
    }
  });

  // Real-time single stroke deletion
  socket.on('stroke-delete', (data) => {
    if (!currentRoom || !data?.strokeId) return;
    const room = rooms.get(currentRoom);
    if (room) {
      room.strokes = room.strokes.filter(s => s.id !== data.strokeId);
      saveRoomToKV(currentRoom, { strokes: room.strokes, activePage: room.activePage || 1 });
      saveRoomsToDisk();
      socket.to(currentRoom).emit('stroke-deleted', { strokeId: data.strokeId });
      broadcastRoomToSSE(currentRoom);
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        const userLeaving = room.users.get(socket.id);
        room.users.delete(socket.id);
        const uniqueCount = getUniqueUserCount(room);
        const hasOtherSocket = userLeaving && Array.from(room.users.values()).some(u => u.deviceId === userLeaving.deviceId);
        if (!hasOtherSocket) {
          socket.to(currentRoom).emit('user-left', {
            socketId: socket.id,
            userName: userLeaving?.name || currentUser?.name,
            remainingCount: uniqueCount,
            users: Array.from(room.users.values())
          });
        } else {
          io.to(currentRoom).emit('user-count-updated', {
            totalCount: uniqueCount
          });
        }
      }
    }
  });
});

if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`VanishBoard real-time canvas server running at http://localhost:${PORT}`);
  });
}

module.exports = server;
module.exports.app = app;

