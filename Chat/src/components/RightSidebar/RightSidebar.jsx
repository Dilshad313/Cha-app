import React from 'react';
import assets from '../../assets/assets';
import { useApp } from '../../context/AppContext';
import GroupSettings from './GroupSettings';

function RightSidebar({ closeSidebar }) {
  const { logoutUser, user, onlineUsers, currentChat } = useApp();

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isCurrentUserOnline = user && onlineUsers.includes(user._id);

  return (
    <div className="bg-white h-full flex flex-col p-4">
      <div className="flex justify-end md:hidden">
        <button onClick={closeSidebar}>
          <img src={assets.close_icon} alt="Close" className="w-6 h-6" />
        </button>
      </div>

      {currentChat && currentChat.isGroupChat ? (
        <GroupSettings />
      ) : (
        <>
          {/* Profile */}
          <div className="text-center mt-8">
            <img
              src={user?.avatar || assets.profile_img}
              alt="Profile"
              className="w-28 h-28 rounded-full mx-auto"
            />
            <h3 className="text-lg font-semibold flex items-center justify-center gap-2 my-2">
              {user?.name || 'User'}
              <img
                className="w-3 h-3"
                src={isCurrentUserOnline ? assets.green_dot : assets.grey_dot}
                alt="status"
              />
            </h3>
            <p className="text-xs text-gray-500">
              {user?.bio || 'Hey, There I am using chat app'}
            </p>
          </div>

          {/* Divider */}
          <hr className="my-4" />

          {/* Media */}
          <div className="px-5 text-sm">
            <p className="font-semibold">Media</p>
            <div className="max-h-48 overflow-y-auto grid grid-cols-3 gap-2 mt-2">
              <img src={assets.pic1} alt="" className="w-full rounded cursor-pointer" />
              <img src={assets.pic2} alt="" className="w-full rounded cursor-pointer" />
              <img src={assets.pic3} alt="" className="w-full rounded cursor-pointer" />
              <img src={assets.pic4} alt="" className="w-full rounded cursor-pointer" />
              <img src={assets.pic1} alt="" className="w-full rounded cursor-pointer" />
              <img src={assets.pic2} alt="" className="w-full rounded cursor-pointer" />
            </div>
          </div>
        </>
      )}

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full bg-red-500 text-white py-2.5 rounded-full cursor-pointer hover:bg-red-600 transition mt-auto"
      >
        Logout
      </button>
    </div>
  );
}

export default RightSidebar;
