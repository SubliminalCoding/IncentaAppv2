const express = require('express');
const router = express.Router();
const messagingController = require('./controllers');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/messaging/conversations
 * @desc    Get all conversations for the authenticated user
 * @access  Private
 */
router.get(
  '/conversations',
  authenticate,
  messagingController.getUserConversations
);

/**
 * @route   POST /api/messaging/conversations
 * @desc    Create a new conversation
 * @access  Private
 */
router.post(
  '/conversations',
  authenticate,
  messagingController.createConversation
);

/**
 * @route   GET /api/messaging/conversations/:id
 * @desc    Get a conversation by ID
 * @access  Private
 */
router.get(
  '/conversations/:id',
  authenticate,
  messagingController.getConversationById
);

/**
 * @route   GET /api/messaging/conversations/:id/messages
 * @desc    Get messages for a conversation
 * @access  Private
 */
router.get(
  '/conversations/:id/messages',
  authenticate,
  messagingController.getConversationMessages
);

/**
 * @route   POST /api/messaging/conversations/:id/messages
 * @desc    Send a message in a conversation
 * @access  Private
 */
router.post(
  '/conversations/:id/messages',
  authenticate,
  messagingController.sendMessage
);

/**
 * @route   POST /api/messaging/conversations/:id/read
 * @desc    Mark all messages in a conversation as read
 * @access  Private
 */
router.post(
  '/conversations/:id/read',
  authenticate,
  messagingController.markMessagesAsRead
);

/**
 * @route   GET /api/messaging/unread
 * @desc    Get unread message count for the authenticated user
 * @access  Private
 */
router.get(
  '/unread',
  authenticate,
  messagingController.getUnreadMessageCount
);

/**
 * @route   DELETE /api/messaging/messages/:id
 * @desc    Delete a message
 * @access  Private
 */
router.delete(
  '/messages/:id',
  authenticate,
  messagingController.deleteMessage
);

module.exports = router; 