const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Constants
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'incenta-documents';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/heic',
  'text/plain'
];

// For local development, use the local filesystem
const useLocalStorage = process.env.USE_LOCAL_STORAGE === 'true';
const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || path.join(__dirname, '../../uploads');

// Ensure local storage directory exists
if (useLocalStorage && !fs.existsSync(LOCAL_STORAGE_PATH)) {
  fs.mkdirSync(LOCAL_STORAGE_PATH, { recursive: true });
}

/**
 * Upload a document to S3 or local storage
 */
exports.uploadDocument = async (documentData) => {
  const { userId, caseId, file, documentType } = documentData;
  
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds the maximum allowed limit of 10MB');
  }
  
  // Validate file type
  if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    throw new Error('File type not allowed');
  }
  
  // Generate a unique filename
  const fileExtension = path.extname(file.originalname);
  const fileName = `${uuidv4()}${fileExtension}`;
  
  let fileUrl;
  
  // Upload file to S3 or local storage
  if (useLocalStorage) {
    // Save file to local storage
    const filePath = path.join(LOCAL_STORAGE_PATH, fileName);
    await fs.promises.writeFile(filePath, file.buffer);
    fileUrl = `/uploads/${fileName}`;
  } else {
    // Upload to S3
    const params = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype
    };
    
    const s3Response = await s3.upload(params).promise();
    fileUrl = s3Response.Location;
  }
  
  // Save document metadata to database
  const result = await db.query(
    `INSERT INTO documents (
      user_id, case_id, file_name, original_name, file_type, file_size, 
      file_url, document_type, upload_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
    [
      userId,
      caseId,
      fileName,
      file.originalname,
      file.mimetype,
      file.size,
      fileUrl,
      documentType
    ]
  );
  
  return result.rows[0];
};

/**
 * Get a document by ID
 */
exports.getDocumentById = async (documentId) => {
  const result = await db.query(
    `SELECT * FROM documents WHERE document_id = $1`,
    [documentId]
  );
  
  return result.rows[0] || null;
};

/**
 * Get documents for a case
 */
exports.getCaseDocuments = async (caseId) => {
  const result = await db.query(
    `SELECT * FROM documents 
     WHERE case_id = $1
     ORDER BY upload_date DESC`,
    [caseId]
  );
  
  return result.rows;
};

/**
 * Get documents for a user
 */
exports.getUserDocuments = async (userId) => {
  const result = await db.query(
    `SELECT d.*, c.issue_type as case_issue_type, c.case_number 
     FROM documents d
     LEFT JOIN cases c ON d.case_id = c.case_id
     WHERE d.user_id = $1
     ORDER BY d.upload_date DESC`,
    [userId]
  );
  
  return result.rows;
};

/**
 * Delete a document
 */
exports.deleteDocument = async (documentId) => {
  // Get document info first
  const document = await exports.getDocumentById(documentId);
  
  if (!document) {
    throw new Error('Document not found');
  }
  
  // Delete from storage
  if (useLocalStorage) {
    const filePath = path.join(LOCAL_STORAGE_PATH, document.file_name);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } else {
    // Delete from S3
    const params = {
      Bucket: BUCKET_NAME,
      Key: document.file_name
    };
    
    await s3.deleteObject(params).promise();
  }
  
  // Delete from database
  await db.query(
    `DELETE FROM documents WHERE document_id = $1`,
    [documentId]
  );
  
  return true;
};

/**
 * Update document metadata
 */
exports.updateDocumentMetadata = async (documentId, metadata) => {
  const { documentType, description } = metadata;
  
  const result = await db.query(
    `UPDATE documents 
     SET document_type = COALESCE($1, document_type),
         description = COALESCE($2, description),
         last_updated = NOW()
     WHERE document_id = $3
     RETURNING *`,
    [documentType, description, documentId]
  );
  
  return result.rows[0] || null;
}; 