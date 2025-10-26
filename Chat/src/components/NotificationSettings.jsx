import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { requestNotificationPermission } from '../utils/notifications';

const NotificationSettings = ({ isOpen, onClose }) => {
  const [browserNotifications, setBrowserNotifications] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState('default');

  useEffect(() => {
    // Check current notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Check if sound is muted
    const isMuted = localStorage.getItem('notificationsMuted') === 'true';
    setSoundEnabled(!isMuted);

    // Check if browser notifications are enabled
    setBrowserNotifications(Notification.permission === 'granted');
  }, [isOpen]);

  const handleEnableBrowserNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setBrowserNotifications(true);
      setNotificationPermission('granted');
      toast.success('Browser notifications enabled');
    } else {
      toast.error('Please allow notifications in your browser settings');
    }
  };

  const handleToggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('notificationsMuted', (!newValue).toString());
    toast.success(newValue ? 'Notification sounds enabled' : 'Notification sounds muted');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Notification Settings</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Browser Notifications */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Browser Notifications
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get desktop notifications for new messages
                </p>
              </div>
              {notificationPermission === 'granted' ? (
                <span className="flex items-center gap-1 text-sm font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Enabled
                </span>
              ) : (
                <button
                  onClick={handleEnableBrowserNotifications}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30 px-4 py-2 rounded-lg transition-all"
                >
                  Enable
                </button>
              )}
            </div>
          </div>

          {/* Sound Notifications */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  Notification Sounds
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Play sound when receiving messages
                </p>
              </div>
              <button
                onClick={handleToggleSound}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  soundEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm mb-1">
                  About Notifications
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  You'll receive notifications for new messages and group updates. Notifications won't appear when you're actively viewing a chat.
                </p>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-all active:scale-95 shadow-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
