import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    default: ""
  },
  avatar: {
    type: String,
    default: ""
  },
  bio: {
    type: String,
    default: "Hey, There I am using chat app"
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  resetPasswordToken: {
    type: String,
    default: ""
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Remove password when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Index for friends list
userSchema.index({ friends: 1 });

export default mongoose.model('User', userSchema);