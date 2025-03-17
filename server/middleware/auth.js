const jwt = require('jsonwebtoken');
const authService = require('../auth/services');

/**
 * Authenticate user using JWT token
 */
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await authService.getUserById(decoded.id);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid token. User not found' });
      }
      
      // Add user info to request
      req.user = {
        id: user.user_id,
        email: user.email,
        role: user.role,
        employerId: user.employer_id,
        firstName: user.first_name,
        lastName: user.last_name
      };
      
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Check if user has required role
 * @param {Array} roles - Array of allowed roles
 */
exports.checkRole = (roles) => {
  return (req, res, next) => {
    // Make sure authenticate middleware has run
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if user's role is in the allowed roles
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have the required role to access this resource'
      });
    }
  };
};

/**
 * Generate JWT token
 * @param {Object} user - User object
 */
exports.generateToken = (user) => {
  const payload = {
    id: user.user_id,
    email: user.email,
    role: user.role
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION || '7d'
  });
};

/**
 * Generate refresh token
 * @param {Object} user - User object
 */
exports.generateRefreshToken = (user) => {
  const payload = {
    id: user.user_id,
    tokenVersion: user.token_version || 0
  };
  
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRATION || '30d'
  });
}; 