const express = require('express');
const router = express.Router();
const benefitsController = require('./controllers');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/benefits
 * @desc    Get all benefits for the authenticated user
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  benefitsController.getUserBenefits
);

/**
 * @route   GET /api/benefits/:id
 * @desc    Get details for a specific benefit
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  benefitsController.getBenefitDetails
);

/**
 * @route   GET /api/benefits/dependents
 * @desc    Get user's dependents
 * @access  Private
 */
router.get(
  '/dependents',
  authenticate,
  benefitsController.getUserDependents
);

/**
 * @route   POST /api/benefits/dependents
 * @desc    Add a dependent
 * @access  Private
 */
router.post(
  '/dependents',
  authenticate,
  benefitsController.addDependent
);

/**
 * @route   DELETE /api/benefits/dependents/:id
 * @desc    Remove a dependent
 * @access  Private
 */
router.delete(
  '/dependents/:id',
  authenticate,
  benefitsController.removeDependent
);

/**
 * @route   POST /api/benefits/:id/enroll
 * @desc    Enroll in a benefit
 * @access  Private
 */
router.post(
  '/:id/enroll',
  authenticate,
  benefitsController.enrollBenefit
);

/**
 * @route   POST /api/benefits/:id/cancel
 * @desc    Cancel a benefit enrollment
 * @access  Private
 */
router.post(
  '/:id/cancel',
  authenticate,
  benefitsController.cancelEnrollment
);

module.exports = router; 