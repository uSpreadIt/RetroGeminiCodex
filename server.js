import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files from dist folder
app.use(express.static(join(__dirname, 'dist')));

// In-memory storage for sessions (per team)
const sessions = new Map(); // sessionId -> session data
const teamMembers = new Map(); // sessionId -> Set of socket IDs

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join a session room
  socket.on('join-session', ({ sessionId, userId, userName }) => {
    socket.join(sessionId);
    socket.sessionId = sessionId;
    socket.userId = userId;
    socket.userName = userName;

    // Track members in this session
    if (!teamMembers.has(sessionId)) {
      teamMembers.set(sessionId, new Map());
    }
    teamMembers.get(sessionId).set(socket.id, { id: userId, name: userName });

    // Send current session state to the new joiner
    if (sessions.has(sessionId)) {
      socket.emit('session-update', sessions.get(sessionId));
    }

    // Notify others that someone joined
    socket.to(sessionId).emit('member-joined', { userId, userName });

    console.log(`User ${userName} joined session ${sessionId}`);
  });

  // Update session data
  socket.on('update-session', (sessionData) => {
    const sessionId = socket.sessionId;
    if (!sessionId) return;

    // Store and broadcast to all clients in the session
    sessions.set(sessionId, sessionData);
    socket.to(sessionId).emit('session-update', sessionData);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const sessionId = socket.sessionId;
    if (sessionId && teamMembers.has(sessionId)) {
      teamMembers.get(sessionId).delete(socket.id);

      // Notify others
      socket.to(sessionId).emit('member-left', {
        userId: socket.userId,
        userName: socket.userName
      });
    }
    console.log('Client disconnected:', socket.id);
  });
});

// Handle SPA routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
