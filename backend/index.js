// Enhanced backend/index.js
import dotenv from "dotenv";
// Load environment variables FIRST
dotenv.config();

import express from "express";
import cors from "cors";
import connectDB from "./config/database.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import chatRoutes from "./routes/chats.js";
import { configureCloudinary } from "./config/cloudinary.js";

const app = express();

// Connect to database
connectDB();

// Configure Cloudinary
configureCloudinary();

// Enhanced CORS configuration
const allowedOrigins = [
  'https://real-chat-app-silk.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware to attach io
const attachIO = (req, res, next) => {
  req.io = io;
  next();
};

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chats", attachIO, chatRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    database: "Connected",
    cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? "Configured" : "Not Configured",
    jwt: process.env.JWT_SECRET ? "Configured" : "Using Development Key",
    cors: "Enabled"
  });
});

// Push notifications registration endpoint (placeholder for Web Push/FCM)
app.post("/api/notifications/register", express.json(), async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user._id; // Assuming authMiddleware is used, but for simplicity
    // Store subscription in DB for user
    // e.g., await User.findByIdAndUpdate(userId, { pushSubscription: subscription });
    res.json({ success: true });
  } catch (error) {
    console.error('Notification registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send notification endpoint (placeholder)
app.post("/api/notifications/send", async (req, res) => {
  try {
    const { userId, title, body } = req.body;
    // Implement Web Push or FCM logic here
    // e.g., webpush.sendNotification(subscription, payload);
    res.json({ success: true });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'CORS policy violation' });
  }
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Import http and socket.io
import http from 'http';
import { Server } from 'socket.io';

// Create http server
const server = http.createServer(app);

// Create socket.io server
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket.io middleware for authentication
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import Chat from './models/Chat.js';

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-change-in-production');
    socket.user = await User.findById(decoded.userId).select('-password');
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

const onlineUsers = new Map();

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.user?.name, socket.id);

  // Add user to online users list
  if (socket.user && socket.user._id) {
    const userId = socket.user._id.toString();
    onlineUsers.set(userId, socket.id);
    socket.broadcast.emit('user-online', userId);
  }

  // Send online users list to the new user
  socket.emit('online-users', Array.from(onlineUsers.keys()));

  // Join chat
  socket.on('join-chat', (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.id} joined chat ${chatId}`);
  });

  // Send message
  socket.on('send-message', async ({ chatId, message }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return; // Or handle error
      }

      const newMessage = {
        sender: socket.user._id,
        content: message.content,
        timestamp: new Date(),
        image: message.image // Assuming image is a URL
      };

      chat.messages.push(newMessage);
      await chat.save();

      // Populate sender info before emitting
      const populatedMessage = {
        ...newMessage,
        _id: newMessage._id, // Mongo will add _id
        sender: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar
        }
      };

      io.to(chatId).emit('receive-message', populatedMessage);
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  // Edit message
  socket.on('edit-message', async ({ chatId, messageId, content }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) return;

      const message = chat.messages.id(messageId);
      if (!message || message.sender.toString() !== socket.user._id.toString()) return;

      message.content = content;
      message.edited = true;
      message.editedAt = new Date();
      await chat.save();

      io.to(chatId).emit('message-edited', { messageId, content, edited: true, editedAt: message.editedAt });
    } catch (error) {
      console.error('Error editing message:', error);
    }
  });

  // Delete message
  socket.on('delete-message', async ({ chatId, messageId }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) return;

      const message = chat.messages.id(messageId);
      if (!message || message.sender.toString() !== socket.user._id.toString()) return;

      message.deleted = true;
      message.content = '[Message deleted]';
      await chat.save();

      io.to(chatId).emit('message-deleted', { messageId });
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  });

  // Add reaction
  socket.on('add-reaction', async ({ chatId, messageId, reaction }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) return;

      const message = chat.messages.id(messageId);
      if (!message) return;

      if (!message.reactions) message.reactions = {};
      if (!message.reactions[reaction]) message.reactions[reaction] = [];
      if (!message.reactions[reaction].includes(socket.user._id)) {
        message.reactions[reaction].push(socket.user._id);
      }
      await chat.save();

      io.to(chatId).emit('reaction-added', { messageId, reaction, userId: socket.user._id });
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  });

  // Remove reaction
  socket.on('remove-reaction', async ({ chatId, messageId, reaction }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) return;

      const message = chat.messages.id(messageId);
      if (!message || !message.reactions?.[reaction]) return;

      message.reactions[reaction] = message.reactions[reaction].filter(
        id => id.toString() !== socket.user._id.toString()
      );

      if (message.reactions[reaction].length === 0) {
        delete message.reactions[reaction];
      }
      await chat.save();

      io.to(chatId).emit('reaction-removed', { messageId, reaction, userId: socket.user._id });
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  });

  // Mark as read
  socket.on('mark-read', async ({ chatId, messageIds }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) return;

      messageIds.forEach(msgId => {
        const message = chat.messages.id(msgId);
        if (message && !message.readBy?.some(r => r.user.toString() === socket.user._id.toString())) {
          if (!message.readBy) message.readBy = [];
          message.readBy.push({ user: socket.user._id, readAt: new Date() });
        }
      });
      await chat.save();

      socket.to(chatId).emit('messages-read', { messageIds, userId: socket.user._id });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  });

  // Typing indicator
  socket.on('typing', ({ chatId, isTyping }) => {
    socket.to(chatId).emit('user-typing', { userId: socket.user._id.toString(), isTyping, chatId });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.user && socket.user._id) {
      const userId = socket.user._id.toString();
      onlineUsers.delete(userId);
      socket.broadcast.emit('user-offline', userId);
    }
  });
});


server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export the app for Vercel
export default app;