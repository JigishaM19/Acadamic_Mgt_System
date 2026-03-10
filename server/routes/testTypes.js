const express = require('express');
const router = express.Router();
const TestType = require('../models/TestType');
const { auth, adminOnly } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// @route   GET /api/test-types
// @desc    Get all test types
// @access  Admin, HOD, Teacher
router.get('/', async (req, res) => {
    try {
        const testTypes = await TestType.find()
            .sort({ category: 1, name: 1 });
        res.json(testTypes);
    } catch (error) {
        console.error('Error fetching test types:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/test-types/:id
// @desc    Get single test type
// @access  Admin
router.get('/:id', adminOnly, async (req, res) => {
    try {
        const testType = await TestType.findById(req.params.id);
        if (!testType) {
            return res.status(404).json({ message: 'Test type not found' });
        }
        res.json(testType);
    } catch (error) {
        console.error('Error fetching test type:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/test-types
// @desc    Create new test type
// @access  Admin
router.post('/', adminOnly, async (req, res) => {
    try {
        const { name, description, maxScore, category } = req.body;

        // Check if test type already exists
        const existing = await TestType.findOne({ name: name.trim() });
        if (existing) {
            return res.status(400).json({ message: 'Test type with this name already exists' });
        }

        const testType = new TestType({
            name: name.trim(),
            description: description?.trim() || '',
            maxScore: maxScore || 20,
            category: category || 'ut'
        });

        await testType.save();
        res.status(201).json(testType);
    } catch (error) {
        console.error('Error creating test type:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/test-types/:id
// @desc    Update test type
// @access  Admin
router.put('/:id', adminOnly, async (req, res) => {
    try {
        const { name, description, maxScore, category } = req.body;

        // Check for duplicate name (exclude current)
        const existing = await TestType.findOne({
            name: name.trim(),
            _id: { $ne: req.params.id }
        });
        if (existing) {
            return res.status(400).json({ message: 'Test type with this name already exists' });
        }

        const updateData = {
            name: name.trim(),
            description: description?.trim() || '',
            maxScore: maxScore || 20
        };
        if (category) updateData.category = category;

        const testType = await TestType.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!testType) {
            return res.status(404).json({ message: 'Test type not found' });
        }

        res.json(testType);
    } catch (error) {
        console.error('Error updating test type:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/test-types/:id
// @desc    Delete test type
// @access  Admin
router.delete('/:id', adminOnly, async (req, res) => {
    try {
        const testType = await TestType.findByIdAndDelete(req.params.id);
        if (!testType) {
            return res.status(404).json({ message: 'Test type not found' });
        }
        res.json({ message: 'Test type deleted successfully' });
    } catch (error) {
        console.error('Error deleting test type:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/test-types/seed
// @desc    Seed default test types
// @access  Admin
router.post('/seed', adminOnly, async (req, res) => {
    try {
        const defaultTypes = [
            { name: 'UT 1', description: 'Unit Test 1', maxScore: 20, category: 'ut' },
            { name: 'UT 2', description: 'Unit Test 2', maxScore: 20, category: 'ut' },
            { name: 'Assignment', description: 'Assignment Submission', maxScore: 10, category: 'assignment' },
            { name: 'Practical', description: 'Practical Examination', maxScore: 50, category: 'practical' },
            { name: 'ESE', description: 'End Semester Examination', maxScore: 80, category: 'ese' },
        ];

        let created = 0;
        for (const type of defaultTypes) {
            const existing = await TestType.findOne({ name: type.name });
            if (!existing) {
                await TestType.create(type);
                created++;
            }
        }

        res.json({
            message: `Created ${created} test types. ${defaultTypes.length - created} already existed.`,
            created
        });
    } catch (error) {
        console.error('Error seeding test types:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
