const express = require('express');
const router = express.Router();
const faqController = require('./controllers');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/faqs
 * @desc    Get all FAQs
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  faqController.getAllFaqs
);

/**
 * @route   GET /api/faqs/categories
 * @desc    Get all FAQ categories
 * @access  Private
 */
router.get(
  '/categories',
  authenticate,
  faqController.getFaqCategories
);

/**
 * @route   GET /api/faqs/category/:category
 * @desc    Get FAQs by category
 * @access  Private
 */
router.get(
  '/category/:category',
  authenticate,
  faqController.getFaqsByCategory
);

/**
 * @route   GET /api/faqs/search
 * @desc    Search FAQs
 * @access  Private
 */
router.get(
  '/search',
  authenticate,
  faqController.searchFaqs
);

/**
 * @route   GET /api/faqs/:id
 * @desc    Get FAQ by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  faqController.getFaqById
);

module.exports = router; 