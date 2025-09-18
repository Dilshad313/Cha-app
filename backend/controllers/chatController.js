import Chat from '../models/Chat.js';
import User from '../models/User.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

// Get user chats
export const getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .populate('participants', 'username name avatar isOnline lastSeen')
      .sort({ updatedAt: -1 });

    res.json({ success: true, chats });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get or create chat with another user
export const getOrCreateChat = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if chat already exists between these two users
    let chat = await Chat.findOne({
      participants: { $all: [req.user._id, userId] },
      isGroup: false
    }).populate('participants', 'username name avatar isOnline lastSeen');

    // If chat doesn't exist, create a new one
    if (!chat) {
      chat = new Chat({
        participants: [req.user._id, userId],
        messages: []
      });
      await chat.save();
      
      // Populate the participants
      chat = await Chat.findById(chat._id)
        .populate('participants', 'username name avatar isOnline lastSeen');
    }

    res.json({ success: true, chat });
  } catch (error) {
    console.error('Get or create chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send message
export const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;
    let imageUrl = null;

    // If there's a file, upload to Cloudinary
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'chat-app/messages');
      imageUrl = result.secure_url;
    }

    if (!content && !imageUrl) {
      return res.status(400).json({ message: 'Message content or image is required' });
    }

    const message = {
      sender: req.user._id,
      content: content || "",
      image: imageUrl || ""
    };

    const chat = await Chat.findByIdAndUpdate(
      chatId,
      {
        $push: { messages: message },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    )
    .populate('participants', 'username name avatar isOnline lastSeen')
    .populate('messages.sender', 'username name avatar');

    res.json({ success: true, chat, message: chat.messages[chat.messages.length - 1] });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get chat messages
export const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const chat = await Chat.findById(chatId)
      .populate('participants', 'username name avatar isOnline lastSeen')
      .populate('messages.sender', 'username name avatar');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is a participant
    if (!chat.participants.some(p => p._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Paginate messages
    const startIndex = (page - 1) * limit;
    const messages = chat.messages.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      messages,
      totalPages: Math.ceil(chat.messages.length / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getFriendRequests = async (req, res) => {
  try {
    const requests = await Friend.find({ to: req.user._id, status: 'pending' })
      .populate('from', 'username name avatar');

    res.json({ success: true, requests });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get friends
export const getFriends = async (req, res) => {
  try {
    const friends = await User.findById(req.user._id).populate('friends', 'username name avatar isOnline lastSeen');
    res.json({ success: true, friends: friends.friends });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};