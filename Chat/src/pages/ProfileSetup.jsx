import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { usersAPI } from '../config/api';
import { toast } from 'react-toastify';
import assets from '../assets/assets';

function ProfileSetup() {
  const navigate = useNavigate();
  const { user, setUser } = useApp();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || 'Hey, There I am using chat app');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('name', name);
      formData.append('bio', bio);
      if (avatar) {
        formData.append('avatar', avatar);
      }

      const response = await usersAPI.updateProfile(formData);
      setUser(response.data.user);
      toast.success('Profile updated successfully!');
      navigate('/chat');
    } catch (error) {
      console.error('Profile setup error:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkip = () => {
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Complete Your Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Add a photo and tell us about yourself
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-500 dark:border-indigo-400 shadow-lg">
                <img
                  src={avatarPreview || assets.avatar_icon}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-indigo-500 hover:bg-indigo-600 text-white p-3 rounded-full shadow-lg transition-all active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              Click the camera icon to upload a photo
            </p>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
              required
            />
          </div>

          {/* Bio Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
              rows="3"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none transition-all"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-medium"
              disabled={isUploading}
            >
              Skip for Now
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isUploading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfileSetup;
