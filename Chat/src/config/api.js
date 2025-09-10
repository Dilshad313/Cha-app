import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
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
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
};

// Users API
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (formData) => api.put('/users/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  searchUsers: (query) => api.get(`/users/search?q=${encodeURIComponent(query)}`),
  getUser: (id) => api.get(`/users/${id}`),
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
};

export default api;