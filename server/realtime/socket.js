const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/app');
const authService = require('../auth/services');
const messagingService = require('../messaging/services');
const caseService = require('../case/services');

// Keep track of connected users
const connectedUsers = new Map(); // userId -> socket.id
const userConversations = new Map(); // userId -> Set of conversationIds

function initialize(server) {
  const io = socketIo(server, {
    cors: {
      origin: config.corsOrigin || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Socket.io middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }
      
      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await authService.getUserById(decoded.id);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      // Store user info in socket object
      socket.user = {
        id: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      };
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    console.log(`User connected: ${userId} (${socket.user.firstName} ${socket.user.lastName})`);
    
    // Store user connection
    connectedUsers.set(userId, socket.id);
    
    // Initialize user conversations set if not exists
    if (!userConversations.has(userId)) {
      userConversations.set(userId, new Set());
    }
    
    // Join user's conversations
    joinUserConversations(socket);
    
    // Event listeners
    socket.on('join_conversation', (conversationId) => handleJoinConversation(socket, conversationId));
    socket.on('leave_conversation', (conversationId) => handleLeaveConversation(socket, conversationId));
    socket.on('send_message', (messageData) => handleSendMessage(io, socket, messageData));
    socket.on('read_messages', (data) => handleReadMessages(io, socket, data));
    socket.on('typing', (data) => handleTyping(io, socket, data));
    
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
      connectedUsers.delete(userId);
      userConversations.delete(userId);
    });
  });

  return io;
}

// Helper functions
async function joinUserConversations(socket) {
  try {
    const userId = socket.user.id;
    const conversations = await messagingService.getUserConversations(userId);
    
    if (conversations && conversations.length > 0) {
      const userConvSet = userConversations.get(userId);
      
      conversations.forEach(conversation => {
        const roomName = `conversation:${conversation.conversation_id}`;
        socket.join(roomName);
        userConvSet.add(conversation.conversation_id);
        console.log(`User ${userId} joined room: ${roomName}`);
      });
    }
  } catch (error) {
    console.error('Error joining user conversations:', error);
  }
}

