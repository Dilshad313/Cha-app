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

export const getChatMedia = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    const media = chat.messages.filter(m => m.image).map(m => ({ url: m.image, timestamp: m.timestamp }));
    res.json({ success: true, media });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

router.get('/:chatId/media', authMiddleware, getChatMedia);


export default router;