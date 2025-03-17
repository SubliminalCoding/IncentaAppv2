import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSocket from '../hooks/useSocket';

/**
 * NotificationCenter component displays real-time notifications
 * and allows users to interact with them
 */
const NotificationCenter = () => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Initialize socket with notification callback
  const { 
    notifications, 
    clearNotifications, 
    removeNotification,
    isConnected
  } = useSocket({
    onNotification: (notification) => {
      // Play sound or show browser notification
      if (Notification.permission === 'granted') {
        let title, body;
        
        switch (notification.type) {
          case 'new_message':
            title = 'New Message';
            body = `${notification.message.sender.name}: ${notification.message.preview}`;
            break;
          case 'case_update':
            title = 'Case Updated';
            body = `Case #${notification.caseNumber} updated`;
            break;
          case 'new_conversation':
            title = 'New Conversation';
            body = `Started by ${notification.conversation.createdBy.name}`;
            break;
          default:
            title = 'New Notification';
            body = 'You have a new notification';
        }
        
        // Create browser notification
        new Notification(title, { body });
        
        // Play sound
        const audio = new Audio('/notification-sound.mp3');
        audio.play().catch(e => console.error('Failed to play notification sound:', e));
      }
    }
  });
  
  // Request notification permission on component mount
  useEffect(() => {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);
  
  const toggleDropdown = () => {
    setShowDropdown(prev => !prev);
  };
  
  const handleNotificationClick = (notification, index) => {
    // Navigate to appropriate page based on notification type
    switch (notification.type) {
      case 'new_message':
        navigate(`/messages/${notification.conversationId}`);
        break;
      case 'case_update':
        navigate(`/cases/${notification.caseId}`);
        break;
      case 'new_conversation':
        navigate(`/messages/${notification.conversation.id}`);
        break;
      // Add more types as needed
      default:
        console.log('Unhandled notification type:', notification.type);
    }
    
    // Remove this notification
    removeNotification(index);
    
    // Close dropdown
    setShowDropdown(false);
  };
  
  const getNotificationContent = (notification) => {
    switch (notification.type) {
      case 'new_message':
        return (
          <>
            <div className="notification-title">New Message</div>
            <div className="notification-message">
              <strong>{notification.message.sender.name}:</strong> {notification.message.preview}
            </div>
            <div className="notification-time">
              {new Date(notification.message.timestamp).toLocaleTimeString()}
            </div>
          </>
        );
      case 'case_update':
        return (
          <>
            <div className="notification-title">Case Updated</div>
            <div className="notification-message">
              Case #{notification.caseNumber} was updated
              {notification.update.statusChanged && (
                <div>
                  Status changed from <strong>{notification.update.statusChanged.from}</strong> to{' '}
                  <strong>{notification.update.statusChanged.to}</strong>
                </div>
              )}
            </div>
            <div className="notification-time">
              {new Date(notification.update.timestamp).toLocaleTimeString()}
            </div>
          </>
        );
      case 'new_conversation':
        return (
          <>
            <div className="notification-title">New Conversation</div>
            <div className="notification-message">
              Started by <strong>{notification.conversation.createdBy.name}</strong>
            </div>
            <div className="notification-time">
              {new Date(notification.conversation.timestamp).toLocaleTimeString()}
            </div>
          </>
        );
      default:
        return (
          <>
            <div className="notification-title">Notification</div>
            <div className="notification-message">You have a new notification</div>
          </>
        );
    }
  };
  
  return (
    <div className="notification-center">
      <div className="notification-icon" onClick={toggleDropdown}>
        <i className="fas fa-bell"></i>
        {notifications.length > 0 && (
          <span className="notification-badge">{notifications.length}</span>
        )}
        {!isConnected && <span className="connection-error" title="Disconnected">!</span>}
      </div>
      
      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <button className="clear-all" onClick={clearNotifications}>
                Clear All
              </button>
            )}
          </div>
          
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty-notifications">No notifications</div>
            ) : (
              notifications.map((notification, index) => (
                <div 
                  key={index} 
                  className="notification-item"
                  onClick={() => handleNotificationClick(notification, index)}
                >
                  {getNotificationContent(notification)}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter; 