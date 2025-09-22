import Chat from '../models/Chat.js';
import User from '../models/User.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

// Get user chats
export const getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .populate('participants', 'username name avatar isOnline lastSeen')
      .populate('messages.sender', 'username name avatar')
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

// Create group chat
export const createGroupChat = async (req, res) => {
  try {
    const { chatName, participants } = req.body;

    if (!chatName || !participants || !Array.isArray(participants) || participants.length < 1) {
      return res.status(400).json({ message: 'Group name and at least one participant are required.' });
    }

    const group = new Chat({
      chatName,
      participants: [...participants, req.user._id],
      isGroupChat: true,
      groupAdmin: req.user._id,
    });

    await group.save();
    const fullGroupChat = await Chat.findById(group._id)
        .populate('participants', '-password')
        .populate('groupAdmin', '-password');

    fullGroupChat.participants.forEach(p => {
        if(p._id.toString() !== req.user._id.toString()) {
            req.io.to(p._id.toString()).emit('new-group-chat', fullGroupChat);
        }
    });

    res.status(201).json({ success: true, group: fullGroupChat });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Rename group
export const renameGroup = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { chatName } = req.body;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not the admin of this group' });
    }

    chat.chatName = chatName;
    await chat.save();

    req.io.to(chatId).emit('group-updated', { chatId, chatName });

    res.json({ success: true, chat });
  } catch (error) {
    console.error('Rename group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update group icon
export const updateGroupIcon = async (req, res) => {
    try {
        const { chatId } = req.params;
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        if (chat.groupAdmin.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You are not authorized to change the group icon' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const result = await uploadToCloudinary(req.file.buffer, 'chat-app/group-icons');
        chat.groupIcon = result.secure_url;

        await chat.save();

        req.io.to(chatId).emit('group-updated', { chatId, groupIcon: chat.groupIcon });

        res.json({ success: true, chat });

    } catch (error) {
        console.error('Update group icon error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Add user to group
export const addToGroup = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not the admin of this group' });
    }

    if(chat.participants.includes(userId)){
        return res.status(400).json({ message: 'User already in group' });
    }

    chat.participants.push(userId);
    await chat.save();

    const fullChat = await Chat.findById(chatId)
        .populate('participants', '-password')
        .populate('groupAdmin', '-password');

    req.io.to(chatId).emit('group-updated', { chatId, participants: fullChat.participants });

    res.json({ success: true, chat: fullChat });
  } catch (error) {
    console.error('Add to group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove user from group
export const removeFromGroup = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not the admin of this group' });
    }

    chat.participants = chat.participants.filter(p => p.toString() !== userId);
    await chat.save();

    const fullChat = await Chat.findById(chatId)
        .populate('participants', '-password')
        .populate('groupAdmin', '-password');

    req.io.to(chatId).emit('group-updated', { chatId, participants: fullChat.participants });


    res.json({ success: true, chat: fullChat });
  } catch (error) {
    console.error('Remove from group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// edit message
export const editMessage = async (req, res) => {
    try {
        const { chatId, messageId } = req.params;
        const { content } = req.body;
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        const message = chat.messages.id(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }
        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You can only edit your own messages' });
        }
        message.content = content;
        message.edited = true;
        message.editedAt = new Date();
        await chat.save();
        res.json({ success: true, message });
    } catch (error) {
        console.error('Edit message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// delete message
export const deleteMessage = async (req, res) => {
    try {
        const { chatId, messageId } = req.params;
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        const message = chat.messages.id(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }
        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You can only delete your own messages' });
        }
        message.deleted = true;
        await chat.save();
        res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// add reaction
export const addReaction = async (req, res) => {
    try {
        const { chatId, messageId } = req.params;
        const { reaction } = req.body;
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        const message = chat.messages.id(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }
        if (!message.reactions.get(reaction)) {
            message.reactions.set(reaction, []);
        }
        message.reactions.get(reaction).push(req.user._id);
        await chat.save();
        res.json({ success: true, message });
    } catch (error) {
        console.error('Add reaction error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// remove reaction
export const removeReaction = async (req, res) => {
    try {
        const { chatId, messageId } = req.params;
        const { reaction } = req.body;
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        const message = chat.messages.id(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }
        if (!message.reactions.get(reaction)) {
            return res.status(404).json({ message: 'Reaction not found' });
        }
        message.reactions.set(reaction, message.reactions.get(reaction).filter(userId => userId.toString() !== req.user._id.toString()));
        if (message.reactions.get(reaction).length === 0) {
            message.reactions.delete(reaction);
        }
        await chat.save();
        res.json({ success: true, message });
    } catch (error) {
        console.error('Remove reaction error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// mark as read
export const markAsRead = async (req, res) => {
    try {
        const { chatId } = req.params;
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }
        chat.messages.forEach(message => {
            if (!message.readBy.some(r => r.user.toString() === req.user._id.toString())) {
                message.readBy.push({ user: req.user._id, readAt: new Date() });
            }
        });
        await chat.save();
        res.json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};