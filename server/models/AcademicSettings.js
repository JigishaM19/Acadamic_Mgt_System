const mongoose = require('mongoose');

const attendanceSlabSchema = new mongoose.Schema({
    min: {
        type: Number,
        required: true
    },
    multiplier: {
        type: Number,
        required: true,
        min: 0,
        max: 1
    }
}, { _id: false });

const academicSettingsSchema = new mongoose.Schema({
    iaTotal: {
        type: Number,
        default: 20
    },
    eseTotal: {
        type: Number,
        default: 80
    },
    utWeight: {
        type: Number,
        default: 10
    },
    assignmentWeight: {
        type: Number,
        default: 5
    },
    attendanceWeight: {
        type: Number,
        default: 5
    },
    practicalWeight: {
        type: Number,
        default: 5
    },
    minAttendancePercent: {
        type: Number,
        default: 75
    },
    minEsePercent: {
        type: Number,
        default: 40
    },
    attendanceSlabs: {
        type: [attendanceSlabSchema],
        default: [
            { min: 90, multiplier: 0.8 },
            { min: 80, multiplier: 0.6 },
            { min: 75, multiplier: 0.4 },
            { min: 65, multiplier: 0.2 },
            { min: 0, multiplier: 0 }
        ]
    },
    currentSemesterType: {
        type: String,
        enum: ['odd', 'even'],
        default: 'odd'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure only one settings document exists
academicSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

module.exports = mongoose.model('AcademicSettings', academicSettingsSchema);
