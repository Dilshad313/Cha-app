// Frontend: components/LeftSidebar/LeftSidebar.jsx
import React, { useState, useEffect } from "react";
import './LeftSidebar.css';
import assets from "../assets/assets";
import { useApp } from "../context/AppContext";
import GroupChatModal from "./GroupChatModal";
import { usersAPI, chatsAPI } from "../config/api";
import { debounce } from "lodash";
import { toast } from "react-toastify";

/* -------------------- Reusable Components -------------------- */
const UserAvatar = ({ src, isOnline }) => (
  <div className="user-avatar-container">
    <img src={src || assets.profile_img} alt="avatar" className="user-avatar" />
    {typeof isOnline === "boolean" && (
      <img
        className="status-indicator"
        src={isOnline ? assets.green_dot : assets.grey_dot}
        alt="status"
      />
    )}
  </div>
);

const FriendItem = ({ friend, isOnline, isActive, onClick }) => (
  <div
    className={`friend-item ${isActive ? "active" : ""}`}
    onClick={onClick}
  >
    <UserAvatar src={friend.avatar} isOnline={isOnline} />
    <div>
      <p className="friend-name">{friend.name}</p>
      <span className="friend-status">Click to chat</span>
    </div>
  </div>
);

const GroupItem = ({ group, isActive, onClick }) => (
  <div
    className={`group-item ${isActive ? "active" : ""}`}
    onClick={onClick}
  >
    <div className="group-icon-container">
      <img src={assets.group_icon || assets.profile_img} alt="group" className="group-icon" />
    </div>
    <div>
      <p className="group-name">{group.groupName}</p>
      <span className="group-members">Group Chat ({group.participants.length})</span>
    </div>
  </div>
);

const RequestItem = ({ request, onAccept, onReject }) => (
  <div className="request-item">
    <UserAvatar src={request.from.avatar} />
    <div className="request-info">
      <p className="request-name">{request.from.name}</p>
      <span className="request-label">Friend Request</span>
    </div>
    <div className="request-actions">
      <button onClick={() => onAccept(request._id)} className="accept-button">Accept</button>
      <button onClick={() => onReject(request._id)} className="reject-button">Reject</button>
    </div>
  </div>
);

const SearchResultItem = ({ result, isOnline, onChat, onAdd }) => (
  <div className="search-result-item">
    <UserAvatar src={result.avatar} isOnline={isOnline} />
    <div className="search-result-info">
      <p className="search-result-name">{result.name}</p>
      <span className="search-result-username">{result.username}</span>
    </div>
    <div className="search-result-actions">
      <button onClick={() => onChat(result._id)} className="chat-button">Chat</button>
      <button onClick={() => onAdd(result._id)} className="add-button">Add</button>
    </div>
  </div>
);

