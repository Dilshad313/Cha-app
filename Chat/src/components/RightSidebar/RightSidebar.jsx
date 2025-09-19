import React from 'react';
import assets from '../../assets/assets';
import { useApp } from '../../context/AppContext';

function RightSidebar() {
  const { logoutUser, user, onlineUsers } = useApp();

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isCurrentUserOnline = user && onlineUsers.includes(user._id);

  return (
    <div className="text-white bg-[#001030] relative h-[75vh] overflow-y-scroll">
      {/* Profile */}
      <div className="pt-16 text-center max-w-[70%] mx-auto">
        <img
          src={user?.avatar || assets.profile_img}
          alt="Profile"
          className="w-[110px] aspect-square rounded-full mx-auto"
        />
        <h3 className="text-[18px] font-normal flex items-center justify-center gap-1 my-1">
          {user?.name || 'User'}
          <img
            className="w-3 h-3"
            src={isCurrentUserOnline ? assets.green_dot : assets.grey_dot}
            alt="status"
          />
        </h3>
        <p className="text-[10px] opacity-80 font-light">
          {user?.bio || 'Hey, There I am using chat app'}
        </p>
      </div>

      {/* Divider */}
      <hr className="border-[#ffffff50] my-4" />

      {/* Media */}
      <div className="px-5 text-[13px]">
        <p>Media</p>
        <div className="max-h-[180px] overflow-y-scroll grid grid-cols-3 gap-1.5 mt-2">
          <img src={assets.pic1} alt="" className="w-[60px] rounded cursor-pointer" />
          <img src={assets.pic2} alt="" className="w-[60px] rounded cursor-pointer" />
          <img src={assets.pic3} alt="" className="w-[60px] rounded cursor-pointer" />
          <img src={assets.pic4} alt="" className="w-[60px] rounded cursor-pointer" />
          <img src={assets.pic1} alt="" className="w-[60px] rounded cursor-pointer" />
          <img src={assets.pic2} alt="" className="w-[60px] rounded cursor-pointer" />
        </div>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-[#077eff] text-white border-none text-[12px] font-light px-[65px] py-2.5 rounded-full cursor-pointer hover:bg-[#005fcc] transition"
      >
        Logout
      </button>
    </div>
  );
}

export default RightSidebar;
