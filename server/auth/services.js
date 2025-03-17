const bcrypt = require('bcrypt');
const db = require('../config/database');

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null if not found
 */
exports.getUserByEmail = async (email) => {
  try {
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
};

/**
 * Get user by ID
 * @param {string} id - User ID
 * @returns {Promise<Object|null>} User object or null if not found
 */
exports.getUserById = async (id) => {
  try {
    const result = await db.query(
      'SELECT * FROM users WHERE user_id = $1',
      [id]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
};

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user
 */
exports.createUser = async (userData) => {
  try {
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
    
    // Insert the user
    const result = await db.query(
      `INSERT INTO users (
        employer_id, first_name, last_name, email, password, 
        phone_number, member_id, plan_id, role, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *`,
      [
        userData.employerId,
        userData.firstName,
        userData.lastName,
        userData.email,
        hashedPassword,
        userData.phoneNumber,
        userData.memberId,
        userData.planId,
        userData.role || 'user'
      ]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Update user's last login
 * @param {string} userId - User ID
 */
exports.updateLastLogin = async (userId) => {
  try {
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE user_id = $1',
      [userId]
    );
  } catch (error) {
    console.error('Error updating last login:', error);
    throw error;
  }
};

/**
 * Verify user password
 * @param {string} password - Plain text password to verify
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} True if password is valid
 */
exports.verifyPassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} userData - User data to update
 * @returns {Promise<Object>} Updated user
 */
exports.updateUser = async (userId, userData) => {
  try {
    const result = await db.query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone_number = COALESCE($3, phone_number)
       WHERE user_id = $4
       RETURNING *`,
      [
        userData.firstName,
        userData.lastName,
        userData.phoneNumber,
        userId
      ]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Update user password
 * @param {string} userId - User ID
 * @param {string} newPassword - New password
 */
exports.updatePassword = async (userId, newPassword) => {
  try {
    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    await db.query(
      `UPDATE users 
       SET password = $1,
           token_version = COALESCE(token_version, 0) + 1
       WHERE user_id = $2`,
      [hashedPassword, userId]
    );
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

/**
 * Increment token version to invalidate refresh tokens
 * @param {string} userId - User ID
 */
exports.incrementTokenVersion = async (userId) => {
  try {
    await db.query(
      `UPDATE users 
       SET token_version = COALESCE(token_version, 0) + 1
       WHERE user_id = $1`,
      [userId]
    );
  } catch (error) {
    console.error('Error incrementing token version:', error);
    throw error;
  }
}; 