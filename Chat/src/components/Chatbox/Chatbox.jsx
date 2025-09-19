// Frontend: components/Chatbox/Chatbox.jsx
import React, { useState, useEffect, useRef } from 'react';
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
      <div className="h-[75vh] relative bg-[#f1f5ff]">
        <div className="flex h-full items-center justify-center">
          <p className="text-gray-600">Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  const otherParticipant = currentChat.participants.find(p => p._id !== user._id);
  const isOtherUserOnline = otherParticipant && onlineUsers.includes(otherParticipant._id);
  const typingUsersList = getTypingUsers();

  return (
    <div className="h-[75vh] relative bg-[#f1f5ff] flex flex-col">
      {/* Chat Header */}
      <div className="flex items-center gap-3 border-b border-gray-300 px-4 py-2">
        {currentChat.isGroup ? (
          <>
            <img src={assets.group_icon || assets.profile_img} alt="" className="w-10 h-10 rounded-full" />
            <p className="flex-1 font-medium text-lg text-gray-800 flex items-center gap-2">
              {currentChat.groupName}
              <img className="w-2.5 h-2.5" src={assets.green_dot} alt="" />
            </p>
          </>
        ) : (
          <>
            <img src={otherParticipant?.avatar || assets.profile_img} alt="" className="w-10 h-10 rounded-full" />
            <p className="flex-1 font-medium text-lg text-gray-800 flex items-center gap-2">
              {otherParticipant?.name || 'Unknown User'}
              <img
                className="w-2.5 h-2.5"
                src={isOtherUserOnline ? assets.green_dot : assets.grey_dot}
                alt=""
              />
            </p>
          </>
        )}
        <img src={assets.help_icon} className="w-6 h-6 cursor-pointer" alt="" />
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-scroll flex flex-col-reverse pb-16 px-2">
        {currentChat.messages.map((message, index) => {
          if (message.deleted) {
            return (
              <div key={index} className={`flex gap-2 px-4 ${message.sender._id === user._id ? 'justify-end' : 'flex-row-reverse justify-start'}`}>
                <p className="bg-gray-300 text-gray-600 text-sm px-3 py-1 rounded-md">[Message deleted]</p>
              </div>
            );
          }

          return (
            <div key={index} className={`flex gap-2 px-4 ${message.sender._id === user._id ? 'justify-end' : 'flex-row-reverse justify-start'}`}>
              {editingMessage?._id === message._id ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                  <button onClick={handleSendMessage} className="px-2 py-1 bg-blue-500 text-white rounded">Save</button>
                  <button onClick={handleCancelEdit} className="px-2 py-1 bg-gray-400 text-white rounded">Cancel</button>
                </div>
              ) : message.image ? (
                <img className="max-w-[230px] mb-7 rounded-lg" src={message.image} alt="Message attachment" />
              ) : (
                <p className={`text-white text-xs font-light px-3 py-2 mb-7 max-w-[200px] rounded-lg ${message.sender._id === user._id ? 'bg-blue-500 rounded-br-none' : 'bg-blue-500 rounded-bl-none'}`}>
                  {message.content}
                </p>
              )}
              <div className="text-[10px] text-center">
                <div className="flex gap-1">
                  {message.reactions && Object.entries(message.reactions).map(([emoji, users]) => (
                    <span key={emoji} className="cursor-pointer" onClick={() => handleRemoveReaction(emoji)}>
                      {emoji} {users.length}
                    </span>
                  ))}
                </div>
                <div className="flex gap-1">
                  {message.sender._id === user._id && !editingMessage && (
                    <>
                      <button onClick={() => handleEdit(message)} className="text-xs text-blue-600">Edit</button>
                      <button onClick={() => handleDelete(message._id)} className="text-xs text-red-600">Delete</button>
                    </>
                  )}
                  <button onClick={() => handleToggleReaction(message._id)} className="text-xs text-gray-600">React</button>
                </div>
                {showReactions === message._id && (
                  <div className="flex gap-1 mt-1">
                    {['👍', '❤️', '😂', '😮', '😢'].map(r => (
                      <button key={r} onClick={() => handleAddReaction(r)} className="text-lg">{r}</button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                  <img src={message.sender.avatar || assets.profile_img} alt="" className="w-6 h-6 rounded-full" />
                  <p>{formatTime(message.timestamp)}</p>
                  {message.edited && <span>Edited</span>}
                  {isMessageRead(message) && <span className="text-green-500">Seen</span>}
                </div>
              </div>
            </div>
          );
        })}
        {typingUsersList.length > 0 && (
          <div className="px-4 text-xs italic text-gray-500">
            {typingUsersList.map(u => u.name).join(', ')} {typingUsersList.length > 1 ? 'are' : 'is'} typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white absolute bottom-0 left-0 right-0">
        <input
          type="text"
          placeholder={editingMessage ? 'Edit message...' : 'Send a Message'}
          value={newMessage}
          onChange={handleInputChange}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          className="flex-1 border-none outline-none text-sm"
        />
        <input
          type="file"
          id="image"
          accept="image/png, image/jpeg, image/webp"
          hidden
          onChange={handleImageSelect}
        />
        <label htmlFor="image" className="cursor-pointer">
          <img src={assets.gallery_icon} alt="Attach" className="w-5" />
        </label>
        <img
          src={assets.send_button}
          alt="Send"
          onClick={handleSendMessage}
          className="w-7 cursor-pointer"
        />
      </div>
    </div>
  );
}

export default Chatbox;
