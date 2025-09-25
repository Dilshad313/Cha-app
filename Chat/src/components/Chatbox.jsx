// Frontend: components/Chatbox/Chatbox.jsx
import React, { useState, useEffect, useRef } from 'react';
import './Chatbox.css';
import assets from '../assets/assets';
import { useApp } from '../context/AppContext';
import { toast } from 'react-toastify';
import { chatsAPI } from '../config/api';

function Chatbox({ toggleLeftSidebar, toggleRightSidebar }) {
  const [newMessage, setNewMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showReactions, setShowReactions] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { currentChat, user, socket, sendMessage, joinChat, onlineUsers, typingUsers, sendTypingIndicator, editMessage, deleteMessage, addReaction, removeReaction, markMessagesAsRead } = useApp();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages]);

  useEffect(() => {
    if (currentChat && socket) {
      joinChat(currentChat._id);
      const unreadMessageIds = currentChat.messages
        .filter(m => m.sender._id !== user._id && !m.readBy?.some(r => r.user._id === user._id))
        .map(m => m._id);
      if (unreadMessageIds.length > 0) {
        markMessagesAsRead(currentChat._id, unreadMessageIds);
      }
    }
  }, [currentChat, socket, joinChat, markMessagesAsRead]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedImage) return;
    if (!currentChat) {
      toast.error('Please select a chat first');
      return;
    }

    let imageUrl = null;
    if (selectedImage) {
      // Upload image to backend or storage and get URL
      const formData = new FormData();
      formData.append('image', selectedImage);
      // You should have an API endpoint for image upload, e.g. /api/chats/:chatId/message
      const res = await chatsAPI.sendMessage(currentChat._id, formData);
      imageUrl = res.data?.image; // Adjust based on your backend response
    }

    if (editingMessage) {
      editMessage(currentChat._id, editingMessage._id, newMessage);
      setEditingMessage(null);
    } else {
      sendMessage(currentChat._id, newMessage, imageUrl);
      sendTypingIndicator(currentChat._id, false);
    }

    setNewMessage("");
    setSelectedImage(null);
    scrollToBottom();
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (socket && !editingMessage) {
      if (!typingTimeoutRef.current) {
        sendTypingIndicator(currentChat._id, true);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(currentChat._id, false);
        typingTimeoutRef.current = null;
      }, 3000);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const handleEdit = (message) => {
    setEditingMessage(message);
    setNewMessage(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setNewMessage("");
  };

  const handleDelete = (messageId) => {
    if (window.confirm('Delete this message?')) {
      deleteMessage(currentChat._id, messageId);
    }
  };

  const handleToggleReaction = (messageId) => {
    setShowReactions(showReactions === messageId ? null : messageId);
  };

  const handleAddReaction = (reaction) => {
    if (showReactions) {
      addReaction(currentChat._id, showReactions, reaction);
      setShowReactions(null);
    }
  };

  const handleRemoveReaction = (reaction) => {
    if (showReactions) {
      removeReaction(currentChat._id, showReactions, reaction);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isMessageRead = (message) => {
    if (!currentChat || message.sender._id === user._id) {
      const otherParticipant = currentChat.participants.find(p => p._id !== user._id);
      return message.readBy?.some(r => r.user._id === otherParticipant?._id);
    }
    return false;
  };

  const getTypingUsers = () => {
    if (!currentChat) return [];
    const typingUserIds = Object.keys(typingUsers)
      .filter(key => key.startsWith(`${currentChat._id}-`) && typingUsers[key])
      .map(key => key.split('-')[1]);
    return currentChat.participants.filter(p => p._id !== user._id && typingUserIds.includes(p._id));
  };

  if (!currentChat) {
    return (
      <div className="chatbox-container">
        <div className="flex h-full items-center justify-center">
          <p className="text-gray-400">Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  const otherParticipant = currentChat.participants.find(p => p._id !== user._id);
  const isOtherUserOnline = otherParticipant && onlineUsers.includes(otherParticipant._id);
  const typingUsersList = getTypingUsers();

  return (
    <div className="chatbox-container">
      {/* Chat Header */}
      <div className="chat-header">
        <button onClick={toggleLeftSidebar} className="menu-button">
          <img src={assets.menu_icon} alt="Menu" className="menu-icon" />
        </button>
        {currentChat.isGroupChat ? (
          <>
            <img src={assets.group_icon || assets.profile_img} alt="" className="group-icon" />
            <p className="chat-name">
              {currentChat.groupName}
              <img className="online-indicator" src={assets.green_dot} alt="" />
            </p>
          </>
        ) : (
          <>
            <img src={otherParticipant?.avatar || assets.profile_img} alt="" className="group-icon" />
            <p className="chat-name">
              {otherParticipant?.name || 'Unknown User'}
              <img
                className="online-indicator"
                src={isOtherUserOnline ? assets.green_dot : assets.grey_dot}
                alt=""
              />
            </p>
          </>
        )}
        <button onClick={toggleRightSidebar} className="menu-button">
          <img src={assets.menu_icon} alt="Menu" className="menu-icon" />
        </button>
        <img src={assets.help_icon} className="help-icon" alt="" />
      </div>

      {/* Chat Messages */}
      <div className="chat-messages">
        {currentChat.messages.map((message, index) => {
          if (message.deleted) {
            return (
              <div key={index} className={`message-container ${message.sender._id === user._id ? 'sent' : 'received'}`}>
                <p className="deleted-message">[Message deleted]</p>
              </div>
            );
          }

          return (
            <div key={index} className={`message-container ${message.sender._id === user._id ? 'sent' : 'received'}`}>
              {editingMessage?._id === message._id ? (
                <div className="edit-message-container">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="edit-message-input"
                  />
                  <button onClick={handleSendMessage} className="save-button">Save</button>
                  <button onClick={handleCancelEdit} className="cancel-button">Cancel</button>
                </div>
              ) : message.image ? (
                <img className="message-image" src={message.image} alt="Message attachment" />
              ) : (
                <p className={`message-content ${message.sender._id === user._id ? 'sent' : 'received'}`}>
                  {message.content}
                </p>
              )}
              <div className="message-info">
                <div className="reactions-container">
                  {message.reactions && Object.entries(message.reactions).map(([emoji, users]) => (
                    <span key={emoji} className="reaction" onClick={() => handleRemoveReaction(emoji)}>
                      {emoji} {users.length}
                    </span>
                  ))}
                </div>
                <div className="message-actions">
                  {message.sender._id === user._id && !editingMessage && (
                    <>
                      <button onClick={() => handleEdit(message)} className="action-button">Edit</button>
                      <button onClick={() => handleDelete(message._id)} className="delete-button">Delete</button>
                    </>
                  )}
                  <button onClick={() => handleToggleReaction(message._id)} className="react-button">React</button>
                </div>
                {showReactions === message._id && (
                  <div className="add-reaction-container">
                    {['👍', '❤️', '😂', '😮', '😢'].map(r => (
                      <button key={r} onClick={() => handleAddReaction(r)} className="add-reaction-button">{r}</button>
                    ))}
                  </div>
                )}
                <div className="message-meta">
                  <img src={message.sender.avatar || assets.profile_img} alt="" className="sender-avatar" />
                  <p>{formatTime(message.timestamp)}</p>
                  {message.edited && <span className='edited-indicator'>Edited</span>}
                  {isMessageRead(message) && <span className="seen-indicator">Seen</span>}
                </div>
              </div>
            </div>
          );
        })}
        {typingUsersList.length > 0 && (
          <div className="typing-indicator">
            {typingUsersList.map(u => u.name).join(', ')} {typingUsersList.length > 1 ? 'are' : 'is'} typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="chat-input-container">
        <input
          type="text"
          placeholder={editingMessage ? 'Edit message...' : 'Send a Message'}
          value={newMessage}
          onChange={handleInputChange}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          className="chat-input"
        />
        {selectedImage && (
          <div className="image-preview-container">
            <img src={URL.createObjectURL(selectedImage)} alt="Preview" className="image-preview" />
            <button onClick={() => setSelectedImage(null)} className="remove-image-button">Remove</button>
          </div>
        )}
        <input
          type="file"
          id="image"
          accept="image/png, image/jpeg, image/webp"
          hidden
          onChange={handleImageSelect}
        />
        <label htmlFor="image" className="attach-button-label">
          <img src={assets.gallery_icon} alt="Attach" className="attach-icon" />
        </label>
        <button onClick={handleSendMessage} className="send-button">
          <img
            src={assets.send_button}
            alt="Send"
            className="send-icon"
          />
        </button>
      </div>
    </div>
  );
}

export default Chatbox;
