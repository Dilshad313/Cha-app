import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './config/auth.js';
import connectDB from "./config/database.js";
import User from './models/User.js';
import Chat from './models/Chat.js';

const app = express();
const server = http.createServer(app);

// CORS configuration
const allowedOrigins = [
  'https://real-chat-app-silk.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Socket.io with enhanced configuration
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token || token === 'undefined' || token === 'null') {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.user = user;
    socket.userId = user._id.toString();
    next();
  } catch (error) {
    console.error('Socket auth error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Authentication error: Invalid token'));
    }
    
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'));
    }
    
    return next(new Error('Authentication error'));
  }
});

// Store online users and their socket connections
const onlineUsers = new Map();
const userSockets = new Map();

io.on('connection', (socket) => {
  console.log(`✅ New connection: ${socket.id}, User: ${socket.user?.name} (${socket.userId})`);

  // Add user to online users
  onlineUsers.set(socket.userId, {
    userId: socket.userId,
    socketId: socket.id,
    user: socket.user,
    connectedAt: new Date()
  });

  // Store user's socket
  if (!userSockets.has(socket.userId)) {
    userSockets.set(socket.userId, new Set());
  }
  userSockets.get(socket.userId).add(socket.id);

  // Notify all clients about online users
  const onlineUserIds = Array.from(onlineUsers.keys());
  io.emit('online-users', onlineUserIds);
  socket.emit('user-status', { status: 'online', userId: socket.userId });

  // Join user to their personal room for targeted messages
  socket.join(socket.userId);

  // Join all user's chats
  socket.on('join-chats', async (chatIds) => {
    chatIds.forEach(chatId => {
      socket.join(chatId);
      console.log(`User ${socket.userId} joined chat ${chatId}`);
    });
  });

  // Handle joining a specific chat
  socket.on('join-chat', (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.userId} joined chat ${chatId}`);
  });

  // Handle sending messages
  socket.on('send-message', async (data) => {
    try {
      const { chatId, content, image, tempId } = data;
      
      // Validate chat access
      const chat = await Chat.findById(chatId).populate('participants');
      if (!chat || !chat.participants.some(p => p._id.toString() === socket.userId)) {
        return socket.emit('error', { message: 'Chat not found or access denied' });
      }

      // Create new message
      const newMessage = {
        sender: socket.userId,
        content: content || '',
        image: image || '',
        timestamp: new Date(),
        readBy: [{ user: socket.userId, readAt: new Date() }]
      };

      // Add to database
      chat.messages.push(newMessage);
      chat.updatedAt = new Date();
      await chat.save();

      // Populate the message with sender info
      const populatedMessage = {
        ...newMessage.toObject ? newMessage.toObject() : newMessage,
        _id: chat.messages[chat.messages.length - 1]._id,
        sender: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar
        }
      };

      // Emit to all participants in the chat
      io.to(chatId).emit('receive-message', { ...populatedMessage, chatId, tempId });

      // Notify participants who are not in the chat
      chat.participants.forEach(participant => {
        if (participant._id.toString() !== socket.userId) {
          io.to(participant._id.toString()).emit('new-message-notification', {
            chatId,
            message: populatedMessage
          });
        }
      });

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const { chatId, isTyping } = data;
    socket.to(chatId).emit('user-typing', {
      userId: socket.userId,
      isTyping,
      chatId,
      userName: socket.user.name
    });
  });

  // Handle message editing
  socket.on('edit-message', async (data) => {
    try {
      const { chatId, messageId, content } = data;

      const chat = await Chat.findById(chatId);
      if (!chat) return;

      const message = chat.messages.id(messageId);
      if (!message || message.sender.toString() !== socket.userId) {
        return socket.emit('error', { message: 'Message not found or unauthorized' });
      }

      message.content = content;
      message.edited = true;
      message.editedAt = new Date();
      await chat.save();

      io.to(chatId).emit('message-edited', {
        messageId,
        content,
        edited: true,
        editedAt: message.editedAt
      });

    } catch (error) {
      console.error('Error editing message:', error);
      socket.emit('error', { message: 'Failed to edit message' });
    }
  });

  // Handle message deletion
  socket.on('delete-message', async (data) => {
    try {
      const { chatId, messageId } = data;

      const chat = await Chat.findById(chatId);
      if (!chat) return;

      const message = chat.messages.id(messageId);
      if (!message || message.sender.toString() !== socket.userId) {
        return socket.emit('error', { message: 'Message not found or unauthorized' });
      }

      message.deleted = true;
      message.content = '[Message deleted]';
      await chat.save();

      io.to(chatId).emit('message-deleted', { messageId });

    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit('error', { message: 'Failed to delete message' });
    }
  });

  // Handle reactions
  socket.on('add-reaction', async (data) => {
    try {
      const { chatId, messageId, reaction } = data;

      const chat = await Chat.findById(chatId);
      if (!chat) return;

      const message = chat.messages.id(messageId);
      if (!message) return;

      if (!message.reactions) message.reactions = new Map();
      if (!message.reactions.get(reaction)) {
        message.reactions.set(reaction, []);
      }

      const reactionUsers = message.reactions.get(reaction);
      if (!reactionUsers.includes(socket.userId)) {
        reactionUsers.push(socket.userId);
        await chat.save();

        io.to(chatId).emit('reaction-added', {
          messageId,
          reaction,
          userId: socket.userId
        });
      }

    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  });

  socket.on('remove-reaction', async (data) => {
    try {
      const { chatId, messageId, reaction } = data;

      const chat = await Chat.findById(chatId);
      if (!chat) return;

      const message = chat.messages.id(messageId);
      if (!message || !message.reactions) return;

      const reactionUsers = message.reactions.get(reaction);
      if (reactionUsers) {
        message.reactions.set(
          reaction,
          reactionUsers.filter(id => id.toString() !== socket.userId)
        );

        if (message.reactions.get(reaction).length === 0) {
          message.reactions.delete(reaction);
        }

        await chat.save();

        io.to(chatId).emit('reaction-removed', {
          messageId,
          reaction,
          userId: socket.userId
        });
      }

    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  });

  // Handle read receipts
  socket.on('mark-read', async (data) => {
    try {
      const { chatId, messageIds } = data;

      const chat = await Chat.findById(chatId);
      if (!chat) return;

      messageIds.forEach(messageId => {
        const message = chat.messages.id(messageId);
        if (message && !message.readBy.some(r => r.user.toString() === socket.userId)) {
          message.readBy.push({
            user: socket.userId,
            readAt: new Date()
          });
        }
      });

      await chat.save();

      socket.to(chatId).emit('messages-read', {
        messageIds,
        userId: socket.userId
      });

    } catch (error) {
      console.error('Error marking as read:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`❌ Disconnected: ${socket.id}, User: ${socket.userId}, Reason: ${reason}`);

    // Remove socket from user's sockets
    if (userSockets.has(socket.userId)) {
      const userSocketSet = userSockets.get(socket.userId);
      userSocketSet.delete(socket.id);

      // If no more sockets for this user, mark as offline
      if (userSocketSet.size === 0) {
        onlineUsers.delete(socket.userId);
        userSockets.delete(socket.userId);
        
        io.emit('user-offline', socket.userId);
        console.log(`User ${socket.userId} is now offline`);
      }
    }
  });

  // Error handling
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    database: "Connected",
    timestamp: new Date().toISOString()
  });
});

// Import routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import chatRoutes from "./routes/chats.js";

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);

// Middleware to attach io to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

const PORT = process.env.PORT || 5000;

// Connect to database and start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`✅ Socket.io server initialized`);
  });
});

export default app;