// components/Chatbox.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import assets from '../assets/assets';
import { useApp } from '../context/AppContext';
import { toast } from 'react-toastify';

function Chatbox({ toggleLeftSidebar, toggleRightSidebar }) {
  const [newMessage, setNewMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const {
    currentChat,
    user,
    sendMessage,
    onlineUsers,
    typingUsers,
    sendTypingIndicator,
    socket,
    deleteMessage,
    editMessage,
  } = useApp();

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    // Use setTimeout to ensure DOM is updated before scrolling
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => {
      clearTimeout(timer);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentChat?.messages, scrollToBottom]);

  // Mark messages as read when viewing chat
  useEffect(() => {
    if (currentChat && socket && user) {
      const unreadMessages = currentChat.messages?.filter(
        msg => msg.sender?._id !== user._id && msg.status !== 'read'
      );
      
      if (unreadMessages && unreadMessages.length > 0) {
        unreadMessages.forEach(msg => {
          socket.emit('mark-message-read', {
            chatId: currentChat._id,
            messageId: msg._id
          });
        });
      }
    }
  }, [currentChat, socket, user]);

  const handleSendMessage = useCallback(async () => {
    if ((!newMessage.trim() && !selectedImage && !audioBlob) || isUploading) return;
    
    if (!currentChat) {
      toast.error('Please select a chat first');
      return;
    }

    try {
      setIsUploading(true);
      await sendMessage(currentChat._id, newMessage, selectedImage, audioBlob);
      setNewMessage("");
      setSelectedImage(null);
      setAudioBlob(null);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        sendTypingIndicator(currentChat._id, false);
      }
      
      // Focus back to input for better UX
      inputRef.current?.focus();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsUploading(false);
    }
  }, [newMessage, selectedImage, audioBlob, currentChat, sendMessage, sendTypingIndicator, isUploading]);

  const handleEditMessage = useCallback(async (messageId) => {
    if (!editContent.trim()) {
      toast.error('Message cannot be empty');
      return;
    }
    
    const success = await editMessage(currentChat._id, messageId, editContent);
    if (success) {
      setEditingMessageId(null);
      setEditContent("");
    }
  }, [editContent, currentChat, editMessage]);

  const startEdit = useCallback((message) => {
    setEditingMessageId(message._id);
    setEditContent(message.content);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditContent("");
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioBlob(null);
      setRecordingTime(0);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      const stream = mediaRecorderRef.current.stream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [isRecording]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInputChange = useCallback((e) => {
    setNewMessage(e.target.value);
    
    if (socket && currentChat) {
      if (!typingTimeoutRef.current) {
        sendTypingIndicator(currentChat._id, true);
      } else {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(currentChat._id, false);
        typingTimeoutRef.current = null;
      }, 3000);
    }
  }, [socket, currentChat, sendTypingIndicator]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleImageChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size too large. Maximum 10MB allowed.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setSelectedImage(file);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      if (imageFile.size > 10 * 1024 * 1024) {
        toast.error('File size too large. Maximum 10MB allowed.');
        return;
      }
      setSelectedImage(imageFile);
    } else {
      toast.error('Please drop an image file');
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const chatPartner = currentChat?.participants.find(p => p._id !== user._id);
  const isSelfChat = currentChat && !currentChat.isGroupChat && currentChat.participants?.every(p => p._id === user._id);
  
  const getChatDisplayName = () => {
    if (!currentChat) return '';
    if (currentChat.isGroupChat) return currentChat.chatName;
    if (isSelfChat) return `${user.name || user.username} (You)`;
    return chatPartner?.name || chatPartner?.username || 'Unknown User';
  };
  
  const typingUserNames = Object.entries(typingUsers)
    .filter(([key, value]) => key.startsWith(currentChat?._id) && value && key.split('-') !== user._id)
    .map(([key, value]) => value.name)
    .join(', ');

  if (!currentChat) {
    return (
      <div className="h-full flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 hidden md:flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center space-y-4 p-8">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mb-6">
            <img src={assets.logo_icon} alt="Talko" className="w-20 h-20 opacity-60" />
          </div>
          <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">Welcome to Talko</h2>
          <p className="text-base text-gray-500 dark:text-gray-400 max-w-md">Select a conversation from the sidebar to start messaging</p>
          <div className="flex gap-2 justify-center mt-6">
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex h-full w-full flex-col bg-gray-100 dark:bg-gray-800 relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 border-2 border-dashed border-blue-500 z-50 flex items-center justify-center">
          <div className="text-blue-600 text-xl font-semibold">Drop image here to send</div>
        </div>
      )}

      {/* Fixed Chat Header */}
      <div className="flex items-center justify-between border-b-2 border-gray-200 dark:border-gray-800 px-4 md:px-6 py-4 md:py-5 bg-white dark:bg-gray-900 shadow-md flex-shrink-0">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button 
            onClick={toggleLeftSidebar} 
            className="text-gray-600 dark:text-gray-300 md:hidden hover:bg-gray-100 dark:hover:bg-gray-700 p-2.5 rounded-lg transition-all active:scale-95"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* User Profile with Status */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              <img
                src={currentChat.isGroupChat ? (currentChat.groupIcon || assets.avatar_icon) : (isSelfChat ? user.avatar || assets.avatar_icon : chatPartner?.avatar || assets.avatar_icon)}
                alt="avatar"
                className="w-11 h-11 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700 shadow-sm"
              />
              {!currentChat.isGroupChat && (
                <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white dark:border-gray-900 rounded-full ${
                  isSelfChat ? 'bg-green-500' : (onlineUsers.includes(chatPartner?._id) ? 'bg-green-500' : 'bg-gray-400')
                }`}></div>
              )}
            </div>
            
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-base text-gray-900 dark:text-white truncate">
                {getChatDisplayName()}
              </h3>
              {!currentChat.isGroupChat && !isSelfChat && (
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                    onlineUsers.includes(chatPartner?._id) 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      onlineUsers.includes(chatPartner?._id) ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    }`}></span>
                    {onlineUsers.includes(chatPartner?._id) ? 'Online' : 'Offline'}
                  </span>
                </div>
              )}
              {isSelfChat && (
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Messages to yourself
                </p>
              )}
              {currentChat.isGroupChat && (
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {currentChat.participants.length} members
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleRightSidebar} 
            className="text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700 p-2.5 rounded-lg transition-all active:scale-95 lg:hidden"
            title="View details"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900"
      >
        {!currentChat.messages || currentChat.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-lg font-medium mb-2">No messages yet</h3>
            <p className="text-sm">Send a message to start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {currentChat.messages.map((message) => {
              const isSender = message.sender?._id === user._id;
              const senderAvatar = isSender ? (user.avatar || assets.avatar_icon) : (message.sender?.avatar || assets.avatar_icon);
              const senderName = message.sender?.name || message.sender?.username || 'Unknown';
              
              return (
              <div key={message._id} className={`flex items-end gap-2 ${isSender ? 'flex-row-reverse' : ''} group animate-fadeIn`}>
                <img
                  src={senderAvatar}
                  alt="sender avatar"
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-white dark:ring-gray-800 shadow-sm"
                />
                <div className={`relative max-w-[75%] sm:max-w-[70%] md:max-w-md lg:max-w-lg ${isSender ? 'ml-auto' : 'mr-auto'}`}>
                  <div 
                    className={`px-4 py-2.5 rounded-2xl shadow-md transition-all hover:shadow-lg ${
                      isSender 
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-sm' 
                        : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    {!isSender && currentChat.isGroupChat && (
                      <p className="text-xs font-semibold mb-1 text-blue-400">{senderName}</p>
                    )}
                    
                    {editingMessageId === message._id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                          rows="3"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleEditMessage(message._id);
                            }
                            if (e.key === 'Escape') {
                              cancelEdit();
                            }
                          }}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleEditMessage(message._id)}
                            className="px-3 py-1 text-sm bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      message.content && (
                        <p className={`text-[15px] leading-relaxed break-words whitespace-pre-wrap ${
                          message.deleted ? 'italic opacity-60' : ''
                        }`}>
                          {message.content}
                        </p>
                      )
                    )}
                    
                    {message.image && (
                      <div className="mt-2">
                        <img 
                          src={message.image} 
                          alt="attachment" 
                          className="rounded-lg max-w-full max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(message.image, '_blank')}
                        />
                      </div>
                    )}

                    {message.audio && (
                      <div className="mt-1">
                        <div className={`flex items-center gap-2 p-2 rounded-lg ${isSender ? 'bg-white/10' : 'bg-gray-100 dark:bg-gray-600'}`}>
                          <audio 
                            id={`audio-${message._id}`}
                            src={message.audio}
                            className="hidden"
                            onLoadedMetadata={(e) => {
                              const duration = Math.floor(e.target.duration);
                              const mins = Math.floor(duration / 60);
                              const secs = duration % 60;
                              const timeSpan = document.getElementById(`time-${message._id}`);
                              if (timeSpan) {
                                timeSpan.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                              }
                            }}
                            onTimeUpdate={(e) => {
                              const currentTime = Math.floor(e.target.currentTime);
                              const mins = Math.floor(currentTime / 60);
                              const secs = currentTime % 60;
                              const timeSpan = document.getElementById(`time-${message._id}`);
                              if (timeSpan) {
                                timeSpan.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                              }
                            }}
                            onEnded={(e) => {
                              const btn = document.getElementById(`btn-${message._id}`);
                              if (btn) {
                                btn.innerHTML = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg>';
                              }
                              const duration = Math.floor(e.target.duration);
                              const mins = Math.floor(duration / 60);
                              const secs = duration % 60;
                              const timeSpan = document.getElementById(`time-${message._id}`);
                              if (timeSpan) {
                                timeSpan.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                              }
                            }}
                          />
                          <button
                            id={`btn-${message._id}`}
                            onClick={(e) => {
                              const audio = document.getElementById(`audio-${message._id}`);
                              if (audio.paused) {
                                audio.play();
                                e.currentTarget.innerHTML = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>';
                              } else {
                                audio.pause();
                                e.currentTarget.innerHTML = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg>';
                              }
                            }}
                            className={`flex-shrink-0 ${isSender ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`}
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <div className="flex-1 flex items-center gap-2">
                            <div className="flex items-center gap-0.5 flex-1">
                              {[...Array(20)].map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`w-0.5 rounded-full ${isSender ? 'bg-white/60' : 'bg-gray-400 dark:bg-gray-300'}`}
                                  style={{ height: `${Math.random() * 16 + 8}px` }}
                                />
                              ))}
                            </div>
                            <span id={`time-${message._id}`} className={`text-xs font-medium ${isSender ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                              0:00
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mt-1.5">
                      <p className={`text-xs font-medium ${isSender ? 'text-indigo-100' : 'text-gray-400 dark:text-gray-500'}`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {message.edited && <span className="ml-1 italic">(edited)</span>}
                      </p>
                      
                      <div className="flex items-center gap-1">
                        {isSender && (
                          <>
                            {message.isSending === true ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" title="Sending..."></div>
                            ) : (
                              <div className="flex items-center">
                                {message.status === 'read' ? (
                                  // Two blue ticks for read
                                  <div className="flex -space-x-1" title="Read">
                                    <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                ) : message.status === 'delivered' ? (
                                  // Two gray ticks for delivered
                                  <div className="flex -space-x-1" title="Delivered">
                                    <svg className="w-4 h-4 text-white opacity-60" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <svg className="w-4 h-4 text-white opacity-60" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                ) : (
                                  // One gray tick for sent
                                  <svg className="w-4 h-4 text-white opacity-60" fill="currentColor" viewBox="0 0 20 20" title="Sent">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Message actions (only show for sender's messages and not deleted) */}
                  {isSender && !message.isSending && !message.deleted && (
                    <div className="absolute top-0 right-full mr-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <div className="flex gap-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-1">
                        <button
                          onClick={() => startEdit(message)}
                          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Edit message"
                        >
                          <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteMessage(currentChat._id, message._id)}
                          className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete message"
                        >
                          <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
        
        {typingUserNames && (
          <div className="flex items-center gap-2 px-4 mt-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <p className="text-xs italic text-gray-500">{typingUserNames} is typing...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="border-t-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 md:p-5 shadow-lg flex-shrink-0">
        {selectedImage && (
          <div className="mb-3 flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
            <div className="relative">
              <img 
                src={URL.createObjectURL(selectedImage)} 
                alt="preview" 
                className="w-16 h-16 object-cover rounded-lg shadow-md"
              />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                {selectedImage.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button 
              onClick={() => setSelectedImage(null)} 
              className="text-red-500 hover:text-red-700 p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all active:scale-95"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {audioBlob && (
          <div className="mb-3 flex items-center gap-3 p-3 bg-gradient-to-r from-teal-50 to-green-50 dark:from-teal-900/20 dark:to-green-900/20 rounded-2xl border border-teal-200 dark:border-teal-800 shadow-sm">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-green-500 rounded-full flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5 flex-1">
                    {[...Array(25)].map((_, i) => (
                      <div 
                        key={i} 
                        className="w-1 bg-teal-500 dark:bg-teal-400 rounded-full"
                        style={{ height: `${Math.random() * 20 + 8}px` }}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-teal-700 dark:text-teal-300">{formatTime(recordingTime)}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => { setAudioBlob(null); setRecordingTime(0); }} 
              className="text-red-500 hover:text-red-700 p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-all active:scale-95"
              title="Delete voice message"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {isRecording && (
          <div className="mb-3 flex items-center gap-3 p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-2xl border-2 border-red-300 dark:border-red-700 shadow-lg">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex items-center justify-center">
                <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                <div className="absolute w-6 h-6 bg-red-500/30 rounded-full animate-ping"></div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">Recording</span>
                  <div className="flex items-center gap-0.5">
                    {[...Array(30)].map((_, i) => (
                      <div 
                        key={i} 
                        className="w-0.5 bg-red-500 dark:bg-red-400 rounded-full animate-pulse"
                        style={{ 
                          height: `${Math.random() * 16 + 8}px`,
                          animationDelay: `${i * 0.05}s`
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-mono font-semibold text-red-600 dark:text-red-400">{formatTime(recordingTime)}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={cancelRecording}
              className="px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-sm border border-gray-300 dark:border-gray-600"
            >
              Cancel
            </button>
            <button 
              onClick={stopRecording}
              className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-md flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
              Stop
            </button>
          </div>
        )}
        
        <div className="flex items-end gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-gray-700 transition-all active:scale-95 flex-shrink-0 text-gray-600 dark:text-gray-300"
            disabled={isUploading}
            title="Attach image"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageChange}
            />
          </button>

          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 rounded-xl transition-all active:scale-95 flex-shrink-0 ${
              isRecording 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'hover:bg-indigo-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
            disabled={isUploading || !!audioBlob}
            title={isRecording ? "Stop recording" : "Record voice message"}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
          </button>
          
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isUploading}
              className="w-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-gray-700 resize-none max-h-32 disabled:opacity-50 text-[15px] transition-all shadow-sm"
              rows="1"
              style={{
                minHeight: '48px',
                height: 'auto',
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!socket || (!newMessage.trim() && !selectedImage && !audioBlob) || isUploading || isRecording}
            className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed hover:from-indigo-600 hover:to-purple-700 transition-all active:scale-95 shadow-lg hover:shadow-xl flex-shrink-0"
            title="Send message"
          >
            {isUploading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chatbox;
