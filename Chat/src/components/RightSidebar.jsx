import React from 'react';
import assets from '../assets/assets';
import { useApp } from '../context/AppContext';
import GroupSettings from './GroupSettings';
import { toast } from 'react-toastify';

function RightSidebar({ closeSidebar }) {
  const { logoutUser, user, onlineUsers, currentChat } = useApp();

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Logout error');
    }
  };

  const isCurrentUserOnline = user && onlineUsers.includes(user._id);

  return (
    <div className="bg-white dark:bg-gray-900 h-full flex flex-col border-l-2 border-gray-200 dark:border-gray-800">
      {/* Fixed Profile Header */}
      <div className="px-5 md:px-6 py-4 md:py-5 border-b-2 border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 shadow-md flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
          Profile
        </h2>
        <button 
          onClick={closeSidebar}
          className="lg:hidden p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all active:scale-95"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {currentChat && currentChat.isGroupChat ? (
        <GroupSettings />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Profile Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 text-center border border-indigo-100 dark:border-indigo-900/50">
            <div className="relative inline-block mb-4">
              <img
                src={user?.avatar || assets.profile_img}
                alt="Profile"
                className="w-24 h-24 rounded-full mx-auto object-cover ring-4 ring-white dark:ring-gray-800 shadow-lg"
              />
              {isCurrentUserOnline && (
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-white dark:border-gray-800 rounded-full"></div>
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {user?.name || 'User'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {user?.email || 'user@example.com'}
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-full text-sm">
              <span className={`w-2 h-2 rounded-full ${isCurrentUserOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {isCurrentUserOnline ? 'Active now' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Bio Section */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              About
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {user?.bio || 'Hey there! I am using this chat app.'}
            </p>
          </div>

          {/* Media Gallery */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                Shared Media
              </h4>
              <button className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                View all
              </button>
            </div>
            <div className="max-h-[400px] overflow-y-auto pr-1">
              <div className="grid grid-cols-3 gap-2">
                {[assets.pic1, assets.pic2, assets.pic3, assets.pic4, assets.pic1, assets.pic2, assets.pic3, assets.pic4, assets.pic1, assets.pic2, assets.pic3, assets.pic4].map((pic, idx) => (
                  <div key={idx} className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity group relative">
                    <img src={pic} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Button */}
      <div className="p-4 md:p-5 border-t-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
        <button
          onClick={handleLogout}
          className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-3 rounded-xl font-semibold cursor-pointer hover:from-red-600 hover:to-red-700 transition-all active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </div>
  );
}

export default RightSidebar;
