const express = require('express');
const router = express.Router();
const CollegeDetail = require('../models/CollegeDetail');
const { auth } = require('../middleware/auth');

const MAX_LOGO_SIZE = 100 * 1024 * 1024; // 100MB

// @route   GET /api/college-detail/public
// @desc    Get college name and logo (public - for login page)
// @access  Public
router.get('/public', async (req, res) => {
    try {
        const details = await CollegeDetail.findOne().select('collegeName collegeLogo');
        res.json(details || { collegeName: '', collegeLogo: '' });
    } catch (error) {
        console.error('Get public college detail error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/college-detail
// @desc    Get college details (any authenticated user)
// @access  Authenticated
router.get('/', auth, async (req, res) => {
    try {
        const details = await CollegeDetail.getDetails();
        res.json(details);
    } catch (error) {
        console.error('Get college detail error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/college-detail
// @desc    Update college details (Admin only)
// @access  Admin
router.put('/', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const {
            collegeName,
            collegeLogo,
            address,
            aboutCollege,
            feesStructure,
            hostelAvailable,
            hostelDetails,
            contactNumbers
        } = req.body;

        // Validate logo size if provided
        if (collegeLogo && collegeLogo.length > 0) {
            // base64 string size approximation
            const sizeInBytes = Buffer.byteLength(collegeLogo, 'utf8');
            if (sizeInBytes > MAX_LOGO_SIZE) {
                return res.status(400).json({ message: 'Logo image exceeds 100MB limit' });
            }
        }

        let details = await CollegeDetail.findOne();
        if (!details) {
            details = new CollegeDetail();
        }

        if (collegeName !== undefined) details.collegeName = collegeName;
        if (collegeLogo !== undefined) details.collegeLogo = collegeLogo;
        if (address !== undefined) details.address = address;
        if (aboutCollege !== undefined) details.aboutCollege = aboutCollege;
        if (feesStructure !== undefined) details.feesStructure = feesStructure;
        if (hostelAvailable !== undefined) details.hostelAvailable = hostelAvailable;
        if (hostelDetails !== undefined) details.hostelDetails = hostelDetails;
        if (contactNumbers !== undefined) details.contactNumbers = contactNumbers;

        details.updatedAt = new Date();
        await details.save();

        res.json(details);
    } catch (error) {
        console.error('Update college detail error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
