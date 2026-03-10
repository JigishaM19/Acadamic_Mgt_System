const mongoose = require('mongoose');
const timetableSchema = new mongoose.Schema({
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class.batches',
        // Optional - if not provided, it means the lecture is for the entire class
        default: null
    },
    lectureId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lecture'
    },
    subject: {
        type: String,
        trim: true,
        default: 'No Lecture'
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        required: true
    },
    timeSlotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TimeSlot',
        required: true
    },
    // For practicals spanning multiple slots, this can be an array
    timeSlotIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TimeSlot'
    }],
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room'
    },
    type: {
        type: String,
        enum: ['lecture', 'practical', 'blank'],
        required: true
    },
    semester: {
        type: Number,
        min: 1,
        max: 8
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Modified indices to allow different batches at same time/room
// Room conflict: same room can't be used by different classes/batches at the same time
timetableSchema.index({ day: 1, timeSlotId: 1, roomId: 1, semester: 1 }, { unique: true, sparse: true });

// Teacher conflict: teacher can't teach different classes at the same time
// But removed unique constraint to allow batch-based teaching
timetableSchema.index({ day: 1, timeSlotId: 1, teacherId: 1, semester: 1 });

// Class-batch conflict: same class-batch combination can't have multiple entries for same time slot in the same semester
timetableSchema.index({ day: 1, timeSlotId: 1, classId: 1, batchId: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('Timetable', timetableSchema);