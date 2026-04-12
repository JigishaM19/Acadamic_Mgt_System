const mongoose = require('mongoose');

const assignmentMarkSchema = new mongoose.Schema({
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['assignment', 'experiment', 'lab_attendance', 'internal_viva'],
        required: true
    },
    number: {
        type: Number,
        required: true,
        min: 1
    },
    maxScore: {
        type: Number,
        required: true,
        min: 1,
        default: 10
    },
    marks: [{
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        score: {
            type: Number,
            min: 0,
            default: 0
        }
    }],
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Prevent duplicate entries for same class-subject-type-number
assignmentMarkSchema.index({ classId: 1, subject: 1, type: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('AssignmentMark', assignmentMarkSchema);
