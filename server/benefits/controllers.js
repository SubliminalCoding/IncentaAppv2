const benefitsService = require('./services');

/**
 * Get benefits for the authenticated user
 */
exports.getUserBenefits = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const benefits = await benefitsService.getUserBenefits(userId);
    
    res.status(200).json({ benefits });
  } catch (error) {
    console.error('Get user benefits error:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve benefits' });
  }
};

/**
 * Get details for a specific benefit
 */
exports.getBenefitDetails = async (req, res) => {
  try {
    const benefitId = req.params.id;
    const userId = req.user.id;
    
    const benefitDetails = await benefitsService.getBenefitDetails(benefitId, userId);
    
    if (!benefitDetails) {
      return res.status(404).json({ error: 'Benefit not found' });
    }
    
    res.status(200).json({ benefit: benefitDetails });
  } catch (error) {
    console.error('Get benefit details error:', error);
    res.status(500).json({ error: 'Failed to retrieve benefit details' });
  }
};

/**
 * Get user's dependents
 */
exports.getUserDependents = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const dependents = await benefitsService.getUserDependents(userId);
    
    res.status(200).json({ dependents });
  } catch (error) {
    console.error('Get user dependents error:', error);
    res.status(500).json({ error: 'Failed to retrieve dependents' });
  }
};

/**
 * Add a dependent
 */
exports.addDependent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, dateOfBirth, relationship } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !dateOfBirth || !relationship) {
      return res.status(400).json({
        error: 'Missing required fields',
        requiredFields: ['firstName', 'lastName', 'dateOfBirth', 'relationship']
      });
    }
    
    const dependent = await benefitsService.addDependent(userId, {
      firstName,
      lastName,
      dateOfBirth,
      relationship
    });
    
    res.status(201).json({
      dependent,
      message: 'Dependent added successfully'
    });
  } catch (error) {
    console.error('Add dependent error:', error);
    res.status(500).json({ error: 'Failed to add dependent' });
  }
};

/**
 * Remove a dependent
 */
exports.removeDependent = async (req, res) => {
  try {
    const userId = req.user.id;
    const dependentId = req.params.id;
    
    await benefitsService.removeDependent(dependentId, userId);
    
    res.status(200).json({ message: 'Dependent removed successfully' });
  } catch (error) {
    console.error('Remove dependent error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to remove dependent' });
  }
};

/**
 * Enroll in a benefit
 */
exports.enrollBenefit = async (req, res) => {
  try {
    const userId = req.user.id;
    const benefitId = req.params.id;
    const {
      coverageLevel,
      dependentsCovered,
      effectiveDate
    } = req.body;
    
    // Validate required fields
    if (!coverageLevel || !effectiveDate) {
      return res.status(400).json({
        error: 'Missing required fields',
        requiredFields: ['coverageLevel', 'effectiveDate']
      });
    }
    
    // Check if the benefit exists
    const benefit = await benefitsService.getBenefitById(benefitId);
    
    if (!benefit) {
      return res.status(404).json({ error: 'Benefit not found' });
    }
    
    const enrollment = await benefitsService.enrollBenefit(userId, {
      benefitId,
      coverageLevel,
      dependentsCovered: dependentsCovered || [],
      effectiveDate
    });
    
    res.status(200).json({
      enrollment,
      message: 'Successfully enrolled in benefit'
    });
  } catch (error) {
    console.error('Enroll benefit error:', error);
    res.status(500).json({ error: 'Failed to enroll in benefit' });
  }
};

/**
 * Cancel a benefit enrollment
 */
exports.cancelEnrollment = async (req, res) => {
  try {
    const userId = req.user.id;
    const benefitId = req.params.id;
    
    // Check if the benefit exists
    const benefit = await benefitsService.getBenefitById(benefitId);
    
    if (!benefit) {
      return res.status(404).json({ error: 'Benefit not found' });
    }
    
    const enrollment = await benefitsService.cancelEnrollment(userId, benefitId);
    
    res.status(200).json({
      enrollment,
      message: 'Benefit enrollment cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel enrollment error:', error);
    
    if (error.message.includes('not enrolled')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to cancel benefit enrollment' });
  }
}; 