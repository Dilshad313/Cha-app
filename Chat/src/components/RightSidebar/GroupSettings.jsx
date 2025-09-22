import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { toast } from 'react-toastify';
import { chatsAPI, usersAPI } from '../../config/api';
import assets from '../../assets/assets';

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
        } catch (error) a=> {
            toast.error('Failed to remove user');
        }
    };

    if (!currentChat || !currentChat.isGroupChat) {
        return null; // Or some placeholder
    }

    return (
        <div className="p-4 h-full flex flex-col">
            <h2 className="text-xl font-bold mb-4">Group Settings</h2>

            <div className="flex flex-col items-center mb-4">
                <div className="relative">
                    <img src={currentChat.groupIcon || assets.group_icon} alt="group icon" className="w-24 h-24 rounded-full" />
                    {isAdmin && (
                        <label htmlFor="group-icon-upload" className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full cursor-pointer">
                            <img src={assets.edit_icon} alt="edit" className="w-4 h-4" />
                            <input id="group-icon-upload" type="file" className="hidden" onChange={handleIconChange} accept="image/*" />
                        </label>
                    )}
                </div>
                <div className="flex items-center mt-2">
                    {isEditingName ? (
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="text-lg font-semibold border-b-2 border-blue-500"
                            onBlur={handleRenameGroup}
                            autoFocus
                        />
                    ) : (
                        <h3 className="text-lg font-semibold">{currentChat.chatName}</h3>
                    )}
                    {isAdmin && (
                        <button onClick={() => setIsEditingName(!isEditingName)} className="ml-2">
                            <img src={assets.edit_icon} alt="edit" className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-4">
                <h4 className="font-bold mb-2">Members ({currentChat.participants.length})</h4>
                <div className="max-h-48 overflow-y-auto">
                    {currentChat.participants.map(p => (
                        <div key={p._id} className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-md">
                            <div className="flex items-center gap-2">
                                <UserAvatar src={p.avatar} />
                                <div>
                                    <p>{p.name}</p>
                                    {p._id === currentChat.groupAdmin._id && <span className="text-xs text-green-500">Admin</span>}
                                </div>
                            </div>
                            {isAdmin && p._id !== user._id && (
                                <button onClick={() => handleRemoveUser(p)} className="text-red-500">
                                    Remove
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {isAdmin && (
                <div>
                    <h4 className="font-bold mb-2">Add Members</h4>
                    <input
                        type="text"
                        placeholder="Search for users to add"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full p-2 border rounded mb-2"
                    />
                    {loading ? <p>Loading...</p> : (
                        <div className="max-h-32 overflow-y-auto">
                            {searchResult.map(u => (
                                <div key={u._id} className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-md">
                                    <div className="flex items-center gap-2">
                                        <UserAvatar src={u.avatar} />
                                        <p>{u.name}</p>
                                    </div>
                                    <button onClick={() => handleAddUser(u)} className="text-blue-500">
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
