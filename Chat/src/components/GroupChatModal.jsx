import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { usersAPI } from '../config/api';
import { useApp } from '../context/AppContext';
import assets from '../assets/assets';

const GroupChatModal = ({ isOpen, onClose }) => {
  const [groupName, setGroupName] = useState('');
  const [search, setSearch] = useState('');
  const [searchResult, setSearchResult] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groupImage, setGroupImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const { createGroup } = useApp();

  const handleSearch = async (query) => {
    setSearch(query);
    if (!query) {
      setSearchResult([]);
      return;
    }

    try {
      setLoading(true);
      const { data } = await usersAPI.searchUsers(query);
      setSearchResult(data.users);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load search results');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = (userToAdd) => {
    if (selectedUsers.some((u) => u._id === userToAdd._id)) {
      toast.warning('User already added');
      return;
    }
    setSelectedUsers([...selectedUsers, userToAdd]);
  };

  const handleRemoveUser = (userToRemove) => {
    setSelectedUsers(selectedUsers.filter((u) => u._id !== userToRemove._id));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setGroupImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!groupName || selectedUsers.length < 1) {
      toast.warning('Please fill all fields and add at least one member');
      return;
    }

    try {
      await createGroup(groupName, selectedUsers.map((u) => u._id), groupImage);
      onClose(); // Close modal on success
      toast.success('Group created successfully');
      // Reset state for next time
      setGroupName('');
      setSearch('');
      setSearchResult([]);
      setSelectedUsers([]);
      setGroupImage(null);
      setImagePreview(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create group');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Create Group Chat</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Group Image Upload */}
          <div className="flex flex-col items-center mb-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-lg">
                {imagePreview ? (
                  <img src={imagePreview} alt="Group preview" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full p-2 shadow-lg transition-all transform hover:scale-110"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Upload group photo (optional)</p>
          </div>

          {/* Group Name Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Group Name *
            </label>
            <input
              type="text"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white"
            />
          </div>

          {/* Search Users Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Add Members *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search users to add"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Selected Members ({selectedUsers.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((u) => (
                  <div key={u._id} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-1.5 rounded-full flex items-center gap-2 shadow-md">
                    <img src={u.avatar || assets.profile_img} alt={u.name} className="w-5 h-5 rounded-full" />
                    <span className="text-sm font-medium">{u.name}</span>
                    <button
                      onClick={() => handleRemoveUser(u)}
                      className="hover:bg-white/20 rounded-full p-0.5 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {search && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Search Results
              </label>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded-xl p-2">
                  {searchResult?.slice(0, 5).map((user) => (
                    <div
                      key={user._id}
                      onClick={() => handleAddUser(user)}
                      className="flex items-center gap-3 p-3 cursor-pointer rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-all group"
                    >
                      <img src={user.avatar || assets.profile_img} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 bg-indigo-500 text-white px-3 py-1 rounded-lg text-sm font-medium transition-all">
                        Add
                      </button>
                    </div>
                  ))}
                  {searchResult?.length === 0 && (
                    <p className="text-center py-4 text-gray-500 dark:text-gray-400">No users found</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-xl font-semibold transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!groupName || selectedUsers.length < 1}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              Create Group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupChatModal;