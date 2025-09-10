import { createContext, useState, useContext } from 'react';
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

  // Initialize socket connection
  const initSocket = (token) => {
    const newSocket = io(import.meta.env.VITE_API_BASE_URL, {
      auth: { token }
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
    });
    
    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
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

  // Logout user
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
    loadUserData,
    loginUser,
    registerUser,
    logoutUser,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppProvider;