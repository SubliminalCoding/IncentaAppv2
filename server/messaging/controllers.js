const messagingService = require('./services');
const caseService = require('../case/services');

/**
 * Get conversations for the authenticated user
 */
exports.getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await messagingService.getUserConversations(userId);
    
    res.status(200).json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to retrieve conversations' });
  }
};

/**
 * Get conversation by ID
 */
exports.getConversationById = async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user.id;
    
    // Check if user has access to this conversation
    const hasAccess = await messagingService.userHasAccessToConversation(userId, conversationId);
    
    if (!hasAccess && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const conversation = await messagingService.getConversationById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.status(200).json({ conversation });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to retrieve conversation' });
  }
};

/**
 * Get messages for a conversation
 */
exports.getConversationMessages = async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user.id;
    
    // Check if user has access to this conversation
    const hasAccess = await messagingService.userHasAccessToConversation(userId, conversationId);
    
    if (!hasAccess && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    
    const messages = await messagingService.getConversationMessages(conversationId, page, pageSize);
    
    // Mark messages as read via WebSocket if available
    const io = req.app.get('io');
    if (io) {
      await messagingService.markMessagesAsRead(conversationId, userId);
      
      // Emit event to all users in the conversation that this user has read messages
      io.to(`conversation:${conversationId}`).emit('messages_read', {
        conversationId,
        userId,
        timestamp: new Date()
      });
    }
    
    res.status(200).json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
};

/**
 * Send a message to a conversation
 * Used as a fallback for clients that don't support WebSockets
 */
exports.sendMessage = async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user.id;
    
    // Check if user has access to this conversation
    const hasAccess = await messagingService.userHasAccessToConversation(userId, conversationId);
    
    if (!hasAccess && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Validate request
    if (!req.body.content) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    // Create message object
    const messageData = {
      conversationId,
      senderId: userId,
      senderType: req.user.role,
      content: req.body.content,
      contentType: req.body.contentType || 'text',
      attachments: req.body.attachments || []
    };
    
    // Send the message
    const message = await messagingService.sendMessage(messageData);
    
    // Add sender info to the response
    message.sender = {
      id: userId,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role
    };
    
    // Broadcast message to all users in the conversation via WebSocket if available
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('new_message', message);
      
      // Get socket service to send notifications to users not in the conversation
      const socketService = require('../realtime/socket');
      await socketService.sendCaseUpdateNotification(
        message.case_id,
        {
          type: 'new_message',
          message: {
            id: message.message_id,
            content: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
            sender: {
              id: userId,
              name: `${req.user.firstName} ${req.user.lastName}`
            },
            timestamp: message.created_at
          }
        },
        userId
      );
    }
    
    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

/**
 * Mark messages as read
 * Used as a fallback for clients that don't support WebSockets
 */
exports.markMessagesAsRead = async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user.id;
    
    // Check if user has access to this conversation
    const hasAccess = await messagingService.userHasAccessToConversation(userId, conversationId);
    
    if (!hasAccess && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Mark messages as read
    const count = await messagingService.markMessagesAsRead(conversationId, userId);
    
    // Broadcast to all users in the conversation that this user has read messages via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('messages_read', {
        conversationId,
        userId,
        timestamp: new Date()
      });
    }
    
    res.status(200).json({ 
      message: `Marked ${count} messages as read`,
      count
    });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};

/**
 * Create a new conversation
 */
exports.createConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Validate request
    if (!req.body.participants || !Array.isArray(req.body.participants)) {
      return res.status(400).json({ error: 'Participants array is required' });
    }
    
    // Ensure current user is included in participants
    const participants = Array.from(new Set([...req.body.participants, userId]));
    
    // Create conversation
    const conversationData = {
      title: req.body.title,
      caseId: req.body.caseId,
      participants,
      createdBy: userId
    };
    
    const conversation = await messagingService.createConversation(conversationData);
    
    // Notify participants about the new conversation via WebSocket
    const io = req.app.get('io');
    if (io) {
      participants.forEach(participantId => {
        // Skip the creator
        if (participantId === userId) return;
        
        // Check if participant is connected
        const socketService = require('../realtime/socket');
        const connectedUsers = socketService.getConnectedUsers();
        
        if (connectedUsers && connectedUsers.has(participantId)) {
          io.to(connectedUsers.get(participantId)).emit('notification', {
            type: 'new_conversation',
            conversation: {
              id: conversation.conversation_id,
              title: conversation.title,
              caseId: conversation.case_id,
              createdBy: {
                id: userId,
                name: `${req.user.firstName} ${req.user.lastName}`
              },
              timestamp: conversation.created_at
            }
          });
        }
      });
    }
    
    res.status(201).json({ conversation });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
};

/**
 * Get unread message count for the authenticated user
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const unreadCount = await messagingService.getUnreadMessageCount(userId);
    
    res.status(200).json({ unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to retrieve unread message count' });
  }
};

/**
 * Delete a message
 */
exports.deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;
    
    const success = await messagingService.deleteMessage(messageId, userId);
    
    if (!success) {
      return res.status(404).json({
        error: 'Message not found or you do not have permission to delete it'
      });
    }
    
    res.status(200).json({ message: 'Message deleted or redacted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
}; 