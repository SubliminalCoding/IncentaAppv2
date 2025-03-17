const Joi = require('joi');

// Define validation schemas
const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  
  refresh: Joi.object({
    refreshToken: Joi.string().required()
  }),
  
  createCase: Joi.object({
    issueType: Joi.string().required(),
    issueDescription: Joi.string().required(),
    priority: Joi.string().valid('Low', 'Medium', 'High', 'Urgent').default('Medium')
  }),
  
  updateCase: Joi.object({
    status: Joi.string().valid('New', 'Open', 'InProgress', 'Resolved', 'Closed'),
    priority: Joi.string().valid('Low', 'Medium', 'High', 'Urgent'),
    assignedTo: Joi.string(),
    resolution: Joi.string(),
    isEscalated: Joi.boolean()
  }).min(1), // At least one field must be provided
  
  createMessage: Joi.object({
    content: Joi.string().required(),
    contentType: Joi.string().valid('Text', 'Image', 'Document').default('Text'),
    attachments: Joi.array().items(Joi.string())
  })
};

/**
 * Middleware to validate request body against a schema
 * @param {string} schemaName - Name of the schema to validate against
 */
exports.validateRequest = (schemaName) => {
  return (req, res, next) => {
    if (!schemas[schemaName]) {
      return res.status(500).json({ error: `Schema ${schemaName} not found` });
    }
    
    const { error } = schemas[schemaName].validate(req.body, { abortEarly: false });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({ error: errorMessage });
    }
    
    next();
  };
}; 