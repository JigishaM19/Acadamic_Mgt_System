const mongoose = require('mongoose');

const testTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    category: {
        type: String,
        enum: ['ut', 'assignment', 'practical', 'ese'],
        default: 'ut'
    },
    maxScore: {
        type: Number,
        default: 20,
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

module.exports = mongoose.model('TestType', testTypeSchema);
