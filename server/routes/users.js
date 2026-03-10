const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const User = require('../models/User');
const { auth, adminOnly } = require('../middleware/auth');
const { generateUsername, generatePassword } = require('../utils/credentials');
const { reorganizeClass, syncStudentAttendance } = require('../utils/classUtils');

const upload = multer({ storage: multer.memoryStorage() });

// @route   GET /api/users
// @desc    Get all users with filters
router.get('/', auth, async (req, res) => {
    try {
        const { role, departmentId, classId, search } = req.query;
        const filter = {};

        if (role) filter.role = role;
        if (departmentId) filter.departmentId = departmentId;
        if (classId) filter.classId = classId;
        if (search) {
            filter.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(filter)
            .select('-password')
            .populate('departmentId')
            .populate('classId')
            .sort({ createdAt: -1 });

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/users/template
// @desc    Download Excel template for bulk upload
router.get('/template', auth, adminOnly, (req, res) => {
    const templateData = [
        {
            firstName: 'John',
            fatherName: 'Michael',
            lastName: 'Doe',
            dob: '2005-09-15',
            role: 'student',
            email: 'john@example.com',
            phone: '9876543210'
        },
        {
            firstName: 'Jane',
            fatherName: 'Robert',
            lastName: 'Smith',
            dob: '2004-03-22',
            role: 'teacher',
            email: 'jane@example.com',
            phone: '9876543211'
        }
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    worksheet['!cols'] = [
        { wch: 15 }, // firstName
        { wch: 15 }, // fatherName
        { wch: 15 }, // lastName
        { wch: 12 }, // dob
        { wch: 15 }, // role
        { wch: 25 }, // email
        { wch: 15 }  // phone
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=user_upload_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

// @route   GET /api/users/:id
// @desc    Get single user
router.get('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password')
            .populate('departmentId')
            .populate('classId');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/users
// @desc    Create user (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const { firstName, fatherName, lastName, role, dob, email, phone, departmentId, classId } = req.body;

        // Generate credentials
        const username = generateUsername(firstName, lastName, dob);
        const password = generatePassword(firstName, dob);

        // Check if username exists
        let finalUsername = username;
        let counter = 1;
        while (await User.findOne({ username: finalUsername })) {
            finalUsername = username + counter;
            counter++;
        }

        const user = new User({
            firstName,
            fatherName,
            lastName,
            username: finalUsername,
            password,
            role,
            dob,
            email,
            phone,
            departmentId: departmentId || null,
            classId: classId || null,
            mustChangePassword: true
        });

        await user.save();

        // If student was created with a classId, reorganize and sync attendance
        if (role === 'student' && classId) {
            try {
                await reorganizeClass(classId);
                await syncStudentAttendance(user._id, classId);
            } catch (syncError) {
                console.error('Class sync warning on user create:', syncError);
            }
        }

        res.status(201).json({
            user: {
                ...user.toObject(),
                password: undefined
            },
            credentials: {
                username: finalUsername,
                password: password
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/users/:id
// @desc    Update user
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const { firstName, fatherName, lastName, role, dob, email, phone, departmentId, classId, isActive } = req.body;

        // Get old user data to detect classId change
        const existingUser = await User.findById(req.params.id);
        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        const oldClassId = existingUser.classId?.toString() || null;
        const newClassId = classId || null;

        // Build fullName from parts
        const fullName = [firstName, fatherName, lastName].filter(Boolean).join(' ');

        const user = await User.findByIdAndUpdate(
            req.params.id,
            {
                firstName,
                fatherName,
                lastName,
                fullName,
                role,
                dob,
                email,
                phone,
                departmentId: departmentId || null,
                classId: newClassId,
                isActive
            },
            { new: true }
        ).select('-password');

        // If student's classId changed, reorganize classes and sync attendance
        if ((existingUser.role === 'student' || role === 'student') && newClassId !== oldClassId) {
            try {
                if (newClassId) {
                    await reorganizeClass(newClassId);
                    await syncStudentAttendance(req.params.id, newClassId);
                }
                if (oldClassId && oldClassId !== newClassId) {
                    await reorganizeClass(oldClassId);
                }
            } catch (syncError) {
                console.error('Class sync warning on user update:', syncError);
            }
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/users/bulk-upload
// @desc    Bulk upload users via Excel
router.post('/bulk-upload', auth, adminOnly, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        const results = {
            success: [],
            failed: []
        };

        for (const row of data) {
            try {
                const { firstName, fatherName, lastName, dob, role, email, phone } = row;

                if (!firstName || !lastName || !role) {
                    results.failed.push({ row, error: 'Missing required fields (firstName, lastName, role)' });
                    continue;
                }

                // Validate role
                const validRoles = ['student', 'teacher', 'hod', 'classcoordinator', 'parent'];
                if (!validRoles.includes(role.toLowerCase())) {
                    results.failed.push({ row, error: 'Invalid role' });
                    continue;
                }

                const username = generateUsername(firstName, lastName, dob);
                const password = generatePassword(firstName, dob);

                let finalUsername = username;
                let counter = 1;
                while (await User.findOne({ username: finalUsername })) {
                    finalUsername = username + counter;
                    counter++;
                }

                const user = new User({
                    firstName,
                    fatherName: fatherName || '',
                    lastName,
                    username: finalUsername,
                    password,
                    role: role.toLowerCase(),
                    dob: dob ? new Date(dob) : null,
                    email: email || '',
                    phone: phone ? String(phone) : '',
                    mustChangePassword: true
                });

                await user.save();
                results.success.push({
                    fullName: user.fullName,
                    username: finalUsername,
                    password,
                    role: role.toLowerCase()
                });
            } catch (err) {
                results.failed.push({ row, error: err.message });
            }
        }

        res.json({
            message: 'Bulk upload completed',
            successCount: results.success.length,
            failedCount: results.failed.length,
            credentials: results.success,
            errors: results.failed
        });
    } catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/users/:id/reset-password
// @desc    Reset user password
router.post('/:id/reset-password', auth, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const newPassword = generatePassword(user.firstName, user.dob);

        user.password = newPassword;
        user.mustChangePassword = true;
        await user.save();

        res.json({
            message: 'Password reset successful',
            credentials: {
                username: user.username,
                password: newPassword
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
