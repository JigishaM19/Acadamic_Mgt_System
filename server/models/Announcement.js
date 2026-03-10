const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Role of the creator at the time of creation
    createdByRole: {
        type: String,
        enum: ['hod', 'classcoordinator', 'teacher'],
        required: true
    },
    // 'all' = all students in dept, 'year' = specific year, 'class' = specific class
    targetType: {
        type: String,
        enum: ['all', 'year', 'class'],
        required: true
    },
    // Only used when targetType is 'year'
    targetYear: {
        type: Number,
        min: 1,
        max: 4
    },
    // Only used when targetType is 'class'
    targetClassId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
    },
    // Department scope for announcements
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    },
    // Duration in hours for dashboard display
    // null means permanent on dashboard
    displayDuration: {
        type: Number,
        enum: [8, 24, 72, 120, 168], // 8hr, 24hr, 3 days, 5 days, 1 week
        default: 24
    },
    // When the announcement expires from dashboard display
    expiresAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-compute expiresAt before saving
announcementSchema.pre('save', function (next) {
    if (this.isNew && this.displayDuration) {
        this.expiresAt = new Date(this.createdAt.getTime() + this.displayDuration * 60 * 60 * 1000);
    }
    next();
});

module.exports = mongoose.model('Announcement', announcementSchema);
