import React from 'react';
import './LeftSidebar.css';
import assets from '../../assets/assets';
import { useApp } from '../../context/AppContext';

function LeftSidebar() {
  const { chats, user, onlineUsers, setCurrentChat, currentChat } = useApp();

  return (
    <div className='ls'>
      <div className="ls-top">
        <div className="ls-nav">
          <img src={assets.logo} className='logo' alt="" />
          <div className="menu">
            <img src={assets.menu_icon} alt="" />
            <div className='sub-menu'>
              <p>Edit profile</p>
              <hr />
              <p>Logout</p>
            </div>
          </div>
        </div>
        <div className="ls-search">
          <img src={assets.search_icon} alt="" />
          <input type="text" placeholder='Search here....' />
        </div>
      </div>
      <div className="ls-list">
        {chats.map((chat) => {
          const otherParticipant = chat.participants.find(p => p._id !== user._id);
          if (!otherParticipant) return null;

          const isOnline = onlineUsers.includes(otherParticipant._id);
          const lastMessage = chat.messages[chat.messages.length - 1];

          return (
            <div
              key={chat._id}
              className={`friends ${currentChat?._id === chat._id ? 'active' : ''}`}
              onClick={() => setCurrentChat(chat)}
            >
              <div className="friend-avatar">
                <img src={otherParticipant.avatar || assets.profile_img} alt="" />
                <img className='dot' src={isOnline ? assets.green_dot : assets.grey_dot} alt="" />
              </div>
              <div>
                <p>{otherParticipant.name}</p>
                <span>{lastMessage?.content || 'No messages yet'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LeftSidebar;