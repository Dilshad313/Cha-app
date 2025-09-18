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
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('bio', bio);
      
      if (image) {
        formData.append('avatar', image);
      }

      const response = await usersAPI.updateProfile(formData);
      
      if (response.data.success) {
        setUser(response.data.user);
        setPrevImage(response.data.user.avatar || "");
        setImage(null);
        toast.success("Profile updated successfully!");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      
      setImage(file);
    }
  };

  return (
    <div className='profile'>
      <div className="profile-container">
        <form onSubmit={profileUpdate}>
          <h3>Profile Details</h3>
          <label htmlFor="avatar">
            <input 
              onChange={handleImageChange} 
              type="file" 
              id='avatar' 
              accept='.png, .jpg, .jpeg, .webp' 
              hidden 
            />
            <img 
              src={image ? URL.createObjectURL(image) : prevImage || assets.avatar_icon} 
              alt="Profile Preview" 
            />
            {image ? 'Change Profile Image' : 'Upload Profile Image'}
          </label>
          <input 
            onChange={(e) => setName(e.target.value)} 
            value={name} 
            type="text" 
            placeholder='Your Name' 
            name='name'
            required 
          />
          <textarea 
            onChange={(e) => setBio(e.target.value)} 
            value={bio} 
            placeholder='Write profile bio' 
            rows="4"
          ></textarea>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
        <img 
          className='profile-pic' 
          src={image ? URL.createObjectURL(image) : prevImage || assets.logo_icon} 
          alt="Profile" 
        />
      </div>
    </div>
  );
}

export default ProfileUpdate;