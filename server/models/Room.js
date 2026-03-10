const mongoose = require('mongoose');
const roomSchema = new mongoose.Schema({
    roomNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    roomType: {
        type: String,
        enum: ['classroom', 'lab'],
        required: true
    },
    capacity: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
module.exports = mongoose.model('Room', roomSchema);