// context/AppContext.js
import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
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
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  const apiBaseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';
  const socketBaseUrl = apiBaseUrl.replace(/\/api$/, '');

  // Health check function
  const performHealthCheck = useCallback(async () => {
    try {
      const isHealthy = await checkApiHealth();
      setApiConnected(isHealthy);
      return isHealthy;
    } catch (error) {
      setApiConnected(false);
      return false;
    }
  }, []);

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      const isHealthy = await performHealthCheck();
      if (!isHealthy) {
        console.warn('API server is not reachable');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (token) {
        await loadUserData();
      } else {
        setLoading(false);
      }
    };

    initializeApp();
  }, [performHealthCheck]);

  // Socket connection management
  const connectSocket = useCallback(() => {
    if (!user || socketRef.current?.connected) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    console.log('[Socket] Connecting to:', socketBaseUrl);
    
    const newSocket = io(socketBaseUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['polling', 'websocket'],
      withCredentials: true,
      autoConnect: true,
      forceNew: false,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setApiConnected(true);
      setReconnectAttempts(0);
      
      // Join user's personal room
      newSocket.emit('join-user-room', user._id);
    });

    newSocket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${reason}`);
      if (reason === 'io server disconnect' || reason === 'transport close') {
        setApiConnected(false);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error(`[Socket] Connection Error: ${error.message}`);
      setApiConnected(false);
      setReconnectAttempts(prev => prev + 1);
      
      if (error.message.includes('Invalid token')) {
        console.log('[Socket] Invalid token, logging out...');
        logoutUser();
        return;
      }
      
      // Exponential backoff for reconnection
      if (reconnectAttempts < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[Socket] Attempting to reconnect...');
          newSocket.connect();
        }, delay);
      }
    });

    // Real-time event handlers
    newSocket.on('online-users', (users) => {
      setOnlineUsers(users);
    });

    newSocket.on('user-online', (userId) => {
      setOnlineUsers(prev => [...new Set([...prev, userId])]);
    });

    newSocket.on('user-offline', (userId) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    newSocket.on('receive-message', handleReceiveMessage);
    newSocket.on('message-sent', handleMessageSent);
    newSocket.on('message-error', handleMessageError);
    newSocket.on('user-typing', handleUserTyping);
    newSocket.on('new-chat', handleNewChat);
    newSocket.on('chat-updated', handleChatUpdated);
    newSocket.on('message-deleted', handleMessageDeleted);
    newSocket.on('message-edited', handleMessageEdited);
    newSocket.on('message-delivered', handleMessageDelivered);
    newSocket.on('message-read', handleMessageRead);

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      newSocket.disconnect();
    };
  }, [user, reconnectAttempts]);

  useEffect(() => {
    if (user && apiConnected) {
      const cleanup = connectSocket();
      return cleanup;
    }
  }, [user, apiConnected, connectSocket]);

  // Load initial data after socket connection
  useEffect(() => {
    if (socket && user) {
      loadChats();
      loadFriends();
      loadFriendRequests();
    }
  }, [socket, user]);

  // Message handlers
  const handleReceiveMessage = useCallback((data) => {
    const { chatId, message, tempId } = data;

    setChats(prevChats => {
      return prevChats.map(chat => {
        if (chat._id === chatId) {
          const updatedMessages = [...(chat.messages || [])];
          
          // Remove temp message if exists
          if (tempId) {
            const tempIndex = updatedMessages.findIndex(m => m._id === tempId);
            if (tempIndex !== -1) {
              updatedMessages.splice(tempIndex, 1);
            }
          }
          
          // Add new message if not already exists
          if (!updatedMessages.some(m => m._id === message._id)) {
            updatedMessages.push(message);
          }
          
          return {
            ...chat,
            messages: updatedMessages,
            updatedAt: message.timestamp
          };
        }
        return chat;
      }).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    });

    // Update current chat if it's the same
    setCurrentChat(prev => {
      if (prev?._id === chatId) {
        const updatedMessages = [...(prev.messages || [])];
        
        if (tempId) {
          const tempIndex = updatedMessages.findIndex(m => m._id === tempId);
          if (tempIndex !== -1) {
            updatedMessages.splice(tempIndex, 1);
          }
        }
        
        if (!updatedMessages.some(m => m._id === message._id)) {
          updatedMessages.push(message);
        }
        
        return { ...prev, messages: updatedMessages };
      }
      return prev;
    });

    // Emit delivered event if message is from another user
    if (socketRef.current && message.sender._id !== user?._id) {
      socketRef.current.emit('mark-message-delivered', {
        chatId,
        messageId: message._id
      });
    }
  }, [user]);

  const handleMessageSent = useCallback((data) => {
    const { chatId, message, tempId } = data;
    
    console.log('Message sent confirmation received:', { tempId, messageId: message._id, isSending: false });
    
    setChats(prevChats => {
      return prevChats.map(chat => {
        if (chat._id === chatId) {
          let updatedMessages = chat.messages || [];
          
          // Find and replace temp message with real message
          const tempIndex = updatedMessages.findIndex(m => m._id === tempId);
          if (tempIndex !== -1) {
            updatedMessages = [
              ...updatedMessages.slice(0, tempIndex),
              { ...message, isSending: false },
              ...updatedMessages.slice(tempIndex + 1)
            ];
          } else if (!updatedMessages.some(m => m._id === message._id)) {
            // If temp message not found, add the real message
            updatedMessages = [...updatedMessages, { ...message, isSending: false }];
          }
          
          return { ...chat, messages: updatedMessages, updatedAt: message.timestamp };
        }
        return chat;
      }).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    });

    setCurrentChat(prev => {
      if (prev?._id === chatId) {
        let updatedMessages = prev.messages || [];
        
        const tempIndex = updatedMessages.findIndex(m => m._id === tempId);
        if (tempIndex !== -1) {
          updatedMessages = [
            ...updatedMessages.slice(0, tempIndex),
            { ...message, isSending: false },
            ...updatedMessages.slice(tempIndex + 1)
          ];
        } else if (!updatedMessages.some(m => m._id === message._id)) {
          updatedMessages = [...updatedMessages, { ...message, isSending: false }];
        }
        
        return { ...prev, messages: updatedMessages };
      }
      return prev;
    });
  }, []);

  const handleMessageError = useCallback((data) => {
    const { tempId, error } = data;
    
    // Remove the failed message or mark it as failed
    setChats(prevChats => {
      return prevChats.map(chat => ({
        ...chat,
        messages: chat.messages?.filter(m => m._id !== tempId) || []
      }));
    });

    setCurrentChat(prev => {
      if (prev) {
        return {
          ...prev,
          messages: prev.messages?.filter(m => m._id !== tempId) || []
        };
      }
      return prev;
    });
    
    toast.error(error || 'Failed to send message');
  }, []);

  const handleUserTyping = useCallback(({ userId, isTyping, chatId, userName }) => {
    const key = `${chatId}-${userId}`;
    setTypingUsers(prev => ({
      ...prev,
      [key]: isTyping ? { name: userName } : undefined
    }));

    // Auto-clear typing after 5 seconds
    if (isTyping) {
      setTimeout(() => {
        setTypingUsers(prev => ({ ...prev, [key]: undefined }));
      }, 5000);
    }
  }, []);

  const handleNewChat = useCallback((chat) => {
    setChats(prev => {
      if (!prev.some(c => c._id === chat._id)) {
        return [chat, ...prev];
      }
      return prev;
    });
  }, []);

  const handleChatUpdated = useCallback((updatedChat) => {
    setChats(prev => prev.map(chat => 
      chat._id === updatedChat._id ? updatedChat : chat
    ));
    
    setCurrentChat(prev => 
      prev?._id === updatedChat._id ? updatedChat : prev
    );
  }, []);

  const handleMessageDeleted = useCallback((data) => {
    const { chatId, messageId } = data;
    
    console.log('Message deleted event received:', { chatId, messageId });
    
    // Update chats state
    setChats(prevChats => {
      return prevChats.map(chat => {
        if (chat._id === chatId) {
          return {
            ...chat,
            messages: chat.messages?.map(m => 
              m._id === messageId ? { ...m, deleted: true, content: 'This message was deleted' } : m
            ) || []
          };
        }
        return chat;
      });
    });
    
    // Update current chat
    setCurrentChat(prev => {
      if (prev?._id === chatId) {
        return {
          ...prev,
          messages: prev.messages?.map(m => 
            m._id === messageId ? { ...m, deleted: true, content: 'This message was deleted' } : m
          ) || []
        };
      }
      return prev;
    });
  }, []);

  const handleMessageEdited = useCallback((data) => {
    const { chatId, messageId, content } = data;
    
    console.log('Message edited event received:', { chatId, messageId, content });
    
    // Update chats state
    setChats(prevChats => {
      return prevChats.map(chat => {
        if (chat._id === chatId) {
          return {
            ...chat,
            messages: chat.messages?.map(m => 
              m._id === messageId ? { ...m, content, edited: true } : m
            ) || []
          };
        }
        return chat;
      });
    });
    
    // Update current chat
    setCurrentChat(prev => {
      if (prev?._id === chatId) {
        return {
          ...prev,
          messages: prev.messages?.map(m => 
            m._id === messageId ? { ...m, content, edited: true } : m
          ) || []
        };
      }
      return prev;
    });
  }, []);

  const handleMessageDelivered = useCallback((data) => {
    const { chatId, messageId } = data;
    
    console.log('Message delivered event received:', { chatId, messageId });
    
    // Update chats state
    setChats(prevChats => {
      return prevChats.map(chat => {
        if (chat._id === chatId) {
          return {
            ...chat,
            messages: chat.messages?.map(m => 
              m._id === messageId ? { ...m, status: 'delivered' } : m
            ) || []
          };
        }
        return chat;
      });
    });
    
    // Update current chat
    setCurrentChat(prev => {
      if (prev?._id === chatId) {
        return {
          ...prev,
          messages: prev.messages?.map(m => 
            m._id === messageId ? { ...m, status: 'delivered' } : m
          ) || []
        };
      }
      return prev;
    });
  }, []);

  const handleMessageRead = useCallback((data) => {
    const { chatId, messageId } = data;
    
    console.log('Message read event received:', { chatId, messageId });
    
    // Update chats state
    setChats(prevChats => {
      return prevChats.map(chat => {
        if (chat._id === chatId) {
          return {
            ...chat,
            messages: chat.messages?.map(m => 
              m._id === messageId ? { ...m, status: 'read' } : m
            ) || []
          };
        }
        return chat;
      });
    });
    
    // Update current chat
    setCurrentChat(prev => {
      if (prev?._id === chatId) {
        return {
          ...prev,
          messages: prev.messages?.map(m => 
            m._id === messageId ? { ...m, status: 'read' } : m
          ) || []
        };
      }
      return prev;
    });
  }, []);

  // Data loading functions
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
      const sortedChats = (response.data.chats || []).sort(
        (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
      );
      setChats(sortedChats);
    } catch (error) {
      console.error('Error loading chats:', error);
      if (!error.response || error.response.status >= 500) {
        toast.error('Failed to load chats. Please check your connection.');
      }
    }
  };

  const loadFriends = useCallback(async () => {
    try {
      const response = await usersAPI.getFriends();
      setFriends(response.data.friends || []);
    } catch (error) {
      console.error('Error loading friends:', error);
      setFriends([]);
    }
  }, []);

  const loadFriendRequests = useCallback(async () => {
    try {
      const response = await usersAPI.getFriendRequests();
      setFriendRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error loading friend requests:', error);
      setFriendRequests([]);
    }
  }, []);

  // Auth functions
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
      // Clear socket connection
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      // Clear timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Clear state
      localStorage.removeItem('token');
      setUser(null);
      setSocket(null);
      setChats([]);
      setFriends([]);
      setFriendRequests([]);
      setCurrentChat(null);
      setOnlineUsers([]);
      setTypingUsers({});
      
      // Redirect
      window.location.href = '/';
    }
  };

  // Message functions
  const sendMessage = useCallback(async (chatId, content, image = null, audio = null) => {
    if (!socket || !user) {
      toast.error("Not connected to server. Cannot send message.");
      return;
    }

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tempMessage = {
      _id: tempId,
      sender: { _id: user._id, name: user.name, avatar: user.avatar, username: user.username },
      content: content || '',
      image: image ? URL.createObjectURL(image) : null,
      audio: audio ? URL.createObjectURL(audio) : null,
      timestamp: new Date().toISOString(),
      isSending: true,
    };
    
    console.log('Sending message with tempId:', tempId, 'hasAudio:', !!audio, 'isSending:', tempMessage.isSending);

    // Optimistic UI update
    const updateChatMessages = (prevChats) => {
      return prevChats.map(chat => {
        if (chat._id === chatId) {
          return {
            ...chat,
            messages: [...(chat.messages || []), tempMessage],
            updatedAt: tempMessage.timestamp
          };
        }
        return chat;
      }).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    };

    setChats(updateChatMessages);
    
    if (currentChat?._id === chatId) {
      setCurrentChat(prev => ({
        ...prev,
        messages: [...(prev.messages || []), tempMessage]
      }));
    }

    // Set a timeout to remove loading state if no response after 5 seconds
    const timeoutId = setTimeout(() => {
      console.warn('Message send timeout - removing loading state');
      setChats(prevChats => {
        return prevChats.map(chat => {
          if (chat._id === chatId) {
            return {
              ...chat,
              messages: chat.messages?.map(m => 
                m._id === tempId ? { ...m, isSending: false } : m
              ) || []
            };
          }
          return chat;
        });
      });
      
      if (currentChat?._id === chatId) {
        setCurrentChat(prev => ({
          ...prev,
          messages: prev.messages?.map(m => 
            m._id === tempId ? { ...m, isSending: false } : m
          ) || []
        }));
      }
    }, 5000);

    try {
      // Use API call to send message
      const formData = new FormData();
      formData.append('content', content || '');
      if (image) {
        formData.append('image', image);
      }
      if (audio) {
        formData.append('image', audio); // Backend uses 'image' field for all files
      }
      
      const response = await chatsAPI.sendMessage(chatId, formData);
      clearTimeout(timeoutId);
      
      // Update with real message from server
      const realMessage = response.data.message;
      
      setChats(prevChats => {
        return prevChats.map(chat => {
          if (chat._id === chatId) {
            const updatedMessages = chat.messages?.map(m => 
              m._id === tempId ? { ...realMessage, isSending: false } : m
            ) || [realMessage];
            return { ...chat, messages: updatedMessages, updatedAt: realMessage.timestamp };
          }
          return chat;
        }).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      });
      
      if (currentChat?._id === chatId) {
        setCurrentChat(prev => ({
          ...prev,
          messages: prev.messages?.map(m => 
            m._id === tempId ? { ...realMessage, isSending: false } : m
          ) || [realMessage]
        }));
      }
      
      console.log('Message sent successfully:', realMessage._id);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Send message error:', error);
      
      // Get specific error message from server
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to send message';
      
      // Remove temp message on error
      setChats(prevChats => {
        return prevChats.map(chat => ({
          ...chat,
          messages: chat.messages?.filter(m => m._id !== tempId) || []
        }));
      });
      
      if (currentChat?._id === chatId) {
        setCurrentChat(prev => ({
          ...prev,
          messages: prev.messages?.filter(m => m._id !== tempId) || []
        }));
      }
      
      toast.error(errorMessage);
    }
  }, [socket, user, currentChat]);

  const sendTypingIndicator = useCallback((chatId, isTyping) => {
    if (socket && user) {
      socket.emit('typing', { chatId, isTyping });
    }
  }, [socket, user]);

  const deleteMessage = useCallback(async (chatId, messageId) => {
    try {
      await chatsAPI.deleteMessage(chatId, messageId);
      
      // Emit socket event to notify other users
      if (socket) {
        socket.emit('delete-message', { chatId, messageId });
      }
      
      // Update chats state
      setChats(prevChats => {
        return prevChats.map(chat => {
          if (chat._id === chatId) {
            return {
              ...chat,
              messages: chat.messages?.map(m => 
                m._id === messageId ? { ...m, deleted: true, content: 'This message was deleted' } : m
              ) || []
            };
          }
          return chat;
        });
      });
      
      // Update current chat
      if (currentChat?._id === chatId) {
        setCurrentChat(prev => ({
          ...prev,
          messages: prev.messages?.map(m => 
            m._id === messageId ? { ...m, deleted: true, content: 'This message was deleted' } : m
          ) || []
        }));
      }
      
      toast.success('Message deleted');
    } catch (error) {
      console.error('Delete message error:', error);
      toast.error('Failed to delete message');
    }
  }, [currentChat, socket]);

  const editMessage = useCallback(async (chatId, messageId, content) => {
    try {
      const response = await chatsAPI.editMessage(chatId, messageId, content);
      const updatedMessage = response.data.message;
      
      // Emit socket event to notify other users
      if (socket) {
        socket.emit('edit-message', { chatId, messageId, content });
      }
      
      // Update chats state
      setChats(prevChats => {
        return prevChats.map(chat => {
          if (chat._id === chatId) {
            return {
              ...chat,
              messages: chat.messages?.map(m => 
                m._id === messageId ? { ...m, ...updatedMessage, edited: true } : m
              ) || []
            };
          }
          return chat;
        });
      });
      
      // Update current chat
      if (currentChat?._id === chatId) {
        setCurrentChat(prev => ({
          ...prev,
          messages: prev.messages?.map(m => 
            m._id === messageId ? { ...m, ...updatedMessage, edited: true } : m
          ) || []
        }));
      }
      
      toast.success('Message updated');
      return true;
    } catch (error) {
      console.error('Edit message error:', error);
      toast.error('Failed to edit message');
      return false;
    }
  }, [currentChat, socket]);

  const createGroup = async (groupName, participants) => {
    try {
      const response = await chatsAPI.createGroup({ 
        chatName: groupName, 
        participants 
      });
      const newGroup = response.data.group;
      setChats(prev => [newGroup, ...prev]);
      return newGroup;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  };

  const value = {
    // State
    user,
    chats,
    currentChat,
    socket,
    loading,
    onlineUsers,
    typingUsers,
    friends,
    friendRequests,
    apiConnected,
    
    // Setters
    setUser,
    setChats,
    setCurrentChat,
    
    // Auth functions
    loginUser,
    registerUser,
    logoutUser,
    loadUserData,
    
    // Chat functions
    sendMessage,
    sendTypingIndicator,
    deleteMessage,
    editMessage,
    createGroup,
    
    // Data loading functions
    loadFriends,
    loadFriendRequests,
    loadChats,
    
    // Utility functions
    checkApiHealth: performHealthCheck,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppProvider;
