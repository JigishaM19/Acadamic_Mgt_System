const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
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
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    testType: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        required: true
    },
    maxScore: {
        type: Number,
        required: true,
        min: 1
    },
    marks: [{
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        score: {
            type: Number,
            min: 0
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to prevent duplicate tests for same class, subject, testType, and date
testSchema.index({ classId: 1, subject: 1, testType: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Test', testSchema);
