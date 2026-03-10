const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    type: {
        type: String,
        enum: ['theory', 'practical', 'both'],
        default: 'both'
    },
    practicalName: {
        type: String,
        trim: true
    },
    practicalCode: {
        type: String,
        trim: true,
        uppercase: true
    },
    year: {
        type: Number,
        min: 1,
        max: 4,
        required: true
    },
    semester: {
        type: Number,
        min: 1,
        max: 8,
        default: 1
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    },
    maxMarks: {
        type: Number,
        default: 100,
        min: 1
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

// Compound index for unique code per department
subjectSchema.index({ code: 1, departmentId: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
