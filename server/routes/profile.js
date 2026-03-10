const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');

// Get current user's profile (view-only data from User + editable data from UserProfile)
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('departmentId', 'name')
            .populate('classId', 'name year');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fetch editable profile data from UserProfile collection
        let userProfile = await UserProfile.findOne({ userId: req.user._id });

        // Return combined data
        const profileData = {
            // View-only data from User collection
            _id: user._id,
            firstName: user.firstName,
            fatherName: user.fatherName,
            lastName: user.lastName,
            motherName: user.motherName,
            fullName: user.fullName,
            username: user.username,
            role: user.role,
            roles: user.roles,
            activeRole: user.activeRole,
            dob: user.dob,
            email: user.email,
            phone: user.phone,
            gender: user.gender,
            year: user.year,
            departmentId: user.departmentId,
            classId: user.classId,
            rollNo: user.rollNo,
            parentPhone: user.parentPhone,
            parentEmail: user.parentEmail,
            isActive: user.isActive,
            createdAt: user.createdAt,
            // Editable data from UserProfile collection
            about: userProfile?.about || '',
            address: userProfile?.address || { street: '', city: '', state: '', pincode: '' },
            emergencyContact: userProfile?.emergencyContact || { name: '', phone: '', relation: '' }
        };

        res.json(profileData);
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update current user's editable profile data (stored in UserProfile collection)
router.put('/', auth, async (req, res) => {
    try {
        const { about, address, emergencyContact } = req.body;

        const updateData = {};

        if (about !== undefined) updateData.about = about;
        if (address !== undefined) updateData.address = address;
        if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;

        // Upsert - create if doesn't exist, update if it does
        const userProfile = await UserProfile.findOneAndUpdate(
            { userId: req.user._id },
            { $set: { ...updateData, userId: req.user._id } },
            { new: true, upsert: true }
        );

        if (!userProfile) {
            return res.status(404).json({ message: 'Failed to update profile' });
        }

        // Return combined data
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('departmentId', 'name')
            .populate('classId', 'name year');

        const profileData = {
            _id: user._id,
            firstName: user.firstName,
            fatherName: user.fatherName,
            lastName: user.lastName,
            motherName: user.motherName,
            fullName: user.fullName,
            username: user.username,
            role: user.role,
            roles: user.roles,
            activeRole: user.activeRole,
            dob: user.dob,
            email: user.email,
            phone: user.phone,
            gender: user.gender,
            year: user.year,
            departmentId: user.departmentId,
            classId: user.classId,
            rollNo: user.rollNo,
            parentPhone: user.parentPhone,
            parentEmail: user.parentEmail,
            isActive: user.isActive,
            createdAt: user.createdAt,
            about: userProfile.about || '',
            address: userProfile.address || { street: '', city: '', state: '', pincode: '' },
            emergencyContact: userProfile.emergencyContact || { name: '', phone: '', relation: '' }
        };

        res.json(profileData);
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        // Get user with password
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Update password - let the pre-save hook handle hashing
        user.password = newPassword;
        user.mustChangePassword = false;
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
