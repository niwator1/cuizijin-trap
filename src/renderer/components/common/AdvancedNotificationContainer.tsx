import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface AdvancedNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationAction[];
  progress?: number; // 0-100 for progress notifications
  group?: string; // Group notifications together
  sound?: boolean; // Play notification sound
  priority?: 'low' | 'normal' | 'high'; // Priority for ordering
}

interface NotificationItemProps {
  notification: AdvancedNotification;
  onClose: (id: string) => void;
  onAction: (id: string, action: NotificationAction) => void;
}

const AdvancedNotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onClose, 
  onAction 
}) => {
  const [progress, setProgress] = useState(notification.progress || 0);

  useEffect(() => {
    if (notification.type === 'loading' && notification.progress !== undefined) {
      setProgress(notification.progress);
    }
  }, [notification.progress, notification.type]);

  useEffect(() => {
    if (!notification.persistent && notification.duration !== 0 && notification.type !== 'loading') {
      const duration = notification.duration || (notification.type === 'error' ? 8000 : 5000);
      const timer = setTimeout(() => {
        onClose(notification.id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  // Play notification sound
  useEffect(() => {
    if (notification.sound && notification.type !== 'loading') {
      playNotificationSound(notification.type);
    }
  }, [notification.sound, notification.type]);

  const playNotificationSound = (type: string) => {
    try {
      // Create audio context for notification sounds
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies for different notification types
      const frequencies = {
        success: 800,
        error: 400,
        warning: 600,
        info: 500,
        loading: 700
      };

      oscillator.frequency.setValueAtTime(frequencies[type as keyof typeof frequencies] || 500, audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'loading':
        return (
          <svg className="w-5 h-5 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
    }
  };

  const getBackgroundColor = () => {
    const priority = notification.priority || 'normal';
    const baseColors = {
      success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      loading: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    };

    const priorityBorder = priority === 'high' ? 'border-2' : 'border';
    return `${baseColors[notification.type]} ${priorityBorder}`;
  };

  const getTextColor = () => {
    switch (notification.type) {
      case 'success':
        return 'text-green-800 dark:text-green-200';
      case 'error':
        return 'text-red-800 dark:text-red-200';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-200';
      case 'info':
      case 'loading':
        return 'text-blue-800 dark:text-blue-200';
    }
  };

  const handleAction = (action: NotificationAction) => {
    onAction(notification.id, action);
    action.action();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`
        ${getBackgroundColor()}
        rounded-xl shadow-lg p-4 mb-3 max-w-sm w-full
        backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90
        ${notification.priority === 'high' ? 'ring-2 ring-opacity-50' : ''}
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h4 className={`text-sm font-medium ${getTextColor()}`}>
            {notification.title}
          </h4>
          {notification.message && (
            <p className={`text-sm mt-1 ${getTextColor()} opacity-80`}>
              {notification.message}
            </p>
          )}
          
          {/* Progress bar for loading notifications */}
          {notification.type === 'loading' && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs mt-1 opacity-60">{Math.round(progress)}%</p>
            </div>
          )}

          {/* Action buttons */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="mt-3 flex space-x-2">
              {notification.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleAction(action)}
                  className={`
                    px-3 py-1 text-xs font-medium rounded-md transition-colors
                    ${action.style === 'primary' 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : action.style === 'danger'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {!notification.persistent && (
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={() => onClose(notification.id)}
              className={`
                inline-flex rounded-md p-1.5 transition-colors
                ${getTextColor()} hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10
              `}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

interface NotificationGroup {
  group: string;
  notifications: AdvancedNotification[];
}

const AdvancedNotificationContainer: React.FC = () => {
  const [notifications, setNotifications] = useState<AdvancedNotification[]>([]);

  // Group notifications by group property
  const groupedNotifications = notifications.reduce((groups: NotificationGroup[], notification) => {
    const groupName = notification.group || 'default';
    const existingGroup = groups.find(g => g.group === groupName);
    
    if (existingGroup) {
      existingGroup.notifications.push(notification);
    } else {
      groups.push({
        group: groupName,
        notifications: [notification]
      });
    }
    
    return groups;
  }, []);

  // Sort notifications by priority within each group
  groupedNotifications.forEach(group => {
    group.notifications.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return (priorityOrder[b.priority || 'normal'] || 2) - (priorityOrder[a.priority || 'normal'] || 2);
    });
  });

  const addNotification = useCallback((notification: Omit<AdvancedNotification, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { ...notification, id }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const updateNotification = useCallback((id: string, updates: Partial<AdvancedNotification>) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const clearGroup = useCallback((group: string) => {
    setNotifications(prev => prev.filter(n => (n.group || 'default') !== group));
  }, []);

  // Global notification manager
  useEffect(() => {
    // Enhanced global API
    (window as any).showAdvancedNotification = addNotification;
    (window as any).hideAdvancedNotification = removeNotification;
    (window as any).updateAdvancedNotification = updateNotification;
    (window as any).clearAllNotifications = clearAllNotifications;
    (window as any).clearNotificationGroup = clearGroup;

    // Backward compatibility
    (window as any).showNotification = (notification: any) => {
      addNotification({
        ...notification,
        sound: true,
        priority: 'normal'
      });
    };

    return () => {
      delete (window as any).showAdvancedNotification;
      delete (window as any).hideAdvancedNotification;
      delete (window as any).updateAdvancedNotification;
      delete (window as any).clearAllNotifications;
      delete (window as any).clearNotificationGroup;
    };
  }, [addNotification, removeNotification, updateNotification, clearAllNotifications, clearGroup]);

  const handleAction = (id: string, action: NotificationAction) => {
    // Actions can be handled here if needed
    console.log('Notification action:', id, action.label);
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-4 max-h-screen overflow-y-auto">
      <AnimatePresence>
        {groupedNotifications.map(group => (
          <div key={group.group} className="space-y-2">
            {group.group !== 'default' && group.notifications.length > 1 && (
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {group.group}
                </span>
                <button
                  onClick={() => clearGroup(group.group)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  清除全部
                </button>
              </div>
            )}
            {group.notifications.map(notification => (
              <AdvancedNotificationItem
                key={notification.id}
                notification={notification}
                onClose={removeNotification}
                onAction={handleAction}
              />
            ))}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedNotificationContainer;
