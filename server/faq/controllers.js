const faqService = require('./services');

/**
 * Get all FAQs
 */
exports.getAllFaqs = async (req, res) => {
  try {
    const userId = req.user.id;
    let employerId = null;
    
    // Get user's employer ID if available
    if (req.user.employerId) {
      employerId = req.user.employerId;
    }
    
    const faqs = await faqService.getAllFaqs(employerId);
    
    res.status(200).json({ faqs });
  } catch (error) {
    console.error('Get FAQs error:', error);
    res.status(500).json({ error: 'Failed to retrieve FAQs' });
  }
};

/**
 * Get FAQs by category
 */
exports.getFaqsByCategory = async (req, res) => {
  try {
    const category = req.params.category;
    let employerId = null;
    
    // Get user's employer ID if available
    if (req.user.employerId) {
      employerId = req.user.employerId;
    }
    
    const faqs = await faqService.getFaqsByCategory(category, employerId);
    
    res.status(200).json({ faqs });
  } catch (error) {
    console.error('Get FAQs by category error:', error);
    res.status(500).json({ error: 'Failed to retrieve FAQs' });
  }
};

/**
 * Get FAQ by ID
 */
exports.getFaqById = async (req, res) => {
  try {
    const faqId = req.params.id;
    
    const faq = await faqService.getFaqById(faqId);
    
    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }
    
    res.status(200).json({ faq });
  } catch (error) {
    console.error('Get FAQ by ID error:', error);
    res.status(500).json({ error: 'Failed to retrieve FAQ' });
  }
};

/**
 * Search FAQs
 */
exports.searchFaqs = async (req, res) => {
  try {
    const searchTerm = req.query.q;
    
    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term is required' });
    }
    
    let employerId = null;
    
    // Get user's employer ID if available
    if (req.user.employerId) {
      employerId = req.user.employerId;
    }
    
    const faqs = await faqService.searchFaqs(searchTerm, employerId);
    
    res.status(200).json({ faqs });
  } catch (error) {
    console.error('Search FAQs error:', error);
    res.status(500).json({ error: 'Failed to search FAQs' });
  }
};

/**
 * Get FAQ categories
 */
exports.getFaqCategories = async (req, res) => {
  try {
    let employerId = null;
    
    // Get user's employer ID if available
    if (req.user.employerId) {
      employerId = req.user.employerId;
    }
    
    const categories = await faqService.getFaqCategories(employerId);
    
    res.status(200).json({ categories });
  } catch (error) {
    console.error('Get FAQ categories error:', error);
    res.status(500).json({ error: 'Failed to retrieve FAQ categories' });
  }
}; 