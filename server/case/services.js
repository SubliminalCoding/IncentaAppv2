const db = require('../config/database');

/**
 * Get all cases for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of cases
 */
exports.getUserCases = async (userId) => {
  try {
    const result = await db.query(
      `SELECT c.*, 
        u.first_name AS assigned_first_name, 
        u.last_name AS assigned_last_name
      FROM cases c
      LEFT JOIN users u ON c.assigned_to = u.user_id
      WHERE c.user_id = $1
      ORDER BY c.updated_at DESC`,
      [userId]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error getting user cases:', error);
    throw error;
  }
};

/**
 * Get case by ID
 * @param {string} caseId - Case ID
 * @returns {Promise<Object|null>} Case object or null if not found
 */
exports.getCaseById = async (caseId) => {
  try {
    const result = await db.query(
      `SELECT c.*, 
        u.first_name AS assigned_first_name, 
        u.last_name AS assigned_last_name
      FROM cases c
      LEFT JOIN users u ON c.assigned_to = u.user_id
      WHERE c.case_id = $1`,
      [caseId]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting case by ID:', error);
    throw error;
  }
};

/**
 * Create a new case
 * @param {Object} caseData - Case data
 * @returns {Promise<Object>} Created case
 */
exports.createCase = async (caseData) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Insert the case
    const caseResult = await client.query(
      `INSERT INTO cases (
        user_id, issue_type, issue_description, priority, status
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        caseData.userId,
        caseData.issueType,
        caseData.issueDescription,
        caseData.priority || 'Medium',
        'New'
      ]
    );
    
    const newCase = caseResult.rows[0];
    
    // Add to timeline
    await client.query(
      `INSERT INTO case_timeline (
        case_id, status, actor_id, notes
      ) VALUES ($1, $2, $3, $4)`,
      [
        newCase.case_id,
        'New',
        caseData.userId,
        'Case created'
      ]
    );
    
    // Create conversation for the case
    await client.query(
      `INSERT INTO conversations (
        case_id, title
      ) VALUES ($1, $2)`,
      [
        newCase.case_id,
        `Case #${newCase.case_id}: ${caseData.issueType}`
      ]
    );
    
    await client.query('COMMIT');
    return newCase;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating case:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Update a case
 * @param {string} caseId - Case ID
 * @param {Object} caseData - Case data to update
 * @param {string} actorId - User ID making the update
 * @returns {Promise<Object>} Updated case
 */
exports.updateCase = async (caseId, caseData, actorId) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get current case to compare changes
    const currentCaseResult = await client.query(
      'SELECT * FROM cases WHERE case_id = $1',
      [caseId]
    );
    
    const currentCase = currentCaseResult.rows[0];
    if (!currentCase) {
      throw new Error('Case not found');
    }
    
    // Build update query based on provided fields
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (caseData.status && caseData.status !== currentCase.status) {
      updates.push(`status = $${paramIndex}`);
      values.push(caseData.status);
      paramIndex++;
    }
    
    if (caseData.priority && caseData.priority !== currentCase.priority) {
      updates.push(`priority = $${paramIndex}`);
      values.push(caseData.priority);
      paramIndex++;
    }
    
    if (caseData.assignedTo !== undefined && caseData.assignedTo !== currentCase.assigned_to) {
      updates.push(`assigned_to = $${paramIndex}`);
      values.push(caseData.assignedTo);
      paramIndex++;
    }
    
    if (caseData.resolution !== undefined) {
      updates.push(`resolution = $${paramIndex}`);
      values.push(caseData.resolution);
      paramIndex++;
    }
    
    if (caseData.isEscalated !== undefined && caseData.isEscalated !== currentCase.is_escalated) {
      updates.push(`is_escalated = $${paramIndex}`);
      values.push(caseData.isEscalated);
      paramIndex++;
    }
    
    if (caseData.dueDate !== undefined) {
      updates.push(`due_date = $${paramIndex}`);
      values.push(caseData.dueDate);
      paramIndex++;
    }
    
    // Add updated_at timestamp
    updates.push(`updated_at = NOW()`);
    
    // If no updates, return current case
    if (values.length === 0) {
      return currentCase;
    }
    
    // Add case_id to values array
    values.push(caseId);
    
    // Update the case
    const updateQuery = `
      UPDATE cases 
      SET ${updates.join(', ')} 
      WHERE case_id = $${paramIndex}
      RETURNING *
    `;
    
    const updateResult = await client.query(updateQuery, values);
    const updatedCase = updateResult.rows[0];
    
    // Add timeline entry if status changed
    if (caseData.status && caseData.status !== currentCase.status) {
      await client.query(
        `INSERT INTO case_timeline (
          case_id, status, actor_id, notes
        ) VALUES ($1, $2, $3, $4)`,
        [
          caseId,
          caseData.status,
          actorId,
          caseData.notes || `Status changed from ${currentCase.status} to ${caseData.status}`
        ]
      );
    }
    
    // Add timeline entry if assigned_to changed
    if (caseData.assignedTo !== undefined && caseData.assignedTo !== currentCase.assigned_to) {
      await client.query(
        `INSERT INTO case_timeline (
          case_id, status, actor_id, notes
        ) VALUES ($1, $2, $3, $4)`,
        [
          caseId,
          updatedCase.status,
          actorId,
          `Case assigned to specialist ID: ${caseData.assignedTo}`
        ]
      );
    }
    
    await client.query('COMMIT');
    return updatedCase;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating case:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get case timeline
 * @param {string} caseId - Case ID
 * @returns {Promise<Array>} Array of timeline entries
 */
exports.getCaseTimeline = async (caseId) => {
  try {
    const result = await db.query(
      `SELECT t.*, 
        u.first_name, 
        u.last_name,
        u.role
      FROM case_timeline t
      LEFT JOIN users u ON t.actor_id = u.user_id
      WHERE t.case_id = $1
      ORDER BY t.timestamp ASC`,
      [caseId]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error getting case timeline:', error);
    throw error;
  }
};

/**
 * Get cases assigned to a specialist
 * @param {string} specialistId - Specialist user ID
 * @returns {Promise<Array>} Array of cases
 */
exports.getAssignedCases = async (specialistId) => {
  try {
    const result = await db.query(
      `SELECT c.*, 
        u.first_name AS user_first_name, 
        u.last_name AS user_last_name
      FROM cases c
      JOIN users u ON c.user_id = u.user_id
      WHERE c.assigned_to = $1
      ORDER BY 
        CASE WHEN c.status = 'New' THEN 1
             WHEN c.status = 'Open' THEN 2
             WHEN c.status = 'InProgress' THEN 3
             WHEN c.status = 'Resolved' THEN 4
             WHEN c.status = 'Closed' THEN 5
             ELSE 6
        END,
        c.updated_at DESC`,
      [specialistId]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error getting assigned cases:', error);
    throw error;
  }
}; 