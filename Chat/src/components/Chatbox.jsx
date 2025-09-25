import React, { useState, useEffect, useRef } from 'react';
import assets from '../assets/assets';
import { useApp } from '../context/AppContext';
import { toast } from 'react-toastify';

function Chatbox({ toggleLeftSidebar, toggleRightSidebar }) {
  const [newMessage, setNewMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  const { 
    currentChat, 
    user, 
    socket, 
    sendMessage, 
    joinChat, 
    onlineUsers, 
    typingUsers, 
    sendTypingIndicator,
    socketConnected 
  } = useApp();

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages]);

  // Join chat when currentChat changes
  useEffect(() => {
    if (currentChat && socketConnected) {
      joinChat(currentChat._id);
    }
  }, [currentChat, socketConnected, joinChat]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedImage) return;
    if (!currentChat) {
      toast.error('Please select a chat first');
      return;
    }

    try {
      if (editingMessage) {
        // Edit existing message
        if (socketConnected) {
          socket.emit('edit-message', {
            chatId: currentChat._id,
            messageId: editingMessage._id,
            content: newMessage
          });
        }
        setEditingMessage(null);
      } else {
        // Send new message
        sendMessage(currentChat._id, newMessage, selectedImage);
        sendTypingIndicator(currentChat._id, false);
      }

      setNewMessage("");
      setSelectedImage(null);
      scrollToBottom();
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    if (socketConnected && !editingMessage && currentChat) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Send typing start
      sendTypingIndicator(currentChat._id, true);
      
      // Set timeout to send typing stop
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(currentChat._id, false);
        typingTimeoutRef.current = null;
      }, 3000);
    }
  };

  // Get typing users for current chat
  const getTypingUsers = () => {
    if (!currentChat) return [];
    
    return Object.values(typingUsers)
      .filter(typingData => 
        typingData.isTyping && 
        typingData.userId !== user._id
      )
      .map(typingData => typingData.userName);
  };

  const typingUsersList = getTypingUsers();

  if (!currentChat) {
    return (
      <div className="h-[75vh] relative bg-gray-800 flex flex-col text-white">
        <div className="flex h-full items-center justify-center">
          <p className="text-gray-400">Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[75vh] relative bg-gray-800 flex flex-col text-white">
      {/* Chat Header */}
      <div className="flex items-center gap-3 border-b border-gray-700 p-4 bg-gray-900">
        <button onClick={toggleLeftSidebar} className="text-white md:hidden">
          <img src={assets.menu_icon} alt="Menu" className="w-6 h-6" />
        </button>
        
        {/* Chat header content */}
        
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-800">
        {/* Connection status */}
        {!socketConnected && (
          <div className="text-center text-yellow-400 text-sm mb-4">
            Connecting to chat...
          </div>
        )}

        {/* Typing indicators */}
        {typingUsersList.length > 0 && (
          <div className="px-4 text-xs italic text-gray-400 mb-2">
            {typingUsersList.join(', ')} {typingUsersList.length > 1 ? 'are' : 'is'} typing...
          </div>
        )}

        {/* Messages */}
        {currentChat.messages?.map((message, index) => (
          <div key={message._id || index} className={`flex my-2 ${message.sender._id === user._id ? 'justify-end' : 'justify-start'}`}>
            {/* Message content */}
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="flex items-center gap-3 p-4 bg-gray-900">
        <input 
          type="text" 
          placeholder={editingMessage ? 'Edit message...' : 'Type a message...'} 
          value={newMessage} 
          onChange={handleInputChange}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          className="flex-1 bg-gray-700 text-white p-2 rounded"
        />
        <button 
          onClick={handleSendMessage}
          disabled={!socketConnected}
          className={`p-2 rounded ${socketConnected ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 cursor-not-allowed'}`}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default Chatbox;