async function handleJoinConversation(socket, conversationId) {
  try {
    const userId = socket.user.id;
    
    // Verify user has access to this conversation
    const hasAccess = await messagingService.userHasAccessToConversation(userId, conversationId);
    
    if (!hasAccess) {
      socket.emit('error', { message: 'Access denied to conversation' });
      return;
    }
    
    const roomName = `conversation:${conversationId}`;
    socket.join(roomName);
    
    // Add conversation to user's set
    const userConvSet = userConversations.get(userId);
    userConvSet.add(conversationId);
    
    console.log(`User ${userId} joined conversation: ${conversationId}`);
    
    // Mark messages as read when joining conversation
    await messagingService.markMessagesAsRead(conversationId, userId);
    
    // Notify other users in conversation that this user has read messages
    socket.to(roomName).emit('messages_read', {
      conversationId,
      userId,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error joining conversation:', error);
    socket.emit('error', { message: 'Failed to join conversation' });
  }
}

function handleLeaveConversation(socket, conversationId) {
  const userId = socket.user.id;
  const roomName = `conversation:${conversationId}`;
  
  socket.leave(roomName);
  
  // Remove conversation from user's set
  const userConvSet = userConversations.get(userId);
  if (userConvSet) {
    userConvSet.delete(conversationId);
  }
  
  console.log(`User ${userId} left conversation: ${conversationId}`);
}

async function handleSendMessage(io, socket, messageData) {
  try {
    const userId = socket.user.id;
    
    // Verify message data
    if (!messageData.conversationId || !messageData.content || !messageData.contentType) {
      socket.emit('error', { message: 'Invalid message data' });
      return;
    }
    
    // Verify user has access to this conversation
    const hasAccess = await messagingService.userHasAccessToConversation(userId, messageData.conversationId);
    
    if (!hasAccess) {
      socket.emit('error', { message: 'Access denied to conversation' });
      return;
    }
    
    // Format message data
    const message = {
      conversationId: messageData.conversationId,
      senderId: userId,
      senderType: 'user',
      content: messageData.content,
      contentType: messageData.contentType,
      attachments: messageData.attachments || []
    };
    
    // Save message to database
    const savedMessage = await messagingService.sendMessage(message);
    
    // Get sender details to include in emitted message
    const senderDetails = {
      id: userId,
      firstName: socket.user.firstName,
      lastName: socket.user.lastName,
      role: socket.user.role
    };
    
    // Prepare message object for clients
    const messageForClients = {
      ...savedMessage,
      sender: senderDetails
    };
    
    // Emit to all in conversation room
    const roomName = `conversation:${messageData.conversationId}`;
    io.to(roomName).emit('new_message', messageForClients);
    
    // Send notifications to users not in the conversation room
    await sendMessageNotifications(io, messageData.conversationId, savedMessage, socket.user);
  } catch (error) {
    console.error('Error sending message:', error);
    socket.emit('error', { message: 'Failed to send message' });
  }
}

async function handleReadMessages(io, socket, data) {
  try {
    const userId = socket.user.id;
    
    if (!data.conversationId) {
      socket.emit('error', { message: 'Conversation ID required' });
      return;
    }
    
    // Verify user has access to this conversation
    const hasAccess = await messagingService.userHasAccessToConversation(userId, data.conversationId);
    
    if (!hasAccess) {
      socket.emit('error', { message: 'Access denied to conversation' });
      return;
    }
    
    // Mark messages as read
    await messagingService.markMessagesAsRead(data.conversationId, userId);
    
    // Notify other users in conversation
    const roomName = `conversation:${data.conversationId}`;
    socket.to(roomName).emit('messages_read', {
      conversationId: data.conversationId,
      userId,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    socket.emit('error', { message: 'Failed to mark messages as read' });
  }
}

function handleTyping(io, socket, data) {
  const userId = socket.user.id;
  
  if (!data.conversationId) {
    socket.emit('error', { message: 'Conversation ID required' });
    return;
  }
  
  const roomName = `conversation:${data.conversationId}`;
  
  // Send typing indicator to others in conversation
  socket.to(roomName).emit('typing_indicator', {
    conversationId: data.conversationId,
    userId,
    isTyping: !!data.isTyping,
    timestamp: new Date()
  });
}

// Notification functions
async function sendMessageNotifications(io, conversationId, message, sender) {
  try {
    // Get conversation details to find which users should be notified
    const conversation = await messagingService.getConversationById(conversationId);
    
    if (!conversation) {
      console.error('Conversation not found for notifications:', conversationId);
      return;
    }
    
    // Get all users who should receive notifications
    let userIdsToNotify = [];
    
    // For case-related conversations, notify case owner and assigned specialist
    if (conversation.case_id) {
      const caseData = await caseService.getCaseById(conversation.case_id);
      
      if (caseData) {
        // Add case owner and assigned specialist if they exist
        if (caseData.user_id) userIdsToNotify.push(caseData.user_id);
        if (caseData.assigned_to) userIdsToNotify.push(caseData.assigned_to);
      }
    } else {
      // For direct conversations, notify all participants
      const participants = await messagingService.getConversationParticipants(conversationId);
      userIdsToNotify = participants.map(p => p.user_id);
    }
    
    // Filter out sender and users already in the conversation room
    userIdsToNotify = userIdsToNotify.filter(userId => {
      // Skip sender
      if (userId === sender.id) return false;
      
      // Skip users already in the conversation room
      const userConvs = userConversations.get(userId);
      if (userConvs && userConvs.has(conversationId)) return false;
      
      return true;
    });
    
    // Send notification to each user who should be notified
    userIdsToNotify.forEach(userId => {
      // Check if user is connected
      const socketId = connectedUsers.get(userId);
      if (socketId) {
        io.to(socketId).emit('notification', {
          type: 'new_message',
          conversationId,
          message: {
            id: message.message_id,
            preview: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
            sender: {
              id: sender.id,
              name: `${sender.firstName} ${sender.lastName}`
            },
            timestamp: message.created_at
          }
        });
      }
    });
  } catch (error) {
    console.error('Error sending message notifications:', error);
  }
}

async function sendCaseUpdateNotification(caseId, update, excludeUserId) {
  try {
    // Get case details to find who should be notified
    const caseData = await caseService.getCaseById(caseId);
    
    if (!caseData) {
      console.error('Case not found for notifications:', caseId);
      return;
    }
    
    // Get users who should be notified (case owner and assigned specialist)
    let userIdsToNotify = [];
    
    if (caseData.user_id) userIdsToNotify.push(caseData.user_id);
    if (caseData.assigned_to) userIdsToNotify.push(caseData.assigned_to);
    
    // Filter out the user who made the update
    userIdsToNotify = userIdsToNotify.filter(userId => userId !== excludeUserId);
    
    // Send notification to each user
    userIdsToNotify.forEach(userId => {
      // Check if user is connected
      const socketId = connectedUsers.get(userId);
      if (socketId) {
        const io = getIoInstance();
        if (io) {
          io.to(socketId).emit('notification', {
            type: 'case_update',
            caseId,
            caseNumber: caseData.case_number,
            update
          });
        }
      }
    });
  } catch (error) {
    console.error('Error sending case update notification:', error);
  }
}

// Helper to get IO instance from global scope
let ioInstance = null;
function getIoInstance() {
  return ioInstance;
}

function setIoInstance(io) {
  ioInstance = io;
}

// Function to expose connectedUsers
function getConnectedUsers() {
  return connectedUsers;
}

module.exports = {
  initialize,
  sendCaseUpdateNotification,
  getIoInstance,
  setIoInstance,
  getConnectedUsers
}; 