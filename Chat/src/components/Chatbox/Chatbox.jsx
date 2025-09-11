import React, { useState, useEffect, useRef } from 'react'
import './Chatbox.css';
import assets from '../../assets/assets';
import { useApp } from '../../context/AppContext';
import { chatsAPI } from '../../config/api';

function Chatbox() {
  const [newMessage, setNewMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const messagesEndRef = useRef(null);
  const { currentChat, user, socket, sendMessage, joinChat } = useApp();

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
    }
  }, [currentChat, socket, joinChat]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedImage) return;

    try {
      if (socket) {
        sendMessage(currentChat._id, newMessage, selectedImage);
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
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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

  return (
    <div className='chat-box'>
      <div className="chat-user">
        <img src={currentChat.participants.find(p => p._id !== user._id)?.avatar || assets.profile_img} alt="" />
        <p>
          {currentChat.participants.find(p => p._id !== user._id)?.name || 'Unknown User'}
          <img className='dot' src={assets.green_dot} alt="" />
        </p>
        <img src={assets.help_icon} className='help' alt="" />
      </div>

      <div className="chat-msg">
        {currentChat.messages.map((message, index) => (
          <div key={index} className={message.sender._id === user._id ? "s-msg" : "r-msg"}>
            {message.image ? (
              <img className='msg-img' src={message.image} alt="Message attachment" />
            ) : (
              <p className="msg">{message.content}</p>
            )}
            <div>
              <img src={message.sender.avatar || assets.profile_img} alt="" />
              <p>{formatTime(message.timestamp)}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input 
          type="text" 
          placeholder='Send a Message' 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
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

export default Chatbox