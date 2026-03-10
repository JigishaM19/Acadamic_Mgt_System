const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        default: 'Batch 1'
    },
    studentIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { _id: true });

const classSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    year: {
        type: Number,
        required: true,
        min: 1,
        max: 4
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    coordinatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Maximum student capacity for this class
    maxCapacity: {
        type: Number,
        default: 75,  // Default allows up to 3 batches of 25 students
        min: 15,
        max: 75
    },
    // Batches for the class (max 3 batches, each with 15-25 students)
    batches: [batchSchema],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Class', classSchema);