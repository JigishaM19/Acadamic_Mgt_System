const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

router.use(auth);

// @route   GET /api/notifications
// @desc    Get notifications for the current user
router.get('/', async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await Notification.countDocuments({
            userId: req.user._id,
            read: false
        });

        res.json({ notifications, unreadCount });
    } catch (error) {
        console.error('Notification fetch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
router.put('/read-all', async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user._id, read: false },
            { $set: { read: true } }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Notification read-all error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a single notification as read
router.put('/:id/read', async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { $set: { read: true } },
            { new: true }
        );
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json(notification);
    } catch (error) {
        console.error('Notification read error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
router.delete('/:id', async (req, res) => {
    try {
        await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        res.json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Notification delete error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
