const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema({
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    type: {
        type: String,
        enum: ['lecture', 'practical'],
        required: true
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to prevent duplicate lecture assignments
lectureSchema.index({ subjectId: 1, teacherId: 1, classId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Lecture', lectureSchema);
