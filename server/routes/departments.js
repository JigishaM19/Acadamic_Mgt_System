const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const User = require('../models/User');
const { auth, adminOnly } = require('../middleware/auth');

// @route   GET /api/departments
router.get('/', auth, async (req, res) => {
    try {
        const departments = await Department.find().sort({ name: 1 });
        res.json(departments);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/departments/:id
router.get('/:id', auth, async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }
        res.json(department);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/departments
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const { name, code } = req.body;

        const existing = await Department.findOne({ code: code.toUpperCase() });
        if (existing) {
            return res.status(400).json({ message: 'Department code already exists' });
        }

        const department = new Department({ name, code: code.toUpperCase() });
        await department.save();
        res.status(201).json(department);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/departments/:id
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const { name, code } = req.body;

        const department = await Department.findByIdAndUpdate(
            req.params.id,
            { name, code: code.toUpperCase() },
            { new: true }
        );

        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }

        res.json(department);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/departments/:id
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        // Check if users are assigned
        const usersCount = await User.countDocuments({ departmentId: req.params.id });
        if (usersCount > 0) {
            return res.status(400).json({
                message: `Cannot delete. ${usersCount} users are assigned to this department.`
            });
        }

        const department = await Department.findByIdAndDelete(req.params.id);
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }

        res.json({ message: 'Department deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
