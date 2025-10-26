import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { toast } from 'react-toastify';
import { chatsAPI, usersAPI } from '../config/api';
import assets from '../assets/assets';

// This sub-component is already using Tailwind, so it's good to go.
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

    // Handle both cases: groupAdmin as object or as string ID
    const groupAdminId = typeof currentChat?.groupAdmin === 'object' 
        ? currentChat?.groupAdmin?._id 
        : currentChat?.groupAdmin;
    const isAdmin = groupAdminId === user?._id;

    // Debug logging
    useEffect(() => {
        if (currentChat?.isGroupChat) {
            console.log('GroupSettings Debug:', {
                groupAdminId,
                userId: user?._id,
                isAdmin,
                groupAdminType: typeof currentChat?.groupAdmin,
                groupAdmin: currentChat?.groupAdmin
            });
        }
    }, [currentChat, user, groupAdminId, isAdmin]);

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
            toast.error(error.response?.data?.message || 'Failed to rename group');
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
            toast.error(error.response?.data?.message || 'Failed to update group icon');
        }
    };

    const handleSearch = async (query) => {
        setSearch(query);
        if (!query) {
            setSearchResult([]);
            return;
        };
        try {
            setLoading(true);
            const { data } = await usersAPI.searchUsers(query);
            setSearchResult(data.users);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to search users');
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (userToAdd) => {
        try {
            const { data } = await chatsAPI.addToGroup(currentChat._id, userToAdd._id);
            setCurrentChat(data.chat);
            toast.success(`${userToAdd.name} added to the group`);
            setSearch('');
            setSearchResult([]);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add user');
        }
    };

    const handleRemoveUser = async (userToRemove) => {
        if (userToRemove._id === groupAdminId) {
            toast.error("You cannot remove the group admin.");
            return;
        }
        try {
            const { data } = await chatsAPI.removeFromGroup(currentChat._id, userToRemove._id);
            setCurrentChat(data.chat);
            toast.success(`${userToRemove.name} removed from the group`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove user');
        }
    };
    
    if (!currentChat || !currentChat.isGroupChat) {
        return (
            <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
                <div className="text-center">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400">Select a group to see its settings</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-900 overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
                <h2 className="text-2xl font-bold text-white mb-1">Group Settings</h2>
                <p className="text-indigo-100 text-sm">Manage your group</p>
            </div>

            <div className="p-6 space-y-6">
                {/* Group Profile Section */}
                <div className="flex flex-col items-center">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-xl">
                            {currentChat.groupIcon ? (
                                <img src={currentChat.groupIcon} alt="group icon" className="w-full h-full object-cover" />
                            ) : (
                                <svg className="w-16 h-16 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            )}
                        </div>
                        {isAdmin && (
                            <label htmlFor="group-icon-upload" className="absolute bottom-0 right-0 bg-indigo-500 hover:bg-indigo-600 p-3 rounded-full cursor-pointer shadow-lg transition-all transform hover:scale-110">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <input id="group-icon-upload" type="file" className="hidden" onChange={handleIconChange} accept="image/*" />
                            </label>
                        )}
                    </div>
                    <div className="flex items-center mt-4 gap-2">
                        {isEditingName ? (
                            <input
                                type="text"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                className="text-xl font-bold border-b-2 border-indigo-500 bg-transparent text-center focus:outline-none text-gray-900 dark:text-white px-2"
                                onBlur={handleRenameGroup}
                                onKeyPress={(e) => e.key === 'Enter' && handleRenameGroup()}
                                autoFocus
                            />
                        ) : (
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{currentChat.chatName}</h3>
                        )}
                        {isAdmin && (
                            <button 
                                onClick={() => setIsEditingName(!isEditingName)} 
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                            >
                                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentChat.participants.length} members</p>
                </div>

                {/* Members Section */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            Members
                        </h4>
                        <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                            {currentChat.participants.length}
                        </span>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                        {currentChat.participants.map(p => (
                            <div key={p._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-all group">
                                <div className="flex items-center gap-3">
                                    <UserAvatar src={p.avatar} />
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{p.name}</p>
                                        {p._id === groupAdminId && (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full mt-1">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                Admin
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {isAdmin && p._id !== user._id && (
                                    <button 
                                        onClick={() => handleRemoveUser(p)} 
                                        className="opacity-0 group-hover:opacity-100 text-sm font-semibold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg transition-all"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Add Members Section (Admin Only) */}
                {isAdmin && (
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/50">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            Add Members
                        </h4>
                        <div className="relative mb-3">
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
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white"
                            />
                        </div>
                        {loading ? (
                            <div className="flex justify-center items-center py-6">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                            </div>
                        ) : (
                            <div className="max-h-48 overflow-y-auto space-y-2">
                                {searchResult.map(u => (
                                    <div key={u._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-all group bg-white/50 dark:bg-gray-800/50">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar src={u.avatar} />
                                            <p className="font-semibold text-gray-900 dark:text-white">{u.name}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleAddUser(u)} 
                                            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-all"
                                        >
                                            Add
                                        </button>
                                    </div>
                                ))}
                                {search && searchResult.length === 0 && (
                                    <p className="text-center py-4 text-gray-500 dark:text-gray-400">No users found</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GroupSettings;