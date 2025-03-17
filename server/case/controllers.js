const caseService = require('./services');
const documentService = require('../document/services');
const socketService = require('../realtime/socket');

/**
 * Get all cases for the authenticated user
 */
exports.getUserCases = async (req, res) => {
  try {
    const userId = req.user.id;
    const cases = await caseService.getUserCases(userId);
    
    res.status(200).json({ cases });
  } catch (error) {
    console.error('Get user cases error:', error);
    res.status(500).json({ error: 'Failed to retrieve cases' });
  }
};

/**
 * Get case by ID
 */
exports.getCaseById = async (req, res) => {
  try {
    const caseId = req.params.id;
    const userId = req.user.id;
    
    const caseData = await caseService.getCaseById(caseId);
    
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    // Check if user has access to the case (owner or assigned specialist)
    if (caseData.user_id !== userId && caseData.assigned_to !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.status(200).json({ case: caseData });
  } catch (error) {
    console.error('Get case error:', error);
    res.status(500).json({ error: 'Failed to retrieve case' });
  }
};

/**
 * Create a new case
 */
exports.createCase = async (req, res) => {
  try {
    const userId = req.user.id;
    const caseData = {
      userId,
      issueType: req.body.issueType,
      issueDescription: req.body.issueDescription,
      priority: req.body.priority
    };
    
    const newCase = await caseService.createCase(caseData);
    
    // Create a message in the conversation if io is available
    const io = req.app.get('io');
    if (io) {
      // The createCase service function should return the conversation_id if it creates one
      if (newCase.conversation_id) {
        const systemMessage = {
          conversationId: newCase.conversation_id,
          senderId: userId,
          senderType: 'system',
          content: 'Case created. Please wait for a specialist to be assigned.',
          contentType: 'text'
        };
        
        // Get messaging service and send system message
        const messagingService = require('../messaging/services');
        await messagingService.sendMessage(systemMessage);
      }
    }
    
    res.status(201).json({ case: newCase, message: 'Case created successfully' });
  } catch (error) {
    console.error('Create case error:', error);
    res.status(500).json({ error: 'Failed to create case' });
  }
};

/**
 * Update a case
 */
exports.updateCase = async (req, res) => {
  try {
    const caseId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Get current case
    const existingCase = await caseService.getCaseById(caseId);
    
    if (!existingCase) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    // Check if user has access to update the case
    const isOwner = existingCase.user_id === userId;
    const isAssigned = existingCase.assigned_to === userId;
    const isAdmin = userRole === 'admin';
    
    if (!isOwner && !isAssigned && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Limit what regular users can update
    const updateData = {};
    
    if (userRole === 'specialist' || userRole === 'admin') {
      // Specialists and admins can update all fields
      updateData.status = req.body.status;
      updateData.priority = req.body.priority;
      updateData.assignedTo = req.body.assignedTo;
      updateData.resolution = req.body.resolution;
      updateData.isEscalated = req.body.isEscalated;
      updateData.dueDate = req.body.dueDate;
      updateData.notes = req.body.notes;
    } else {
      // Regular users can only update limited fields
      if (req.body.isEscalated !== undefined) {
        updateData.isEscalated = req.body.isEscalated;
      }
      if (req.body.notes) {
        updateData.notes = req.body.notes;
      }
    }
    
    const updatedCase = await caseService.updateCase(caseId, updateData, userId);
    
    // Send real-time notification about the case update
    const update = {
      type: 'update',
      status: updatedCase.status,
      updatedBy: {
        id: userId,
        role: userRole,
        name: `${req.user.firstName} ${req.user.lastName}`
      },
      timestamp: new Date()
    };
    
    // Add specific update details
    if (updateData.status && updateData.status !== existingCase.status) {
      update.statusChanged = {
        from: existingCase.status,
        to: updateData.status
      };
    }
    
    if (updateData.assignedTo && updateData.assignedTo !== existingCase.assigned_to) {
      update.assignmentChanged = {
        from: existingCase.assigned_to,
        to: updateData.assignedTo
      };
    }
    
    if (updateData.priority && updateData.priority !== existingCase.priority) {
      update.priorityChanged = {
        from: existingCase.priority,
        to: updateData.priority
      };
    }
    
    // Send notification through WebSocket
    await socketService.sendCaseUpdateNotification(caseId, update, userId);
    
    // Create a system message in the case conversation if status changed
    if (updatedCase.conversation_id && updateData.status && updateData.status !== existingCase.status) {
      try {
        // Get messaging service
        const messagingService = require('../messaging/services');
        
        const statusMessage = {
          conversationId: updatedCase.conversation_id,
          senderId: userId,
          senderType: 'system',
          content: `Case status changed from ${existingCase.status} to ${updateData.status}`,
          contentType: 'text'
        };
        
        await messagingService.sendMessage(statusMessage);
      } catch (error) {
        console.error('Create status message error:', error);
        // Don't fail the request if system message fails
      }
    }
    
    res.status(200).json({
      case: updatedCase,
      message: 'Case updated successfully'
    });
  } catch (error) {
    console.error('Update case error:', error);
    res.status(500).json({ error: 'Failed to update case' });
  }
};

/**
 * Get case timeline
 */
exports.getCaseTimeline = async (req, res) => {
  try {
    const caseId = req.params.id;
    const userId = req.user.id;
    
    // Get current case to check access
    const existingCase = await caseService.getCaseById(caseId);
    
    if (!existingCase) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    // Check if user has access to the case
    if (existingCase.user_id !== userId && existingCase.assigned_to !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const timeline = await caseService.getCaseTimeline(caseId);
    
    res.status(200).json({ timeline });
  } catch (error) {
    console.error('Get timeline error:', error);
    res.status(500).json({ error: 'Failed to retrieve case timeline' });
  }
};

/**
 * Get cases assigned to the authenticated specialist
 */
exports.getAssignedCases = async (req, res) => {
  try {
    const specialistId = req.user.id;
    
    // Verify user is a specialist
    if (req.user.role !== 'specialist' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Not a specialist' });
    }
    
    const assignedCases = await caseService.getAssignedCases(specialistId);
    
    res.status(200).json({ cases: assignedCases });
  } catch (error) {
    console.error('Get assigned cases error:', error);
    res.status(500).json({ error: 'Failed to retrieve assigned cases' });
  }
};

/**
 * Attach document to case
 */
exports.attachDocument = async (req, res) => {
  try {
    const caseId = req.params.id;
    const userId = req.user.id;
    
    // Get current case to check access
    const existingCase = await caseService.getCaseById(caseId);
    
    if (!existingCase) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    // Check if user has access to the case
    if (existingCase.user_id !== userId && existingCase.assigned_to !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Upload document first
    const documentData = {
      userId,
      caseId,
      file: req.file,
      documentType: req.body.documentType || 'Other'
    };
    
    const document = await documentService.uploadDocument(documentData);
    
    // Add to case timeline
    const updateData = { 
      notes: `Document ${document.file_name} uploaded` 
    };
    
    await caseService.updateCase(caseId, updateData, userId);
    
    // Send notification through WebSocket
    const update = {
      type: 'document_added',
      document: {
        id: document.document_id,
        fileName: document.file_name,
        fileType: document.file_type,
        documentType: document.document_type
      },
      addedBy: {
        id: userId,
        name: `${req.user.firstName} ${req.user.lastName}`
      },
      timestamp: new Date()
    };
    
    await socketService.sendCaseUpdateNotification(caseId, update, userId);
    
    // Create a system message in the case conversation for the document
    if (existingCase.conversation_id) {
      try {
        // Get messaging service
        const messagingService = require('../messaging/services');
        
        const documentMessage = {
          conversationId: existingCase.conversation_id,
          senderId: userId,
          senderType: 'system',
          content: `Document ${document.file_name} uploaded`,
          contentType: 'text',
          attachments: [document.document_id]
        };
        
        await messagingService.sendMessage(documentMessage);
      } catch (error) {
        console.error('Create document message error:', error);
        // Don't fail the request if system message fails
      }
    }
    
    res.status(201).json({
      document,
      message: 'Document attached successfully'
    });
  } catch (error) {
    console.error('Attach document error:', error);
    res.status(500).json({ error: 'Failed to attach document' });
  }
}; 