/* -------------------- Main Sidebar Component -------------------- */
function LeftSidebar({ closeSidebar }) {
  const {
    chats,
    setChats,
    user,
    onlineUsers,
    setCurrentChat,
    currentChat,
    friends,
    friendRequests,
    groups,
    loadFriends,
    loadFriendRequests,
    createGroup,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("friends"); // friends | groups | requests
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  
  // Search users with debounce
  const searchUsers = debounce(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    try {
      setIsSearching(true);
      const response = await usersAPI.searchUsers(query);
      // Filter out the current user from search results
      setSearchResults(response.data.users.filter(u => u._id !== user._id));
      setIsSearching(false);
    } catch (error) {
      console.error("Error searching users:", error);
      toast.error("Failed to search users");
      setIsSearching(false);
    }
  }, 500);

  useEffect(() => {
    loadFriends();
    loadFriendRequests();
  }, []);

  /* -------------------- Search -------------------- */
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
    
    // If search query is not empty, switch to search tab
    if (query.trim()) {
      setActiveTab('search');
    } else if (activeTab === 'search') {
      setActiveTab('friends');
    }
  };

  /* -------------------- Chat & Friends -------------------- */
  const handleCreateChat = async (userId) => {
    try {
      const response = await chatsAPI.getOrCreateChat(userId);
      const newChat = response.data.chat;

      if (!chats.find((c) => c._id === newChat._id)) {
        setChats((prev) => [newChat, ...prev]);
      }

      setCurrentChat(newChat);
      setSearchQuery("");
      setSearchResults([]);
    } catch {
      toast.error("Error creating chat");
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      await usersAPI.sendFriendRequest(userId);
      toast.success("Friend request sent");
    } catch {
      toast.error("Error sending request");
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await usersAPI.acceptFriendRequest(requestId);
      loadFriendRequests();
      loadFriends();
      toast.success("Friend request accepted");
    } catch {
      toast.error("Error accepting request");
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await usersAPI.rejectFriendRequest(requestId);
      loadFriendRequests();
      toast.success("Request rejected");
    } catch {
      toast.error("Error rejecting request");
    }
  };

  /* -------------------- Render -------------------- */
  return (
    <div className="sidebar-container">
      {/* Top Nav */}
      <div className="top-nav">
        <div className="logo-container">
          <img src={assets.logo} className="logo" alt="logo" />
          <button onClick={closeSidebar} className="close-button">
            <img src={assets.close_icon} alt="Close" className="close-icon" />
          </button>
          <div className="menu-container">
            <img src={assets.menu_icon} alt="menu" className="menu-icon" />
            <div className="menu-dropdown">
              <p className="menu-item">Edit profile</p>
              <hr />
              <p className="menu-item">Logout</p>
            </div>
          </div>
        </div>
        <div className="search-container">
          <img src={assets.search_icon} alt="search" className="search-icon" />
          <input
            type="text"
            placeholder="Search here..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button onClick={() => setActiveTab("friends")} className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}>
          Friends ({friends.length})
        </button>
        <button onClick={() => setActiveTab("groups")} className={`tab-button ${activeTab === 'groups' ? 'active' : ''}`}>
          Groups ({groups.length})
        </button>
        <button onClick={() => setActiveTab("requests")} className={`tab-button ${activeTab === 'requests' ? 'active' : ''}`}>
          Requests ({friendRequests.length})
        </button>
        {searchQuery.trim() && (
          <button onClick={() => setActiveTab("search")} className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}>
            Search
          </button>
        )}
      </div>

      {/* List */}
      <div className="list-container">
        {isSearching ? (
          <div className="spinner-container">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            {/* Search Results */}
            {activeTab === "search" && (
              <>
                {searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <SearchResultItem
                      key={result._id}
                      result={result}
                      isOnline={onlineUsers.includes(result._id)}
                      onChat={() => handleCreateChat(result._id)}
                      onAdd={() => handleSendRequest(result._id)}
                    />
                  ))
                ) : (
                  <div className="empty-search-message">
                    {searchQuery.trim() ? "No users found" : "Type to search users"}
                  </div>
                )}
              </>
            )}
            
            {/* Friend Requests */}
            {activeTab === "requests" &&
              friendRequests.map((request) => (
                <RequestItem
                  key={request._id}
                  request={request}
                  onAccept={handleAcceptRequest}
                  onReject={handleRejectRequest}
                />
              ))}

            {/* Group Chats */}
            {activeTab === "groups" &&
              groups.map((group) => (
                <GroupItem
                  key={group._id}
                  group={group}
                  isActive={currentChat?._id === group._id}
                  onClick={() => setCurrentChat(group)}
                />
              ))}

            {/* Default Chats */}
            {activeTab === "friends" &&
              chats.map((chat) => {
                const other = chat.participants.find((p) => p._id !== user._id);
                if (!other || chat.isGroup) return null;
                const lastMessage = chat.messages.at(-1);
                return (
                  <FriendItem
                    key={chat._id}
                    friend={{ ...other, name: other.name }}
                    isOnline={onlineUsers.includes(other._id)}
                    isActive={currentChat?._id === chat._id}
                    onClick={() => setCurrentChat(chat)}
                  />
                );
              })}
          </>
        )}
      </div>

      {/* Create Group Button */}
      <button
        className="create-group-button"
        onClick={() => setIsGroupModalOpen(true)}
      >
        Create Group
      </button>

      <GroupChatModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
      />
    </div>
  );
}

export default LeftSidebar;
