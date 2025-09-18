// Frontend: components/LeftSidebar/LeftSidebar.jsx
import React, { useState, useEffect } from 'react';
import './LeftSidebar.css';
import assets from '../../assets/assets';
import { useApp } from '../../context/AppContext';
import { usersAPI, chatsAPI } from '../../config/api';
import { debounce } from 'lodash';
import { toast } from 'react-toastify';

function LeftSidebar() {
  const { chats, setChats, user, onlineUsers, setCurrentChat, currentChat, friends, friendRequests, groups, loadFriends, loadFriendRequests } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  useEffect(() => {
    loadFriends();
    loadFriendRequests();
  }, []);

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
      toast.error('Error searching users');
    } finally {
      setIsSearching(false);
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

      if (!chats.find(c => c._id === newChat._id)) {
        setChats(prev => [newChat, ...prev]);
      }

      setCurrentChat(newChat);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Error creating chat');
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      await usersAPI.sendFriendRequest(userId);
      toast.success('Friend request sent');
      // Refresh search results or handle UI update
    } catch (error) {
      toast.error('Error sending request');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await usersAPI.acceptFriendRequest(requestId);
      loadFriendRequests();
      loadFriends();
      toast.success('Friend request accepted');
    } catch (error) {
      toast.error('Error accepting request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await usersAPI.rejectFriendRequest(requestId);
      loadFriendRequests();
      toast.success('Request rejected');
    } catch (error) {
      toast.error('Error rejecting request');
    }
  };

  const handleToggleParticipant = (userId) => {
    setSelectedParticipants(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedParticipants.length === 0) {
      toast.error('Group name and participants required');
      return;
    }
    try {
      await useApp().createGroup(groupName, selectedParticipants);
      toast.success('Group created successfully');
      setShowCreateGroup(false);
      setGroupName('');
      setSelectedParticipants([]);
    } catch (error) {
      toast.error('Error creating group');
    }
  };

  const renderSearchResults = () => (
    searchResults.map((result) => (
      <div key={result._id} className="friends search-result">
        <div className="friend-avatar">
          <img src={result.avatar || assets.profile_img} alt="" />
          {onlineUsers.includes(result._id) && <img className='dot' src={assets.green_dot} alt="" />}
        </div>
        <div>
          <p>{result.name}</p>
          <span>{result.username}</span>
        </div>
        <div className="actions">
          <button onClick={() => handleCreateChat(result._id)}>Chat</button>
          <button onClick={() => handleSendRequest(result._id)}>Add Friend</button>
        </div>
      </div>
    ))
  );

  const renderRequests = () => (
    friendRequests.map(req => (
      <div key={req._id} className="friends request">
        <div className="friend-avatar">
          <img src={req.from.avatar || assets.profile_img} alt="" />
        </div>
        <div>
          <p>{req.from.name}</p>
          <span>Friend Request</span>
        </div>
        <div className="actions">
          <button onClick={() => handleAcceptRequest(req._id)}>Accept</button>
          <button onClick={() => handleRejectRequest(req._id)}>Reject</button>
        </div>
      </div>
    ))
  );

  const renderFriends = () => (
    friends.map(friend => {
      const isOnline = onlineUsers.includes(friend._id);
      return (
        <div key={friend._id} className={`friends ${currentChat?.participants.some(p => p._id === friend._id) ? 'active' : ''}`} onClick={() => handleCreateChat(friend._id)}>
          <div className="friend-avatar">
            <img src={friend.avatar || assets.profile_img} alt="" />
            <img className='dot' src={isOnline ? assets.green_dot : assets.grey_dot} alt="" />
          </div>
          <div>
            <p>{friend.name}</p>
            <span>Click to chat</span>
          </div>
        </div>
      );
    })
  );

  const renderGroups = () => (
    groups.map(group => (
      <div key={group._id} className={`friends group ${currentChat?._id === group._id ? 'active' : ''}`} onClick={() => setCurrentChat(group)}>
        <div className="friend-avatar group-avatar">
          <img src={assets.group_icon || assets.profile_img} alt="" /> {/* Assume group icon */}
        </div>
        <div>
          <p>{group.groupName}</p>
          <span>Group Chat ({group.participants.length})</span>
        </div>
      </div>
    ))
  );

  const renderCreateGroupModal = () => (
    showCreateGroup && (
      <div className="modal-overlay">
        <div className="modal">
          <h3>Create New Group</h3>
          <input 
            type="text" 
            placeholder="Group Name" 
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <p>Select Participants:</p>
          {/* Simplified: use search for selection */}
          <input 
            type="text" 
            placeholder="Search users to add" 
            onChange={handleSearchChange}
          />
          {searchResults.map(user => (
            <div key={user._id} className="participant-select">
              <input 
                type="checkbox" 
                checked={selectedParticipants.includes(user._id)}
                onChange={() => handleToggleParticipant(user._id)}
              />
              <span>{user.name}</span>
            </div>
          ))}
          <div className="modal-actions">
            <button onClick={handleCreateGroup}>Create</button>
            <button onClick={() => setShowCreateGroup(false)}>Cancel</button>
          </div>
        </div>
      </div>
    )
  );

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
      <div className="ls-tabs">
        <button onClick={() => { setShowFriends(!showFriends); setShowGroups(false); setShowRequests(false); }}>
          Friends ({friends.length})
        </button>
        <button onClick={() => { setShowGroups(!showGroups); setShowFriends(false); setShowRequests(false); }}>
          Groups ({groups.length})
        </button>
        <button onClick={() => { setShowRequests(!showRequests); setShowFriends(false); setShowGroups(false); }}>
          Requests ({friendRequests.length})
        </button>
      </div>
      <div className="ls-list">
        {isSearching && <p>Searching...</p>}
        {searchQuery && !isSearching && renderSearchResults()}
        {!searchQuery && (
          <>
            {showRequests && renderRequests()}
            {showFriends && renderFriends()}
            {showGroups && renderGroups()}
            {chats.map((chat) => {
              const otherParticipant = chat.participants.find(p => p._id !== user._id);
              if (!otherParticipant || chat.isGroup) return null; // Skip groups here
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
          </>
        )}
      </div>
      <button className="create-group-btn" onClick={() => setShowCreateGroup(true)}>
        Create Group
      </button>
      {renderCreateGroupModal()}
    </div>
  );
}

export default LeftSidebar;