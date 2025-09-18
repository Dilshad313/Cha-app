import User from '../models/User.js';
import Friend from '../models/Friend.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

// Get user profile
export const getProfile = async (req, res) => {
  try {
    res.json({ success: true, user: req.user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile - FIXED VERSION
export const updateProfile = async (req, res) => {
  try {
    const { name, bio } = req.body;
    let avatarUrl = req.user.avatar;

    // If there's a file, upload to Cloudinary
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.buffer);
        avatarUrl = result.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({ message: 'Error uploading image' });
      }
    }

    const updates = { name, bio };
    if (avatarUrl) {
      updates.avatar = avatarUrl;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Search users
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } }
      ],
      _id: { $ne: req.user._id } // Exclude current user
    }).select('username name avatar isOnline lastSeen');

    res.json({ success: true, users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('username name avatar isOnline lastSeen bio');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Friend request
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

export const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('friends', 'username name avatar isOnline lastSeen');
    res.json({ success: true, friends: user.friends });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send friend request
export const sendFriendRequest = async (req, res) => {
  try {
    const { id: toUserId } = req.params;
    const fromUserId = req.user._id;

    if (toUserId.toString() === fromUserId.toString()) {
      return res.status(400).json({ message: "You cannot send a friend request to yourself." });
    }

    // Check if a request already exists or if they are already friends
    const existingRequest = await Friend.findOne({
      $or: [
        { from: fromUserId, to: toUserId },
        { from: toUserId, to: fromUserId },
      ],
    });

    if (existingRequest) {
        if(existingRequest.status === 'accepted'){
            return res.status(400).json({ message: "You are already friends." });
        }
        if(existingRequest.status === 'pending'){
            return res.status(400).json({ message: "Friend request already sent." });
        }
    }

    // check if users are already friends
    const fromUser = await User.findById(fromUserId);
    if(fromUser.friends.includes(toUserId)){
        return res.status(400).json({ message: "You are already friends." });
    }


    const newRequest = new Friend({
      from: fromUserId,
      to: toUserId,
    });

    await newRequest.save();

    res.status(201).json({ success: true, message: "Friend request sent." });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Accept friend request
export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const request = await Friend.findById(requestId);

    if (!request || request.to.toString() !== userId.toString()) {
      return res.status(404).json({ message: "Friend request not found." });
    }

    if (request.status !== 'pending') {
        return res.status(400).json({ message: "This friend request has already been responded to." });
    }

    request.status = 'accepted';
    await request.save();

    // Add each user to the other's friends list
    await User.findByIdAndUpdate(userId, { $addToSet: { friends: request.from } });
    await User.findByIdAndUpdate(request.from, { $addToSet: { friends: userId } });

    res.json({ success: true, message: "Friend request accepted." });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reject friend request
export const rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const request = await Friend.findById(requestId);

    if (!request || request.to.toString() !== userId.toString()) {
      return res.status(404).json({ message: "Friend request not found." });
    }

    if (request.status !== 'pending') {
        return res.status(400).json({ message: "This friend request has already been responded to." });
    }

    request.status = 'rejected';
    await request.save();

    res.json({ success: true, message: "Friend request rejected." });
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};