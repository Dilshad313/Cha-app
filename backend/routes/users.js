import express from 'express';
import { getProfile, updateProfile, searchUsers, getUserById, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, getFriendRequests, getFriends } from '../controllers/userController.js';
import authMiddleware from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, upload.single('avatar'), updateProfile);
router.get('/search', authMiddleware, searchUsers);
router.get('/:id', authMiddleware, getUserById);
router.post('/:id/friend-request', authMiddleware, sendFriendRequest);
router.post('/friend-request/:requestId/accept', authMiddleware, acceptFriendRequest);
router.post('/friend-request/:requestId/reject', authMiddleware, rejectFriendRequest);
router.get('/friend-requests', authMiddleware, getFriendRequests);
router.get('/friends', authMiddleware, getFriends);

export default router;