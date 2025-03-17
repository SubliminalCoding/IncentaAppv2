const express = require('express');
const router = express.Router();
const documentController = require('./controllers');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  }
});

/**
 * @route   POST /api/documents
 * @desc    Upload a document
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  upload.single('file'),
  documentController.uploadDocument
);

/**
 * @route   GET /api/documents/:id
 * @desc    Get a document by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  documentController.getDocumentById
);

/**
 * @route   GET /api/documents/case/:caseId
 * @desc    Get all documents for a case
 * @access  Private
 */
router.get(
  '/case/:caseId',
  authenticate,
  documentController.getCaseDocuments
);

/**
 * @route   GET /api/documents/user
 * @desc    Get all documents for the authenticated user
 * @access  Private
 */
router.get(
  '/user',
  authenticate,
  documentController.getUserDocuments
);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete a document
 * @access  Private
 */
router.delete(
  '/:id',
  authenticate,
  documentController.deleteDocument
);

/**
 * @route   PATCH /api/documents/:id
 * @desc    Update document metadata
 * @access  Private
 */
router.patch(
  '/:id',
  authenticate,
  documentController.updateDocumentMetadata
);

module.exports = router; 