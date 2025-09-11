import dotenv from "dotenv";
// Load environment variables FIRST
dotenv.config();

import express from "express";
import cors from "cors";
import connectDB from "./config/database.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import chatRoutes from "./routes/chats.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { testCloudinaryConnection, configureCloudinary } from "./config/cloudinary.js";
import { verifyToken } from "./config/auth.js";
import User from "./models/User.js";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Connect to database
connectDB();

// Configure and test Cloudinary
configureCloudinary();

// Test Cloudinary connection after a short delay
setTimeout(() => {
  testCloudinaryConnection();
}, 1000);

// Middleware
app.use(cors());
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
    jwt: process.env.JWT_SECRET ? "Configured" : "Using Development Key"
  });
});

// Socket.io for real-time messaging with authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new Error('Authentication error'));
    }
    
    socket.userId = user._id.toString();
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.userId);

  // Join user personal room
  socket.join(socket.userId);

  // Join chat room
  socket.on("join-chat", (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.userId} joined chat: ${chatId}`);
  });

  // Send message
  socket.on("send-message", async (data) => {
    try {
      // Save message to database first (this would be handled by your API)
      // Then broadcast to all users in the chat
      socket.to(data.chatId).emit("receive-message", {
        ...data.message,
        sender: socket.userId,
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

  // Typing indicator
  socket.on("typing", (data) => {
    socket.to(data.chatId).emit("user-typing", {
      userId: socket.userId,
      isTyping: data.isTyping
    });
  });

  // User online status
  socket.on("user-online", async () => {
    try {
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastSeen: new Date()
      });
      console.log(`User ${socket.userId} is online`);
    } catch (error) {
      console.error("Error updating online status:", error);
    }
  });

  // Disconnect
  socket.on("disconnect", async () => {
    try {
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date()
      });
      console.log("❌ User disconnected:", socket.userId);
    } catch (error) {
      console.error("Error updating offline status:", error);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
  console.log(`☁️ Cloudinary Cloud: ${process.env.CLOUDINARY_CLOUD_NAME || "Not configured"}`);
  console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? "Configured" : "Using Development Key"}`);
});