const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = user;
        // Use activeRole from token if available, else user's activeRole or first role
        req.activeRole = decoded.activeRole || user.activeRole || user.role;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

const adminOnly = (req, res, next) => {
    // Check activeRole for admin access
    const activeRole = req.activeRole || req.user.role;
    if (activeRole !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
};

const roles = (...allowedRoles) => {
    return (req, res, next) => {
        // Check if user's active role is in allowed roles
        const activeRole = req.activeRole || req.user.role;
        if (!allowedRoles.includes(activeRole)) {
            return res.status(403).json({ message: 'Access denied.' });
        }
        next();
    };
};

module.exports = { auth, adminOnly, roles };
