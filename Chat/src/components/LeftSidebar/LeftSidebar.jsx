import React, { useState, useEffect } from 'react';
import './LeftSidebar.css';
import assets from '../../assets/assets';
import { useApp } from '../../context/AppContext';
import { usersAPI, chatsAPI } from '../../config/api';
import { debounce } from 'lodash';

function LeftSidebar() {
  const { chats, setChats, user, onlineUsers, setCurrentChat, currentChat } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query) => {
    if (query.trim() === '') {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const response = await usersAPI.searchUsers(query);
      setSearchResults(response.data.users);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const debouncedSearch = debounce(handleSearch, 300);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const handleCreateChat = async (userId) => {
    try {
      const response = await chatsAPI.getOrCreateChat(userId);
      const newChat = response.data.chat;

      // Add new chat to the list if it's not there already
      if (!chats.find(c => c._id === newChat._id)) {
        setChats(prev => [newChat, ...prev]);
      }

      setCurrentChat(newChat);
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

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
          <input
            type="text"
            placeholder='Search here....'
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>
      <div className="ls-list">
        {isSearching ? (
          searchResults.map((result) => (
            <div
              key={result._id}
              className="friends"
              onClick={() => handleCreateChat(result._id)}
            >
              <div className="friend-avatar">
                <img src={result.avatar || assets.profile_img} alt="" />
              </div>
              <div>
                <p>{result.name}</p>
              </div>
            </div>
          ))
        ) : (
          chats.map((chat) => {
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
          })
        )}
      </div>
    </div>
  );
}

export default LeftSidebar;