import React, { useState } from 'react';
import './GroupChatModal.css';
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
      return;
    }

    try {
      setLoading(true);
      const { data } = await usersAPI.searchUsers(query);
      setLoading(false);
      setSearchResult(data.users);
    } catch (error) {
      toast.error('Failed to load search results');
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
      onClose();
      toast.success('Group created successfully');
    } catch (error) {
      toast.error('Failed to create group');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">Create Group Chat</h2>
        <input
          type="text"
          placeholder="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="modal-input"
        />
        <input
          type="text"
          placeholder="Search for users to add"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="modal-input"
        />

        <div className="selected-users-container">
          {selectedUsers.map((u) => (
            <div key={u._id} className="selected-user">
              <span>{u.name}</span>
              <button onClick={() => handleRemoveUser(u)} className="remove-user-button">
                &times;
              </button>
            </div>
          ))}
        </div>

        {loading ? (
          <p className="loading-text">Loading...</p>
        ) : (
          <div className="search-results-container">
            {searchResult?.slice(0, 4).map((user) => (
              <div
                key={user._id}
                onClick={() => handleAddUser(user)}
                className="search-result-item"
              >
                <p className="user-name">{user.name}</p>
                <p className="user-email">{user.email}</p>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button onClick={onClose} className="cancel-button">
            Cancel
          </button>
          <button onClick={handleSubmit} className="create-button">
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupChatModal;
