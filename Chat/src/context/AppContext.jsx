import { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, usersAPI } from '../config/api';
import { io } from 'socket.io-client';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, []);

  // Initialize socket connection
  const initSocket = (token) => {
    const newSocket = io(import.meta.env.VITE_API_BASE_URL, {
      auth: { token }
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
      // Notify server that user is online
      newSocket.emit('user-online');
    });
    
    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    // Handle incoming messages
    newSocket.on('receive-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Handle typing indicators
    newSocket.on('user-typing', (data) => {
      // Implement typing indicator logic here
      console.log('User typing:', data);
    });
    
    setSocket(newSocket);
    return newSocket;
  };

  // Load user data
  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');
      
      const response = await usersAPI.getProfile();
      setUser(response.data.user);
      
      // Initialize socket connection
      initSocket(token);
      
      return response.data.user;
    } catch (error) {
      console.error('Error loading user data:', error);
      localStorage.removeItem('token');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const loginUser = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      
      // Initialize socket connection
      initSocket(response.data.token);
      
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // Register user
  const registerUser = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      
      // Initialize socket connection
      initSocket(response.data.token);
      
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // Logout user - FIXED VERSION
  const logoutUser = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      setChats([]);
      setCurrentChat(null);
      setMessages([]);
      
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      
      // Force reload to clear all state
      window.location.href = '/';
    }
  };

  // Send message function for real-time chat
  const sendMessage = (chatId, content, image = null) => {
    if (socket) {
      socket.emit('send-message', {
        chatId,
        message: {
          content,
          image,
          timestamp: new Date()
        }
      });
    }
  };

  // Join chat room
  const joinChat = (chatId) => {
    if (socket) {
      socket.emit('join-chat', chatId);
    }
  };

  // Typing indicator
  const sendTypingIndicator = (chatId, isTyping) => {
    if (socket) {
      socket.emit('typing', { chatId, isTyping });
    }
  };

  const value = {
    user,
    setUser,
    chats,
    setChats,
    currentChat,
    setCurrentChat,
    messages,
    setMessages,
    socket,
    loading,
    loadUserData,
    loginUser,
    registerUser,
    logoutUser,
    sendMessage,
    joinChat,
    sendTypingIndicator
  };

  return (
    <AppContext.Provider value={value}>
      {!loading && children}
    </AppContext.Provider>
  );
};

export default AppProvider;