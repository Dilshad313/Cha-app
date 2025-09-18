// Frontend: pages/ProfileUpdate/ProfileUpdate.jsx
import React, { useState, useEffect, useCallback } from 'react';
import './ProfileUpdate.css';
import assets from '../../assets/assets';
import { useApp } from '../../context/AppContext';
import { usersAPI } from '../../config/api';
import { toast } from 'react-toastify';
import Cropper from 'react-easy-crop';

function ProfileUpdate() {
  const [image, setImage] = useState(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [prevImage, setPrevImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const { user, setUser } = useApp();

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setBio(user.bio || "");
      setPrevImage(user.avatar || "");
    }
  }, [user]);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', reject);
      image.src = url;
    });

  const getCroppedImage = useCallback(async () => {
    try {
      const image = await createImage(imageSrc);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      return new Promise((resolve) => {
        canvas.toBlob((file) => {
          setImage(file);
          resolve(URL.createObjectURL(file));
        }, 'image/jpeg', 1);
      });
    } catch (e) {
      console.error(e);
    }
  }, [imageSrc, croppedAreaPixels]);

  const handleImageChange = async (e) => {
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
      
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setShowCropper(true);
    }
  };

  const handleCrop = async () => {
    const croppedImageUrl = await getCroppedImage();
    setPrevImage(croppedImageUrl);
    setShowCropper(false);
    setImageSrc(null);
    setCroppedAreaPixels(null);
  };

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

  if (showCropper) {
    return (
      <div className='profile'>
        <div className="crop-container">
          <h3>Crop Your Image</h3>
          <div className="cropper-wrapper">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div className="crop-controls">
            <button onClick={handleCrop}>Crop & Continue</button>
            <button onClick={() => { setShowCropper(false); setImageSrc(null); }}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

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
              src={prevImage || assets.avatar_icon} 
              alt="Profile Preview" 
            />
            {prevImage ? 'Change Profile Image' : 'Upload Profile Image'}
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
          src={prevImage || assets.logo_icon} 
          alt="Profile" 
        />
      </div>
    </div>
  );
}

export default ProfileUpdate;