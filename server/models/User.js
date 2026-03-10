const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    fatherName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    motherName: {
        type: String,
        trim: true
    },
    fullName: {
        type: String,
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    // Changed from single role to roles array for multi-role support
    roles: [{
        type: String,
        enum: ['admin', 'hod', 'classcoordinator', 'teacher', 'student', 'parent']
    }],
    // For backward compatibility - computed from roles array
    role: {
        type: String,
        enum: ['admin', 'hod', 'classcoordinator', 'teacher', 'student', 'parent']
    },
    // Active role for current session (set during login)
    activeRole: {
        type: String,
        enum: ['admin', 'hod', 'classcoordinator', 'teacher', 'student', 'parent']
    },
    dob: {
        type: Date
    },
    email: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other']
    },
    year: {
        type: Number,
        min: 1,
        max: 4
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
    },
    // For parent users - link to their child (student)
    childUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // For student users - link to their parent
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Parent contact info (stored on student record)
    parentPhone: {
        type: String,
        trim: true
    },
    parentEmail: {
        type: String,
        trim: true
    },
    mustChangePassword: {
        type: Boolean,
        default: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // Roll number for students (auto-assigned based on last name)
    rollNo: {
        type: Number
    },
    // Profile fields
    address: {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        pincode: { type: String, trim: true }
    },
    about: {
        type: String,
        trim: true,
        maxlength: 500
    },
    emergencyContact: {
        name: { type: String, trim: true },
        phone: { type: String, trim: true },
        relation: { type: String, trim: true }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Generate fullName before saving
userSchema.pre('save', async function (next) {
    // Generate fullName from parts
    this.fullName = [this.firstName, this.fatherName, this.lastName].filter(Boolean).join(' ');

    // If roles array is set but role is not, set role to first role
    if (this.roles && this.roles.length > 0 && !this.role) {
        this.role = this.roles[0];
    }

    // If role is set but roles array is empty, populate roles
    if (this.role && (!this.roles || this.roles.length === 0)) {
        this.roles = [this.role];
    }

    // Hash password if modified
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Check if user has a specific role
userSchema.methods.hasRole = function (role) {
    return this.roles && this.roles.includes(role);
};

module.exports = mongoose.model('User', userSchema);
