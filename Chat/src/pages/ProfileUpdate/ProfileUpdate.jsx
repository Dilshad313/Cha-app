import React, { useEffect, useState } from 'react';
import './ProfileUpdate.css';
import assets from '../../assets/assets';
import { useApp } from '../../context/AppContext';
import { usersAPI } from '../../config/api';
import { toast } from 'react-toastify';

function ProfileUpdate() {
  const [image, setImage] = useState(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [prevImage, setPrevImage] = useState("");
  const { user, setUser } = useApp();

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setBio(user.bio || "");
      setPrevImage(user.avatar || "");
    }
  }, [user]);

  const profileUpdate = async (event) => {
    event.preventDefault();
    try {
      if (!prevImage && !image) {
        toast.error("Upload profile Picture..");
        return;
      }

      const formData = new FormData();
      formData.append('name', name);
      formData.append('bio', bio);
      if (image) {
        formData.append('avatar', image);
      }

      const response = await usersAPI.updateProfile(formData);
      
      if (response.data.success) {
        setUser(response.data.user);
        toast.success("Profile updated successfully!");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  return (
    <div className='profile'>
      <div className="profile-container">
        <form onSubmit={profileUpdate}>
          <h3>Profile Details</h3>
          <label htmlFor="avatar">
            <input onChange={(e) => setImage(e.target.files[0])} type="file" id='avatar' accept='.png, .jpg, .jpeg' hidden />
            <img src={image ? URL.createObjectURL(image) : prevImage || assets.avatar_icon} alt="" />
            upload Profile image
          </label>
          <input onChange={(e) => setName(e.target.value)} value={name} type="text" placeholder='Your Name' required />
          <textarea onChange={(e) => setBio(e.target.value)} value={bio} placeholder='write profile bio' required></textarea>
          <button type="submit">Save</button>
        </form>
        <img className='profile-pic' src={image ? URL.createObjectURL(image) : prevImage || assets.logo_icon} alt="" />
      </div>
    </div>
  );
}

export default ProfileUpdate;