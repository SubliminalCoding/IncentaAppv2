const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_secret';

/**
 * Middleware to authenticate JWT token
 */
exports.authenticateToken = (req, res, next) => {
  // Get auth header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  // Verify token
  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      // Token is invalid or expired
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    // Token is valid, attach user info to request
    req.user = decoded;
    next();
  });
};

/**
 * Middleware to check user roles
 * @param {Array} roles - Allowed roles
 */
exports.checkRole = (roles) => {
  return (req, res, next) => {
    // User should be attached by authenticateToken middleware
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}; 