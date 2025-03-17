const db = require('../config/database');

/**
 * Get all FAQs
 */
exports.getAllFaqs = async (employerId = null) => {
  let query;
  let params = [];
  
  if (employerId) {
    // Get employer-specific FAQs
    query = `
      SELECT * FROM faqs 
      WHERE employer_id IS NULL OR employer_id = $1
      ORDER BY category, priority ASC
    `;
    params = [employerId];
  } else {
    // Get general FAQs
    query = `
      SELECT * FROM faqs 
      WHERE employer_id IS NULL
      ORDER BY category, priority ASC
    `;
  }
  
  const result = await db.query(query, params);
  return result.rows;
};

/**
 * Get FAQs by category
 */
exports.getFaqsByCategory = async (category, employerId = null) => {
  let query;
  let params;
  
  if (employerId) {
    // Get employer-specific FAQs for the category
    query = `
      SELECT * FROM faqs 
      WHERE (employer_id IS NULL OR employer_id = $1)
        AND category = $2
      ORDER BY priority ASC
    `;
    params = [employerId, category];
  } else {
    // Get general FAQs for the category
    query = `
      SELECT * FROM faqs 
      WHERE employer_id IS NULL
        AND category = $1
      ORDER BY priority ASC
    `;
    params = [category];
  }
  
  const result = await db.query(query, params);
  return result.rows;
};

/**
 * Get FAQ by ID
 */
exports.getFaqById = async (faqId) => {
  const result = await db.query(
    `SELECT * FROM faqs WHERE faq_id = $1`,
    [faqId]
  );
  
  return result.rows[0] || null;
};

/**
 * Search FAQs by keyword
 */
exports.searchFaqs = async (searchTerm, employerId = null) => {
  let query;
  let params;
  
  if (employerId) {
    // Search employer-specific and general FAQs
    query = `
      SELECT * FROM faqs 
      WHERE (employer_id IS NULL OR employer_id = $1)
        AND (
          question ILIKE $2 OR
          answer ILIKE $2
        )
      ORDER BY category, priority ASC
    `;
    params = [employerId, `%${searchTerm}%`];
  } else {
    // Search general FAQs only
    query = `
      SELECT * FROM faqs 
      WHERE employer_id IS NULL
        AND (
          question ILIKE $1 OR
          answer ILIKE $1
        )
      ORDER BY category, priority ASC
    `;
    params = [`%${searchTerm}%`];
  }
  
  const result = await db.query(query, params);
  return result.rows;
};

/**
 * Get all FAQ categories
 */
exports.getFaqCategories = async (employerId = null) => {
  let query;
  let params = [];
  
  if (employerId) {
    // Get categories for employer-specific and general FAQs
    query = `
      SELECT DISTINCT category 
      FROM faqs 
      WHERE employer_id IS NULL OR employer_id = $1
      ORDER BY category ASC
    `;
    params = [employerId];
  } else {
    // Get categories for general FAQs only
    query = `
      SELECT DISTINCT category 
      FROM faqs 
      WHERE employer_id IS NULL
      ORDER BY category ASC
    `;
  }
  
  const result = await db.query(query, params);
  return result.rows.map(row => row.category);
}; 