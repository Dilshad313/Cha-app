// components/Chatbox/Chatbox.jsx
import React, { useState, useEffect, useRef } from 'react';
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
        ?.filter(m => m.sender._id !== user._id && !m.readBy?.some(r => r.user._id === user._id))
        .map(m => m._id) || [];
      if (unreadMessageIds.length > 0) {
        markMessagesAsRead(currentChat._id, unreadMessageIds);
      }
    }
  }, [currentChat, socket]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedImage) return;
    if (!currentChat) {
      toast.error('Please select a chat first');
      return;
    }

    let imageUrl = null;
    
    // Upload image if selected
    if (selectedImage) {
      try {
        const formData = new FormData();
        formData.append('image', selectedImage);
        const res = await chatsAPI.sendMessage(currentChat._id, formData);
        imageUrl = res.data.message?.image || res.data.imageUrl;
      } catch (error) {
        toast.error('Failed to upload image');
        return;
      }
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
    if (socket && !editingMessage && currentChat) {
      if (!typingTimeoutRef.current) {
        sendTypingIndicator(currentChat._id, true);
      }
      clearTimeout(typingTimeoutRef.current);
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

  // Rest of the component remains similar but with bug fixes...
  
  const isMessageRead = (message) => {
    if (!currentChat || message.sender._id === user._id) {
      const otherParticipant = currentChat.participants?.find(p => p._id !== user._id);
      return message.readBy?.some(r => r.user._id === otherParticipant?._id);
    }
    return false;
  };

  const getTypingUsers = () => {
    if (!currentChat) return [];
    const typingUserIds = Object.keys(typingUsers)
      .filter(key => key.startsWith(`${currentChat._id}-`) && typingUsers[key])
      .map(key => key.split('-')[1]);
    return currentChat.participants?.filter(p => p._id !== user._id && typingUserIds.includes(p._id)) || [];
  };

  if (!currentChat) {
    return (
      <div className="h-[75vh] relative bg-gray-800 flex flex-col text-white">
        <div className="flex h-full items-center justify-center">
          <p className="text-gray-400">Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  const otherParticipant = currentChat.participants?.find(p => p._id !== user._id);
  const isOtherUserOnline = otherParticipant && onlineUsers.includes(otherParticipant._id);
  const typingUsersList = getTypingUsers();

  return (
    <div className="h-[75vh] relative bg-gray-800 flex flex-col text-white">
      {/* Chat Header */}
      <div className="flex items-center gap-3 border-b border-gray-700 p-2 sm:p-4 bg-gray-900">
        <button onClick={toggleLeftSidebar} className="text-white md:hidden">
          <img src={assets.menu_icon} alt="Menu" className="w-6 h-6" />
        </button>
        {currentChat.isGroupChat ? (
          <>
            <img src={currentChat.groupIcon || assets.group_icon || assets.profile_img} alt="" className="w-10 h-10 rounded-full" />
            <p className="flex-1 font-medium text-lg flex items-center gap-2">
              {currentChat.chatName || currentChat.groupName}
              <img className="w-2.5 h-2.5" src={assets.green_dot} alt="" />
            </p>
          </>
        ) : (
          <>
            <img src={otherParticipant?.avatar || assets.profile_img} alt="" className="w-10 h-10 rounded-full" />
            <p className="flex-1 font-medium text-lg flex items-center gap-2">
              {otherParticipant?.name || 'Unknown User'}
              <img className="w-2.5 h-2.5" src={isOtherUserOnline ? assets.green_dot : assets.grey_dot} alt="" />
            </p>
          </>
        )}
        <button onClick={toggleRightSidebar} className="text-white md:hidden">
          <img src={assets.menu_icon} alt="Menu" className="w-6 h-6" />
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col-reverse p-2 sm:p-4 bg-gray-800">
        <div ref={messagesEndRef} />
        {typingUsersList.length > 0 && (
          <div className="px-4 text-xs italic text-gray-400">
            {typingUsersList.map(u => u.name).join(', ')} {typingUsersList.length > 1 ? 'are' : 'is'} typing...
          </div>
        )}
        {currentChat.messages?.map((message, index) => {
          const isSender = message.sender._id === user._id;
          if (message.deleted) {
            return (
              <div key={index} className={`flex my-2 px-4 ${isSender ? 'justify-end' : 'justify-start'}`}>
                <p className="bg-gray-700 text-gray-400 text-sm italic py-1 px-3 rounded-md">[Message deleted]</p>
              </div>
            );
          }
          return (
            <div key={index} className={`flex flex-col my-1 ${isSender ? 'items-end' : 'items-start'}`}>
              <div className={`flex items-end gap-2 px-4 ${isSender ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`p-2 rounded-lg max-w-xs sm:max-w-md ${isSender ? 'bg-purple-600 text-white rounded-br-none' : 'bg-gray-700 text-white rounded-bl-none'}`}>
                  {editingMessage?._id === message._id ? (
                    <div className="flex gap-2">
                      <input type="text" value={newMessage} onChange={handleInputChange} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} className="border border-gray-600 rounded p-1 text-sm bg-gray-700 text-white" />
                      <button onClick={handleSendMessage} className="py-1 px-2 bg-purple-600 text-white rounded hover:bg-purple-700">Save</button>
                      <button onClick={handleCancelEdit} className="py-1 px-2 bg-gray-600 text-white rounded hover:bg-gray-700">Cancel</button>
                    </div>
                  ) : message.image ? (
                    <img className="max-w-[230px] mb-2 rounded-lg" src={message.image} alt="Message attachment" />
                  ) : (
                    <p className="text-sm font-normal break-words">{message.content}</p>
                  )}
                </div>
              </div>
              {/* Message metadata and actions */}
              <div className={`text-xs text-gray-400 mt-1 px-4 flex items-center gap-2 ${isSender ? 'flex-row-reverse' : 'flex-row'}`}>
                <p>{formatTime(message.timestamp)}</p>
                {message.edited && <span className='italic'>Edited</span>}
                {isSender && isMessageRead(message) && <span className="text-green-400">Seen</span>}
                {isSender && !message.deleted && (
                  <>
                    <button onClick={() => handleEdit(message)} className="text-xs text-blue-400 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(message._id)} className="text-xs text-red-400 hover:underline">Delete</button>
                  </>
                )}
                <button onClick={() => handleToggleReaction(message._id)} className="text-xs text-gray-400 hover:underline">React</button>
              </div>
              
              {/* Reactions */}
              <div className={`px-4 mt-1 ${isSender ? 'flex justify-end' : ''}`}>
                {showReactions === message._id && (
                  <div className="flex gap-1 p-1 bg-gray-600 rounded-full">
                    {['👍', '❤️', '😂', '😮', '😢'].map(r => (
                      <button key={r} onClick={() => handleAddReaction(r)} className="text-lg hover:scale-125 transition-transform">{r}</button>
                    ))}
                  </div>
                )}
                <div className="flex gap-1 mt-1">
                  {message.reactions && Object.entries(message.reactions).map(([emoji, users]) => (
                    <span key={emoji} className="reaction bg-gray-600 text-xs rounded-full px-2 py-0.5 cursor-pointer" onClick={() => handleRemoveReaction(emoji)}>
                      {emoji} {users.length}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat Input */}
      <div className="flex items-center gap-3 p-2 px-4 bg-gray-900 absolute bottom-0 left-0 right-0">
        {selectedImage && (
          <div className="absolute bottom-16 left-4">
            <img src={URL.createObjectURL(selectedImage)} alt="Preview" className="max-h-24 rounded" />
            <button onClick={() => setSelectedImage(null)} className="absolute top-0 right-0 text-white bg-red-500 rounded-full w-5 h-5 flex items-center justify-center text-xs">X</button>
          </div>
        )}
        <input type="file" id="image" accept="image/png, image/jpeg, image/webp" hidden onChange={handleImageSelect} />
        <label htmlFor="image" className="cursor-pointer">
          <img src={assets.gallery_icon} alt="Attach" className="w-6 h-6" />
        </label>
        <input 
          type="text" 
          placeholder={editingMessage ? 'Edit message...' : 'Send a Message'} 
          value={newMessage} 
          onChange={handleInputChange} 
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} 
          className="flex-1 border-none outline-none text-sm bg-gray-700 text-white py-2 px-3 rounded-full" 
        />
        <button onClick={handleSendMessage} className="p-2 bg-purple-600 rounded-full hover:bg-purple-700">
          <img src={assets.send_button} alt="Send" className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

export default Chatbox;