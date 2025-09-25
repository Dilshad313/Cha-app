import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { usersAPI } from '../config/api';
import { useApp } from '../context/AppContext';

const GroupChatModal = ({ isOpen, onClose }) => {
  const [groupName, setGroupName] = useState('');
  const [search, setSearch] = useState('');
  const [searchResult, setSearchResult] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

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
      toast.error('Failed to load search results');
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

  const handleSubmit = async () => {
    if (!groupName || selectedUsers.length < 1) {
      toast.warning('Please fill all fields and add at least one member');
      return;
    }

    try {
      await createGroup(groupName, selectedUsers.map((u) => u._id));
      onClose(); // Close modal on success
      toast.success('Group created successfully');
      // Reset state for next time
      setGroupName('');
      setSearch('');
      setSearchResult([]);
      setSelectedUsers([]);
    } catch (error) {
      toast.error('Failed to create group');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Create Group Chat</h2>
        <input
          type="text"
          placeholder="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />
        <input
          type="text"
          placeholder="Search for users to add"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-4"
        />

        <div className="flex flex-wrap gap-2 mb-4">
          {selectedUsers.map((u) => (
            <div key={u._id} className="bg-blue-500 text-white px-2 py-1 rounded-full flex items-center">
              <span>{u.name}</span>
              <button onClick={() => handleRemoveUser(u)} className="ml-2 text-white font-bold">
                &times;
              </button>
            </div>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
            {searchResult?.slice(0, 4).map((user) => (
              <div
                key={user._id}
                onClick={() => handleAddUser(user)}
                className="p-2 cursor-pointer rounded hover:bg-gray-100"
              >
                <p className="font-medium text-gray-800">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded mr-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupChatModal;