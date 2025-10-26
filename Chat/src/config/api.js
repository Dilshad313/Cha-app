// config/api.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';

// Create axios instance with better timeout settings
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Increased timeout to 15 seconds
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add timestamp to prevent caching
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with better error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.status, error.message);
    
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout - server might be down or slow');
      return Promise.reject(new Error('Connection timeout. Please check your internet connection.'));
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Don't redirect immediately - might be due to server issues
      console.error('Authentication error - token might be invalid');
    }
    
    if (!error.response) {
      console.error('Network error - server might be unreachable');
      return Promise.reject(new Error('Unable to connect to server. Please try again.'));
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// Users API with retry logic
const retryableApiCall = async (apiCall, retries = 2) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (i === retries - 1) throw error;
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

export const checkApiHealth = async () => {
  try {
    // The health check endpoint is /api/health
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      timeout: 5000,
    });
    return response.ok;
  } catch (error) {
    console.error('Health check error:', error.message);
    return false;
  }
};

// Add to your existing api object
export const healthAPI = {
  check: checkApiHealth
};

export const usersAPI = {
  getProfile: () => retryableApiCall(() => api.get('/users/profile')),
  updateProfile: (formData) => api.put('/users/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  searchUsers: (query) => api.get(`/users/search?q=${encodeURIComponent(query)}`),
  getUser: (id) => api.get(`/users/${id}`),
  sendFriendRequest: (userId) => api.post(`/users/${userId}/friend-request`),
  acceptFriendRequest: (requestId) => api.post(`/users/friend-request/${requestId}/accept`),
  rejectFriendRequest: (requestId) => api.post(`/users/friend-request/${requestId}/reject`),
  getFriendRequests: () => retryableApiCall(() => api.get('/users/friend-requests')),
  getFriends: () => retryableApiCall(() => api.get('/users/friends')),
};

// Chats API
export const chatsAPI = {
  getUserChats: () => retryableApiCall(() => api.get('/chats')),
  getOrCreateChat: (userId) => api.get(`/chats/${userId}`),
  sendMessage: (chatId, formData) => api.post(`/chats/${chatId}/message`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getChatMessages: (chatId, page = 1, limit = 50) => 
    api.get(`/chats/${chatId}/messages?page=${page}&limit=${limit}`),
  createGroup: (formData) => api.post('/chats/group', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  renameGroup: (chatId, chatName) => api.put(`/chats/group/${chatId}/rename`, { chatName }),
  updateGroupIcon: (chatId, formData) => api.put(`/chats/group/${chatId}/icon`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  addToGroup: (chatId, userId) => api.put(`/chats/group/${chatId}/add`, { userId }),
  removeFromGroup: (chatId, userId) => api.put(`/chats/group/${chatId}/remove`, { userId }),
  editMessage: (chatId, messageId, content) => api.put(`/chats/${chatId}/message/${messageId}`, { content }),
  deleteMessage: (chatId, messageId) => api.delete(`/chats/${chatId}/message/${messageId}`),
  addReaction: (chatId, messageId, reaction) => api.post(`/chats/${chatId}/message/${messageId}/reaction`, { reaction }),
  removeReaction: (chatId, messageId, reaction) => api.delete(`/chats/${chatId}/message/${messageId}/reaction`, { data: { reaction } }),
  markAsRead: (chatId, messageIds) => api.post(`/chats/${chatId}/read`, { messageIds }),
  uploadImage: (formData) => api.post('/chats/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export default api;