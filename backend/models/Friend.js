import mongoose from 'mongoose';

const friendSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Prevent duplicate requests
friendSchema.index({ from: 1, to: 1 }, { unique: true });

// Index for querying friend requests
friendSchema.index({ to: 1, status: 1 });

export default mongoose.model('Friend', friendSchema);