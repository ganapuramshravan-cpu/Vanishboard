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
async function saveRoomToKV(code, strokes) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  try {
    await fetch(`${url}/set/room:${code}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(strokes)
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
      return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
    }
  } catch (e) {}
  return null;
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
  if (!room || room.strokes.length === 0) {
    const kvStrokes = await getRoomFromKV(code);
    if (kvStrokes && Array.isArray(kvStrokes) && kvStrokes.length > 0) {
      if (!room) room = getOrCreateRoom(code).room;
      room.strokes = kvStrokes;
    }
  }
  if (!room) {
    return res.json({ roomCode: code, strokes: [], userCount: 0, timestamp: Date.now() });
  }
  res.json({
    roomCode: code,
    strokes: room.strokes,
    userCount: room.users.size,
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
  const existingIdx = room.strokes.findIndex(s => s.id === stroke.id);
  if (existingIdx >= 0) {
    room.strokes[existingIdx] = stroke;
  } else {
    room.strokes.push(stroke);
  }
  saveRoomToKV(code, room.strokes);
  io.to(code).emit('stroke-end', { strokeId: stroke.id, fullStroke: stroke });
  broadcastRoomToSSE(code);
  res.json({ success: true, strokeCount: room.strokes.length });
});

// HTTP REST clear canvas
app.post('/api/room/:code/clear', (req, res) => {
  const code = sanitizeRoomCode(req.params.code);
  const { room } = getOrCreateRoom(code);
  room.strokes = [];
  saveRoomToKV(code, []);
  io.to(code).emit('canvas-cleared', { byUser: req.body?.byUser || 'User' });
  broadcastRoomToSSE(code);
  res.json({ success: true, cleared: true });
});

// Real-Time Server-Sent Events (SSE) Stream for 24/7 background widget sync
const sseClients = new Map(); // roomCode -> Set of res

app.get('/api/room/:code/live', (req, res) => {
  const code = sanitizeRoomCode(req.params.code);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  if (!sseClients.has(code)) {
    sseClients.set(code, new Set());
  }
  const set = sseClients.get(code);
  set.add(res);

  // Send current room strokes immediately on connect
  const room = rooms.get(code);
  const initialData = JSON.stringify({ strokes: room ? room.strokes : [], userCount: room ? room.users.size : 1 });
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
  const payload = JSON.stringify({ strokes: room ? room.strokes : [], userCount: room ? room.users.size : 1 });
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

// In-memory room tracking
// roomCode -> { users: Map(socketId => { id, name, color }), strokes: [] }
const rooms = new Map();

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
      strokes: []
    });
  }
  return { code, room: rooms.get(code) };
}

// Periodically clean up expired strokes from server storage
setInterval(() => {
  const now = Date.now();
  for (const [code, roomData] of rooms.entries()) {
    // Keep only strokes that haven't fully expired yet
    roomData.strokes = roomData.strokes.filter(stroke => {
      const expirationTime = stroke.createdAt + (stroke.fadeDuration * 1000) + 2000; // 2s buffer
      return now < expirationTime;
    });

    // Remove empty rooms after 1 hour of no users
    if (roomData.users.size === 0 && roomData.strokes.length === 0) {
      rooms.delete(code);
    }
  }
}, 5000);

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

    // Leave any previous room
    if (currentRoom) {
      socket.leave(currentRoom);
      const prevRoomData = rooms.get(currentRoom);
      if (prevRoomData) {
        prevRoomData.users.delete(socket.id);
        io.to(currentRoom).emit('user-left', {
          socketId: socket.id,
          remainingCount: prevRoomData.users.size,
          users: Array.from(prevRoomData.users.values())
        });
      }
    }

    // Join new room
    const { code, room } = getOrCreateRoom(cleanCode);
    currentRoom = code;
    socket.join(code);

    currentUser = {
      id: socket.id,
      name: (userName && userName.trim()) || `Artist #${Math.floor(100 + Math.random() * 900)}`,
      color: getRandomColor()
    };
    room.users.set(socket.id, currentUser);

    // Send the joiner their identity and active strokes that have not yet faded
    const now = Date.now();
    const activeStrokes = room.strokes.filter(s => {
      return (now - s.createdAt) < (s.fadeDuration * 1000);
    });

    const responseData = {
      roomCode: code,
      user: currentUser,
      activeStrokes,
      serverTime: now,
      users: Array.from(room.users.values())
    };

    socket.emit('joined-room-success', responseData);
    if (typeof ack === 'function') {
      ack({ success: true, roomCode: code });
    }
    console.log(`[Socket] User ${currentUser.name} (${socket.id}) joined room "${code}"`);

    // Notify other peers in room
    socket.to(code).emit('user-joined', {
      user: currentUser,
      totalCount: room.users.size,
      users: Array.from(room.users.values())
    });
  });

  // Stroke initiation
  socket.on('stroke-start', (strokeData) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    // Attach verified server timestamp and permanent lifespan
    const fullStroke = {
      ...strokeData,
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
      const existingIndex = room.strokes.findIndex(s => s.id === data.strokeId);
      const strokeObj = {
        ...data.fullStroke,
        userId: socket.id,
        fadeDuration: 999999999,
        createdAt: data.fullStroke.createdAt || Date.now()
      };
      if (existingIndex !== -1) {
        room.strokes[existingIndex] = strokeObj;
      } else {
        room.strokes.push(strokeObj);
      }
    }
    if (data && data.fullStroke) {
      data.fullStroke.fadeDuration = 999999999;
    }
    socket.to(currentRoom).emit('stroke-end', data);
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

  // Manual canvas clear
  socket.on('clear-canvas', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (room) {
      room.strokes = [];
    }
    io.to(currentRoom).emit('canvas-cleared', { byUser: currentUser?.name });
    broadcastRoomToSSE(currentRoom);
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.users.delete(socket.id);
        socket.to(currentRoom).emit('user-left', {
          socketId: socket.id,
          userName: currentUser?.name,
          remainingCount: room.users.size,
          users: Array.from(room.users.values())
        });
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

