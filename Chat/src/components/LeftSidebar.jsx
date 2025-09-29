// Frontend: components/LeftSidebar/LeftSidebar.jsx
import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import GroupChatModal from "./GroupChatModal";
import { usersAPI, chatsAPI } from "../config/api";
import { debounce } from "lodash";
import { toast } from "react-toastify";

// Add missing assets import
import assets from "../assets/assets";

/* -------------------- Reusable Components -------------------- */
const UserAvatar = ({ src, isOnline }) => (
  <div className="relative">
    <img 
      src={src || assets.profile_img} 
      alt="avatar" 
      className="w-10 h-10 rounded-full" 
    />
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
    className={`flex items-center gap-4 p-2 rounded-md cursor-pointer ${
      isActive ? "bg-gray-200" : "hover:bg-gray-100"
    }`}
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
    className={`flex items-center gap-4 p-2 rounded-md cursor-pointer ${
      isActive ? "bg-gray-200" : "hover:bg-gray-100"
    }`}
    onClick={onClick}
  >
    <div className="relative">
      <img 
        src={assets.group_icon || assets.profile_img} 
        alt="group" 
        className="w-10 h-10 rounded-full" 
      />
    </div>
    <div>
      <p className="font-semibold">{group.chatName}</p>
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
      <button 
        onClick={() => onAccept(request._id)} 
        className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        Accept
      </button>
      <button 
        onClick={() => onReject(request._id)} 
        className="px-3 py-1 text-sm bg-gray-300 rounded-md hover:bg-gray-400 transition-colors"
      >
        Reject
      </button>
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
      <button 
        onClick={() => onChat(result._id)} 
        className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        Chat
      </button>
      <button 
        onClick={() => onAdd(result._id)} 
        className="px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
      >
        Add
      </button>
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
    friends = [],
    friendRequests = [],
    groups = [],
    loadFriends,
    loadFriendRequests,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("friends");
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  
  const searchUsers = debounce(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    try {
      setIsSearching(true);
      const response = await usersAPI.searchUsers(query);
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
  }, [loadFriends, loadFriendRequests]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
    
    if (query.trim()) {
      setActiveTab('search');
    } else if (activeTab === 'search') {
      setActiveTab('friends');
    }
  };

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
    } catch (error) {
      toast.error(error.response?.data?.message || "Error creating chat");
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      await usersAPI.sendFriendRequest(userId);
      toast.success("Friend request sent");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error sending request");
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await usersAPI.acceptFriendRequest(requestId);
      loadFriendRequests();
      loadFriends();
      toast.success("Friend request accepted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error accepting request");
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await usersAPI.rejectFriendRequest(requestId);
      loadFriendRequests();
      toast.success("Request rejected");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error rejecting request");
    }
  };

  return (
    <div className="bg-white h-full flex flex-col p-4">
      {/* Top Nav */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <img src={assets.logo} className="w-24" alt="logo" />
          <button onClick={closeSidebar} className="hidden md:block">
            <img src={assets.close_icon} alt="Close" className="w-6 h-6" />
          </button>
          <div className="relative group">
            <img src={assets.menu_icon} alt="menu" className="cursor-pointer w-6 h-6" />
            <div className="absolute hidden group-hover:block bg-white shadow-lg rounded-md py-2 w-40 right-0 z-10">
              <p className="px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors">Edit profile</p>
              <hr className="my-1" />
              <p className="px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors">Logout</p>
            </div>
          </div>
        </div>
        <div className="relative">
          <img 
            src={assets.search_icon} 
            alt="search" 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" 
          />
          <input
            type="text"
            placeholder="Search here..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-gray-100 border border-gray-200 rounded-full py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-around my-4 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab("friends")} 
          className={`py-2 px-1 transition-colors ${
            activeTab === 'friends' 
              ? 'border-b-2 border-blue-500 text-blue-600 font-medium' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Friends ({friends.length})
        </button>
        <button 
          onClick={() => setActiveTab("groups")} 
          className={`py-2 px-1 transition-colors ${
            activeTab === 'groups' 
              ? 'border-b-2 border-blue-500 text-blue-600 font-medium' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Groups ({groups.length})
        </button>
        <button 
          onClick={() => setActiveTab("requests")} 
          className={`py-2 px-1 transition-colors ${
            activeTab === 'requests' 
              ? 'border-b-2 border-blue-500 text-blue-600 font-medium' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Requests ({friendRequests.length})
        </button>
        {searchQuery.trim() && (
          <button 
            onClick={() => setActiveTab("search")} 
            className={`py-2 px-1 transition-colors ${
              activeTab === 'search' 
                ? 'border-b-2 border-blue-500 text-blue-600 font-medium' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
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
            {activeTab === "requests" && (
              <>
                {friendRequests.length > 0 ? (
                  friendRequests.map((request) => (
                    <RequestItem
                      key={request._id}
                      request={request}
                      onAccept={handleAcceptRequest}
                      onReject={handleRejectRequest}
                    />
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No pending requests
                  </div>
                )}
              </>
            )}

            {/* Group Chats */}
            {activeTab === "groups" && (
              <>
                {groups.length > 0 ? (
                  groups.map((group) => (
                    <GroupItem
                      key={group._id}
                      group={group}
                      isActive={currentChat?._id === group._id}
                      onClick={() => setCurrentChat(group)}
                    />
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No groups yet
                  </div>
                )}
              </>
            )}

            {/* Friends/Chats */}
            {activeTab === "friends" && (
              <>
                {chats.filter(chat => {
                  const other = chat.participants.find((p) => p._id !== user._id);
                  return other && !chat.isGroup;
                }).length > 0 ? (
                  chats.map((chat) => {
                    const other = chat.participants.find((p) => p._id !== user._id);
                    if (!other || chat.isGroup) return null;
                    return (
                      <FriendItem
                        key={chat._id}
                        friend={{ ...other, name: other.name }}
                        isOnline={onlineUsers.includes(other._id)}
                        isActive={currentChat?._id === chat._id}
                        onClick={() => setCurrentChat(chat)}
                      />
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No chats yet
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Create Group Button */}
      <button
        className="bg-blue-500 text-white rounded-full px-4 py-2 self-center mt-4 hover:bg-blue-600 transition-colors"
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