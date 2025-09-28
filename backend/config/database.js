import mongoose from 'mongoose';

// This helps manage connections in a serverless environment
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('=> using existing database connection');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log('=> new database connection');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // In a serverless environment, we should not exit the process
    throw new Error('Database connection failed');
  }
};

export default connectDB;