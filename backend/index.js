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
import { JWT_SECRET } from "./config/auth.js";

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

// Socket.io for real-time messaging
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // Join user personal room
  socket.on("join-user", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined personal room`);
  });

  // Join chat room
  socket.on("join-chat", (chatId) => {
    socket.join(chatId);
    console.log(`User joined chat: ${chatId}`);
  });

  // Send message
  socket.on("send-message", ({ chatId, message }) => {
    socket.to(chatId).emit("receive-message", { chatId, message });
  });

  // Typing indicator
  socket.on("typing", ({ chatId, userId, isTyping }) => {
    socket.to(chatId).emit("user-typing", { userId, isTyping });
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
  console.log(`☁️ Cloudinary Cloud: ${process.env.CLOUDINARY_CLOUD_NAME || "Not configured"}`);
  console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? "Configured" : "Using Development Key"}`);
});