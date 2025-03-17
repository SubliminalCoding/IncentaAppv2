const db = require('../config/database');

/**
 * Get benefits for a user
 */
exports.getUserBenefits = async (userId) => {
  // Get user's employer ID first
  const userResult = await db.query(
    `SELECT employer_id FROM users WHERE user_id = $1`,
    [userId]
  );
  
  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }
  
  const employerId = userResult.rows[0].employer_id;
  
  // Get employer benefits
  const benefitsResult = await db.query(
    `SELECT * FROM benefits
     WHERE employer_id = $1`,
    [employerId]
  );
  
  // Get user enrollment details
  const enrollmentResult = await db.query(
    `SELECT * FROM benefit_enrollments
     WHERE user_id = $1`,
    [userId]
  );
  
  // Map enrollment data to benefits
  const benefits = benefitsResult.rows;
  const enrollments = enrollmentResult.rows;
  
  // Create a map of benefit_id to enrollment
  const enrollmentMap = {};
  enrollments.forEach(enrollment => {
    enrollmentMap[enrollment.benefit_id] = enrollment;
  });
  
  // Add enrollment data to each benefit
  const userBenefits = benefits.map(benefit => {
    const enrollment = enrollmentMap[benefit.benefit_id] || null;
    return {
      ...benefit,
      enrolled: !!enrollment,
      enrollment_date: enrollment ? enrollment.enrollment_date : null,
      coverage_level: enrollment ? enrollment.coverage_level : null,
      dependents_covered: enrollment ? enrollment.dependents_covered : null
    };
  });
  
  return userBenefits;
};

/**
 * Get benefit by ID
 */
exports.getBenefitById = async (benefitId) => {
  const result = await db.query(
    `SELECT * FROM benefits WHERE benefit_id = $1`,
    [benefitId]
  );
  
  return result.rows[0] || null;
};

/**
 * Get benefit details including coverage options and costs
 */
exports.getBenefitDetails = async (benefitId, userId) => {
  // Get the benefit
  const benefit = await exports.getBenefitById(benefitId);
  
  if (!benefit) {
    return null;
  }
  
  // Get coverage options
  const coverageResult = await db.query(
    `SELECT * FROM benefit_coverage_options
     WHERE benefit_id = $1
     ORDER BY cost ASC`,
    [benefitId]
  );
  
  // Get user's enrollment if any
  const enrollmentResult = await db.query(
    `SELECT * FROM benefit_enrollments
     WHERE benefit_id = $1 AND user_id = $2`,
    [benefitId, userId]
  );
  
  const enrollment = enrollmentResult.rows[0] || null;
  
  // Combine all data
  return {
    ...benefit,
    coverage_options: coverageResult.rows,
    enrolled: !!enrollment,
    enrollment_details: enrollment
  };
};

/**
 * Get dependent information for a user
 */
exports.getUserDependents = async (userId) => {
  const result = await db.query(
    `SELECT * FROM dependents
     WHERE user_id = $1
     ORDER BY first_name ASC`,
    [userId]
  );
  
  return result.rows;
};

/**
 * Add a dependent for a user
 */
exports.addDependent = async (userId, dependentData) => {
  const { firstName, lastName, dateOfBirth, relationship } = dependentData;
  
  const result = await db.query(
    `INSERT INTO dependents (
      user_id, first_name, last_name, date_of_birth, relationship, created_at
    ) VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING *`,
    [userId, firstName, lastName, dateOfBirth, relationship]
  );
  
  return result.rows[0];
};

/**
 * Remove a dependent
 */
exports.removeDependent = async (dependentId, userId) => {
  // First check if the dependent belongs to the user
  const checkResult = await db.query(
    `SELECT * FROM dependents
     WHERE dependent_id = $1 AND user_id = $2`,
    [dependentId, userId]
  );
  
  if (checkResult.rows.length === 0) {
    throw new Error('Dependent not found or does not belong to the user');
  }
  
  // Remove dependent
  await db.query(
    `DELETE FROM dependents
     WHERE dependent_id = $1`,
    [dependentId]
  );
  
  return true;
};

/**
 * Enroll a user in a benefit
 */
exports.enrollBenefit = async (userId, enrollmentData) => {
  const {
    benefitId,
    coverageLevel,
    dependentsCovered,
    effectiveDate
  } = enrollmentData;
  
  // Check if already enrolled
  const checkResult = await db.query(
    `SELECT * FROM benefit_enrollments
     WHERE user_id = $1 AND benefit_id = $2`,
    [userId, benefitId]
  );
  
  if (checkResult.rows.length > 0) {
    // Update existing enrollment
    const result = await db.query(
      `UPDATE benefit_enrollments
       SET coverage_level = $1,
           dependents_covered = $2,
           effective_date = $3,
           last_updated = NOW()
       WHERE user_id = $4 AND benefit_id = $5
       RETURNING *`,
      [coverageLevel, dependentsCovered, effectiveDate, userId, benefitId]
    );
    
    return result.rows[0];
  } else {
    // Create new enrollment
    const result = await db.query(
      `INSERT INTO benefit_enrollments (
        user_id, benefit_id, enrollment_date, coverage_level,
        dependents_covered, effective_date, status
      ) VALUES ($1, $2, NOW(), $3, $4, $5, 'active')
      RETURNING *`,
      [userId, benefitId, coverageLevel, dependentsCovered, effectiveDate]
    );
    
    return result.rows[0];
  }
};

/**
 * Cancel a benefit enrollment
 */
exports.cancelEnrollment = async (userId, benefitId) => {
  // Check if enrolled
  const checkResult = await db.query(
    `SELECT * FROM benefit_enrollments
     WHERE user_id = $1 AND benefit_id = $2`,
    [userId, benefitId]
  );
  
  if (checkResult.rows.length === 0) {
    throw new Error('User is not enrolled in this benefit');
  }
  
  // Update status to cancelled
  const result = await db.query(
    `UPDATE benefit_enrollments
     SET status = 'cancelled',
         cancellation_date = NOW(),
         last_updated = NOW()
     WHERE user_id = $1 AND benefit_id = $2
     RETURNING *`,
    [userId, benefitId]
  );
  
  return result.rows[0];
}; 