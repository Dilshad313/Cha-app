// context/AppContext.js
import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authAPI, usersAPI, chatsAPI, checkApiHealth } from '../config/api';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

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
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [apiConnected, setApiConnected] = useState(true);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const socketBaseUrl = apiBaseUrl.replace(/\/api$/, '');

  useEffect(() => {
    const initializeApp = async () => {
      const isHealthy = await checkApiHealth();
      if (!isHealthy) {
        console.warn('API server is not reachable');
        setLoading(false);
        setApiConnected(false);
        return;
      }
      setApiConnected(true);

      const token = localStorage.getItem('token');
      if (token) {
        await loadUserData();
      } else {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Effect for managing socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (user && token) {
      const newSocket = io(socketBaseUrl, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      newSocket.on('connect', () => {
        console.log('✅ Socket connected:', newSocket.id);
        setApiConnected(true);
        loadChats();
        loadFriends();
        loadFriendRequests();
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          newSocket.connect();
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
        setApiConnected(false);
        if (error.message.includes('Invalid token')) {
          logoutUser();
        }
      });

      newSocket.on('online-users', setOnlineUsers);
      newSocket.on('receive-message', (data) => {
        const { chatId, ...message } = data;
        setChats(prevChats => {
          const updatedChats = prevChats.map(chat => {
            if (chat._id === chatId) {
              const messageExists = chat.messages?.some(m => m._id === message._id);
              if (!messageExists) {
                return { ...chat, messages: [...(chat.messages || []), message], updatedAt: message.timestamp };
              }
            }
            return chat;
          });
          return updatedChats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        });

        if (currentChat?._id === chatId) {
          setCurrentChat(prev => ({ ...prev, messages: [...(prev.messages || []), message] }));
        }
      });

      const typingTimeouts = {};
      newSocket.on('user-typing', ({ userId, isTyping, chatId, userName }) => {
        const key = `${chatId}-${userId}`;
        setTypingUsers(prev => ({ ...prev, [key]: isTyping ? { name: userName } : undefined }));

        if (typingTimeouts[key]) clearTimeout(typingTimeouts[key]);

        if (isTyping) {
          typingTimeouts[key] = setTimeout(() => {
            setTypingUsers(prev => ({ ...prev, [key]: undefined }));
          }, 3000);
        }
      });

      setSocket(newSocket);

      return () => {
        console.log('Cleaning up socket connection...');
        newSocket.disconnect();
      };
    }
  }, [user]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const response = await usersAPI.getProfile();
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to load user data:', error);
      localStorage.removeItem('token');
      setUser(null);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadChats = async () => {
    try {
      const response = await chatsAPI.getUserChats();
      setChats(response.data.chats || []);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const loadFriends = async () => {
    try {
      const response = await usersAPI.getFriends();
      setFriends(response.data.friends || []);
    } catch (error) {
      console.error('Error loading friends:', error);
      setFriends([]);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const response = await usersAPI.getFriendRequests();
      setFriendRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error loading friend requests:', error);
      setFriendRequests([]);
    }
  };

  const loginUser = async (email, password) => {
    const response = await authAPI.login({ email, password });
    localStorage.setItem('token', response.data.token);
    await loadUserData();
    return response.data;
  };

  const registerUser = async (userData) => {
    const response = await authAPI.register(userData);
    localStorage.setItem('token', response.data.token);
    await loadUserData();
    return response.data;
  };

  const logoutUser = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      setSocket(null);
      setChats([]);
      setFriends([]);
      setFriendRequests([]);
      setCurrentChat(null);
      window.location.href = '/';
    }
  };

  const sendMessage = async (chatId, content, image = null) => {
    if (socket) {
      socket.emit('send-message', {
        chatId,
        content: content || '',
        image: image || null,
        timestamp: new Date()
      });
    } else {
      try {
        const formData = new FormData();
        if (content) formData.append('content', content);
        if (image) formData.append('image', image);
        await chatsAPI.sendMessage(chatId, formData);
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
      }
    }
  };

  const joinChat = (chatId) => { if (socket) socket.emit('join-chat', chatId); };
  const sendTypingIndicator = (chatId, isTyping) => { if (socket && currentChat) socket.emit('typing', { chatId, isTyping }); };
  const editMessage = async (chatId, messageId, content) => { if (socket) socket.emit('edit-message', { chatId, messageId, content }); else await chatsAPI.editMessage(chatId, messageId, content).catch(console.error); };
  const deleteMessage = async (chatId, messageId) => { if (socket) socket.emit('delete-message', { chatId, messageId }); else await chatsAPI.deleteMessage(chatId, messageId).catch(console.error); };

  const value = {
    user, setUser,
    chats, setChats,
    currentChat, setCurrentChat,
    socket,
    loading,
    onlineUsers,
    typingUsers,
    friends,
    friendRequests,
    apiConnected,
    loadUserData,
    loginUser,
    registerUser,
    logoutUser,
    sendMessage,
    joinChat,
    sendTypingIndicator,
    editMessage,
    deleteMessage,
    addReaction: (chatId, messageId, reaction) => { if (socket) socket.emit('add-reaction', { chatId, messageId, reaction }); else chatsAPI.addReaction(chatId, messageId, reaction).catch(console.error); },
    removeReaction: (chatId, messageId, reaction) => { if (socket) socket.emit('remove-reaction', { chatId, messageId, reaction }); else chatsAPI.removeReaction(chatId, messageId, reaction).catch(console.error); },
    markMessagesAsRead: (chatId, messageIds) => { if (socket) socket.emit('mark-read', { chatId, messageIds }); else chatsAPI.markAsRead(chatId, messageIds).catch(console.error); },
    createGroup: async (groupName, participants) => { try { const response = await chatsAPI.createGroup({ chatName: groupName, participants }); const newGroup = response.data.group; setChats(prev => [newGroup, ...prev]); return newGroup; } catch (error) { console.error('Error creating group:', error); throw error; } },
    loadFriends,
    loadFriendRequests,
    checkApiHealth
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppProvider;
