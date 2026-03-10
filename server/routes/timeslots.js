const express = require('express');
const router = express.Router();
const TimeSlot = require('../models/TimeSlot');
const { auth, adminOnly } = require('../middleware/auth');

// @route   GET /api/timeslots
router.get('/', auth, async (req, res) => {
    try {
        const { type } = req.query;
        const filter = {};
        if (type) filter.type = type;

        const timeSlots = await TimeSlot.find(filter).sort({ order: 1 });
        res.json(timeSlots);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/timeslots
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const { label, startTime, endTime, type, order } = req.body;

        const timeSlot = new TimeSlot({ label, startTime, endTime, type, order });
        await timeSlot.save();
        res.status(201).json(timeSlot);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/timeslots/:id
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const { label, startTime, endTime, type, order } = req.body;

        const timeSlot = await TimeSlot.findByIdAndUpdate(
            req.params.id,
            { label, startTime, endTime, type, order },
            { new: true }
        );

        if (!timeSlot) {
            return res.status(404).json({ message: 'Time slot not found' });
        }

        res.json(timeSlot);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/timeslots/:id
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const timeSlot = await TimeSlot.findByIdAndDelete(req.params.id);
        if (!timeSlot) {
            return res.status(404).json({ message: 'Time slot not found' });
        }
        res.json({ message: 'Time slot deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/timeslots/bulk
// @desc    Create default time slots
router.post('/bulk', auth, adminOnly, async (req, res) => {
    try {
        const defaultSlots = [
            { label: 'Lecture 1', startTime: '09:30', endTime: '10:30', type: 'lecture', order: 1 },
            { label: 'Lecture 2', startTime: '10:30', endTime: '11:30', type: 'lecture', order: 2 },
            { label: 'Short Break', startTime: '11:30', endTime: '11:45', type: 'break', order: 3 },
            { label: 'Lecture 3', startTime: '11:45', endTime: '12:45', type: 'lecture', order: 4 },
            { label: 'Lecture 4', startTime: '12:45', endTime: '13:45', type: 'lecture', order: 5 },
            { label: 'Lunch Break', startTime: '13:45', endTime: '14:30', type: 'break', order: 6 },
            { label: 'Lecture 5', startTime: '14:30', endTime: '15:30', type: 'lecture', order: 7 },
            { label: 'Lecture 6', startTime: '15:30', endTime: '16:30', type: 'lecture', order: 8 }
        ];

        await TimeSlot.deleteMany({});
        const slots = await TimeSlot.insertMany(defaultSlots);
        res.json({ message: 'Default time slots created', slots });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
