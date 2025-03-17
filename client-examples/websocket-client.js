/**
 * Example WebSocket Client for Incenta App
 * 
 * This is a simple client script that demonstrates how to connect to the
 * WebSocket server and interact with real-time features.
 * 
 * Usage: 
 * 1. Update the CONFIG section with your server URL and JWT token
 * 2. Run with Node.js: node websocket-client.js
 */

const { io } = require('socket.io-client');

// CONFIG - Update these values
const CONFIG = {
  SERVER_URL: 'http://localhost:3000',  // Update with your server URL
  JWT_TOKEN: 'your_jwt_token_here',     // Get this by logging in through the API
  CONVERSATION_ID: '1'                  // ID of conversation to join
};

// Create socket instance
const socket = io(CONFIG.SERVER_URL, {
  auth: {
    token: CONFIG.JWT_TOKEN
  }
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to WebSocket server');
  
  // After connection, join a conversation
  joinConversation(CONFIG.CONVERSATION_ID);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

// Messaging events
socket.on('new_message', (message) => {
  console.log('New message received:', message);
  
  // Example: Mark messages as read after a short delay
  setTimeout(() => {
    socket.emit('read_messages', { conversationId: message.conversationId });
  }, 1000);
});

socket.on('messages_read', (data) => {
  console.log('Messages read by user:', data);
});

socket.on('typing_indicator', (data) => {
  console.log('User is typing:', data);
});

// Notification events
socket.on('notification', (notification) => {
  console.log('Notification received:', notification);
  
  // Example: Join conversation if it's a new conversation notification
  if (notification.type === 'new_conversation') {
    joinConversation(notification.conversation.id);
  }
});

// Error events
socket.on('error', (error) => {
  console.error('Server error:', error);
});

// Helper functions
function joinConversation(conversationId) {
  console.log(`Joining conversation ${conversationId}...`);
  socket.emit('join_conversation', conversationId);
}

function sendMessage(conversationId, content) {
  console.log(`Sending message to conversation ${conversationId}...`);
  socket.emit('send_message', {
    conversationId,
    content,
    contentType: 'text'
  });
}

function indicateTyping(conversationId, isTyping = true) {
  socket.emit('typing', {
    conversationId,
    isTyping
  });
}

// Command line interface for testing
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('WebSocket Client Example');
console.log('------------------------');
console.log('Commands:');
console.log('  /join [id] - Join a conversation');
console.log('  /leave [id] - Leave a conversation');
console.log('  /typing [id] - Send typing indicator');
console.log('  /stoptyping [id] - Stop typing indicator');
console.log('  /exit - Disconnect and exit');
console.log('  [anything else] - Send as a message to current conversation');
console.log('------------------------');

let currentConversation = CONFIG.CONVERSATION_ID;

rl.on('line', (input) => {
  if (input.startsWith('/join ')) {
    const id = input.substring(6);
    joinConversation(id);
    currentConversation = id;
  } 
  else if (input.startsWith('/leave ')) {
    const id = input.substring(7);
    socket.emit('leave_conversation', id);
    console.log(`Left conversation ${id}`);
    if (currentConversation === id) {
      currentConversation = null;
    }
  } 
  else if (input.startsWith('/typing ')) {
    const id = input.substring(8);
    indicateTyping(id, true);
    console.log(`Typing indicator sent for conversation ${id}`);
  } 
  else if (input.startsWith('/stoptyping ')) {
    const id = input.substring(12);
    indicateTyping(id, false);
    console.log(`Stopped typing indicator for conversation ${id}`);
  } 
  else if (input === '/exit') {
    socket.disconnect();
    rl.close();
  } 
  else {
    if (!currentConversation) {
      console.log('No active conversation. Join one first with /join [id]');
    } else {
      sendMessage(currentConversation, input);
    }
  }
}); 