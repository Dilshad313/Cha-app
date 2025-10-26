// Notification utility functions

// Request browser notification permission
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Show browser notification
export const showBrowserNotification = (title, options = {}) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      ...options,
    });

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    return notification;
  }
  return null;
};

// Create a global audio context (reusable)
let audioContext = null;
let audioContextInitialized = false;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

// Initialize audio context on user interaction (required by browsers)
export const initializeAudioContext = () => {
  if (!audioContextInitialized) {
    try {
      const context = getAudioContext();
      // Resume context to unlock it
      if (context.state === 'suspended') {
        context.resume();
      }
      audioContextInitialized = true;
      console.log('✅ Audio context initialized');
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }
};

// Play notification sound using Web Audio API
export const playNotificationSound = async () => {
  try {
    // Check if user has muted notifications
    const isMuted = localStorage.getItem('notificationsMuted') === 'true';
    if (isMuted) {
      console.log('Notifications are muted');
      return;
    }

    const context = getAudioContext();
    
    // Resume audio context if it's suspended (browser autoplay policy)
    if (context.state === 'suspended') {
      await context.resume();
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    // Create a pleasant notification sound (two-tone beep)
    oscillator.frequency.setValueAtTime(800, context.currentTime);
    oscillator.frequency.setValueAtTime(600, context.currentTime + 0.1);
    oscillator.type = 'sine';

    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.3);

    console.log('✅ Notification sound played');
  } catch (error) {
    console.error('Notification sound error:', error);
    // Fallback: try using HTML5 Audio with data URI
    try {
      playFallbackSound();
    } catch (fallbackError) {
      console.error('Fallback sound error:', fallbackError);
    }
  }
};

// Fallback sound using HTML5 Audio with data URI
const playFallbackSound = () => {
  // Create a simple beep sound using data URI
  const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OmfTgwOUKXi8LdjHAU2jdXzzn0vBSh+zPLaizsKFF+16+qnVRQKRp/g8r5sIQYqf87y2Yk2CBhku+zqn04MDlCl4vC3YxwFNo3V8859LwUofszy2os7ChRftevqp1UUCkaf4PK+bCEGKn/O8tmJNggYZLvs6p9ODA5QpeLwt2McBTaN1fPOfS8FKH7M8tqLOwoUX7Xr6qdVFApGn+DyvmwhBip/zvLZiTYIGGS77OqfTgwOUKXi8LdjHAU2jdXzzn0vBSh+zPLaizsKFF+16+qnVRQKRp/g8r5sIQYqf87y2Yk2CBhku+zqn04MDlCl4vC3YxwFNo3V8859LwUofszy2os7ChRftevqp1UUCkaf4PK+bCEGKn/O8tmJNggYZLvs6p9ODA5QpeLwt2McBTaN1fPOfS8FKH7M8tqLOwoUX7Xr6qdVFApGn+DyvmwhBip/zvLZiTYIGGS77OqfTgwOUKXi8LdjHAU2jdXzzn0vBSh+zPLaizsKFF+16+qnVRQKRp/g8r5sIQYqf87y2Yk2CBhku+zqn04MDlCl4vC3YxwFNo3V8859LwUofszy2os7ChRftevqp1UUCkaf4PK+bCEGKn/O8tmJNggYZLvs6p9ODA5QpeLwt2McBTaN1fPOfS8FKH7M8tqLOwoUX7Xr6qdVFApGn+DyvmwhBip/zvLZiTYIGGS77OqfTgwOUKXi8LdjHAU2jdXzzn0vBSh+zPLaizsKFF+16+qnVRQKRp/g8r5sIQYqf87y2Yk2CBhku+zqn04MDlCl4vC3YxwFNo3V8859LwUofszy2os7ChRftevqp1UUCkaf4PK+bCEGKn/O8tmJNggYZLvs6p9ODA5QpeLwt2McBTaN1fPOfS8FKH7M8tqLOwoUX7Xr6qdVFApGn+DyvmwhBip/zvLZiTYIGGS77OqfTgwOUKXi8LdjHAU2jdXzzn0vBSh+zPLaizsKFF+16+qnVRQKRp/g8r5sIQYqf87y2Yk2CBhku+zqn04MDlCl4vC3YxwFNo3V8859LwUofszy2os7ChRftevqp1UUCkaf4PK+bCEGKn/O8tmJNggYZLvs6p9ODA5QpeLwt2McBTaN1fPOfS8FKH7M8tqLOwoUX7Xr6qdVFApGn+DyvmwhBip/zvLZiTYIGGS77OqfTgwOUKXi8LdjHAU2jdXzzn0vBSh+zPLaizsKFF+16+qnVRQKRp/g8r5sIQYqf87y2Yk2CBhku+zqn04MDlCl4vC3YxwFNo3V8859LwUofszy2os7ChRftevqp1UUCkaf4PK+bCEGKn/O8tmJNggYZLvs6p9ODA5QpeLwt2McBTaN1fPOfS8FKH7M8tqLOwoUX7Xr6qdVFApGn+DyvmwhBip/zvLZiTYIGGS77OqfTgwOUKXi8Ldj');
  audio.volume = 0.3;
  audio.play().catch(err => console.log('Could not play fallback sound:', err));
};

// Format notification message
export const formatNotificationMessage = (message, maxLength = 50) => {
  if (!message) return '';
  
  if (message.audio) return '🎤 Voice message';
  if (message.image) return '📷 Photo';
  
  const content = message.content || '';
  return content.length > maxLength 
    ? content.substring(0, maxLength) + '...' 
    : content;
};

// Check if user is on the page
export const isPageVisible = () => {
  return document.visibilityState === 'visible';
};

// Check if chat is currently active
export const isChatActive = (chatId, currentChatId) => {
  return chatId === currentChatId && isPageVisible();
};
