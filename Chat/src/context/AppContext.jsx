import { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, usersAPI, chatsAPI } from '../config/api';
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
  const [groups, setGroups] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);

  // Check for existing token on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, []);

  // Load friends and requests when user is set
  useEffect(() => {
    if (user) {
      loadFriends();
      loadFriendRequests();
      registerPush();
    }
  }, [user]);

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

    // Handle incoming messages
    newSocket.on('receive-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Handle online users
    newSocket.on('online-users', (users) => {
      setOnlineUsers(users);
    });

    newSocket.on('user-online', (userId) => {
      setOnlineUsers(prev => [...prev, userId]);
    });

    newSocket.on('user-offline', (userId) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    // Handle typing indicators
    const typingTimeouts = {};
    newSocket.on('user-typing', ({ userId, isTyping, chatId }) => {
      const key = `${chatId}-${userId}`;
      if (isTyping) {
        setTypingUsers(prev => ({ ...prev, [key]: true }));
        if (typingTimeouts[key]) {
          clearTimeout(typingTimeouts[key]);
        }
        typingTimeouts[key] = setTimeout(() => {
          setTypingUsers(prev => ({ ...prev, [key]: false }));
        }, 3000);
      } else {
        if (typingTimeouts[key]) {
          clearTimeout(typingTimeouts[key]);
        }
        setTypingUsers(prev => ({ ...prev, [key]: false }));
      }
    });

    // Handle message edited
    newSocket.on('message-edited', ({ messageId, content, edited, editedAt }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, content, edited, editedAt } : m));
    });

    // Handle message deleted
    newSocket.on('message-deleted', ({ messageId }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deleted: true, content: '[Message deleted]' } : m));
    });

    // Handle reaction added
    newSocket.on('reaction-added', ({ messageId, reaction, userId }) => {
      setMessages(prev => prev.map(m => {
        if (m._id === messageId) {
          const reactions = { ...m.reactions };
          if (!reactions[reaction]) reactions[reaction] = [];
          if (!reactions[reaction].includes(userId)) reactions[reaction].push(userId);
          return { ...m, reactions };
        }
        return m;
      }));
    });

    // Handle reaction removed
    newSocket.on('reaction-removed', ({ messageId, reaction, userId }) => {
      setMessages(prev => prev.map(m => {
        if (m._id === messageId) {
          const reactions = { ...m.reactions };
          if (reactions[reaction]) {
            reactions[reaction] = reactions[reaction].filter(id => id !== userId);
            if (reactions[reaction].length === 0) {
              delete reactions[reaction];
            }
          }
          return { ...m, reactions };
        }
        return m;
      }));
    });

    // Handle messages read
    newSocket.on('messages-read', ({ messageIds, userId }) => {
      setMessages(prev => prev.map(m => 
        messageIds.includes(m._id) 
          ? { ...m, readBy: [...(m.readBy || []), { user: userId }] } 
          : m
      ));
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

  // Load friends
  const loadFriends = async () => {
    try {
      const response = await usersAPI.getFriends();
      setFriends(response.data.friends);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  // Load friend requests
  const loadFriendRequests = async () => {
    try {
      const response = await usersAPI.getFriendRequests();
      setFriendRequests(response.data.requests);
    } catch (error) {
      console.error('Error loading friend requests:', error);
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
      setGroups([]);
      setCurrentChat(null);
      setMessages([]);
      setOnlineUsers([]);
      setTypingUsers({});
      setFriends([]);
      setFriendRequests([]);
      
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

  // Edit message
  const editMessage = (chatId, messageId, content) => {
    if (socket) {
      socket.emit('edit-message', { chatId, messageId, content });
    } else {
      chatsAPI.editMessage(chatId, messageId, content);
    }
  };

  // Delete message
  const deleteMessage = (chatId, messageId) => {
    if (socket) {
      socket.emit('delete-message', { chatId, messageId });
    } else {
      chatsAPI.deleteMessage(chatId, messageId);
    }
  };

  // Add reaction
  const addReaction = (chatId, messageId, reaction) => {
    if (socket) {
      socket.emit('add-reaction', { chatId, messageId, reaction });
    } else {
      chatsAPI.addReaction(chatId, messageId, reaction);
    }
  };

  // Remove reaction
  const removeReaction = (chatId, messageId, reaction) => {
    if (socket) {
      socket.emit('remove-reaction', { chatId, messageId, reaction });
    } else {
      chatsAPI.removeReaction(chatId, messageId, reaction);
    }
  };

  // Mark messages as read
  const markMessagesAsRead = (chatId, messageIds) => {
    if (socket) {
      socket.emit('mark-read', { chatId, messageIds });
    } else {
      chatsAPI.markAsRead(chatId, messageIds);
    }
  };

  // Create group
  const createGroup = async (groupName, participants) => {
    try {
      const response = await chatsAPI.createGroup({ groupName, participants });
      const newGroup = response.data.chat;
      setGroups(prev => [...prev, newGroup]);
      setChats(prev => [...prev, newGroup]);
      return newGroup;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  };

  // Register for push notifications
  const registerPush = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window && user) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
        });
        // Send to server
        await api.post('/api/notifications/register', { subscription: JSON.stringify(subscription) });
      } catch (error) {
        console.error('Error registering push:', error);
      }
    }
  };

  // Helper function for VAPID key
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const value = {
    user,
    setUser,
    chats,
    setChats,
    groups,
    setGroups,
    currentChat,
    setCurrentChat,
    messages,
    setMessages,
    socket,
    loading,
    onlineUsers,
    typingUsers,
    friends,
    setFriends,
    friendRequests,
    setFriendRequests,
    loadUserData,
    loginUser,
    registerUser,
    logoutUser,
    sendMessage,
    joinChat,
    sendTypingIndicator,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    markMessagesAsRead,
    createGroup,
    loadFriends,
    loadFriendRequests
  };

  return (
    <AppContext.Provider value={value}>
      {!loading && children}
    </AppContext.Provider>
  );
};

export default AppProvider;