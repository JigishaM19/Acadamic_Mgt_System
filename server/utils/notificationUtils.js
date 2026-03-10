const Notification = require('../models/Notification');

/**
 * Create a notification for a specific user
 */
const createNotification = async (userId, type, title, message, relatedId = null) => {
    try {
        const notification = new Notification({
            userId,
            type,
            title,
            message,
            relatedId
        });
        await notification.save();
        return notification;
    } catch (error) {
        console.error('Failed to create notification:', error);
    }
};

/**
 * Create notifications for multiple users
 */
const createBulkNotifications = async (userIds, type, title, message, relatedId = null) => {
    try {
        const notifications = userIds.map(userId => ({
            userId,
            type,
            title,
            message,
            relatedId
        }));
        await Notification.insertMany(notifications);
    } catch (error) {
        console.error('Failed to create bulk notifications:', error);
    }
};

module.exports = { createNotification, createBulkNotifications };
