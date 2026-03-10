const express = require('express');
const router = express.Router();
const AcademicSettings = require('../models/AcademicSettings');
const { auth } = require('../middleware/auth');

// @route   GET /api/academic-settings
// @desc    Get academic settings (creates defaults if none exist)
// @access  Authenticated users
router.get('/', auth, async (req, res) => {
    try {
        const settings = await AcademicSettings.getSettings();
        res.json(settings);
    } catch (error) {
        console.error('Get academic settings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/academic-settings
// @desc    Update academic settings (Admin only)
// @access  Admin
router.put('/', auth, async (req, res) => {
    try {
        // Admin-only check
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const {
            iaTotal,
            eseTotal,
            utWeight,
            assignmentWeight,
            attendanceWeight,
            practicalWeight,
            minAttendancePercent,
            minEsePercent,
            attendanceSlabs,
            currentSemesterType
        } = req.body;

        let settings = await AcademicSettings.findOne();
        if (!settings) {
            settings = new AcademicSettings();
        }

        // Update fields if provided
        if (iaTotal !== undefined) settings.iaTotal = iaTotal;
        if (eseTotal !== undefined) settings.eseTotal = eseTotal;
        if (utWeight !== undefined) settings.utWeight = utWeight;
        if (assignmentWeight !== undefined) settings.assignmentWeight = assignmentWeight;
        if (attendanceWeight !== undefined) settings.attendanceWeight = attendanceWeight;
        if (practicalWeight !== undefined) settings.practicalWeight = practicalWeight;
        if (minAttendancePercent !== undefined) settings.minAttendancePercent = minAttendancePercent;
        if (minEsePercent !== undefined) settings.minEsePercent = minEsePercent;
        if (currentSemesterType !== undefined) settings.currentSemesterType = currentSemesterType;
        if (attendanceSlabs !== undefined) {
            // Validate slabs
            if (!Array.isArray(attendanceSlabs)) {
                return res.status(400).json({ message: 'attendanceSlabs must be an array' });
            }
            for (const slab of attendanceSlabs) {
                if (slab.min === undefined || slab.multiplier === undefined) {
                    return res.status(400).json({ message: 'Each slab must have min and multiplier' });
                }
            }
            settings.attendanceSlabs = attendanceSlabs;
        }

        settings.updatedAt = new Date();
        await settings.save();

        res.json(settings);
    } catch (error) {
        console.error('Update academic settings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/academic-settings/reset
// @desc    Reset academic settings to defaults (Admin only)
// @access  Admin
router.post('/reset', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        await AcademicSettings.deleteMany({});
        const settings = await AcademicSettings.getSettings();
        res.json({ message: 'Settings reset to defaults', settings });
    } catch (error) {
        console.error('Reset academic settings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
