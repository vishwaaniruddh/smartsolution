const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// Enable CORS for Express REST endpoints
app.use(cors({
  origin: '*', // Allow all in development. Update for production if needed.
  methods: ['GET', 'POST']
}));
app.use(express.json());

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000
});

// Middleware for JWT authorization of socket connections
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  
  if (!token) {
    return next(new Error('Authentication error: Token required'));
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.user_id) {
      return next(new Error('Authentication error: Invalid payload'));
    }
    
    socket.userId = decoded.user_id;
    socket.userRole = decoded.role;
    next();
  } catch (err) {
    console.error('Socket authentication failed:', err.message);
    return next(new Error('Authentication error: Invalid or expired token'));
  }
});

// Map to track online status (userId -> Set of socketIds)
const activeUsers = new Map();

io.on('connection', (socket) => {
  const userId = String(socket.userId);
  console.log(`User connected: ID: ${userId} (Role: ${socket.userRole}) [Socket: ${socket.id}]`);
  
  // Track active socket connection
  if (!activeUsers.has(userId)) {
    activeUsers.set(userId, new Set());
  }
  activeUsers.get(userId).add(socket.id);
  
  // Join a room unique to this user ID so we can broadcast to all their open tabs
  socket.join(`user_${userId}`);
  
  // Broadcast online presence to other clients
  socket.broadcast.emit('user_online', { userId, status: 'online' });
  
  // WebRTC Call Signaling Events
  
  // 1. Initiate a call
  socket.on('call-user', (data) => {
    const { offer, isVideo, callerName } = data;
    const userToCall = String(data.userToCall);
    console.log(`[Call] User ${userId} is calling User ${userToCall}`);
    
    // Check if target user is online
    if (activeUsers.has(userToCall) && activeUsers.get(userToCall).size > 0) {
      // Forward the offer to all devices of the target user
      io.to(`user_${userToCall}`).emit('call-made', {
        offer,
        from: userId,
        callerName: callerName || 'Someone',
        isVideo
      });
    } else {
      // Send back a "user-offline" event to the caller
      socket.emit('call-failed', { reason: 'User is offline', to: userToCall });
    }
  });
  
  // 2. Answer a call
  socket.on('make-answer', (data) => {
    const { answer } = data;
    const to = String(data.to);
    console.log(`[Call] User ${userId} answered call from User ${to}`);
    io.to(`user_${to}`).emit('answer-made', {
      answer,
      from: userId
    });
  });
  
  // 3. Candidate ICE exchange
  socket.on('ice-candidate', (data) => {
    const { candidate } = data;
    const to = String(data.to);
    io.to(`user_${to}`).emit('ice-candidate', {
      candidate,
      from: userId
    });
  });
  
  // 4. Reject call
  socket.on('reject-call', (data) => {
    const to = String(data.to);
    console.log(`[Call] User ${userId} rejected call from User ${to}`);
    io.to(`user_${to}`).emit('call-rejected', {
      from: userId
    });
  });
  
  // 5. End call
  socket.on('end-call', (data) => {
    const to = String(data.to);
    console.log(`[Call] User ${userId} ended call with User ${to}`);
    io.to(`user_${to}`).emit('call-ended', {
      from: userId
    });
  });

  // 6. User typing indicators
  socket.on('typing', (data) => {
    const { isTyping } = data;
    const to = String(data.to);
    io.to(`user_${to}`).emit('typing', {
      from: userId,
      isTyping
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ID: ${userId} [Socket: ${socket.id}]`);
    const userSockets = activeUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        activeUsers.delete(userId);
        // Broadcast offline status if no more sockets are connected for this user
        socket.broadcast.emit('user_offline', { userId, status: 'offline' });
      }
    }
  });
});

// Private Webhook API for the PHP backend to relay database updates to sockets
app.post('/api/webhook/new-message', (req, res) => {
  const { message, secret } = req.body;
  
  if (!secret || secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized webhook secret' });
  }
  
  if (!message || !message.sender_id || !message.receiver_id) {
    return res.status(400).json({ success: false, error: 'Invalid message structure' });
  }
  
  const senderId = message.sender_id;
  const receiverId = message.receiver_id;
  
  console.log(`[Webhook] Relaying message from ${senderId} to ${receiverId}`);
  
  // Send the new message to the receiver's room and the sender's room (for sync across multiple devices)
  io.to(`user_${receiverId}`).emit('new_message', message);
  io.to(`user_${senderId}`).emit('new_message', message);
  
  return res.json({ success: true });
});

// Webhook for marking messages as read
app.post('/api/webhook/mark-read', (req, res) => {
  const { sender_id, receiver_id, secret } = req.body;
  
  if (!secret || secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized webhook secret' });
  }
  
  if (!sender_id || !receiver_id) {
    return res.status(400).json({ success: false, error: 'Invalid parameters' });
  }
  
  console.log(`[Webhook] Mark read: sender_id ${sender_id} has been read by receiver_id ${receiver_id}`);
  
  // Notify sender's room that receiver read their messages
  io.to(`user_${sender_id}`).emit('message_read', {
    reader_id: receiver_id
  });
  
  return res.json({ success: true });
});

// Basic Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', online_users: activeUsers.size });
});

server.listen(PORT, () => {
  console.log(`Dhurandhar Socket Server running on port ${PORT}`);
});
