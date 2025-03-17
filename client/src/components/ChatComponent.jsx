import React, { useState, useEffect, useRef } from 'react';
import useSocket from '../hooks/useSocket';

const ChatComponent = ({ conversationId }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Initialize socket with callbacks
  const socket = useSocket({
    onNewMessage: (newMessage) => {
      // Only add messages for the current conversation
      if (newMessage.conversationId === conversationId) {
        setMessages(prev => [...prev, newMessage]);
        // Mark message as read
        socket.markMessagesAsRead(conversationId);
      }
    },
    onTypingIndicator: (data) => {
      if (data.conversationId === conversationId) {
        if (data.isTyping) {
          setTypingUsers(prev => ({
            ...prev,
            [data.userId]: {
              id: data.userId,
              timestamp: new Date()
            }
          }));
        } else {
          setTypingUsers(prev => {
            const updated = { ...prev };
            delete updated[data.userId];
            return updated;
          });
        }
      }
    },
    onMessagesRead: (data) => {
      // Handle messages read event (e.g., update read status indicators)
      console.log('Messages read:', data);
    }
  });
  
  // Load previous messages when component mounts or conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/messages/conversations/${conversationId}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };
    
    if (conversationId) {
      loadMessages();
      socket.joinConversation(conversationId);
    }
    
    // Cleanup when unmounting or conversation changes
    return () => {
      if (conversationId) {
        socket.leaveConversation(conversationId);
      }
    };
  }, [conversationId, socket]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Clear stale typing indicators after 3 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = new Date();
      setTypingUsers(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(userId => {
          const diff = now - new Date(updated[userId].timestamp);
          if (diff > 3000) { // 3 seconds
            delete updated[userId];
          }
        });
        return updated;
      });
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  const handleTyping = () => {
    // Send typing indicator
    socket.sendTypingIndicator(conversationId, true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to clear typing indicator after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      socket.sendTypingIndicator(conversationId, false);
    }, 2000);
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!message.trim() || !socket.isConnected) return;
    
    // Send message via WebSocket
    socket.sendMessage({
      conversationId,
      content: message,
      contentType: 'text'
    });
    
    // Clear input
    setMessage('');
    
    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.sendTypingIndicator(conversationId, false);
  };
  
  if (!socket.isConnected) {
    return (
      <div className="chat-container">
        <div className="connection-status error">
          Disconnected. <button onClick={socket.reconnect}>Reconnect</button>
          {socket.error && <p className="error-message">{socket.error}</p>}
        </div>
      </div>
    );
  }
  
  return (
    <div className="chat-container">
      <div className="connection-status">
        {socket.isConnected ? 'Connected' : 'Disconnected'}
      </div>
      
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">No messages yet</div>
        ) : (
          messages.map(msg => (
            <div 
              key={msg.id || msg.message_id} 
              className={`message ${msg.senderId === socket.userId ? 'own' : 'other'}`}
            >
              <div className="message-sender">
                {msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : 'Unknown'}
              </div>
              <div className="message-content">{msg.content}</div>
              <div className="message-time">
                {new Date(msg.createdAt || msg.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
        
        {/* Typing indicators */}
        {Object.keys(typingUsers).length > 0 && (
          <div className="typing-indicator">
            Someone is typing...
          </div>
        )}
      </div>
      
      <form className="message-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleTyping}
          placeholder="Type a message..."
          disabled={!socket.isConnected}
        />
        <button type="submit" disabled={!socket.isConnected}>Send</button>
      </form>
    </div>
  );
};

export default ChatComponent; 