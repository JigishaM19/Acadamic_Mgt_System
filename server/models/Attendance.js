const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    subject: {
        type: String,
        trim: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class.batches',
        default: null
    },
    timeSlotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TimeSlot'
    },
    date: {
        type: Date,
        required: true
    },
    records: [{
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        status: {
            type: String,
            enum: ['present', 'absent', 'late'],
            default: 'present'
        }
    }],
    presentCount: {
        type: Number,
        default: 0
    },
    absentCount: {
        type: Number,
        default: 0
    },
    totalCount: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to prevent duplicate entries for same class, subject, date, timeSlot, and batch
attendanceSchema.index({ classId: 1, subject: 1, date: 1, timeSlotId: 1, batchId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);

