const mongoose = require('mongoose');

const collegeDetailSchema = new mongoose.Schema({
    collegeName: {
        type: String,
        trim: true,
        default: ''
    },
    collegeLogo: {
        type: String,
        default: ''
    },
    address: {
        type: String,
        trim: true,
        default: ''
    },
    aboutCollege: {
        type: String,
        trim: true,
        default: ''
    },
    feesStructure: {
        type: String,
        trim: true,
        default: ''
    },
    hostelAvailable: {
        type: Boolean,
        default: false
    },
    hostelDetails: {
        type: String,
        trim: true,
        default: ''
    },
    contactNumbers: [{
        label: { type: String, trim: true },
        number: { type: String, trim: true }
    }],
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure only one college detail document exists
collegeDetailSchema.statics.getDetails = async function () {
    let details = await this.findOne();
    if (!details) {
        details = await this.create({});
    }
    return details;
};

module.exports = mongoose.model('CollegeDetail', collegeDetailSchema);
