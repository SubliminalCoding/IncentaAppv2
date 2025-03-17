const documentService = require('./services');
const caseService = require('../case/services');

/**
 * Upload a document
 */
exports.uploadDocument = async (req, res) => {
  try {
    // This is handled by the case controller's attachDocument method
    // when attaching to a case, but this endpoint allows direct uploads
    
    const userId = req.user.id;
    const caseId = req.body.caseId;
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // If case ID is provided, check if user has access to the case
    if (caseId) {
      const caseData = await caseService.getCaseById(caseId);
      
      if (!caseData) {
        return res.status(404).json({ error: 'Case not found' });
      }
      
      // Check if user has access to the case
      if (caseData.user_id !== userId && caseData.assigned_to !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied to this case' });
      }
    }
    
    // Prepare the document data
    const documentData = {
      userId,
      caseId: caseId || null,
      file: req.file,
      documentType: req.body.documentType || 'Other',
    };
    
    // Upload the document
    const document = await documentService.uploadDocument(documentData);
    
    // If case ID is provided, update the case timeline
    if (caseId) {
      await caseService.updateCase(
        caseId,
        { notes: `Document ${document.original_name} uploaded` },
        userId
      );
    }
    
    res.status(201).json({
      document,
      message: 'Document uploaded successfully'
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload document' });
  }
};

/**
 * Get a document by ID
 */
exports.getDocumentById = async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;
    
    const document = await documentService.getDocumentById(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check if user has access to the document
    // Users can access their own documents or documents from cases they're assigned to
    if (document.user_id !== userId && req.user.role !== 'admin') {
      // If document is linked to a case, check case access
      if (document.case_id) {
        const caseData = await caseService.getCaseById(document.case_id);
        
        if (!caseData || (caseData.user_id !== userId && caseData.assigned_to !== userId)) {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    res.status(200).json({ document });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Failed to retrieve document' });
  }
};

/**
 * Get documents for a case
 */
exports.getCaseDocuments = async (req, res) => {
  try {
    const caseId = req.params.caseId;
    const userId = req.user.id;
    
    // Check if user has access to the case
    const caseData = await caseService.getCaseById(caseId);
    
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    if (caseData.user_id !== userId && caseData.assigned_to !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const documents = await documentService.getCaseDocuments(caseId);
    
    res.status(200).json({ documents });
  } catch (error) {
    console.error('Get case documents error:', error);
    res.status(500).json({ error: 'Failed to retrieve case documents' });
  }
};

/**
 * Get documents for the authenticated user
 */
exports.getUserDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const documents = await documentService.getUserDocuments(userId);
    
    res.status(200).json({ documents });
  } catch (error) {
    console.error('Get user documents error:', error);
    res.status(500).json({ error: 'Failed to retrieve user documents' });
  }
};

/**
 * Delete a document
 */
exports.deleteDocument = async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;
    
    const document = await documentService.getDocumentById(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check if user has access to delete the document
    // Only the document owner, case owner, assigned specialist, or admin can delete
    if (document.user_id !== userId && req.user.role !== 'admin') {
      // If document is linked to a case, check case access for specialists
      if (document.case_id && req.user.role === 'specialist') {
        const caseData = await caseService.getCaseById(document.case_id);
        
        if (!caseData || caseData.assigned_to !== userId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    await documentService.deleteDocument(documentId);
    
    // If document was linked to a case, update the case timeline
    if (document.case_id) {
      await caseService.updateCase(
        document.case_id,
        { notes: `Document ${document.original_name} deleted` },
        userId
      );
    }
    
    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete document' });
  }
};

/**
 * Update document metadata
 */
exports.updateDocumentMetadata = async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;
    
    const document = await documentService.getDocumentById(documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check if user has access to update the document
    if (document.user_id !== userId && req.user.role !== 'admin') {
      // If document is linked to a case, check case access for specialists
      if (document.case_id && req.user.role === 'specialist') {
        const caseData = await caseService.getCaseById(document.case_id);
        
        if (!caseData || caseData.assigned_to !== userId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const metadata = {
      documentType: req.body.documentType,
      description: req.body.description
    };
    
    const updatedDocument = await documentService.updateDocumentMetadata(
      documentId,
      metadata
    );
    
    res.status(200).json({
      document: updatedDocument,
      message: 'Document metadata updated successfully'
    });
  } catch (error) {
    console.error('Update document metadata error:', error);
    res.status(500).json({ error: 'Failed to update document metadata' });
  }
}; 