import React from 'react'
import './RightSidebar.css'
import assets from '../../assets/assets'
import { useApp } from '../../context/AppContext'

function RightSidebar() {
  const { logoutUser, user } = useApp();

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  return (
    <div className='rs'>
      <div className="rs-profile">
        <img src={user?.avatar || assets.profile_img} alt="Profile" />
        <h3>{user?.name || 'User'} <img className='dot' src={assets.green_dot} alt="" /></h3>
        <p>{user?.bio || 'Hey, There I am using chat app'}</p>
      </div>
      <hr />
      <div className="rs-media">
        <p>Media</p>
        <div>
          <img src={assets.pic1} alt="" />
          <img src={assets.pic2} alt="" />
          <img src={assets.pic3} alt="" />
          <img src={assets.pic4} alt="" />
          <img src={assets.pic1} alt="" />
          <img src={assets.pic2} alt="" />
        </div>
      </div>
      <button onClick={handleLogout}>Logout</button>
    </div>
  )
}

export default RightSidebar