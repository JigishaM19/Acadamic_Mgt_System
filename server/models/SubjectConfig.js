const mongoose = require('mongoose');

const subjectConfigSchema = new mongoose.Schema({
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
    totalAssignments: {
        type: Number,
        default: 0,
        min: 0
    },
    totalExperiments: {
        type: Number,
        default: 0,
        min: 0
    },
    assignmentMaxScore: {
        type: Number,
        default: 10,
        min: 1
    },
    experimentMaxScore: {
        type: Number,
        default: 10,
        min: 1
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

subjectConfigSchema.index({ classId: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('SubjectConfig', subjectConfigSchema);
