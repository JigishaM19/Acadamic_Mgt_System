const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const { auth, adminOnly } = require('../middleware/auth');

// @route   GET /api/rooms
router.get('/', auth, async (req, res) => {
    try {
        const { roomType } = req.query;
        const filter = {};
        if (roomType) filter.roomType = roomType;

        const rooms = await Room.find(filter).sort({ roomNumber: 1 });
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/rooms
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const { roomNumber, roomType, capacity } = req.body;

        const existing = await Room.findOne({ roomNumber });
        if (existing) {
            return res.status(400).json({ message: 'Room number already exists' });
        }

        const room = new Room({ roomNumber, roomType, capacity });
        await room.save();
        res.status(201).json(room);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/rooms/:id
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const { roomNumber, roomType, capacity } = req.body;

        const room = await Room.findByIdAndUpdate(
            req.params.id,
            { roomNumber, roomType, capacity },
            { new: true }
        );

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        res.json(room);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/rooms/:id
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const room = await Room.findByIdAndDelete(req.params.id);
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }
        res.json({ message: 'Room deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
