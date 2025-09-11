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

export default app;
