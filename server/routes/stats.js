const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Department = require('../models/Department');
const Class = require('../models/Class');
const { auth } = require('../middleware/auth');

// @route   GET /api/stats
// @desc    Get dashboard statistics
router.get('/', auth, async (req, res) => {
    try {
        const [students, teachers, departments, classes] = await Promise.all([
            User.countDocuments({ role: 'student' }),
            User.countDocuments({ role: 'teacher' }),
            Department.countDocuments(),
            Class.countDocuments()
        ]);

        res.json({
            students,
            teachers,
            departments,
            classes
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
