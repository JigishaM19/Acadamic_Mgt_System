const express = require('express');
const router = express.Router();
const Lecture = require('../models/Lecture');
const Subject = require('../models/Subject');
const User = require('../models/User');
const Class = require('../models/Class');
const Department = require('../models/Department');
const { auth, adminOnly } = require('../middleware/auth');

// @route   GET /api/lectures
// @desc    Get all lectures (admin - all departments)
router.get('/', auth, adminOnly, async (req, res) => {
    try {
        const { departmentId, classId } = req.query;

        const filter = { isActive: true };
        if (departmentId) filter.departmentId = departmentId;
        if (classId) filter.classId = classId;

        const lectures = await Lecture.find(filter)
            .populate('subjectId', 'name code semester')
            .populate('teacherId', 'fullName username')
            .populate('classId', 'name year')
            .populate('departmentId', 'name code')
            .sort({ createdAt: -1 });

        res.json(lectures);
    } catch (error) {
        console.error('Lectures fetch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/lectures
// @desc    Create lecture (admin)
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const { subjectId, teacherId, classId, type, departmentId } = req.body;

        if (!subjectId || !teacherId || !classId || !departmentId) {
            return res.status(400).json({ message: 'subjectId, teacherId, classId, and departmentId are required' });
        }

        // Check for duplicate lecture
        const existing = await Lecture.findOne({
            subjectId, teacherId, classId, type, isActive: true
        });
        if (existing) {
            return res.status(400).json({ message: 'This lecture assignment already exists' });
        }

        const lecture = new Lecture({
            subjectId,
            teacherId,
            classId,
            type: type || 'lecture',
            departmentId,
            isActive: true
        });

        await lecture.save();

        const populated = await Lecture.findById(lecture._id)
            .populate('subjectId', 'name code semester')
            .populate('teacherId', 'fullName username')
            .populate('classId', 'name year')
            .populate('departmentId', 'name code');

        res.status(201).json(populated);
    } catch (error) {
        console.error('Lecture create error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/lectures/:id
// @desc    Update lecture
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const { subjectId, teacherId, classId, type, departmentId } = req.body;

        const lecture = await Lecture.findByIdAndUpdate(
            req.params.id,
            { subjectId, teacherId, classId, type, departmentId },
            { new: true }
        )
            .populate('subjectId', 'name code semester')
            .populate('teacherId', 'fullName username')
            .populate('classId', 'name year')
            .populate('departmentId', 'name code');

        if (!lecture) {
            return res.status(404).json({ message: 'Lecture not found' });
        }

        res.json(lecture);
    } catch (error) {
        console.error('Lecture update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/lectures/:id
// @desc    Delete lecture (soft delete)
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const lecture = await Lecture.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!lecture) {
            return res.status(404).json({ message: 'Lecture not found' });
        }

        res.json({ message: 'Lecture deleted successfully' });
    } catch (error) {
        console.error('Lecture delete error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
