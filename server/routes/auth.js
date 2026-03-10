const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// @route   POST /api/auth/login
// @desc    Login user with role selection
router.post('/login', async (req, res) => {
    try {
        const { username, password, selectedRole } = req.body;

        // Role is required
        if (!selectedRole) {
            return res.status(400).json({ message: 'Please select a role' });
        }

        // Find user
        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if active
        if (!user.isActive) {
            return res.status(400).json({ message: 'Account is deactivated' });
        }

        // Get user's roles (use roles array or fallback to single role)
        const userRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];

        // Validate that user has the selected role
        if (!userRoles.includes(selectedRole)) {
            return res.status(400).json({
                message: `You do not have the "${selectedRole}" role. Please select the correct role.`
            });
        }

        // Update user's activeRole
        user.activeRole = selectedRole;
        await user.save();

        // Generate token with activeRole
        const token = jwt.sign(
            { userId: user._id, activeRole: selectedRole },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                role: selectedRole,
                roles: userRoles,
                activeRole: selectedRole,
                mustChangePassword: user.mustChangePassword
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/auth/select-role
// @desc    Select role for multi-role users (after initial login)
router.post('/select-role', async (req, res) => {
    try {
        const { userId, selectedRole } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];

        if (!userRoles.includes(selectedRole)) {
            return res.status(400).json({ message: 'Invalid role selection' });
        }

        user.activeRole = selectedRole;
        await user.save();

        const token = jwt.sign(
            { userId: user._id, activeRole: selectedRole },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                role: selectedRole,
                roles: userRoles,
                activeRole: selectedRole,
                mustChangePassword: user.mustChangePassword
            }
        });
    } catch (error) {
        console.error('Role selection error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/auth/change-password
// @desc    Change password (for first login)
router.post('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user._id);

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Update password
        user.password = newPassword;
        user.mustChangePassword = false;
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('departmentId')
            .populate('classId');

        // Include roles info
        const userRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];

        res.json({
            ...user.toObject(),
            roles: userRoles,
            activeRole: user.activeRole || user.role
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Initialize admin user
const initAdmin = async () => {
    try {
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            const admin = new User({
                firstName: 'System',
                lastName: 'Administrator',
                fullName: 'System Administrator',
                username: 'admin',
                password: 'admin',
                roles: ['admin'],
                role: 'admin',
                activeRole: 'admin',
                mustChangePassword: false
            });
            await admin.save();
            console.log('Admin user created: admin/admin');
        }
    } catch (error) {
        console.error('Error creating admin:', error);
    }
};

initAdmin();

module.exports = router;
