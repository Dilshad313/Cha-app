import express from 'express';
import { getUserChats, getOrCreateChat, sendMessage, getChatMessages, createGroup, addToGroup, removeFromGroup, editMessage, deleteMessage, addReaction, removeReaction, markAsRead } from '../controllers/chatController.js';
import authMiddleware from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

router.get('/', authMiddleware, getUserChats);
router.get('/:userId', authMiddleware, getOrCreateChat);
router.post('/', authMiddleware, createGroup);
router.post('/group/:chatId/add', authMiddleware, addToGroup);
router.post('/group/:chatId/remove', authMiddleware, removeFromGroup);
router.post('/:chatId/message', authMiddleware, upload.single('image'), sendMessage);
router.put('/:chatId/message/:messageId', authMiddleware, editMessage);
router.delete('/:chatId/message/:messageId', authMiddleware, deleteMessage);
router.post('/:chatId/message/:messageId/reaction', authMiddleware, addReaction);
router.delete('/:chatId/message/:messageId/reaction', authMiddleware, removeReaction);
router.post('/:chatId/read', authMiddleware, markAsRead);
router.get('/:chatId/messages', authMiddleware, getChatMessages);

export default router;