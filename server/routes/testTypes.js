const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const { FIXED_TEST_TYPES } = require('../utils/markCalculationService');

// @route   GET /api/test-types
// @desc    Get all fixed test types (read-only, hardcoded)
router.get('/', async (req, res) => {
    try {
        res.json(FIXED_TEST_TYPES);
    } catch (error) {
        console.error('Get test types error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/test-types/:key
// @desc    Get a single test type by key
router.get('/:key', async (req, res) => {
    try {
        const testType = FIXED_TEST_TYPES.find(t => t.key === req.params.key);
        if (!testType) {
            return res.status(404).json({ message: 'Test type not found' });
        }
        res.json(testType);
    } catch (error) {
        console.error('Get test type error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
