// Frontend: components/LeftSidebar/LeftSidebar.jsx
import React, { useState, useEffect } from "react";
import "./LeftSidebar.css";
import assets from "../../assets/assets";
import { useApp } from "../../context/AppContext";
import { usersAPI, chatsAPI } from "../../config/api";
import { debounce } from "lodash";
import { toast } from "react-toastify";

/* -------------------- Reusable Components -------------------- */
const UserAvatar = ({ src, isOnline }) => (
  <div className="friend-avatar">
    <img src={src || assets.profile_img} alt="avatar" />
    {typeof isOnline === "boolean" && (
      <img
        className="dot"
        src={isOnline ? assets.green_dot : assets.grey_dot}
        alt="status"
      />
    )}
  </div>
);

const FriendItem = ({ friend, isOnline, isActive, onClick }) => (
  <div
    className={`friends ${isActive ? "active" : ""}`}
    onClick={onClick}
  >
    <UserAvatar src={friend.avatar} isOnline={isOnline} />
    <div>
      <p>{friend.name}</p>
      <span>Click to chat</span>
    </div>
  </div>
);

const GroupItem = ({ group, isActive, onClick }) => (
  <div
    className={`friends group ${isActive ? "active" : ""}`}
    onClick={onClick}
  >
    <div className="friend-avatar group-avatar">
      <img src={assets.group_icon || assets.profile_img} alt="group" />
    </div>
    <div>
      <p>{group.groupName}</p>
      <span>Group Chat ({group.participants.length})</span>
    </div>
  </div>
);

const RequestItem = ({ request, onAccept, onReject }) => (
  <div className="friends request">
    <UserAvatar src={request.from.avatar} />
    <div>
      <p>{request.from.name}</p>
      <span>Friend Request</span>
    </div>
    <div className="actions">
      <button onClick={() => onAccept(request._id)}>Accept</button>
      <button onClick={() => onReject(request._id)}>Reject</button>
    </div>
  </div>
);

const SearchResultItem = ({ result, isOnline, onChat, onAdd }) => (
  <div className="friends search-result">
    <UserAvatar src={result.avatar} isOnline={isOnline} />
    <div>
      <p>{result.name}</p>
      <span>{result.username}</span>
    </div>
    <div className="actions">
      <button onClick={() => onChat(result._id)}>Chat</button>
      <button onClick={() => onAdd(result._id)}>Add Friend</button>
    </div>
  </div>
);

/* -------------------- Main Sidebar Component -------------------- */
function LeftSidebar() {
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
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  useEffect(() => {
    loadFriends();
    loadFriendRequests();
  }, []);

  /* -------------------- Search -------------------- */
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const response = await usersAPI.searchUsers(query);
      setSearchResults(response.data.users);
    } catch (error) {
      toast.error("Error searching users");
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

  /* -------------------- Group -------------------- */
  const handleToggleParticipant = (userId) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedParticipants.length === 0) {
      toast.error("Group name and participants required");
      return;
    }
    try {
      await createGroup(groupName, selectedParticipants);
      toast.success("Group created successfully");
      setShowCreateGroup(false);
      setGroupName("");
      setSelectedParticipants([]);
    } catch {
      toast.error("Error creating group");
    }
  };

  /* -------------------- Render -------------------- */
  return (
    <div className="ls">
      {/* Top Nav */}
      <div className="ls-top">
        <div className="ls-nav">
          <img src={assets.logo} className="logo" alt="logo" />
          <div className="menu">
            <img src={assets.menu_icon} alt="menu" />
            <div className="sub-menu">
              <p>Edit profile</p>
              <hr />
              <p>Logout</p>
            </div>
          </div>
        </div>
        <div className="ls-search">
          <img src={assets.search_icon} alt="search" />
          <input
            type="text"
            placeholder="Search here..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="ls-tabs">
        <button onClick={() => setActiveTab("friends")}>
          Friends ({friends.length})
        </button>
        <button onClick={() => setActiveTab("groups")}>
          Groups ({groups.length})
        </button>
        <button onClick={() => setActiveTab("requests")}>
          Requests ({friendRequests.length})
        </button>
      </div>

      {/* List */}
      <div className="ls-list">
        {isSearching && <p>Searching...</p>}
        {searchQuery && !isSearching && (
          searchResults.map((result) => (
            <SearchResultItem
              key={result._id}
              result={result}
              isOnline={onlineUsers.includes(result._id)}
              onChat={handleCreateChat}
              onAdd={handleSendRequest}
            />
          ))
        )}
        {!searchQuery && (
          <>
            {activeTab === "requests" &&
              friendRequests.map((req) => (
                <RequestItem
                  key={req._id}
                  request={req}
                  onAccept={handleAcceptRequest}
                  onReject={handleRejectRequest}
                />
              ))}

            {activeTab === "friends" &&
              friends.map((friend) => (
                <FriendItem
                  key={friend._id}
                  friend={friend}
                  isOnline={onlineUsers.includes(friend._id)}
                  isActive={currentChat?.participants.some(
                    (p) => p._id === friend._id
                  )}
                  onClick={() => handleCreateChat(friend._id)}
                />
              ))}

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
        className="create-group-btn"
        onClick={() => setShowCreateGroup(true)}
      >
        Create Group
      </button>

      {/* Create Group Modal */}
      {showCreateGroup && (
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
            <input
              type="text"
              placeholder="Search users to add"
              onChange={handleSearchChange}
            />
            {searchResults.map((user) => (
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
      )}
    </div>
  );
}

export default LeftSidebar;
