const express = require('express');
const router = express.Router();
const caseController = require('./controllers');
const { validateRequest } = require('../middlewares/validation');
const { authenticateToken, checkRole } = require('../middlewares/auth');

// Apply authentication middleware to all case routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/cases:
 *   get:
 *     summary: Get all cases for the authenticated user
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of cases
 *       401:
 *         description: Unauthorized
 */
router.get('/', caseController.getUserCases);

/**
 * @swagger
 * /api/cases:
 *   post:
 *     summary: Create a new case
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - issueType
 *               - issueDescription
 *             properties:
 *               issueType:
 *                 type: string
 *               issueDescription:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [Low, Medium, High, Urgent]
 *     responses:
 *       201:
 *         description: Case created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', validateRequest('createCase'), caseController.createCase);

/**
 * @swagger
 * /api/cases/{id}:
 *   get:
 *     summary: Get case by ID
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Case details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Case not found
 */
router.get('/:id', caseController.getCaseById);

/**
 * @swagger
 * /api/cases/{id}:
 *   put:
 *     summary: Update case
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [New, Open, InProgress, Resolved, Closed]
 *               priority:
 *                 type: string
 *                 enum: [Low, Medium, High, Urgent]
 *               assignedTo:
 *                 type: string
 *               resolution:
 *                 type: string
 *               isEscalated:
 *                 type: boolean
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Case updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Case not found
 */
router.put('/:id', validateRequest('updateCase'), caseController.updateCase);

/**
 * @swagger
 * /api/cases/{id}/timeline:
 *   get:
 *     summary: Get case timeline
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Case timeline
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Case not found
 */
router.get('/:id/timeline', caseController.getCaseTimeline);

/**
 * @swagger
 * /api/cases/assigned:
 *   get:
 *     summary: Get cases assigned to the authenticated specialist
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assigned cases
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a specialist
 */
router.get('/assigned', checkRole(['specialist', 'admin']), caseController.getAssignedCases);

/**
 * @swagger
 * /api/cases/{id}/documents:
 *   post:
 *     summary: Attach document to case
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               documentType:
 *                 type: string
 *                 enum: [EOB, Bill, IDCard, Prescription, Other]
 *     responses:
 *       201:
 *         description: Document attached successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Case not found
 */
router.post('/:id/documents', caseController.attachDocument);

module.exports = router; 