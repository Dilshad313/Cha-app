import express from 'express';
import { getUserChats, getOrCreateChat, sendMessage, getChatMessages } from '../controllers/chatController.js';
import authMiddleware from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

router.get('/', authMiddleware, getUserChats);
router.get('/:userId', authMiddleware, getOrCreateChat);
router.post('/:chatId/message', authMiddleware, upload.single('image'), sendMessage);
router.get('/:chatId/messages', authMiddleware, getChatMessages);

export default router;