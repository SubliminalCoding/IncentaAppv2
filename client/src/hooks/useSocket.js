import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './useAuth';

/**
 * React hook for WebSocket functionality
 * @param {Object} options - Configuration options
 * @returns {Object} Socket methods and state
 */
export const useSocket = (options = {}) => {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [activeConversations, setActiveConversations] = useState(new Set());
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const notificationsRef = useRef([]);
  
  // Update the ref when state changes
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  // Initialize socket connection
  useEffect(() => {
    if (!token) return;
    
    const socketUrl = options.url || process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';
    
    // Create socket instance
    socketRef.current = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    
    // Connection events
    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      setError(null);
    });
    
    socketRef.current.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setIsConnected(false);
      setError(err.message);
    });
    
    socketRef.current.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });
    
    // Message events
    socketRef.current.on('new_message', (message) => {
      setLastMessage(message);
      
      // If this is a callback, call it
      if (options.onNewMessage) {
        options.onNewMessage(message);
      }
    });
    
    socketRef.current.on('messages_read', (data) => {
      if (options.onMessagesRead) {
        options.onMessagesRead(data);
      }
    });
    
    socketRef.current.on('typing_indicator', (data) => {
      if (options.onTypingIndicator) {
        options.onTypingIndicator(data);
      }
    });
    
    // Notifications
    socketRef.current.on('notification', (notification) => {
      // Add notification to state
      setNotifications(prev => [...prev, notification]);
      
      // Call notification callback if provided
      if (options.onNotification) {
        options.onNotification(notification);
      }
    });
    
    // Error handling
    socketRef.current.on('error', (err) => {
      console.error('Socket error:', err);
      setError(err.message || 'Unknown socket error');
    });
    
    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, options.url, options.onNewMessage, options.onMessagesRead, options.onTypingIndicator, options.onNotification]);
  
  /**
   * Join a conversation room
   * @param {string} conversationId - Conversation ID
   */
  const joinConversation = useCallback((conversationId) => {
    if (!socketRef.current || !isConnected) return;
    
    socketRef.current.emit('join_conversation', conversationId);
    setActiveConversations(prev => new Set([...prev, conversationId]));
  }, [isConnected]);
  
  /**
   * Leave a conversation room
   * @param {string} conversationId - Conversation ID
   */
  const leaveConversation = useCallback((conversationId) => {
    if (!socketRef.current || !isConnected) return;
    
    socketRef.current.emit('leave_conversation', conversationId);
    setActiveConversations(prev => {
      const updated = new Set([...prev]);
      updated.delete(conversationId);
      return updated;
    });
  }, [isConnected]);
  
  /**
   * Send a message
   * @param {Object} messageData - Message data
   */
  const sendMessage = useCallback((messageData) => {
    if (!socketRef.current || !isConnected) return;
    
    socketRef.current.emit('send_message', messageData);
  }, [isConnected]);
  
  /**
   * Mark messages as read
   * @param {string} conversationId - Conversation ID
   */
  const markMessagesAsRead = useCallback((conversationId) => {
    if (!socketRef.current || !isConnected) return;
    
    socketRef.current.emit('read_messages', { conversationId });
  }, [isConnected]);
  
  /**
   * Send typing indicator
   * @param {string} conversationId - Conversation ID
   * @param {boolean} isTyping - Whether user is typing
   */
  const sendTypingIndicator = useCallback((conversationId, isTyping = true) => {
    if (!socketRef.current || !isConnected) return;
    
    socketRef.current.emit('typing', {
      conversationId,
      isTyping
    });
  }, [isConnected]);
  
  /**
   * Clear notifications
   */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);
  
  /**
   * Remove a specific notification
   * @param {number} index - Index of notification to remove
   */
  const removeNotification = useCallback((index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  /**
   * Reconnect socket if disconnected
   */
  const reconnect = useCallback(() => {
    if (!socketRef.current) return;
    
    socketRef.current.connect();
  }, []);
  
  /**
   * Disconnect socket
   */
  const disconnect = useCallback(() => {
    if (!socketRef.current) return;
    
    socketRef.current.disconnect();
  }, []);
  
  return {
    isConnected,
    lastMessage,
    notifications,
    activeConversations: Array.from(activeConversations),
    error,
    joinConversation,
    leaveConversation,
    sendMessage,
    markMessagesAsRead,
    sendTypingIndicator,
    clearNotifications,
    removeNotification,
    reconnect,
    disconnect
  };
};

export default useSocket; 