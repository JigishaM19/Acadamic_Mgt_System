const mongoose = require('mongoose');
const timeSlotSchema = new mongoose.Schema({
    label: {
        type: String,
        required: true,
        trim: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['lecture', 'break', 'practical'],
        required: true
    },
    order: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
module.exports = mongoose.model('TimeSlot', timeSlotSchema);
