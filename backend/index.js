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

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

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

  // Typing indicator
  socket.on('typing', ({ chatId, isTyping }) => {
    socket.to(chatId).emit('user-typing', { userId: socket.id, isTyping });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});


server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export the app for Vercel
export default app;