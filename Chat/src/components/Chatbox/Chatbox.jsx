// Frontend: components/Chatbox/Chatbox.jsx
import React, { useState, useEffect, useRef } from 'react';
import './Chatbox.css';
import assets from '../../assets/assets';
import { useApp } from '../../context/AppContext';
import { toast } from 'react-toastify';

function Chatbox() {
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
      // Mark unread messages as read
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

    if (editingMessage) {
      editMessage(currentChat._id, editingMessage._id, newMessage);
      setEditingMessage(null);
    } else {
      try {
        if (socket) {
          sendMessage(currentChat._id, newMessage, selectedImage);
          sendTypingIndicator(currentChat._id, false);
        } else {
          // Fallback to API if socket is not available
          const formData = new FormData();
          formData.append('content', newMessage);
          if (selectedImage) {
            formData.append('image', selectedImage);
          }
          
          await chatsAPI.sendMessage(currentChat._id, formData);
        }

        setNewMessage("");
        setSelectedImage(null);
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Error sending message');
      }
    }
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
      <div className='chat-box'>
        <div className="no-chat-selected">
          <p>Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  const otherParticipant = currentChat.participants.find(p => p._id !== user._id);
  const isOtherUserOnline = otherParticipant && onlineUsers.includes(otherParticipant._id);
  const typingUsersList = getTypingUsers();

  return (
    <div className='chat-box'>
      <div className="chat-user">
        {currentChat.isGroup ? (
          <>
            <img src={assets.group_icon || assets.profile_img} alt="" />
            <p>{currentChat.groupName} <img className='dot' src={assets.green_dot} alt="" /></p>
          </>
        ) : (
          <>
            <img src={otherParticipant?.avatar || assets.profile_img} alt="" />
            <p>
              {otherParticipant?.name || 'Unknown User'}
              <img className='dot' src={isOtherUserOnline ? assets.green_dot : assets.grey_dot} alt="" />
            </p>
          </>
        )}
        <img src={assets.help_icon} className='help' alt="" />
      </div>

      <div className="chat-msg">
        {currentChat.messages.map((message, index) => {
          if (message.deleted) {
            return (
              <div key={index} className={message.sender._id === user._id ? "s-msg" : "r-msg"}>
                <p className="msg deleted">[Message deleted]</p>
              </div>
            );
          }

          return (
            <div key={index} className={message.sender._id === user._id ? "s-msg" : "r-msg"}>
              {editingMessage?._id === message._id ? (
                <div className="edit-input">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button onClick={handleSendMessage}>Save</button>
                  <button onClick={handleCancelEdit}>Cancel</button>
                </div>
              ) : message.image ? (
                <img className='msg-img' src={message.image} alt="Message attachment" />
              ) : (
                <p className="msg">{message.content}</p>
              )}
              <div className="message-footer">
                <div className="reactions-display">
                  {message.reactions && Object.entries(message.reactions).map(([emoji, users]) => (
                    <span key={emoji} className="reaction" onClick={() => handleRemoveReaction(emoji)}>
                      {emoji} {users.length}
                    </span>
                  ))}
                </div>
                <div className="message-actions">
                  {message.sender._id === user._id && !editingMessage && (
                    <>
                      <button onClick={() => handleEdit(message)}>Edit</button>
                      <button onClick={() => handleDelete(message._id)}>Delete</button>
                    </>
                  )}
                  <button onClick={() => handleToggleReaction(message._id)}>React</button>
                </div>
                {showReactions === message._id && (
                  <div className="reactions-picker">
                    {['👍', '❤️', '😂', '😮', '😢'].map(r => (
                      <button key={r} onClick={() => handleAddReaction(r)}>{r}</button>
                    ))}
                  </div>
                )}
                <div className="msg-meta">
                  <img src={message.sender.avatar || assets.profile_img} alt="" />
                  <p>{formatTime(message.timestamp)}</p>
                  {message.edited && <span>Edited</span>}
                  {isMessageRead(message) && <span className="read-receipt">Seen</span>}
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

      <div className="chat-input">
        <input 
          type="text" 
          placeholder={editingMessage ? 'Edit message...' : 'Send a Message'} 
          value={newMessage}
          onChange={handleInputChange}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <input 
          type="file" 
          id='image' 
          accept='image/png, image/jpeg, image/webp' 
          hidden 
          onChange={handleImageSelect}
        />
        <label htmlFor="image">
          <img src={assets.gallery_icon} alt="Attach image" />
        </label>
        <img 
          src={assets.send_button} 
          alt="Send" 
          onClick={handleSendMessage}
          style={{ cursor: 'pointer' }}
        />
      </div>
    </div>
  )
}

export default Chatbox;