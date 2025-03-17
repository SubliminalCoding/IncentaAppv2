const db = require('../config/database');

/**
 * Get conversations for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of conversations
 */
exports.getUserConversations = async (userId) => {
  const result = await db.query(
    `SELECT c.*, 
      CASE 
        WHEN c.case_id IS NOT NULL THEN 
          (SELECT issue_type FROM cases WHERE case_id = c.case_id)
        ELSE c.title
      END AS conversation_title,
      (
        SELECT COUNT(*) FROM messages m 
        WHERE m.conversation_id = c.conversation_id 
        AND m.sender_id != $1 
        AND m.is_read = false
      ) as unread_count,
      (
        SELECT MAX(timestamp) FROM messages 
        WHERE conversation_id = c.conversation_id
      ) as last_message_time
    FROM conversations c
    LEFT JOIN cases ca ON c.case_id = ca.case_id
    WHERE ca.user_id = $1 OR ca.assigned_to = $1 OR EXISTS (
      SELECT 1 FROM messages 
      WHERE conversation_id = c.conversation_id 
      AND sender_id = $1
    )
    ORDER BY last_message_time DESC NULLS LAST`,
    [userId]
  );
  
  return result.rows;
};

/**
 * Get a conversation by ID
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<Object|null>} Conversation object or null if not found
 */
exports.getConversationById = async (conversationId) => {
  const result = await db.query(
    `SELECT c.*, 
      CASE 
        WHEN c.case_id IS NOT NULL THEN 
          (SELECT issue_type FROM cases WHERE case_id = c.case_id)
        ELSE c.title
      END AS conversation_title
    FROM conversations c
    WHERE c.conversation_id = $1`,
    [conversationId]
  );
  
  return result.rows[0] || null;
};

/**
 * Check if user has access to a conversation
 * @param {string} userId - User ID
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<boolean>} Whether user has access
 */
exports.userHasAccessToConversation = async (userId, conversationId) => {
  // Get the conversation
  const conversation = await exports.getConversationById(conversationId);
  
  if (!conversation) {
    return false;
  }
  
  // If conversation is linked to a case, check case access
  if (conversation.case_id) {
    const caseResult = await db.query(
      `SELECT * FROM cases 
       WHERE case_id = $1 
       AND (user_id = $2 OR assigned_to = $2)`,
      [conversation.case_id, userId]
    );
    
    return caseResult.rows.length > 0;
  }
  
  // Check if user is a participant in the conversation
  const participantResult = await db.query(
    `SELECT * FROM messages 
     WHERE conversation_id = $1 
     AND sender_id = $2 
     LIMIT 1`,
    [conversationId, userId]
  );
  
  return participantResult.rows.length > 0;
};

/**
 * Get messages for a conversation
 * @param {string} conversationId - Conversation ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of messages
 */
exports.getConversationMessages = async (conversationId, options = {}) => {
  const limit = options.limit || 50;
  const offset = options.offset || 0;
  
  const result = await db.query(
    `SELECT m.*, 
      u.first_name, 
      u.last_name,
      u.role,
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'attachment_id', ma.attachment_id,
            'document_id', ma.document_id,
            'file_name', d.file_name,
            'file_type', d.file_type,
            'file_url', d.file_url
          )
        )
        FROM message_attachments ma
        JOIN documents d ON ma.document_id = d.document_id
        WHERE ma.message_id = m.message_id
      ) as attachments
    FROM messages m
    JOIN users u ON m.sender_id = u.user_id
    WHERE m.conversation_id = $1
    ORDER BY m.timestamp ASC
    LIMIT $2 OFFSET $3`,
    [conversationId, limit, offset]
  );
  
  return result.rows;
};

/**
 * Create a new conversation
 * @param {Object} conversationData - Conversation data
 * @returns {Promise<Object>} Created conversation
 */
