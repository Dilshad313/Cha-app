import React, { useState, useEffect, useRef } from 'react';
import assets from '../assets/assets';
import { useApp } from '../context/AppContext';
import { toast } from 'react-toastify';

function Chatbox({ toggleLeftSidebar, toggleRightSidebar }) {
  const [newMessage, setNewMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const {
    currentChat,
    user,
    sendMessage,
    onlineUsers,
    typingUsers,
    sendTypingIndicator,
    socket,
  } = useApp();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentChat?.messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() && !selectedImage) return;
    if (!currentChat) {
      toast.error('Please select a chat first');
      return;
    }
    sendMessage(currentChat._id, newMessage, selectedImage);
    setNewMessage("");
    setSelectedImage(null);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      sendTypingIndicator(currentChat._id, false);
    }
  };

  const handleInputChange = (e) => {
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
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const chatPartner = currentChat?.participants.find(p => p._id !== user._id);
  const typingUserNames = Object.entries(typingUsers)
    .filter(([key, value]) => key.startsWith(currentChat?._id) && value && key.split('-')[1] !== user._id)
    .map(([key, value]) => value.name)
    .join(', ');

  if (!currentChat) {
    return (
      <div className="h-full flex-col bg-gray-100 dark:bg-gray-800 hidden md:flex items-center justify-center text-gray-500 dark:text-gray-400">
        <img src={assets.logo_icon} alt="Chat App" className="w-24 h-24 mb-4 opacity-30" />
        <h2 className="text-xl">Select a chat to start messaging</h2>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-gray-100 dark:bg-gray-800">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-3 shadow-sm bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <button onClick={toggleLeftSidebar} className="text-gray-600 dark:text-gray-300 md:hidden">
            <img src={assets.menu_icon} alt="Menu" className="w-6 h-6" />
          </button>
          <img
            src={currentChat.isGroupChat ? currentChat.groupIcon || assets.avatar_icon : chatPartner?.avatar || assets.avatar_icon}
            alt="avatar"
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white">
              {currentChat.isGroupChat ? currentChat.chatName : chatPartner?.name}
            </h3>
            {!currentChat.isGroupChat && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {onlineUsers.includes(chatPartner?._id) ? 'Online' : 'Offline'}
              </p>
            )}
          </div>
        </div>
        {currentChat.isGroupChat && (
          <button onClick={toggleRightSidebar} className="text-gray-600 dark:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 h-0">
        {currentChat.messages?.map((message) => {
          const isSender = message.sender._id === user._id;
          return (
            <div key={message._id} className={`flex items-start gap-3 my-4 ${isSender ? 'flex-row-reverse' : ''}`}>
              <img
                src={isSender ? user.avatar : message.sender.avatar || assets.avatar_icon}
                alt="sender avatar"
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className={`p-3 rounded-lg max-w-xs md:max-w-md shadow ${isSender ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                {!isSender && currentChat.isGroupChat && <p className="text-xs font-semibold mb-1 text-blue-400">{message.sender.name}</p>}
                {message.content && <p className="text-sm break-words">{message.content}</p>}
                {message.image && <img src={message.image} alt="attachment" className="mt-2 rounded-lg max-w-full h-auto" />}
                <div className="flex justify-end items-center mt-1">
                  <p className={`text-xs ${isSender ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {isSender && message.isSending && <svg className="w-4 h-4 ml-1 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                </div>
              </div>
            </div>
          );
        })}
        {typingUserNames && <p className="text-xs italic text-gray-500 px-12">{typingUserNames} is typing...</p>}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        {selectedImage && (
          <div className="mb-2 flex items-center gap-2 text-sm">
            <img src={URL.createObjectURL(selectedImage)} alt="preview" className="w-16 h-16 object-cover rounded-lg" />
            <p className="text-gray-600 dark:text-gray-300">{selectedImage.name}</p>
            <button onClick={() => setSelectedImage(null)} className="ml-auto text-red-500 font-bold">&times;</button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <label htmlFor="image-upload" className="cursor-pointer p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <img src={assets.gallery_icon} alt="Upload" className="w-6 h-6 text-gray-500" />
            <input id="image-upload" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
          </label>
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-3 rounded-full outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!socket || (!newMessage.trim() && !selectedImage)}
            className="p-3 rounded-full bg-blue-500 text-white disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
          >
            <img src={assets.send_button} alt="Send" className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chatbox;