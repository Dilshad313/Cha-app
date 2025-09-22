// Frontend: components/LeftSidebar/LeftSidebar.jsx
import React, { useState, useEffect } from "react";
import assets from "../../assets/assets";
import { useApp } from "../../context/AppContext";
import { usersAPI, chatsAPI } from "../../config/api";
import { debounce } from "lodash";
import { toast } from "react-toastify";

/* -------------------- Reusable Components -------------------- */
const UserAvatar = ({ src, isOnline }) => (
  <div className="relative">
    <img src={src || assets.profile_img} alt="avatar" className="w-10 h-10 rounded-full" />
    {typeof isOnline === "boolean" && (
      <img
        className="absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full"
        src={isOnline ? assets.green_dot : assets.grey_dot}
        alt="status"
      />
    )}
  </div>
);

const FriendItem = ({ friend, isOnline, isActive, onClick }) => (
  <div
    className={`flex items-center gap-4 p-2 rounded-md cursor-pointer hover:bg-gray-100 ${isActive ? "bg-gray-200" : ""}`}
    onClick={onClick}
  >
    <UserAvatar src={friend.avatar} isOnline={isOnline} />
    <div>
      <p className="font-semibold">{friend.name}</p>
      <span className="text-sm text-gray-500">Click to chat</span>
    </div>
  </div>
);

const GroupItem = ({ group, isActive, onClick }) => (
  <div
    className={`flex items-center gap-4 p-2 rounded-md cursor-pointer hover:bg-gray-100 ${isActive ? "bg-gray-200" : ""}`}
    onClick={onClick}
  >
    <div className="relative">
      <img src={assets.group_icon || assets.profile_img} alt="group" className="w-10 h-10 rounded-full" />
    </div>
    <div>
      <p className="font-semibold">{group.groupName}</p>
      <span className="text-sm text-gray-500">Group Chat ({group.participants.length})</span>
    </div>
  </div>
);

const RequestItem = ({ request, onAccept, onReject }) => (
  <div className="flex items-center gap-4 p-2 rounded-md">
    <UserAvatar src={request.from.avatar} />
    <div className="flex-1">
      <p className="font-semibold">{request.from.name}</p>
      <span className="text-sm text-gray-500">Friend Request</span>
    </div>
    <div className="flex gap-2">
      <button onClick={() => onAccept(request._id)} className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm">Accept</button>
      <button onClick={() => onReject(request._id)} className="bg-gray-300 px-3 py-1 rounded-md text-sm">Reject</button>
    </div>
  </div>
);

const SearchResultItem = ({ result, isOnline, onChat, onAdd }) => (
  <div className="flex items-center gap-4 p-2 rounded-md">
    <UserAvatar src={result.avatar} isOnline={isOnline} />
    <div className="flex-1">
      <p className="font-semibold">{result.name}</p>
      <span className="text-sm text-gray-500">{result.username}</span>
    </div>
    <div className="flex gap-2">
      <button onClick={() => onChat(result._id)} className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm">Chat</button>
      <button onClick={() => onAdd(result._id)} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm">Add</button>
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
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  
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
  const [groupName, setGroupName] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState([]);

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
    <div className="bg-white h-full flex flex-col p-4">
      {/* Top Nav */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <img src={assets.logo} className="w-24" alt="logo" />
          <button onClick={closeSidebar} className="md:hidden">
            <img src={assets.close_icon} alt="Close" className="w-6 h-6" />
          </button>
          <div className="relative">
            <img src={assets.menu_icon} alt="menu" className="cursor-pointer" />
            <div className="absolute hidden bg-white shadow-md rounded-md py-2 w-40 right-0">
              <p className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Edit profile</p>
              <hr />
              <p className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Logout</p>
            </div>
          </div>
        </div>
        <div className="relative">
          <img src={assets.search_icon} alt="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" />
          <input
            type="text"
            placeholder="Search here..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-gray-100 border border-gray-200 rounded-full py-2 px-10 focus:outline-none"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-around my-4 border-b">
        <button onClick={() => setActiveTab("friends")} className={`py-2 ${activeTab === 'friends' ? 'border-b-2 border-blue-500' : ''}`}>
          Friends ({friends.length})
        </button>
        <button onClick={() => setActiveTab("groups")} className={`py-2 ${activeTab === 'groups' ? 'border-b-2 border-blue-500' : ''}`}>
          Groups ({groups.length})
        </button>
        <button onClick={() => setActiveTab("requests")} className={`py-2 ${activeTab === 'requests' ? 'border-b-2 border-blue-500' : ''}`}>
          Requests ({friendRequests.length})
        </button>
        {searchQuery.trim() && (
          <button onClick={() => setActiveTab("search")} className={`py-2 ${activeTab === 'search' ? 'border-b-2 border-blue-500' : ''}`}>
            Search
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isSearching ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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
                  <div className="text-center py-4 text-gray-500">
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
        className="bg-blue-500 text-white rounded-full py-2 px-4 self-center mt-4"
        onClick={() => setShowCreateGroup(true)}
      >
        Create Group
      </button>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Create New Group</h3>
            <input
              type="text"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full border rounded-md p-2 mb-4"
            />
            <p className="mb-2">Select Participants:</p>
            <input
              type="text"
              placeholder="Search users to add"
              onChange={handleSearchChange}
              className="w-full border rounded-md p-2 mb-4"
            />
            <div className="max-h-40 overflow-y-auto mb-4">
              {searchResults.map((user) => (
                <div key={user._id} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md">
                  <input
                    type="checkbox"
                    checked={selectedParticipants.includes(user._id)}
                    onChange={() => handleToggleParticipant(user._id)}
                  />
                  <span>{user.name}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-4">
              <button onClick={handleCreateGroup} className="bg-blue-500 text-white px-4 py-2 rounded-md">Create</button>
              <button onClick={() => setShowCreateGroup(false)} className="bg-gray-300 px-4 py-2 rounded-md">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeftSidebar;
