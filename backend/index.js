import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

// Import configurations, DB connection, models
import { JWT_SECRET } from "./config/auth.js";
import connectDB from "./config/database.js";
import User from "./models/User.js";
import Chat from "./models/Chat.js";

// For file uploads in messages
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const server = http.createServer(app);

// Allowed origins for CORS
const allowedOrigins = [
  "https://real-chat-app-silk.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
];

// Middleware Setup
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Initialize socket.io with CORS and ping configurations
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Socket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token || token === "undefined" || token === "null") {
      return next(new Error("Authentication error: No token provided"));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    if (!user)
      return next(new Error("Authentication error: User not found"));

    socket.user = user;
    socket.userId = user._id.toString();
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError")
      return next(new Error("Authentication error: Invalid token"));
    if (error.name === "TokenExpiredError")
      return next(new Error("Authentication error: Token expired"));
    return next(new Error("Authentication error"));
  }
});

// In-memory maps to track online users and sockets
const onlineUsers = new Map();
const userSockets = new Map();

io.on("connection", (socket) => {
  console.log(`✅ New connection: ${socket.id}, User: ${socket.user?.name}`);

  // Store this user's socket connection
  if (!userSockets.has(socket.userId)) {
    userSockets.set(socket.userId, new Set());
  }
  userSockets.get(socket.userId).add(socket.id);
  onlineUsers.set(socket.userId, { user: socket.user, socketId: socket.id, connectedAt: new Date() });

  // Notify all clients about the online users list
  io.emit("online-users", Array.from(onlineUsers.keys()));
  socket.emit("user-status", { status: "online", userId: socket.userId });

  // Join user personal room for direct messages
  socket.join(socket.userId);

  // Join chats rooms user belongs to
  socket.on("join-chats", (chatIds) => {
    chatIds.forEach((chatId) => {
      socket.join(chatId);
      console.log(`User ${socket.userId} joined chat ${chatId}`);
    });
  });

  // Join a specific chat room
  socket.on("join-chat", (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.userId} joined chat ${chatId}`);
  });

  // Sending text message, with optional image (base64 or URL)
  socket.on("send-message", async (data) => {
    try {
      const { chatId, content, image, tempId } = data;
      if (!chatId) return;

      const chat = await Chat.findById(chatId).populate("participants");
      if (!chat || !chat.participants.some((p) => p._id.toString() === socket.userId)) {
        return socket.emit("error", { message: "Chat not found or access denied" });
      }

      // Create new message object
      const newMessage = {
        sender: socket.userId,
        content: content || "",
        image: image || "",
        timestamp: new Date(),
        readBy: [{ user: socket.userId, readAt: new Date() }],
      };

      // Push and save message
      chat.messages.push(newMessage);
      chat.updatedAt = new Date();
      await chat.save();

      // Prepare message with populated sender info
      const populatedMsg = {
        ...newMessage,
        _id: chat.messages[chat.messages.length - 1]._id,
        sender: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
      };

      // Emit message to all chat participants
      io.to(chatId).emit("receive-message", { ...populatedMsg, chatId, tempId });

      // Notify participants not currently in chat (personal rooms)
      chat.participants.forEach((participant) => {
        if (participant._id.toString() !== socket.userId) {
          io.to(participant._id.toString()).emit("new-message-notification", {
            chatId,
            message: populatedMsg,
          });
        }
      });
    } catch (err) {
      console.error("Error sending message:", err);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Typing indicator event
  socket.on("typing", ({ chatId, isTyping }) => {
    socket.to(chatId).emit("user-typing", {
      userId: socket.userId,
      isTyping,
      chatId,
      userName: socket.user.name,
    });
  });

  // Edit a message event
  socket.on("edit-message", async ({ chatId, messageId, content }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) return;

      const message = chat.messages.id(messageId);
      if (!message || message.sender.toString() !== socket.userId) {
        return socket.emit("error", { message: "Message not found or unauthorized" });
      }

      message.content = content;
      message.edited = true;
      message.editedAt = new Date();
      await chat.save();

      io.to(chatId).emit("message-edited", {
        messageId,
        content,
        edited: true,
        editedAt: message.editedAt,
      });
    } catch (error) {
      console.error("Error editing message:", error);
      socket.emit("error", { message: "Failed to edit message" });
    }
  });

  // Delete a message event (soft delete)
  socket.on("delete-message", async ({ chatId, messageId }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) return;

      const message = chat.messages.id(messageId);
      if (!message || message.sender.toString() !== socket.userId) {
        return socket.emit("error", { message: "Message not found or unauthorized" });
      }

      message.deleted = true;
      message.content = "[Message deleted]";
      await chat.save();

      io.to(chatId).emit("message-deleted", { messageId });
    } catch (error) {
      console.error("Error deleting message:", error);
      socket.emit("error", { message: "Failed to delete message" });
    }
  });

  // Reaction events (add/remove)
  socket.on("add-reaction", async ({ chatId, messageId, reaction }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) return;

      const message = chat.messages.id(messageId);
      if (!message) return;

      if (!message.reactions) message.reactions = new Map();
      if (!message.reactions.has(reaction)) message.reactions.set(reaction, []);
      const users = message.reactions.get(reaction);
      if (!users.includes(socket.userId)) {
        users.push(socket.userId);
        await chat.save();

        io.to(chatId).emit("reaction-added", {
          messageId,
          reaction,
          userId: socket.userId,
        });
      }
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  });

  socket.on("remove-reaction", async ({ chatId, messageId, reaction }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) return;

      const message = chat.messages.id(messageId);
      if (!message || !message.reactions) return;

      const users = message.reactions.get(reaction);
      if (users) {
        message.reactions.set(
          reaction,
          users.filter((id) => id.toString() !== socket.userId)
        );

        if (message.reactions.get(reaction).length === 0) {
          message.reactions.delete(reaction);
        }

        await chat.save();

        io.to(chatId).emit("reaction-removed", {
          messageId,
          reaction,
          userId: socket.userId,
        });
      }
    } catch (error) {
      console.error("Error removing reaction:", error);
    }
  });

  // Mark messages as read for read receipts
  socket.on("mark-read", async ({ chatId, messageIds }) => {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat) return;

      messageIds.forEach((messageId) => {
        const message = chat.messages.id(messageId);
        if (message && !message.readBy.some((r) => r.user.toString() === socket.userId)) {
          message.readBy.push({ user: socket.userId, readAt: new Date() });
        }
      });

      await chat.save();

      socket.to(chatId).emit("messages-read", {
        messageIds,
        userId: socket.userId,
      });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  });

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    console.log(`❌ Disconnected: ${socket.id}, User: ${socket.userId}, Reason: ${reason}`);

    if (userSockets.has(socket.userId)) {
      const userSocketSet = userSockets.get(socket.userId);
      userSocketSet.delete(socket.id);

      // If no sockets remain, user is offline
      if (userSocketSet.size === 0) {
        onlineUsers.delete(socket.userId);
        userSockets.delete(socket.userId);
        io.emit("user-offline", socket.userId);
        console.log(`User ${socket.userId} is now offline`);
      }
    }
  });

  // Handle socket error events
  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    database: "Connected",
    timestamp: new Date().toISOString(),
  });
});

// Import your route files and use them here (example)
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import chatRoutes from "./routes/chats.js";

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);

// Middleware to attach io instance to requests for use in controllers if needed
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
