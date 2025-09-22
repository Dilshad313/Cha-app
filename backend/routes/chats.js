import express from 'express';
import {
    getUserChats,
    getOrCreateChat,
    sendMessage,
    getChatMessages,
    createGroupChat,
    renameGroup,
    updateGroupIcon,
    addToGroup,
    removeFromGroup,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    markAsRead
} from '../controllers/chatController.js';
import authMiddleware from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

// Individual chats
router.get('/', authMiddleware, getUserChats);
router.get('/:userId', authMiddleware, getOrCreateChat);
router.post('/:chatId/message', authMiddleware, upload.single('image'), sendMessage);
router.get('/:chatId/messages', authMiddleware, getChatMessages);

// Group chats
router.post('/group', authMiddleware, createGroupChat);
router.put('/group/:chatId/rename', authMiddleware, renameGroup);
router.put('/group/:chatId/icon', authMiddleware, upload.single('groupIcon'), updateGroupIcon);
router.put('/group/:chatId/add', authMiddleware, addToGroup);
router.put('/group/:chatId/remove', authMiddleware, removeFromGroup);


// Message actions
router.put('/:chatId/message/:messageId', authMiddleware, editMessage);
router.delete('/:chatId/message/:messageId', authMiddleware, deleteMessage);
router.post('/:chatId/message/:messageId/reaction', authMiddleware, addReaction);
router.delete('/:chatId/message/:messageId/reaction', authMiddleware, removeReaction);
router.post('/:chatId/read', authMiddleware, markAsRead);


export default router;