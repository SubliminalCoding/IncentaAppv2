const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const userService = require('./services');
const authService = require('./services');
const { generateToken, generateRefreshToken } = require('../middleware/auth');

// JWT configuration
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh_secret';
const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES = '7d';

// In-memory token invalidation list (should be replaced with Redis in production)
const invalidatedTokens = new Set();

/**
 * Login user
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and password are required'
      });
    }
    
    // Check if user exists
    const user = await authService.getUserByEmail(email);
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
    }
    
    // Verify password
    const isPasswordValid = await authService.verifyPassword(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
    }
    
    // Update last login
    await authService.updateLastLogin(user.user_id);
    
    // Generate tokens
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    
    res.status(200).json({
      user: {
        id: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      employerId,
      memberId,
      planId
    } = req.body;
    
    // Validate required inputs
    if (!firstName || !lastName || !email || !password || !employerId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'First name, last name, email, password, and employer ID are required'
      });
    }
    
    // Check if user already exists
    const existingUser = await authService.getUserByEmail(email);
    
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'A user with this email already exists'
      });
    }
    
    // Create user
    const userData = {
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      employerId,
      memberId,
      planId,
      role: 'user' // Default role
    };
    
    const user = await authService.createUser(userData);
    
    // Generate tokens
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    
    res.status(201).json({
      user: {
        id: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role
      },
      accessToken,
      refreshToken,
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

/**
 * Refresh access token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    // Get user from database
    const user = await authService.getUserById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Check token version if implemented
    if (user.token_version !== undefined && decoded.tokenVersion !== user.token_version) {
      return res.status(401).json({ error: 'Refresh token has been revoked' });
    }
    
    // Generate new tokens
    const accessToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);
    
    res.status(200).json({
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
};

/**
 * Get current user info
 */
exports.getMe = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await authService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return user info (exclude sensitive data)
    res.status(200).json({
      user: {
        id: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phoneNumber: user.phone_number,
        role: user.role,
        employerId: user.employer_id,
        memberId: user.member_id,
        planId: user.plan_id,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to retrieve user information' });
  }
};

/**
 * Logout user
 */
exports.logout = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // If you're using token versioning, increment token version to invalidate refresh tokens
    // await authService.incrementTokenVersion(userId);
    
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phoneNumber } = req.body;
    
    // Get current user
    const user = await authService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user profile
    const updatedUser = await authService.updateUser(userId, {
      firstName: firstName || user.first_name,
      lastName: lastName || user.last_name,
      phoneNumber: phoneNumber || user.phone_number
    });
    
    res.status(200).json({
      user: {
        id: updatedUser.user_id,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        email: updatedUser.email,
        phoneNumber: updatedUser.phone_number,
        role: updatedUser.role
      },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

/**
 * Change user password
 */
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    // Validate inputs
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Current password and new password are required'
      });
    }
    
    // Get current user
    const user = await authService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const isPasswordValid = await authService.verifyPassword(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Update password
    await authService.updatePassword(userId, newPassword);
    
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

/**
 * Generate access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      id: user.userId,
      email: user.email,
      role: user.role
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { 
      id: user.userId
    },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES }
  );
}; 