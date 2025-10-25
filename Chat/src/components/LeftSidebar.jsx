// components/LeftSidebar.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import GroupChatModal from "./GroupChatModal";
import { usersAPI, chatsAPI } from "../config/api";
import { debounce } from "lodash";
import { toast } from "react-toastify";
import assets from "../assets/assets";

const UserAvatar = ({ src, isOnline, size = "w-10 h-10" }) => (
  <div className="relative">
    <img 
      src={src || assets.profile_img} 
      alt="avatar" 
      className={`${size} rounded-full object-cover`}
    />
    {typeof isOnline === "boolean" && (
      <div
        className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${
          isOnline ? 'bg-green-500' : 'bg-gray-400'
        }`}
      />
    )}
  </div>
);

const ChatItem = ({ chat, user, isOnline, isActive, onClick, onlineUsers }) => {
  const isGroupChat = chat.isGroupChat;
  const chatPartner = isGroupChat ? null : chat.participants?.find(p => p._id !== user._id);
  const lastMessage = chat.messages?.[chat.messages.length - 1];
  
  // Check if it's a self-chat (all participants are the same user)
  const isSelfChat = !isGroupChat && chat.participants?.every(p => p._id === user._id);
  
  // Get display name
  const getDisplayName = () => {
    if (isGroupChat) return chat.chatName;
    if (isSelfChat) return `${user.name || user.username} (You)`;
    return chatPartner?.name || chatPartner?.username || 'Unknown User';
  };
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
        isActive 
          ? "bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 shadow-sm" 
          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
      }`}
      onClick={onClick}
    >
      <div className="relative">
        <UserAvatar 
          src={isGroupChat ? chat.groupIcon : (isSelfChat ? user.avatar : chatPartner?.avatar)} 
          isOnline={isGroupChat ? undefined : (isSelfChat ? true : onlineUsers.includes(chatPartner?._id))}
          size="w-12 h-12"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-semibold text-[15px] text-gray-900 dark:text-white truncate">
            {getDisplayName()}
          </h4>
          {lastMessage && (
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 ml-2 flex-shrink-0">
              {formatTime(lastMessage.timestamp)}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex-1">
            {lastMessage ? (
              <>
                {lastMessage.sender?._id === user._id && <span className="font-medium">You: </span>}
                {!isGroupChat && lastMessage.sender?._id !== user._id && lastMessage.sender?.name && (
                  <span className="font-medium">{lastMessage.sender.name}: </span>
                )}
                {lastMessage.image ? "📷 Photo" : lastMessage.content || "No message"}
              </>
            ) : (
              <span className="italic">
                {isGroupChat ? `${chat.participants?.length || 0} members` : "Start conversation"}
              </span>
            )}
          </p>
          
          {/* Unread indicator */}
          {lastMessage && lastMessage.sender._id !== user._id && (
            <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full flex-shrink-0 animate-pulse"></div>
          )}
        </div>
      </div>
    </div>
  );
};

const FriendItem = ({ friend, isOnline, isActive, onClick }) => (
  <div
    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
      isActive 
        ? "bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 shadow-sm" 
        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
    }`}
    onClick={onClick}
  >
    <UserAvatar src={friend.avatar} isOnline={isOnline} size="w-12 h-12" />
    <div className="flex-1 min-w-0">
      <h4 className="font-semibold text-[15px] text-gray-900 dark:text-white">{friend.name || friend.username || 'Unknown User'}</h4>
      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
        {isOnline && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
        {isOnline ? "Active now" : "Offline"}
      </p>
    </div>
  </div>
);

const RequestItem = ({ request, onAccept, onReject }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800">
    <UserAvatar src={request.from.avatar} size="w-12 h-12" />
    <div className="flex-1 min-w-0">
      <h4 className="font-semibold text-[15px] text-gray-900 dark:text-white">{request.from.name || request.from.username || 'Unknown User'}</h4>
      <p className="text-sm text-gray-600 dark:text-gray-300">Wants to connect</p>
    </div>
    <div className="flex gap-2">
      <button 
        onClick={() => onAccept(request._id)} 
        className="px-3 py-1.5 text-sm font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all active:scale-95 shadow-sm"
      >
        Accept
      </button>
      <button 
        onClick={() => onReject(request._id)} 
        className="px-3 py-1.5 text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all active:scale-95"
      >
        Decline
      </button>
    </div>
  </div>
);

const SearchResultItem = ({ result, isOnline, onChat, onAdd }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
    <UserAvatar src={result.avatar} isOnline={isOnline} />
    <div className="flex-1 min-w-0">
      <h4 className="font-semibold text-gray-900 dark:text-white">{result.name || result.username || 'Unknown User'}</h4>
      <p className="text-sm text-gray-500 dark:text-gray-400">@{result.username}</p>
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
  const [activeTab, setActiveTab] = useState("chats");
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  
  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      
      try {
        setIsSearching(true);
        const response = await usersAPI.searchUsers(query);
        setSearchResults(response.data.users.filter(u => u._id !== user._id));
      } catch (error) {
        console.error("Error searching users:", error);
        toast.error("Failed to search users");
      } finally {
        setIsSearching(false);
      }
    }, 500),
    [user._id]
  );

  useEffect(() => {
    loadFriends();
    loadFriendRequests();
  }, [loadFriends, loadFriendRequests]);

  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
    
    if (query.trim()) {
      setActiveTab('search');
    } else if (activeTab === 'search') {
      setActiveTab('chats');
    }
  }, [debouncedSearch, activeTab]);

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
      closeSidebar();
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
      toast.success("Request declined");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error declining request");
    }
  };

  const tabs = [
    { id: 'chats', label: 'Chats', count: chats.length },
    { id: 'friends', label: 'Friends', count: friends.length },
    { id: 'groups', label: 'Groups', count: groups.length },
    { id: 'requests', label: 'Requests', count: friendRequests.length },
  ];

  if (searchQuery.trim()) {
    tabs.push({ id: 'search', label: 'Search', count: searchResults.length });
  }

  return (
    <div className="bg-white dark:bg-gray-900 h-full flex flex-col border-r border-gray-200 dark:border-gray-800">
      {/* Fixed Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800">
        {/* Logo and App Name */}
        <div className="px-4 md:px-5 py-4 md:py-5 flex items-center justify-between bg-gray-900 dark:bg-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg">
              <img src={assets.logo_icon} className="w-7 h-7" alt="logo" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ChatApp</h1>
              <p className="text-xs text-gray-300">Stay Connected</p>
            </div>
          </div>
          <button 
            onClick={closeSidebar} 
            className="md:hidden p-2 hover:bg-white/20 rounded-lg transition-all active:scale-95"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="px-4 md:px-5 py-3 bg-gray-50 dark:bg-gray-800/50">
        
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-semibold transition-all relative ${
              activeTab === tab.id
                ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-900'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
            }`}
          >
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            )}
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </span>
          </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        {isSearching ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <>
            {/* Search Results */}
            {activeTab === "search" && (
              <div className="space-y-2">
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
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {searchQuery.trim() ? "No users found" : "Type to search users"}
                  </div>
                )}
              </div>
            )}
            
            {/* Chats */}
            {activeTab === "chats" && (
              <div className="space-y-1">
                {chats.length > 0 ? (
                  chats.map((chat) => (
                    <ChatItem
                      key={chat._id}
                      chat={chat}
                      user={user}
                      isActive={currentChat?._id === chat._id}
                      onClick={() => {
                        setCurrentChat(chat);
                        closeSidebar();
                      }}
                      onlineUsers={onlineUsers}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="text-4xl mb-2">💬</div>
                    <p>No conversations yet</p>
                    <p className="text-sm">Start chatting with friends!</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Friend Requests */}
            {activeTab === "requests" && (
              <div className="space-y-2">
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
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="text-4xl mb-2">📨</div>
                    <p>No pending requests</p>
                  </div>
                )}
              </div>
            )}

            {/* Groups */}
            {activeTab === "groups" && (
              <div className="space-y-1">
                {groups.length > 0 ? (
                  groups.map((group) => (
                    <ChatItem
                      key={group._id}
                      chat={group}
                      user={user}
                      isActive={currentChat?._id === group._id}
                      onClick={() => {
                        setCurrentChat(group);
                        closeSidebar();
                      }}
                      onlineUsers={onlineUsers}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="text-4xl mb-2">👥</div>
                    <p>No groups yet</p>
                    <p className="text-sm">Create a group to get started!</p>
                  </div>
                )}
              </div>
            )}

            {/* Friends */}
            {activeTab === "friends" && (
              <div className="space-y-1">
                {friends.length > 0 ? (
                  friends.map((friend) => (
                    <FriendItem
                      key={friend._id}
                      friend={friend}
                      isOnline={onlineUsers.includes(friend._id)}
                      isActive={false}
                      onClick={() => handleCreateChat(friend._id)}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="text-4xl mb-2">👫</div>
                    <p>No friends yet</p>
                    <p className="text-sm">Search and add friends to chat!</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Group Button */}
      <div className="p-4 md:p-5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
        <button
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl px-4 py-3 hover:from-indigo-600 hover:to-purple-700 transition-all active:scale-95 font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          onClick={() => setIsGroupModalOpen(true)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Group Chat
        </button>
      </div>

      <GroupChatModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
      />
    </div>
  );
}

export default LeftSidebar;
