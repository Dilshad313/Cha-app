import React, { useState } from 'react';
import './GroupSettings.css';
import { useApp } from '../context/AppContext';
import { toast } from 'react-toastify';
import { chatsAPI, usersAPI } from '../config/api';
import assets from '../assets/assets';

const UserAvatar = ({ src }) => (
    <img src={src || assets.profile_img} alt="avatar" className="w-10 h-10 rounded-full" />
);

const GroupSettings = () => {
    const { currentChat, setCurrentChat, user } = useApp();
    const [groupName, setGroupName] = useState(currentChat?.chatName || '');
    const [isEditingName, setIsEditingName] = useState(false);
    const [search, setSearch] = useState('');
    const [searchResult, setSearchResult] = useState([]);
    const [loading, setLoading] = useState(false);

    const isAdmin = currentChat?.groupAdmin?._id === user?._id;

    const handleRenameGroup = async () => {
        if (!groupName.trim()) {
            toast.error('Group name cannot be empty');
            return;
        }
        try {
            const { data } = await chatsAPI.renameGroup(currentChat._id, groupName);
            setCurrentChat(data.chat);
            setIsEditingName(false);
            toast.success('Group name updated');
        } catch (error) {
            toast.error('Failed to rename group');
        }
    };

    const handleIconChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('groupIcon', file);

        try {
            const { data } = await chatsAPI.updateGroupIcon(currentChat._id, formData);
            setCurrentChat(data.chat);
            toast.success('Group icon updated');
        } catch (error) {
            toast.error('Failed to update group icon');
        }
    };

    const handleSearch = async (query) => {
        setSearch(query);
        if (!query) return;
        try {
            setLoading(true);
            const { data } = await usersAPI.searchUsers(query);
            setSearchResult(data.users);
            setLoading(false);
        } catch (error) {
            toast.error('Failed to search users');
            setLoading(false);
        }
    };

    const handleAddUser = async (userToAdd) => {
        try {
            const { data } = await chatsAPI.addToGroup(currentChat._id, userToAdd._id);
            setCurrentChat(data.chat);
            toast.success(`${userToAdd.name} added to the group`);
        } catch (error) {
            toast.error('Failed to add user');
        }
    };

    const handleRemoveUser = async (userToRemove) => {
        if (userToRemove._id === currentChat.groupAdmin._id) {
            toast.error("You cannot remove the group admin.");
            return;
        }
        try {
            const { data } = await chatsAPI.removeFromGroup(currentChat._id, userToRemove._id);
            setCurrentChat(data.chat);
            toast.success(`${userToRemove.name} removed from the group`);
        } catch (error) {
            toast.error('Failed to remove user');
        }
    };
    
    if (!currentChat || !currentChat.isGroupChat) {
        return null; // Or some placeholder
    }

    return (
        <div className="group-settings-container">
            <h2 className="group-settings-title">Group Settings</h2>

            <div className="group-header">
                <div className="group-icon-container">
                    <img src={currentChat.groupIcon || assets.group_icon} alt="group icon" className="group-icon" />
                    {isAdmin && (
                        <label htmlFor="group-icon-upload" className="edit-icon-label">
                            <img src={assets.edit_icon} alt="edit" className="edit-icon" />
                            <input id="group-icon-upload" type="file" className="hidden-input" onChange={handleIconChange} accept="image/*" />
                        </label>
                    )}
                </div>
                <div className="group-name-container">
                    {isEditingName ? (
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="group-name-input"
                            onBlur={handleRenameGroup}
                            autoFocus
                        />
                    ) : (
                        <h3 className="group-name">{currentChat.chatName}</h3>
                    )}
                    {isAdmin && (
                        <button onClick={() => setIsEditingName(!isEditingName)} className="edit-name-button">
                            <img src={assets.edit_icon} alt="edit" className="edit-icon" />
                        </button>
                    )}
                </div>
            </div>

            <div className="members-container">
                <h4 className="members-title">Members ({currentChat.participants.length})</h4>
                <div className="members-list">
                    {currentChat.participants.map(p => (
                        <div key={p._id} className="member-item">
                            <div className="member-info">
                                <UserAvatar src={p.avatar} />
                                <div>
                                    <p>{p.name}</p>
                                    {p._id === currentChat.groupAdmin._id && <span className="admin-badge">Admin</span>}
                                </div>
                            </div>
                            {isAdmin && p._id !== user._id && (
                                <button onClick={() => handleRemoveUser(p)} className="remove-member-button">
                                    Remove
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {isAdmin && (
                <div className="add-members-container">
                    <h4 className="add-members-title">Add Members</h4>
                    <input
                        type="text"
                        placeholder="Search for users to add"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="search-input"
                    />
                    {loading ? <p>Loading...</p> : (
                        <div className="search-results-list">
                            {searchResult.map(u => (
                                <div key={u._id} className="add-member-item">
                                    <div className="add-member-info">
                                        <UserAvatar src={u.avatar} />
                                        <p>{u.name}</p>
                                    </div>
                                    <button onClick={() => handleAddUser(u)} className="add-member-button">
                                        Add
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GroupSettings;
