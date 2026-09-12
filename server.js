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

// Health check endpoint for cloud uptime monitoring & pinging
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});
app.get('/ping', (req, res) => {
  res.send('pong');
});

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

    // Attach verified server timestamp
    const fullStroke = {
      ...strokeData,
      userId: socket.id,
      createdAt: strokeData.createdAt || Date.now()
    };

    room.strokes.push(fullStroke);

    // Broadcast to everyone else in the room
    socket.to(currentRoom).emit('stroke-start', fullStroke);
  });

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
        createdAt: data.fullStroke.createdAt || Date.now()
      };
      if (existingIndex !== -1) {
        room.strokes[existingIndex] = strokeObj;
      } else {
        room.strokes.push(strokeObj);
      }
    }
    socket.to(currentRoom).emit('stroke-end', data);
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

server.listen(PORT, () => {
  console.log(`VanishBoard real-time canvas server running at http://localhost:${PORT}`);
});
