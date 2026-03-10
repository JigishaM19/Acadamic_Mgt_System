const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Department = require('../models/Department');
const Class = require('../models/Class');
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

// Helper: Generate parent username (fatherName + lastName + motherName + birthYear)
const generateParentUsername = (fatherName, lastName, motherName, dob) => {
    const year = new Date(dob).getFullYear();
    return generateUsername([fatherName, lastName, motherName, year]);
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

// @route   GET /api/students
// @desc    Get all students
router.get('/', auth, adminOnly, async (req, res) => {
    try {
        const students = await User.find({ roles: 'student' })
            .populate('departmentId', 'name code')
            .populate('classId', 'name year')
            .populate('parentId', 'fullName username')
            .select('-password')
            .sort({ createdAt: -1 });

        res.json(students);
    } catch (error) {
        console.error('Students fetch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/students
// @desc    Create student with auto-parent creation
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const {
            firstName, fatherName, lastName, motherName,
            dob, phone, email, parentPhone, parentEmail,
            departmentId, classId, year, gender
        } = req.body;

        if (!firstName || !lastName || !dob || !departmentId) {
            return res.status(400).json({ message: 'firstName, lastName, dob, and departmentId are required' });
        }

        // Generate student username (firstName + lastName + birthYear)
        const birthYear = new Date(dob).getFullYear();
        const studentBaseUsername = generateUsername([firstName, lastName, birthYear]);
        const studentUsername = await makeUniqueUsername(studentBaseUsername);

        // Generate password (firstName + ddmmyy)
        const studentPassword = generatePassword(firstName, dob);

        // Create student user
        const student = new User({
            firstName,
            fatherName,
            lastName,
            motherName,
            username: studentUsername,
            password: studentPassword,
            roles: ['student'],
            role: 'student',
            dob,
            phone,
            email,
            parentPhone,
            parentEmail,
            departmentId,
            classId,
            year: year || 1,
            gender,
            mustChangePassword: true
        });

        await student.save();

        // Create parent user if fatherName exists
        let parentCredentials = null;
        if (fatherName) {
            // Parent username: fatherName + lastName + motherName + birthYear
            const parentBaseUsername = generateParentUsername(fatherName, lastName, motherName, dob);
            const parentUsername = await makeUniqueUsername(parentBaseUsername);

            // Parent password same as student password
            const parentPassword = studentPassword;

            const parent = new User({
                firstName: fatherName,
                lastName: lastName,
                fullName: `${fatherName} ${lastName}`,
                username: parentUsername,
                password: parentPassword,
                roles: ['parent'],
                role: 'parent',
                phone: parentPhone,
                email: parentEmail,
                childUserId: student._id,
                departmentId,
                mustChangePassword: true
            });

            await parent.save();

            // Link parent to student
            student.parentId = parent._id;
            await student.save();

            parentCredentials = {
                fullName: parent.fullName,
                username: parentUsername,
                password: parentPassword
            };
        }

        res.status(201).json({
            message: 'Student created successfully',
            student: {
                id: student._id,
                fullName: student.fullName,
                username: studentUsername
            },
            credentials: {
                student: {
                    fullName: student.fullName,
                    username: studentUsername,
                    password: studentPassword
                },
                parent: parentCredentials
            }
        });
    } catch (error) {
        console.error('Student create error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// @route   PUT /api/students/:id
// @desc    Update student
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const { firstName, fatherName, lastName, motherName, phone, email, parentPhone, parentEmail, departmentId, classId, year, gender } = req.body;
        const { reorganizeClass } = require('../utils/classUtils');

        const student = await User.findById(req.params.id);
        if (!student || !student.roles.includes('student')) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Store old class ID for potential reorganization
        const oldClassId = student.classId;
        const classChanged = classId && (!oldClassId || oldClassId.toString() !== classId.toString());

        // Update student fields
        if (firstName) student.firstName = firstName;
        if (fatherName) student.fatherName = fatherName;
        if (lastName) student.lastName = lastName;
        if (motherName) student.motherName = motherName;
        if (phone) student.phone = phone;
        if (email !== undefined) student.email = email;
        if (parentPhone !== undefined) student.parentPhone = parentPhone;
        if (parentEmail !== undefined) student.parentEmail = parentEmail;
        if (departmentId) student.departmentId = departmentId;
        if (classId) student.classId = classId;
        if (year) student.year = year;
        if (gender) student.gender = gender;

        await student.save();

        // Reorganize classes if class assignment changed
        if (classChanged) {
            try {
                await reorganizeClass(classId);
                if (oldClassId) {
                    await reorganizeClass(oldClassId);
                }
            } catch (reorgError) {
                console.error('Class reorganization warning:', reorgError);
            }
        }

        res.json(student);
    } catch (error) {
        console.error('Student update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// @route   DELETE /api/students/:id
// @desc    Delete student and their parent
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const student = await User.findById(req.params.id);
        if (!student || !student.roles.includes('student')) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Delete parent if exists
        if (student.parentId) {
            await User.findByIdAndDelete(student.parentId);
        }

        await User.findByIdAndDelete(req.params.id);

        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Student delete error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/students/template
// @desc    Download student upload template
router.get('/template', auth, adminOnly, (req, res) => {
    const template = [
        {
            firstName: 'John',
            fatherName: 'Robert',
            lastName: 'Doe',
            motherName: 'Mary',
            dob: '2005-09-11',
            studentPhone: '9876543210',
            studentEmail: 'john@example.com',
            parentPhone: '9876543211',
            parentEmail: 'parent@example.com',
            departmentCode: 'CS',
            year: 1,
            gender: 'male'
        }
    ];

    const ws = xlsx.utils.json_to_sheet(template);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Students');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=student_upload_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

// @route   POST /api/students/bulk-upload
// @desc    Bulk upload students with auto-parent creation
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

        // Get departments for code lookup
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

                // Parse DOB
                let dob = row.dob;
                if (typeof dob === 'number') {
                    // Excel date serial number
                    dob = new Date((dob - 25569) * 86400 * 1000);
                } else {
                    dob = new Date(dob);
                }

                const birthYear = dob.getFullYear();
                const studentBaseUsername = generateUsername([row.firstName, row.lastName, birthYear]);
                const studentUsername = await makeUniqueUsername(studentBaseUsername);
                const studentPassword = generatePassword(row.firstName, dob);

                const student = new User({
                    firstName: row.firstName,
                    fatherName: row.fatherName,
                    lastName: row.lastName,
                    motherName: row.motherName,
                    username: studentUsername,
                    password: studentPassword,
                    roles: ['student'],
                    role: 'student',
                    dob,
                    phone: row.studentPhone?.toString(),
                    email: row.studentEmail,
                    parentPhone: row.parentPhone?.toString(),
                    parentEmail: row.parentEmail,
                    departmentId: deptId,
                    year: row.year || 1,
                    gender: row.gender?.toLowerCase(),
                    mustChangePassword: true
                });

                await student.save();

                let parentCredentials = null;
                if (row.fatherName) {
                    const parentBaseUsername = generateParentUsername(row.fatherName, row.lastName, row.motherName, dob);
                    const parentUsername = await makeUniqueUsername(parentBaseUsername);

                    const parent = new User({
                        firstName: row.fatherName,
                        lastName: row.lastName,
                        username: parentUsername,
                        password: studentPassword,
                        roles: ['parent'],
                        role: 'parent',
                        phone: row.parentPhone?.toString(),
                        email: row.parentEmail,
                        childUserId: student._id,
                        departmentId: deptId,
                        mustChangePassword: true
                    });

                    await parent.save();
                    student.parentId = parent._id;
                    await student.save();

                    parentCredentials = {
                        fullName: `${row.fatherName} ${row.lastName}`,
                        username: parentUsername,
                        password: studentPassword
                    };
                }

                results.credentials.push({
                    student: {
                        fullName: `${row.firstName} ${row.fatherName || ''} ${row.lastName}`.trim(),
                        username: studentUsername,
                        password: studentPassword
                    },
                    parent: parentCredentials
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

// @route   POST /api/students/:id/reset-password
// @desc    Reset student password
router.post('/:id/reset-password', auth, adminOnly, async (req, res) => {
    try {
        const student = await User.findById(req.params.id);
        if (!student || !student.roles.includes('student')) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const newPassword = generatePassword(student.firstName, student.dob);

        student.password = newPassword;
        student.mustChangePassword = true;
        await student.save();

        // Also reset parent password if exists
        let parentPassword = null;
        if (student.parentId) {
            const parent = await User.findById(student.parentId);
            if (parent) {
                parent.password = newPassword;
                parent.mustChangePassword = true;
                await parent.save();
                parentPassword = newPassword;
            }
        }

        res.json({
            message: 'Password reset successfully',
            credentials: {
                student: { password: newPassword },
                parent: parentPassword ? { password: parentPassword } : null
            }
        });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
