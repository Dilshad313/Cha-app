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
  const messagesEndRef = useRef(null);
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentChat?.messages, scrollToBottom]);

  const handleSendMessage = useCallback(async () => {
    if ((!newMessage.trim() && !selectedImage) || isUploading) return;
    
    if (!currentChat) {
      toast.error('Please select a chat first');
      return;
    }

    try {
      setIsUploading(true);
      await sendMessage(currentChat._id, newMessage, selectedImage);
      setNewMessage("");
      setSelectedImage(null);
      
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
  }, [newMessage, selectedImage, currentChat, sendMessage, sendTypingIndicator, isUploading]);

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
    const file = e.target.files;
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
  const typingUserNames = Object.entries(typingUsers)
    .filter(([key, value]) => key.startsWith(currentChat?._id) && value && key.split('-') !== user._id)
    .map(([key, value]) => value.name)
    .join(', ');

  if (!currentChat) {
    return (
      <div className="h-full flex-col bg-gray-100 dark:bg-gray-800 hidden md:flex items-center justify-center text-gray-500 dark:text-gray-400">
        <img src={assets.logo_icon} alt="Chat App" className="w-24 h-24 mb-4 opacity-30" />
        <h2 className="text-xl font-semibold">Select a chat to start messaging</h2>
        <p className="text-sm mt-2 opacity-75">Choose from your existing conversations or start a new one</p>
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

      {/* Chat Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-3 shadow-sm bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button 
            onClick={toggleLeftSidebar} 
            className="text-gray-600 dark:text-gray-300 md:hidden hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"
          >
            <img src={assets.menu_icon} alt="Menu" className="w-5 h-5" />
          </button>
          
          <div className="relative">
            <img
              src={currentChat.isGroupChat ? currentChat.groupIcon || assets.avatar_icon : chatPartner?.avatar || assets.avatar_icon}
              alt="avatar"
              className="w-10 h-10 rounded-full object-cover"
            />
            {!currentChat.isGroupChat && onlineUsers.includes(chatPartner?._id) && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-800 dark:text-white truncate">
              {currentChat.isGroupChat ? currentChat.chatName : chatPartner?.name}
            </h3>
            {!currentChat.isGroupChat && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {onlineUsers.includes(chatPartner?._id) ? 'Online' : 'Offline'}
              </p>
            )}
            {currentChat.isGroupChat && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {currentChat.participants.length} members
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {currentChat.isGroupChat && (
            <button 
              onClick={toggleRightSidebar} 
              className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"
              title="Group info"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 h-0">
        {currentChat.messages?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-lg font-medium mb-2">No messages yet</h3>
            <p className="text-sm">Send a message to start the conversation!</p>
          </div>
        ) : (
          currentChat.messages?.map((message) => {
            const isSender = message.sender._id === user._id;
            return (
              <div key={message._id} className={`flex items-start gap-3 ${isSender ? 'flex-row-reverse' : ''} group`}>
                <img
                  src={isSender ? user.avatar || assets.avatar_icon : message.sender.avatar || assets.avatar_icon}
                  alt="sender avatar"
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
                <div className={`relative max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl ${isSender ? 'ml-auto' : 'mr-auto'}`}>
                  <div 
                    className={`p-3 rounded-2xl shadow-sm ${
                      isSender 
                        ? 'bg-blue-500 text-white rounded-br-md' 
                        : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-md'
                    }`}
                  >
                    {!isSender && currentChat.isGroupChat && (
                      <p className="text-xs font-semibold mb-1 text-blue-400">{message.sender.name}</p>
                    )}
                    
                    {message.content && (
                      <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
                    )}
                    
                    {message.image && (
                      <div className="mt-2">
                        <img 
                          src={message.image} 
                          alt="attachment" 
                          className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(message.image, '_blank')}
                        />
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mt-2">
                      <p className={`text-xs ${isSender ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {message.edited && <span className="ml-1">(edited)</span>}
                      </p>
                      
                      <div className="flex items-center gap-1">
                        {isSender && (
                          <>
                            {message.isSending && (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            )}
                            {!message.isSending && (
                              <svg className="w-4 h-4 text-white opacity-70" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Message actions (only show for sender's messages) */}
                  {isSender && !message.isSending && (
                    <div className="absolute top-0 right-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-1">
                        <button
                          onClick={() => {/* Add edit functionality */}}
                          className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                          title="Edit message"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteMessage(currentChat._id, message._id)}
                          className="p-1 rounded-full bg-red-200 hover:bg-red-300 transition-colors"
                          title="Delete message"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        
        {typingUserNames && (
          <div className="flex items-center gap-2 px-4">
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
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        {selectedImage && (
          <div className="mb-3 flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <img 
              src={URL.createObjectURL(selectedImage)} 
              alt="preview" 
              className="w-16 h-16 object-cover rounded-lg"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                {selectedImage.name}
              </p>
              <p className="text-xs text-gray-500">
                {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button 
              onClick={() => setSelectedImage(null)} 
              className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
        
        <div className="flex items-end gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
            disabled={isUploading}
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={isUploading}
              className="w-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-3 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32 disabled:opacity-50"
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
            disabled={!socket || (!newMessage.trim() && !selectedImage) || isUploading}
            className="p-3 rounded-full bg-blue-500 text-white disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors flex-shrink-0"
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