exports.createConversation = async (conversationData) => {
  const { title, caseId, participants } = conversationData;
  
  // Start transaction
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create conversation
    const conversationResult = await client.query(
      `INSERT INTO conversations (
        title, case_id, created_at, updated_at
      ) VALUES ($1, $2, NOW(), NOW())
      RETURNING *`,
      [title, caseId]
    );
    
    const conversation = conversationResult.rows[0];
    
    // If participants were provided, add initial system message
    if (participants && participants.length > 0) {
      const participantsList = participants.join(', ');
      await client.query(
        `INSERT INTO messages (
          conversation_id, sender_id, sender_type, content, 
          content_type, timestamp, is_read
        ) VALUES ($1, $2, $3, $4, $5, NOW(), true)`,
        [
          conversation.conversation_id,
          participants[0], // Use first participant as technical sender
          'system',
          `Conversation started with ${participantsList}`,
          'text'
        ]
      );
    }
    
    await client.query('COMMIT');
    return conversation;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Send a message in a conversation
 * @param {Object} messageData - Message data
 * @returns {Promise<Object>} Created message
 */
exports.sendMessage = async (messageData) => {
  const {
    conversationId,
    senderId,
    senderType,
    content,
    contentType = 'text',
    attachments = []
  } = messageData;
  
  // Start transaction
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Insert message
    const messageResult = await client.query(
      `INSERT INTO messages (
        conversation_id, sender_id, sender_type, content, 
        content_type, timestamp, is_read
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      RETURNING *`,
      [
        conversationId,
        senderId,
        senderType,
        content,
        contentType,
        senderType === 'system' // System messages are automatically read
      ]
    );
    
    const message = messageResult.rows[0];
    
    // Update conversation timestamp
    await client.query(
      `UPDATE conversations 
       SET updated_at = NOW() 
       WHERE conversation_id = $1`,
      [conversationId]
    );
    
    // Add attachments if any
    if (attachments && attachments.length > 0) {
      for (const documentId of attachments) {
        await client.query(
          `INSERT INTO message_attachments (
            message_id, document_id
          ) VALUES ($1, $2)`,
          [message.message_id, documentId]
        );
      }
    }
    
    // Get message with sender info
    const completeMessageResult = await client.query(
      `SELECT m.*, 
        u.first_name, 
        u.last_name,
        u.role
      FROM messages m
      JOIN users u ON m.sender_id = u.user_id
      WHERE m.message_id = $1`,
      [message.message_id]
    );
    
    const completeMessage = completeMessageResult.rows[0];
    
    await client.query('COMMIT');
    return completeMessage;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Mark messages as read
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of messages marked as read
 */
exports.markMessagesAsRead = async (conversationId, userId) => {
  const result = await db.query(
    `UPDATE messages 
     SET is_read = true
     WHERE conversation_id = $1 
     AND sender_id != $2
     AND is_read = false
     RETURNING message_id`,
    [conversationId, userId]
  );
  
  return result.rows.length;
};

/**
 * Get unread message count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of unread messages
 */
exports.getUnreadMessageCount = async (userId) => {
  const result = await db.query(
    `SELECT COUNT(*) FROM messages m
     JOIN conversations c ON m.conversation_id = c.conversation_id
     LEFT JOIN cases ca ON c.case_id = ca.case_id
     WHERE m.sender_id != $1
     AND m.is_read = false
     AND (ca.user_id = $1 OR ca.assigned_to = $1 OR EXISTS (
       SELECT 1 FROM messages 
       WHERE conversation_id = c.conversation_id 
       AND sender_id = $1
     ))`,
    [userId]
  );
  
  return parseInt(result.rows[0].count, 10);
};

/**
 * Delete a message
 * @param {string} messageId - Message ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
exports.deleteMessage = async (messageId, userId) => {
  // Check if message exists and belongs to user
  const messageResult = await db.query(
    `SELECT * FROM messages WHERE message_id = $1 AND sender_id = $2`,
    [messageId, userId]
  );
  
  if (messageResult.rows.length === 0) {
    return false;
  }
  
  // Check if message is recent (within 5 minutes)
  const message = messageResult.rows[0];
  const messageTime = new Date(message.timestamp);
  const now = new Date();
  const diffMinutes = (now - messageTime) / (1000 * 60);
  
  if (diffMinutes > 5) {
    // Instead of deleting, mark as redacted
    await db.query(
      `UPDATE messages 
       SET content = '[Message has been redacted]',
           content_type = 'text'
       WHERE message_id = $1`,
      [messageId]
    );
  } else {
    // Delete message if recent
    await db.query(
      `DELETE FROM messages WHERE message_id = $1`,
      [messageId]
    );
  }
  
  return true;
}; 