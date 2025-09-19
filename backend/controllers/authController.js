import User from '../models/User.js';
import Chat from '../models/Chat.js';
import { generateToken } from '../config/auth.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/emailService.js';

// Register a new user
export const register = async (req, res) => {
  try {
    const { username, email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username: username.toLowerCase() }]
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or username' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      username: username.toLowerCase(),
      email,
      password: hashedPassword,
      name: name || ""
    });

    await user.save();

    // Create empty chat document for user
    const chat = new Chat({
      participants: [user._id],
      messages: []
    });
    await chat.save();

    // Generate token
    const token = generateToken(user._id);

    // Update user status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    // Update user status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Logout user - FIXED VERSION
export const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save();
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
};

// Forgot password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    console.log('Forgot password request for:', email);

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    console.log('User found:', user ? user.email : 'No user found');

    if (!user) {
      // For security, don't reveal if email exists
      return res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set token and expiration (1 hour)
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    console.log('Reset token set for user:', user.email);

    // Send email
    try {
      await sendPasswordResetEmail(email, resetToken);
      console.log('Email sent successfully to:', email);
      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
    } catch (emailError) {
      console.error('Email error:', emailError);
      // Reset the token if email fails
      user.resetPasswordToken = "";
      user.resetPasswordExpires = null;
      await user.save();
      return res.status(500).json({ message: 'Error sending password reset email' });
    }

  } catch (error) {
    console.error('Forgot password error details:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    // Password complexity validation
    const passwordErrors = [];
    if (password.length < 8) passwordErrors.push('be at least 8 characters long');
    if (!/[A-Z]/.test(password)) passwordErrors.push('contain an uppercase letter');
    if (!/[a-z]/.test(password)) passwordErrors.push('contain a lowercase letter');
    if (!/[0-9]/.test(password)) passwordErrors.push('contain a number');
    if (!/[^A-Za-z0-9]/.test(password)) passwordErrors.push('contain a special character');

    if (passwordErrors.length > 0) {
      return res.status(400).json({ message: `Password must ${passwordErrors.join(', ')}.` });
    }

    // Hash the token from the request to match the one in the DB
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user by token and check expiration
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user's password and clear reset fields
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password has been reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};