const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Department = require('../models/Department');
const { auth, adminOnly } = require('../middleware/auth');
const multer = require('multer');
const xlsx = require('xlsx');

const upload = multer({ storage: multer.memoryStorage() });

// Helper: Generate username from name parts
const generateUsername = (parts) => {
    return parts.filter(Boolean).join('').toLowerCase().replace(/[^a-z0-9]/g, '');
};

// Helper: Generate password from firstName and DOB (firstName + ddmmyy)
const generatePassword = (firstName, dob) => {
    const date = new Date(dob);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    return `${firstName.toLowerCase()}${dd}${mm}${yy}`;
};

// Helper: Make username unique
const makeUniqueUsername = async (baseUsername) => {
    let username = baseUsername;
    let counter = 1;
    while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
    }
    return username;
};

// @route   GET /api/teachers
// @desc    Get all teachers (users with teacher role)
router.get('/', auth, adminOnly, async (req, res) => {
    try {
        const teachers = await User.find({ roles: { $in: ['teacher', 'hod', 'classcoordinator'] } })
            .populate('departmentId', 'name code')
            .select('-password')
            .sort({ createdAt: -1 });

        res.json(teachers);
    } catch (error) {
        console.error('Teachers fetch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/teachers
// @desc    Create teacher (default role: teacher)
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const { firstName, fatherName, lastName, dob, phone, email, departmentId } = req.body;

        if (!firstName || !lastName || !dob || !departmentId) {
            return res.status(400).json({ message: 'firstName, lastName, dob, and departmentId are required' });
        }

        // Generate teacher username (firstName + lastName + birthYear)
        const birthYear = new Date(dob).getFullYear();
        const baseUsername = generateUsername([firstName, lastName, birthYear]);
        const username = await makeUniqueUsername(baseUsername);

        // Generate password (firstName + ddmmyy)
        const password = generatePassword(firstName, dob);

        const teacher = new User({
            firstName,
            fatherName,
            lastName,
            username,
            password,
            roles: ['teacher'],
            role: 'teacher',
            dob,
            phone,
            email,
            departmentId,
            mustChangePassword: true
        });

        await teacher.save();

        res.status(201).json({
            message: 'Teacher created successfully',
            teacher: {
                id: teacher._id,
                fullName: teacher.fullName,
                username
            },
            credentials: {
                fullName: teacher.fullName,
                username,
                password
            }
        });
    } catch (error) {
        console.error('Teacher create error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// @route   PUT /api/teachers/:id
// @desc    Update teacher
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const { firstName, fatherName, lastName, phone, email, departmentId } = req.body;

        const teacher = await User.findById(req.params.id);
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        if (firstName) teacher.firstName = firstName;
        if (fatherName) teacher.fatherName = fatherName;
        if (lastName) teacher.lastName = lastName;
        if (phone) teacher.phone = phone;
        if (email !== undefined) teacher.email = email;
        if (departmentId) teacher.departmentId = departmentId;

        await teacher.save();

        res.json(teacher);
    } catch (error) {
        console.error('Teacher update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/teachers/:id
// @desc    Delete teacher
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const teacher = await User.findById(req.params.id);
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Teacher deleted successfully' });
    } catch (error) {
        console.error('Teacher delete error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/teachers/:id/add-role
// @desc    Add a role to teacher
router.post('/:id/add-role', auth, adminOnly, async (req, res) => {
    try {
        const { role } = req.body;
        const allowedRoles = ['teacher', 'hod', 'classcoordinator'];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Allowed: teacher, hod, classcoordinator' });
        }

        const teacher = await User.findById(req.params.id);
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        if (!teacher.roles.includes(role)) {
            teacher.roles.push(role);
            await teacher.save();
        }

        res.json({
            message: `Role '${role}' added successfully`,
            roles: teacher.roles
        });
    } catch (error) {
        console.error('Add role error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/teachers/:id/remove-role
// @desc    Remove a role from teacher
router.post('/:id/remove-role', auth, adminOnly, async (req, res) => {
    try {
        const { role } = req.body;

        const teacher = await User.findById(req.params.id);
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        if (teacher.roles.length <= 1) {
            return res.status(400).json({ message: 'Cannot remove last role. User must have at least one role.' });
        }

        teacher.roles = teacher.roles.filter(r => r !== role);

        // Update primary role if removed
        if (teacher.role === role) {
            teacher.role = teacher.roles[0];
        }

        await teacher.save();

        res.json({
            message: `Role '${role}' removed successfully`,
            roles: teacher.roles
        });
    } catch (error) {
        console.error('Remove role error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/teachers/template
// @desc    Download teacher upload template
router.get('/template', auth, adminOnly, (req, res) => {
    const template = [
        {
            firstName: 'John',
            fatherName: 'Robert',
            lastName: 'Smith',
            phone: '9876543210',
            dob: '1985-05-15',
            email: 'john.smith@college.edu',
            departmentCode: 'CS'
        }
    ];

    const ws = xlsx.utils.json_to_sheet(template);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Teachers');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=teacher_upload_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

// @route   POST /api/teachers/bulk-upload
// @desc    Bulk upload teachers
router.post('/bulk-upload', auth, adminOnly, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const results = {
            successCount: 0,
            failedCount: 0,
            credentials: [],
            errors: []
        };

        const departments = await Department.find();
        const deptMap = {};
        departments.forEach(d => { deptMap[d.code?.toLowerCase()] = d._id; });

        for (const row of data) {
            try {
                const deptId = deptMap[row.departmentCode?.toLowerCase()];
                if (!deptId) {
                    results.errors.push(`Row: ${row.firstName} - Department not found: ${row.departmentCode}`);
                    results.failedCount++;
                    continue;
                }

                let dob = row.dob;
                if (typeof dob === 'number') {
                    dob = new Date((dob - 25569) * 86400 * 1000);
                } else {
                    dob = new Date(dob);
                }

                const birthYear = dob.getFullYear();
                const baseUsername = generateUsername([row.firstName, row.lastName, birthYear]);
                const username = await makeUniqueUsername(baseUsername);
                const password = generatePassword(row.firstName, dob);

                const teacher = new User({
                    firstName: row.firstName,
                    fatherName: row.fatherName,
                    lastName: row.lastName,
                    username,
                    password,
                    roles: ['teacher'],
                    role: 'teacher',
                    dob,
                    phone: row.phone?.toString(),
                    email: row.email,
                    departmentId: deptId,
                    mustChangePassword: true
                });

                await teacher.save();

                results.credentials.push({
                    fullName: `${row.firstName} ${row.fatherName || ''} ${row.lastName}`.trim(),
                    username,
                    password
                });
                results.successCount++;
            } catch (err) {
                results.errors.push(`Row: ${row.firstName} - ${err.message}`);
                results.failedCount++;
            }
        }

        res.json(results);
    } catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/teachers/:id/reset-password
// @desc    Reset teacher password
router.post('/:id/reset-password', auth, adminOnly, async (req, res) => {
    try {
        const teacher = await User.findById(req.params.id);
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        const newPassword = generatePassword(teacher.firstName, teacher.dob);

        teacher.password = newPassword;
        teacher.mustChangePassword = true;
        await teacher.save();

        res.json({
            message: 'Password reset successfully',
            credentials: { password: newPassword }
        });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
