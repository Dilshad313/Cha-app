// Enhanced frontend api.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://real-chat-app-silk.vercel.app/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
      return Promise.reject(new Error('Request timeout. Please try again.'));
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    
    if (error.response?.status === 403) {
      console.error('CORS error or access denied');
      return Promise.reject(new Error('Access denied. Please check your connection.'));
    }
    
    if (!error.response) {
      console.error('Network error');
      return Promise.reject(new Error('Network error. Please check your internet connection.'));
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

// Users API
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (formData) => api.put('/users/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  searchUsers: (query) => api.get(`/users/search?q=${encodeURIComponent(query)}`),
  getUser: (id) => api.get(`/users/${id}`),

  sendFriendRequest: (userId) => api.post(`/users/${userId}/friend-request`),
  acceptFriendRequest: (requestId) => api.post(`/users/friend-request/${requestId}/accept`),
  rejectFriendRequest: (requestId) => api.post(`/users/friend-request/${requestId}/reject`),
  getFriendRequests: () => api.get('/users/friend-requests'),
  getFriends: () => api.get('/users/friends'),
};

// Chats API
export const chatsAPI = {
  getUserChats: () => api.get('/chats'),
  getOrCreateChat: (userId) => api.get(`/chats/${userId}`),
  sendMessage: (chatId, formData) => api.post(`/chats/${chatId}/message`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getChatMessages: (chatId, page = 1, limit = 50) => 
    api.get(`/chats/${chatId}/messages?page=${page}&limit=${limit}`),

  createGroup: (data) => api.post('/chats', data),
  addToGroup: (data) => api.post('/chats/group/add', data),
  removeFromGroup: (data) => api.post('/chats/group/remove', data),
  editMessage: (chatId, messageId, content) => api.put(`/chats/${chatId}/message/${messageId}`, { content }),
  deleteMessage: (chatId, messageId) => api.delete(`/chats/${chatId}/message/${messageId}`),
  addReaction: (chatId, messageId, reaction) => api.post(`/chats/${chatId}/message/${messageId}/reaction`, { reaction }),
  removeReaction: (chatId, messageId, reaction) => api.delete(`/chats/${chatId}/message/${messageId}/reaction`, { data: { reaction } }),
  markAsRead: (chatId, messageIds) => api.post(`/chats/${chatId}/read`, { messageIds }),
};

export default api;