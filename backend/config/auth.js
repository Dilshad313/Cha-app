import jwt from 'jsonwebtoken';

// Get JWT secret from environment variable with a fallback
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// Log the status
console.log(process.env.JWT_SECRET 
  ? '✅ JWT_SECRET is configured' 
  : '⚠️  Using development JWT secret - set JWT_SECRET in .env for production'
);

const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export { generateToken, verifyToken, JWT_SECRET };