const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const User = require('../models/User');
const Class = require('../models/Class');
const Timetable = require('../models/Timetable');
const Attendance = require('../models/Attendance');
const Test = require('../models/Test');
const LeaveRequest = require('../models/LeaveRequest');
const Complaint = require('../models/Complaint');
const Subject = require('../models/Subject');
const AcademicSettings = require('../models/AcademicSettings');
const AssignmentMark = require('../models/AssignmentMark');
const SubjectConfig = require('../models/SubjectConfig');
const academicCalc = require('../utils/academicCalc');
const { auth, roles } = require('../middleware/auth');
const { reorganizeClass, getClassStudents, updateBatchNames, syncStudentAttendance } = require('../utils/classUtils');
const { createNotification } = require('../utils/notificationUtils');

const upload = multer({ storage: multer.memoryStorage() });

// Middleware to ensure HOD access and attach department
const hodOnly = async (req, res, next) => {
    const activeRole = req.activeRole || req.user.role;
    if (activeRole !== 'hod') {
        return res.status(403).json({ message: 'Access denied. HOD only.' });
    }
    if (!req.user.departmentId) {
        return res.status(403).json({ message: 'HOD not assigned to any department.' });
    }
    req.departmentId = req.user.departmentId;
    next();
};

// Apply HOD middleware to all routes
router.use(auth, hodOnly);

// ============================================
// DASHBOARD STATS
// ============================================

// @route   GET /api/hod/stats
// @desc    Get department dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const departmentId = req.departmentId;

        // Get classes grouped by year
        const classes = await Class.find({ departmentId });

        // Get student count per year
        const yearStats = {};
        for (let year = 1; year <= 4; year++) {
            const yearClasses = classes.filter(c => c.year === year);
            const classIds = yearClasses.map(c => c._id);

            const studentCount = await User.countDocuments({
                role: 'student',
                classId: { $in: classIds }
            });

            // Calculate average attendance for the year (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const attendanceData = await Attendance.find({
                classId: { $in: classIds },
                date: { $gte: thirtyDaysAgo }
            });

            let totalPresent = 0;
            let totalStudents = 0;
            attendanceData.forEach(a => {
                totalPresent += a.presentCount;
                totalStudents += a.totalCount;
            });

            const avgAttendance = totalStudents > 0
                ? Math.round((totalPresent / totalStudents) * 100)
                : 0;

            yearStats[year] = {
                classCount: yearClasses.length,
                studentCount,
                avgAttendance
            };
        }

        // Get total counts
        const totalTeachers = await User.countDocuments({
            role: { $in: ['teacher', 'classcoordinator'] },
            departmentId
        });

        const totalStudents = await User.countDocuments({
            role: 'student',
            departmentId
        });

        const pendingLeaves = await LeaveRequest.countDocuments({
            status: 'pending',
            userId: {
                $in: await User.find({ departmentId }).distinct('_id')
            }
        });

        const openComplaints = await Complaint.countDocuments({
            status: 'open',
            userId: {
                $in: await User.find({ departmentId }).distinct('_id')
            }
        });

        // Get at-risk students per year
        const settings = await AcademicSettings.getSettings();
        const atRiskByYear = {};

        for (let year = 1; year <= 4; year++) {
            const yearClasses = classes.filter(c => c.year === year);
            const classIds = yearClasses.map(c => c._id);
            if (classIds.length === 0) {
                atRiskByYear[year] = { count: 0, students: [] };
                continue;
            }

            const yearStudents = await User.find({ role: 'student', classId: { $in: classIds } })
                .select('fullName username classId');
            const yearAttendance = await Attendance.find({ classId: { $in: classIds } });

            const riskStudents = [];
            const seenStudents = new Set();

            for (const student of yearStudents) {
                const sid = student._id.toString();
                const studentClassId = student.classId;
                const subjects = await Timetable.find({ classId: studentClassId }).distinct('subject');

                for (const subj of subjects) {
                    const subjRecords = yearAttendance.filter(r =>
                        r.classId.toString() === studentClassId.toString() && r.subject === subj
                    );
                    let total = 0, attended = 0;
                    for (const record of subjRecords) {
                        const sr = record.records.find(r => r.studentId.toString() === sid);
                        if (sr) { total++; if (sr.status === 'present') attended++; }
                    }
                    if (total > 0) {
                        const attPercent = academicCalc.calcAttendancePercent(attended, total);
                        if (attPercent < settings.minAttendancePercent && !seenStudents.has(sid)) {
                            seenStudents.add(sid);
                            riskStudents.push({
                                studentId: student._id,
                                fullName: student.fullName,
                                username: student.username,
                                lowestAttendance: attPercent,
                                subject: subj
                            });
                        }
                    }
                }
            }

            atRiskByYear[year] = { count: riskStudents.length, students: riskStudents.slice(0, 20) };
        }

        res.json({
            yearStats,
            totalTeachers,
            totalStudents,
            totalClasses: classes.length,
            pendingLeaves,
            openComplaints,
            atRiskByYear
        });
    } catch (error) {
        console.error('HOD stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// ATTENDANCE (Read-only)
// ============================================

// @route   GET /api/hod/attendance
// @desc    Get attendance data for department classes
router.get('/attendance', async (req, res) => {
    try {
        const { year, classId } = req.query;
        const departmentId = req.departmentId;

        // Get department classes
        const classFilter = { departmentId };
        if (year) classFilter.year = parseInt(year);

        const classes = await Class.find(classFilter);
        const classIds = classId ? [classId] : classes.map(c => c._id);

        // Get attendance summary for each class
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const attendanceStats = [];

        for (const cls of classes) {
            if (classId && cls._id.toString() !== classId) continue;

            const studentCount = await User.countDocuments({
                role: 'student',
                classId: cls._id
            });

            const attendanceData = await Attendance.find({
                classId: cls._id,
                date: { $gte: thirtyDaysAgo }
            });

            let totalPresent = 0;
            let totalRecords = 0;
            attendanceData.forEach(a => {
                totalPresent += a.presentCount;
                totalRecords += a.totalCount;
            });

            const avgAttendance = totalRecords > 0
                ? Math.round((totalPresent / totalRecords) * 100)
                : 0;

            let status = 'good';
            if (avgAttendance < 60) status = 'critical';
            else if (avgAttendance < 75) status = 'warning';

            attendanceStats.push({
                classId: cls._id,
                className: cls.name,
                year: cls.year,
                totalStudents: studentCount,
                avgAttendance,
                status
            });
        }

        res.json(attendanceStats);
    } catch (error) {
        console.error('HOD attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// STUDENTS
// ============================================

// @route   GET /api/hod/students
// @desc    Get students in HOD's department
router.get('/students', async (req, res) => {
    try {
        const { classId, year, search } = req.query;
        const departmentId = req.departmentId;

        // Get classes in department
        const classFilter = { departmentId };
        if (year) classFilter.year = parseInt(year);

        const deptClasses = await Class.find(classFilter);
        let classIds = deptClasses.map(c => c._id);

        if (classId) {
            // Verify class belongs to department
            const validClass = deptClasses.find(c => c._id.toString() === classId);
            if (!validClass) {
                return res.status(403).json({ message: 'Class not in your department' });
            }
            classIds = [classId];
        }

        // Build filter to get students:
        // 1. Students assigned to department classes (classId in classIds)
        // 2. Students with departmentId set but no class yet
        const filter = {
            role: 'student',
            $or: [
                { classId: { $in: classIds } },
                { departmentId: departmentId, classId: { $exists: false } },
                { departmentId: departmentId, classId: null }
            ]
        };

        // If filtering by specific classId, don't include unassigned students
        if (classId) {
            filter.$or = [{ classId: classId }];
        }

        if (search) {
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    { fullName: { $regex: search, $options: 'i' } },
                    { username: { $regex: search, $options: 'i' } }
                ]
            });
        }

        const students = await User.find(filter)
            .select('-password')
            .populate('classId')
            .populate('departmentId')
            .sort({ fullName: 1 });

        res.json(students);
    } catch (error) {
        console.error('HOD students error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/hod/students/:id
// @desc    Update student class assignment
router.put('/students/:id', async (req, res) => {
    try {
        const { classId } = req.body;
        const departmentId = req.departmentId;

        // Verify class belongs to department
        const targetClass = await Class.findById(classId);
        if (!targetClass || targetClass.departmentId.toString() !== departmentId.toString()) {
            return res.status(403).json({ message: 'Can only assign to classes in your department' });
        }

        // Verify student exists and is in department
        const student = await User.findById(req.params.id);
        if (!student || student.role !== 'student') {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Store old class ID for potential reorganization
        const oldClassId = student.classId;

        // Update student's class
        student.classId = classId;
        student.departmentId = departmentId;
        await student.save();

        // Reorganize the new class (sort by last name, assign roll numbers, update batches)
        try {
            await reorganizeClass(classId);
            // Also reorganize old class if student was moved from another class
            if (oldClassId && oldClassId.toString() !== classId.toString()) {
                await reorganizeClass(oldClassId);
            }
        } catch (reorgError) {
            console.error('Class reorganization warning:', reorgError);
            // Don't fail the request if reorganization has issues
        }

        // Backfill the student into all existing attendance records as absent
        await syncStudentAttendance(req.params.id, classId);

        const updated = await User.findById(student._id)
            .select('-password')
            .populate('classId')
            .populate('departmentId');

        res.json(updated);
    } catch (error) {
        console.error('HOD student update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// @route   POST /api/hod/students/bulk-assign
// @desc    Bulk assign students to classes via Excel
router.post('/students/bulk-assign', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const departmentId = req.departmentId;
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        // Get all department classes
        const deptClasses = await Class.find({ departmentId });
        const classMap = {};
        deptClasses.forEach(c => {
            classMap[c.name.toLowerCase()] = c._id;
        });

        const results = { success: [], failed: [] };
        const affectedClassIds = new Set(); // Track which classes need reorganization

        for (const row of data) {
            try {
                // Support both new format (Current Class) and old format (className)
                const studentId = row.studentId || row['Student ID'];
                const username = row.username || row.Username;
                const className = row.className || row['Current Class'] || row['Class Name'];

                if (!className) {
                    results.failed.push({ row, error: 'Missing class name (use "Current Class" or "className" column)' });
                    continue;
                }

                // Find student
                let student;
                if (studentId) {
                    student = await User.findById(studentId);
                } else if (username) {
                    student = await User.findOne({ username: username.toString().toLowerCase() });
                } else {
                    results.failed.push({ row, error: 'Missing studentId or username' });
                    continue;
                }

                if (!student || student.role !== 'student') {
                    results.failed.push({ row, error: 'Student not found' });
                    continue;
                }

                // Find class
                const classId = classMap[className.toString().toLowerCase()];
                if (!classId) {
                    results.failed.push({ row, error: 'Class not found in department' });
                    continue;
                }

                // Track old class for reorganization
                if (student.classId) {
                    affectedClassIds.add(student.classId.toString());
                }

                // Update student
                student.classId = classId;
                student.departmentId = departmentId;
                await student.save();

                // Track new class for reorganization
                affectedClassIds.add(classId.toString());

                results.success.push({
                    studentName: student.fullName,
                    username: student.username,
                    className
                });
            } catch (err) {
                results.failed.push({ row, error: err.message });
            }
        }

        // Reorganize all affected classes after bulk assignment
        for (const cid of affectedClassIds) {
            try {
                await reorganizeClass(cid);
            } catch (reorgError) {
                console.error(`Class reorganization warning for ${cid}:`, reorgError);
            }
        }

        // Backfill attendance for all successfully assigned students
        for (const item of results.success) {
            try {
                const student = await User.findOne({ username: item.username });
                if (student && student.classId) {
                    await syncStudentAttendance(student._id, student.classId);
                }
            } catch (syncError) {
                console.error('Attendance sync warning:', syncError);
            }
        }

        res.json({
            message: 'Bulk assignment completed',
            successCount: results.success.length,
            failedCount: results.failed.length,
            success: results.success,
            errors: results.failed
        });
    } catch (error) {
        console.error('HOD bulk assign error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// ============================================
// TEACHERS
// ============================================

// @route   GET /api/hod/teachers
// @desc    Get teachers in HOD's department
router.get('/teachers', async (req, res) => {
    try {
        const departmentId = req.departmentId;
        const { search } = req.query;

        const filter = {
            role: { $in: ['teacher', 'classcoordinator'] },
            departmentId
        };

        if (search) {
            filter.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }

        const teachers = await User.find(filter)
            .select('-password')
            .populate('departmentId')
            .sort({ fullName: 1 });

        // Get class assignments for each teacher
        const teachersWithClasses = await Promise.all(teachers.map(async (teacher) => {
            const assignments = await Timetable.find({ teacherId: teacher._id })
                .populate('classId')
                .distinct('classId');

            const assignedClasses = await Class.find({ _id: { $in: assignments } });

            return {
                ...teacher.toObject(),
                assignedClasses: assignedClasses.map(c => ({
                    _id: c._id,
                    name: c.name,
                    year: c.year
                }))
            };
        }));

        res.json(teachersWithClasses);
    } catch (error) {
        console.error('HOD teachers error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// SUBJECTS
// ============================================

// @route   GET /api/hod/subjects
// @desc    Get subjects for HOD's department
router.get('/subjects', async (req, res) => {
    try {
        const departmentId = req.departmentId;
        const { type, semester, year } = req.query;
        const filter = { isActive: true, departmentId };

        if (type) filter.type = type;
        if (semester) filter.semester = parseInt(semester);
        if (year) filter.year = parseInt(year);

        const subjects = await Subject.find(filter)
            .populate('departmentId')
            .sort({ name: 1 });

        res.json(subjects);
    } catch (error) {
        console.error('HOD subjects error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/hod/subjects
// @desc    Create subject in HOD's department
router.post('/subjects', async (req, res) => {
    try {
        const departmentId = req.departmentId;
        const { name, code, type, practicalName, practicalCode, year, semester } = req.body;

        // Check if code already exists in the department
        const existing = await Subject.findOne({
            code: code.toUpperCase(),
            departmentId
        });

        if (existing) {
            return res.status(400).json({ message: 'Subject code already exists in your department' });
        }

        const subject = new Subject({
            name,
            code: code.toUpperCase(),
            type: type || 'both',
            practicalName: practicalName || '',
            practicalCode: practicalCode ? practicalCode.toUpperCase() : '',
            year: year || 1,
            semester: semester || 1,
            departmentId
        });

        await subject.save();

        const populated = await Subject.findById(subject._id)
            .populate('departmentId');

        res.status(201).json(populated);
    } catch (error) {
        console.error('HOD create subject error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/hod/subjects/:id
// @desc    Update subject in HOD's department
router.put('/subjects/:id', async (req, res) => {
    try {
        const departmentId = req.departmentId;
        const { name, code, type, practicalName, practicalCode, year, semester, isActive } = req.body;

        // Verify subject belongs to department
        const existingSubject = await Subject.findById(req.params.id);
        if (!existingSubject) {
            return res.status(404).json({ message: 'Subject not found' });
        }
        if (existingSubject.departmentId?.toString() !== departmentId.toString()) {
            return res.status(403).json({ message: 'Subject does not belong to your department' });
        }

        // Check if code already exists (excluding current)
        const duplicate = await Subject.findOne({
            code: code.toUpperCase(),
            departmentId,
            _id: { $ne: req.params.id }
        });

        if (duplicate) {
            return res.status(400).json({ message: 'Subject code already exists in your department' });
        }

        const subject = await Subject.findByIdAndUpdate(
            req.params.id,
            {
                name,
                code: code.toUpperCase(),
                type: type || 'both',
                practicalName: practicalName || '',
                practicalCode: practicalCode ? practicalCode.toUpperCase() : '',
                year: year || 1,
                semester: semester || 1,
                isActive: isActive !== undefined ? isActive : true
            },
            { new: true }
        ).populate('departmentId');

        res.json(subject);
    } catch (error) {
        console.error('HOD update subject error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/hod/subjects/:id
// @desc    Delete subject in HOD's department
router.delete('/subjects/:id', async (req, res) => {
    try {
        const departmentId = req.departmentId;

        // Verify subject belongs to department
        const subject = await Subject.findById(req.params.id);
        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }
        if (subject.departmentId?.toString() !== departmentId.toString()) {
            return res.status(403).json({ message: 'Subject does not belong to your department' });
        }

        await Subject.findByIdAndDelete(req.params.id);
        res.json({ message: 'Subject deleted' });
    } catch (error) {
        console.error('HOD delete subject error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// SUBJECTS
// ============================================

// @route   GET /api/hod/subjects/template
// @desc    Download subject upload template for HOD
router.get('/subjects/template', (req, res) => {
    const template = [
        {
            name: 'Data Structures',
            code: 'CS301',
            type: 'both',
            practicalName: 'DS Lab',
            practicalCode: 'CS301P',
            year: 2,
            semester: 3
        }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Subjects');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=subject_upload_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

// @route   POST /api/hod/subjects/bulk-upload
// @desc    Bulk upload subjects for HOD's department
router.post('/subjects/bulk-upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const departmentId = req.departmentId;
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const results = {
            successCount: 0,
            failedCount: 0,
            created: [],
            errors: []
        };

        for (const row of data) {
            try {
                const code = row.code?.toString().toUpperCase();
                if (!row.name || !code) {
                    results.errors.push(`Row: ${row.name || 'unknown'} - Name and code are required`);
                    results.failedCount++;
                    continue;
                }

                // Check if code already exists in department
                const existing = await Subject.findOne({ code, departmentId });
                if (existing) {
                    results.errors.push(`Row: ${row.name} - Subject code ${code} already exists`);
                    results.failedCount++;
                    continue;
                }

                const subject = new Subject({
                    name: row.name,
                    code,
                    type: row.type || 'both',
                    practicalName: row.practicalName || '',
                    practicalCode: row.practicalCode ? row.practicalCode.toString().toUpperCase() : '',
                    year: parseInt(row.year) || 1,
                    semester: parseInt(row.semester) || 1,
                    departmentId
                });

                await subject.save();
                results.created.push({ name: subject.name, code: subject.code });
                results.successCount++;
            } catch (err) {
                results.errors.push(`Row: ${row.name || 'unknown'} - ${err.message}`);
                results.failedCount++;
            }
        }

        res.json(results);
    } catch (error) {
        console.error('HOD bulk upload subjects error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// ASSIGNMENTS & EXPERIMENTS (view-only)
// ============================================

// @route   GET /api/hod/assignments
// @desc    Get assignment/experiment overview for department
router.get('/assignments', async (req, res) => {
    try {
        const departmentId = req.departmentId;
        const { year, classId: filterClassId } = req.query;
        const classFilter = { departmentId };
        if (year) classFilter.year = parseInt(year);
        const classes = await Class.find(classFilter).populate('departmentId');
        const result = [];
        for (const cls of classes) {
            if (filterClassId && cls._id.toString() !== filterClassId) continue;
            const subjects = await Timetable.find({ classId: cls._id }).distinct('subject');
            for (const subject of subjects) {
                const config = await SubjectConfig.findOne({ classId: cls._id, subject });
                const assignmentCount = await AssignmentMark.countDocuments({ classId: cls._id, subject, type: 'assignment' });
                const experimentCount = await AssignmentMark.countDocuments({ classId: cls._id, subject, type: 'experiment' });
                if ((config?.totalAssignments || 0) > 0 || (config?.totalExperiments || 0) > 0 || assignmentCount > 0 || experimentCount > 0) {
                    result.push({
                        classId: cls._id,
                        className: cls.name,
                        year: cls.year,
                        department: cls.departmentId?.name || 'N/A',
                        subject,
                        totalAssignments: config?.totalAssignments || 0,
                        totalExperiments: config?.totalExperiments || 0,
                        assignmentsEntered: assignmentCount,
                        experimentsEntered: experimentCount
                    });
                }
            }
        }
        res.json(result);
    } catch (error) {
        console.error('HOD assignments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/hod/assignments/:classId/:subject
// @desc    Get detailed assignment/experiment marks
router.get('/assignments/:classId/:subject', async (req, res) => {
    try {
        const departmentId = req.departmentId;
        const { classId, subject } = req.params;
        const decodedSubject = decodeURIComponent(subject);
        const classDoc = await Class.findById(classId).populate('departmentId');
        if (!classDoc || classDoc.departmentId?._id?.toString() !== departmentId.toString()) {
            return res.status(403).json({ message: 'Class not in your department' });
        }
        const students = await User.find({ role: 'student', classId }).select('fullName lastName username').sort({ lastName: 1 });
        const config = await SubjectConfig.findOne({ classId, subject: decodedSubject });
        const assignments = await AssignmentMark.find({ classId, subject: decodedSubject, type: 'assignment' }).sort({ number: 1 });
        const experiments = await AssignmentMark.find({ classId, subject: decodedSubject, type: 'experiment' }).sort({ number: 1 });
        res.json({
            classInfo: { classId, className: classDoc.name, year: classDoc.year, department: classDoc.departmentId?.name, subject: decodedSubject },
            config: config || { totalAssignments: 0, totalExperiments: 0, assignmentMaxScore: 10, experimentMaxScore: 10 },
            students, assignments, experiments
        });
    } catch (error) {
        console.error('HOD assignment details error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// CLASSES
// ============================================

// @route   GET /api/hod/classes
// @desc    Get classes in HOD's department
router.get('/classes', async (req, res) => {
    try {
        const departmentId = req.departmentId;
        const { year } = req.query;

        const filter = { departmentId };
        if (year) filter.year = parseInt(year);

        const classes = await Class.find(filter)
            .populate('departmentId')
            .populate('coordinatorId', 'fullName username')
            .sort({ year: 1, name: 1 });

        // Add student count for each class
        const classesWithCounts = await Promise.all(classes.map(async (cls) => {
            const studentCount = await User.countDocuments({
                role: 'student',
                classId: cls._id
            });
            return {
                ...cls.toObject(),
                studentCount
            };
        }));

        res.json(classesWithCounts);
    } catch (error) {
        console.error('HOD classes error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/hod/classes/:id/students
// @desc    Get all students in a class with batches
router.get('/classes/:id/students', async (req, res) => {
    try {
        const departmentId = req.departmentId;

        // Verify class belongs to department
        const classDoc = await Class.findById(req.params.id);
        if (!classDoc || classDoc.departmentId.toString() !== departmentId.toString()) {
            return res.status(403).json({ message: 'Class not in your department' });
        }

        const result = await getClassStudents(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('HOD get class students error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// @route   POST /api/hod/classes/:id/reorganize
// @desc    Reorganize class - sort students, assign roll numbers, create batches
router.post('/classes/:id/reorganize', async (req, res) => {
    try {
        const departmentId = req.departmentId;

        // Verify class belongs to department
        const classDoc = await Class.findById(req.params.id);
        if (!classDoc || classDoc.departmentId.toString() !== departmentId.toString()) {
            return res.status(403).json({ message: 'Class not in your department' });
        }

        await reorganizeClass(req.params.id);
        const result = await getClassStudents(req.params.id);
        res.json({
            message: 'Class reorganized successfully',
            ...result
        });
    } catch (error) {
        console.error('HOD reorganize class error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// @route   PUT /api/hod/classes/:id/batches
// @desc    Update batch names
router.put('/classes/:id/batches', async (req, res) => {
    try {
        const departmentId = req.departmentId;
        const { batchUpdates } = req.body;

        // Verify class belongs to department
        const classDoc = await Class.findById(req.params.id);
        if (!classDoc || classDoc.departmentId.toString() !== departmentId.toString()) {
            return res.status(403).json({ message: 'Class not in your department' });
        }

        const updatedClass = await updateBatchNames(req.params.id, batchUpdates);
        res.json({
            message: 'Batch names updated successfully',
            batches: updatedClass.batches
        });
    } catch (error) {
        console.error('HOD update batch names error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// @route   POST /api/hod/classes
// @desc    Create class in HOD's department
router.post('/classes', async (req, res) => {
    try {
        const { name, year, coordinatorId, maxCapacity } = req.body;
        const departmentId = req.departmentId;

        // If coordinator specified, verify they're in the department
        if (coordinatorId) {
            const coordinator = await User.findById(coordinatorId);
            if (!coordinator || coordinator.departmentId?.toString() !== departmentId.toString()) {
                return res.status(400).json({ message: 'Coordinator must be from your department' });
            }
        }

        // Initialize default batches
        const defaultBatches = [
            { name: 'Batch 1', studentIds: [] },
            { name: 'Batch 2', studentIds: [] },
            { name: 'Batch 3', studentIds: [] }
        ];

        const classItem = new Class({
            name,
            year,
            departmentId,
            coordinatorId: coordinatorId || null,
            maxCapacity: maxCapacity || 75,
            batches: defaultBatches
        });

        await classItem.save();

        const populated = await Class.findById(classItem._id)
            .populate('departmentId')
            .populate('coordinatorId', 'fullName username');

        res.status(201).json({
            ...populated.toObject(),
            studentCount: 0
        });
    } catch (error) {
        console.error('HOD class create error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/hod/classes/:id
// @desc    Update class in HOD's department
router.put('/classes/:id', async (req, res) => {
    try {
        const { name, year, coordinatorId, maxCapacity } = req.body;
        const departmentId = req.departmentId;

        // Verify class belongs to department
        const existingClass = await Class.findById(req.params.id);
        if (!existingClass || existingClass.departmentId.toString() !== departmentId.toString()) {
            return res.status(403).json({ message: 'Can only update classes in your department' });
        }

        // If coordinator specified, verify they're in the department
        if (coordinatorId) {
            const coordinator = await User.findById(coordinatorId);
            if (!coordinator || coordinator.departmentId?.toString() !== departmentId.toString()) {
                return res.status(400).json({ message: 'Coordinator must be from your department' });
            }
        }

        const updateData = {
            name,
            year,
            coordinatorId: coordinatorId || null
        };

        if (maxCapacity !== undefined) {
            updateData.maxCapacity = maxCapacity;
        }

        const classItem = await Class.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        )
            .populate('departmentId')
            .populate('coordinatorId', 'fullName username');

        // Add student count
        const studentCount = await User.countDocuments({
            role: 'student',
            classId: req.params.id
        });

        res.json({
            ...classItem.toObject(),
            studentCount
        });
    } catch (error) {
        console.error('HOD class update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/hod/classes/template
// @desc    Download class upload template for HOD
router.get('/classes/template', (req, res) => {
    const template = [
        {
            name: 'FY-CSE-A',
            year: 1,
            coordinatorUsername: '',
            maxCapacity: 75
        }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Classes');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=class_upload_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

// @route   POST /api/hod/classes/bulk-upload
// @desc    Bulk upload classes for HOD's department
router.post('/classes/bulk-upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const departmentId = req.departmentId;
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const results = {
            successCount: 0,
            failedCount: 0,
            created: [],
            errors: []
        };

        for (const row of data) {
            try {
                if (!row.name) {
                    results.errors.push(`Row: unknown - Class name is required`);
                    results.failedCount++;
                    continue;
                }

                // Look up coordinator by username if provided
                let coordinatorId = null;
                if (row.coordinatorUsername) {
                    const coordinator = await User.findOne({
                        username: row.coordinatorUsername.toString().toLowerCase(),
                        role: { $in: ['teacher', 'classcoordinator'] },
                        departmentId
                    });
                    if (coordinator) {
                        coordinatorId = coordinator._id;
                    }
                }

                const defaultBatches = [
                    { name: 'Batch 1', studentIds: [] },
                    { name: 'Batch 2', studentIds: [] },
                    { name: 'Batch 3', studentIds: [] }
                ];

                const classItem = new Class({
                    name: row.name,
                    year: parseInt(row.year) || 1,
                    departmentId,
                    coordinatorId,
                    maxCapacity: parseInt(row.maxCapacity) || 75,
                    batches: defaultBatches
                });

                await classItem.save();
                results.created.push({ name: classItem.name, year: classItem.year });
                results.successCount++;
            } catch (err) {
                results.errors.push(`Row: ${row.name || 'unknown'} - ${err.message}`);
                results.failedCount++;
            }
        }

        res.json(results);
    } catch (error) {
        console.error('HOD bulk upload classes error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// TIMETABLE
// ============================================

// @route   GET /api/hod/timetables
// @desc    Get timetables for HOD's department classes
router.get('/timetables', async (req, res) => {
    try {
        const { classId, day, batchId, semester } = req.query;
        const departmentId = req.departmentId;

        // Get department classes
        const deptClasses = await Class.find({ departmentId });
        const classIds = deptClasses.map(c => c._id);

        const filter = { classId: { $in: classIds } };
        if (classId) {
            // Verify class is in department
            if (!classIds.some(id => id.toString() === classId)) {
                return res.status(403).json({ message: 'Class not in your department' });
            }
            filter.classId = classId;
        }
        if (day) filter.day = day;
        if (batchId) filter.batchId = batchId;
        if (semester) filter.semester = parseInt(semester);

        const timetables = await Timetable.find(filter)
            .populate('classId')
            .populate('teacherId', 'fullName username')
            .populate('timeSlotId')
            .populate('timeSlotIds')
            .populate('roomId')
            .sort({ day: 1 });

        res.json(timetables);
    } catch (error) {
        console.error('HOD timetable error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/hod/timetables/class-batches/:classId
// @desc    Get batches for a specific class
router.get('/timetables/class-batches/:classId', async (req, res) => {
    try {
        const departmentId = req.departmentId;
        const classData = await Class.findById(req.params.classId).select('batches name departmentId');

        if (!classData) {
            return res.status(404).json({ message: 'Class not found' });
        }

        if (classData.departmentId.toString() !== departmentId.toString()) {
            return res.status(403).json({ message: 'Class not in your department' });
        }

        res.json({ batches: classData.batches || [], className: classData.name });
    } catch (error) {
        console.error('HOD fetch batches error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/hod/timetables/other-departments
// @desc    Get timetables from other departments (read-only)
router.get('/timetables/other-departments', async (req, res) => {
    try {
        const departmentId = req.departmentId;

        // Get classes NOT in department
        const otherClasses = await Class.find({ departmentId: { $ne: departmentId } });
        const classIds = otherClasses.map(c => c._id);

        const timetables = await Timetable.find({ classId: { $in: classIds } })
            .populate({
                path: 'classId',
                populate: { path: 'departmentId' }
            })
            .populate('teacherId', 'fullName username')
            .populate('timeSlotId')
            .populate('timeSlotIds')
            .populate('roomId')
            .sort({ day: 1 });

        res.json(timetables);
    } catch (error) {
        console.error('HOD other timetables error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/hod/timetables
// @desc    Create timetable entry for HOD's department
router.post('/timetables', async (req, res) => {
    try {
        const { classId, subject, teacherId, day, timeSlotId, timeSlotIds, roomId, type, lectureId, batchId, semester } = req.body;
        const departmentId = req.departmentId;

        // Verify class is in department
        const cls = await Class.findById(classId);
        if (!cls || cls.departmentId.toString() !== departmentId.toString()) {
            return res.status(403).json({ message: 'Can only create timetable for your department classes' });
        }

        const slotsToCheck = timeSlotIds && timeSlotIds.length > 0 ? timeSlotIds : [timeSlotId];

        // Check for room conflict (skip for blank entries with no room)
        if (roomId) {
            for (const slotId of slotsToCheck) {
                const roomConflict = await Timetable.findOne({
                    day,
                    $or: [
                        { timeSlotId: slotId },
                        { timeSlotIds: slotId }
                    ],
                    roomId,
                    semester: semester || null
                });
                if (roomConflict) {
                    return res.status(400).json({ message: 'Room is already booked for this time slot' });
                }
            }
        }

        // Check for teacher conflict (skip for blank entries with no teacher)
        if (teacherId) {
            for (const slotId of slotsToCheck) {
                const teacherConflict = await Timetable.findOne({
                    day,
                    $or: [
                        { timeSlotId: slotId },
                        { timeSlotIds: slotId }
                    ],
                    teacherId,
                    semester: semester || null
                });
                if (teacherConflict) {
                    return res.status(400).json({ message: 'Teacher is already assigned for this time slot' });
                }
            }
        }

        // Check for class-batch conflict
        for (const slotId of slotsToCheck) {
            const existingEntries = await Timetable.find({
                day,
                classId,
                semester: semester || null,
                $or: [
                    { timeSlotId: slotId },
                    { timeSlotIds: slotId }
                ]
            });

            for (const existing of existingEntries) {
                // If existing entry is for entire class, no more entries allowed
                if (!existing.batchId) {
                    return res.status(400).json({ message: 'This time slot already has an entry for the entire class' });
                }
                // If new entry is for entire class but slot has batch entries, block it
                if (!batchId) {
                    return res.status(400).json({ message: 'Cannot assign entire class - this slot already has batch-specific entries' });
                }
                // If same batch is already assigned, block it
                if (existing.batchId?.toString() === batchId) {
                    return res.status(400).json({ message: 'This batch is already assigned to this time slot' });
                }
            }
        }

        const timetable = new Timetable({
            classId,
            subject,
            teacherId,
            day,
            timeSlotId: timeSlotIds && timeSlotIds.length > 0 ? timeSlotIds[0] : timeSlotId,
            timeSlotIds: timeSlotIds && timeSlotIds.length > 1 ? timeSlotIds : [],
            roomId,
            type,
            batchId: batchId || null,
            lectureId: lectureId || undefined,
            semester: semester || null
        });

        await timetable.save();

        const populated = await Timetable.findById(timetable._id)
            .populate('classId')
            .populate('teacherId', 'fullName username')
            .populate('timeSlotId')
            .populate('timeSlotIds')
            .populate('roomId');

        res.status(201).json(populated);
    } catch (error) {
        console.error('HOD timetable create error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// @route   PUT /api/hod/timetables/:id
// @desc    Update timetable entry
router.put('/timetables/:id', async (req, res) => {
    try {
        const { classId, subject, teacherId, day, timeSlotId, timeSlotIds, roomId, type, lectureId, batchId } = req.body;
        const departmentId = req.departmentId;
        const timetableId = req.params.id;

        // Verify existing timetable is for department class
        const existing = await Timetable.findById(timetableId).populate('classId');
        if (!existing || existing.classId.departmentId.toString() !== departmentId.toString()) {
            return res.status(403).json({ message: 'Can only update timetable for your department' });
        }

        // Verify new class is in department
        const cls = await Class.findById(classId);
        if (!cls || cls.departmentId.toString() !== departmentId.toString()) {
            return res.status(403).json({ message: 'Can only assign to your department classes' });
        }

        const slotsToCheck = timeSlotIds && timeSlotIds.length > 0 ? timeSlotIds : [timeSlotId];

        // Check for room conflict (excluding current entry)
        for (const slotId of slotsToCheck) {
            const roomConflict = await Timetable.findOne({
                day,
                $or: [
                    { timeSlotId: slotId },
                    { timeSlotIds: slotId }
                ],
                roomId,
                _id: { $ne: timetableId }
            });
            if (roomConflict) {
                return res.status(400).json({ message: 'Room is already booked for this time slot' });
            }
        }

        // Check for teacher conflict (excluding current entry)
        for (const slotId of slotsToCheck) {
            const teacherConflict = await Timetable.findOne({
                day,
                $or: [
                    { timeSlotId: slotId },
                    { timeSlotIds: slotId }
                ],
                teacherId,
                _id: { $ne: timetableId }
            });
            if (teacherConflict) {
                return res.status(400).json({ message: 'Teacher is already assigned for this time slot' });
            }
        }

        const timetable = await Timetable.findByIdAndUpdate(
            timetableId,
            {
                classId,
                subject,
                teacherId,
                day,
                timeSlotId: timeSlotIds && timeSlotIds.length > 0 ? timeSlotIds[0] : timeSlotId,
                timeSlotIds: timeSlotIds && timeSlotIds.length > 1 ? timeSlotIds : [],
                roomId,
                type,
                batchId: batchId || null,
                lectureId: lectureId || undefined
            },
            { new: true }
        )
            .populate('classId')
            .populate('teacherId', 'fullName username')
            .populate('timeSlotId')
            .populate('timeSlotIds')
            .populate('roomId');

        res.json(timetable);
    } catch (error) {
        console.error('HOD timetable update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/hod/timetables/:id
// @desc    Delete timetable entry
router.delete('/timetables/:id', async (req, res) => {
    try {
        const departmentId = req.departmentId;

        // Verify timetable is for department class
        const existing = await Timetable.findById(req.params.id).populate('classId');
        if (!existing || existing.classId.departmentId.toString() !== departmentId.toString()) {
            return res.status(403).json({ message: 'Can only delete timetable for your department' });
        }

        await Timetable.findByIdAndDelete(req.params.id);
        res.json({ message: 'Timetable entry deleted' });
    } catch (error) {
        console.error('HOD timetable delete error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/hod/timetables/bulk-upload
// @desc    Bulk upload timetable via Excel
router.post('/timetables/bulk-upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const departmentId = req.departmentId;
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        // Get department classes and teachers
        const deptClasses = await Class.find({ departmentId });
        const TimeSlot = require('../models/TimeSlot');
        const Room = require('../models/Room');
        const timeSlots = await TimeSlot.find({});
        const rooms = await Room.find({});
        const teachers = await User.find({ role: { $in: ['teacher', 'classcoordinator'] } });

        const results = { success: [], failed: [] };

        for (const row of data) {
            try {
                const { className, subject, teacherUsername, day, timeSlotName, roomName, type } = row;

                // Find class
                const cls = deptClasses.find(c => c.name.toLowerCase() === className?.toLowerCase());
                if (!cls) {
                    results.failed.push({ row, error: 'Class not found in department' });
                    continue;
                }

                // Find teacher
                const teacher = teachers.find(t => t.username === teacherUsername?.toLowerCase());
                if (!teacher) {
                    results.failed.push({ row, error: 'Teacher not found' });
                    continue;
                }

                // Find time slot
                const timeSlot = timeSlots.find(ts => ts.name === timeSlotName);
                if (!timeSlot) {
                    results.failed.push({ row, error: 'Time slot not found' });
                    continue;
                }

                // Find room
                const room = rooms.find(r => r.name === roomName || r.code === roomName);
                if (!room) {
                    results.failed.push({ row, error: 'Room not found' });
                    continue;
                }

                // Check for conflicts
                const roomConflict = await Timetable.findOne({ day, timeSlotId: timeSlot._id, roomId: room._id });
                if (roomConflict) {
                    results.failed.push({ row, error: 'Room conflict' });
                    continue;
                }

                const teacherConflict = await Timetable.findOne({ day, timeSlotId: timeSlot._id, teacherId: teacher._id });
                if (teacherConflict) {
                    results.failed.push({ row, error: 'Teacher conflict' });
                    continue;
                }

                // Create timetable entry
                const timetable = new Timetable({
                    classId: cls._id,
                    subject,
                    teacherId: teacher._id,
                    day,
                    timeSlotId: timeSlot._id,
                    roomId: room._id,
                    type: type || 'lecture'
                });

                await timetable.save();
                results.success.push({ className, subject, teacher: teacher.fullName, day, timeSlot: timeSlotName });
            } catch (err) {
                results.failed.push({ row, error: err.message });
            }
        }

        res.json({
            message: 'Bulk upload completed',
            successCount: results.success.length,
            failedCount: results.failed.length,
            success: results.success,
            errors: results.failed
        });
    } catch (error) {
        console.error('HOD timetable bulk upload error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// LECTURES (Subject-Teacher-Class Assignments)
// ============================================

const Lecture = require('../models/Lecture');

// @route   GET /api/hod/lectures
// @desc    Get all lectures for HOD's department
router.get('/lectures', async (req, res) => {
    try {
        const departmentId = req.departmentId;

        const lectures = await Lecture.find({ departmentId, isActive: true })
            .populate('subjectId', 'name code semester')
            .populate('teacherId', 'fullName username')
            .populate('classId', 'name year')
            .populate('departmentId', 'name')
            .sort({ createdAt: -1 });

        res.json(lectures);
    } catch (error) {
        console.error('HOD lectures fetch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/hod/lectures
// @desc    Create a new lecture assignment
router.post('/lectures', async (req, res) => {
    try {
        const { subjectId, teacherId, classId, type } = req.body;
        const departmentId = req.departmentId;

        // Verify subject exists
        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(400).json({ message: 'Subject not found' });
        }

        // Verify teacher is in department
        const teacher = await User.findById(teacherId);
        if (!teacher || teacher.departmentId?.toString() !== departmentId.toString()) {
            return res.status(400).json({ message: 'Teacher must be from your department' });
        }

        // Verify class is in department
        const cls = await Class.findById(classId);
        if (!cls || cls.departmentId.toString() !== departmentId.toString()) {
            return res.status(400).json({ message: 'Class must be from your department' });
        }

        // Check for duplicate
        const existing = await Lecture.findOne({ subjectId, teacherId, classId, type, departmentId });
        if (existing) {
            return res.status(400).json({ message: 'This lecture assignment already exists' });
        }

        const lecture = new Lecture({
            subjectId,
            teacherId,
            classId,
            type,
            departmentId
        });

        await lecture.save();

        const populated = await Lecture.findById(lecture._id)
            .populate('subjectId', 'name code semester')
            .populate('teacherId', 'fullName username')
            .populate('classId', 'name year')
            .populate('departmentId', 'name');

        res.status(201).json(populated);
    } catch (error) {
        console.error('HOD lecture create error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/hod/lectures/:id
// @desc    Update a lecture assignment
router.put('/lectures/:id', async (req, res) => {
    try {
        const { subjectId, teacherId, classId, type } = req.body;
        const departmentId = req.departmentId;

        // Verify lecture exists and belongs to department
        const existingLecture = await Lecture.findById(req.params.id);
        if (!existingLecture || existingLecture.departmentId.toString() !== departmentId.toString()) {
            return res.status(403).json({ message: 'Can only update lectures in your department' });
        }

        // Verify class is in department
        const cls = await Class.findById(classId);
        if (!cls || cls.departmentId.toString() !== departmentId.toString()) {
            return res.status(400).json({ message: 'Class must be from your department' });
        }

        // Verify teacher is in department
        const teacher = await User.findById(teacherId);
        if (!teacher || teacher.departmentId?.toString() !== departmentId.toString()) {
            return res.status(400).json({ message: 'Teacher must be from your department' });
        }

        // Check for duplicate (excluding current)
        const duplicate = await Lecture.findOne({
            subjectId, teacherId, classId, type, departmentId,
            _id: { $ne: req.params.id }
        });
        if (duplicate) {
            return res.status(400).json({ message: 'This lecture assignment already exists' });
        }

        const lecture = await Lecture.findByIdAndUpdate(
            req.params.id,
            { subjectId, teacherId, classId, type },
            { new: true }
        )
            .populate('subjectId', 'name code semester')
            .populate('teacherId', 'fullName username')
            .populate('classId', 'name year')
            .populate('departmentId', 'name');

        res.json(lecture);
    } catch (error) {
        console.error('HOD lecture update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/hod/lectures/:id
// @desc    Delete a lecture assignment
router.delete('/lectures/:id', async (req, res) => {
    try {
        const departmentId = req.departmentId;

        const lecture = await Lecture.findById(req.params.id);
        if (!lecture || lecture.departmentId.toString() !== departmentId.toString()) {
            return res.status(403).json({ message: 'Can only delete lectures in your department' });
        }

        await Lecture.findByIdAndDelete(req.params.id);
        res.json({ message: 'Lecture deleted successfully' });
    } catch (error) {
        console.error('HOD lecture delete error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// LEAVE REQUESTS
// ============================================

// @route   GET /api/hod/leave-requests
// @desc    Get leave requests from department members
router.get('/leave-requests', async (req, res) => {
    try {
        const { status } = req.query;
        const departmentId = req.departmentId;

        // Get all users in department
        const deptUsers = await User.find({ departmentId }).distinct('_id');

        const filter = { userId: { $in: deptUsers } };
        if (status) filter.status = status;

        const leaveRequests = await LeaveRequest.find(filter)
            .populate({
                path: 'userId',
                select: 'fullName username role classId',
                populate: { path: 'classId', select: 'name' }
            })
            .populate('reviewedBy', 'fullName')
            .sort({ createdAt: -1 });

        res.json(leaveRequests);
    } catch (error) {
        console.error('HOD leave requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/hod/leave-requests/:id
// @desc    Approve or reject leave request
router.put('/leave-requests/:id', async (req, res) => {
    try {
        const { status, reviewRemark } = req.body;
        const departmentId = req.departmentId;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Verify leave request is from department member
        const leaveRequest = await LeaveRequest.findById(req.params.id).populate('userId');
        if (!leaveRequest) {
            return res.status(404).json({ message: 'Leave request not found' });
        }

        if (leaveRequest.userId.departmentId?.toString() !== departmentId.toString()) {
            return res.status(403).json({ message: 'Can only review department leave requests' });
        }

        leaveRequest.status = status;
        leaveRequest.reviewedBy = req.user._id;
        leaveRequest.reviewedAt = new Date();
        if (reviewRemark) leaveRequest.reviewRemark = reviewRemark;

        await leaveRequest.save();

        const populated = await LeaveRequest.findById(leaveRequest._id)
            .populate({
                path: 'userId',
                select: 'fullName username role classId',
                populate: { path: 'classId', select: 'name' }
            })
            .populate('reviewedBy', 'fullName');

        res.json(populated);

        // Notify user about leave request status
        const statusText = status === 'approved' ? 'approved' : 'rejected';
        createNotification(
            leaveRequest.userId._id,
            status === 'approved' ? 'leave_approved' : 'leave_rejected',
            `Leave Request ${statusText}`,
            `Your leave request has been ${statusText} by HOD.`,
            leaveRequest._id
        );
    } catch (error) {
        console.error('HOD leave request update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// COMPLAINTS
// ============================================

// @route   GET /api/hod/complaints
// @desc    Get complaints from department members
router.get('/complaints', async (req, res) => {
    try {
        const { status } = req.query;
        const departmentId = req.departmentId;

        // Get all users in department
        const deptUsers = await User.find({ departmentId }).distinct('_id');

        const filter = { userId: { $in: deptUsers } };
        if (status) filter.status = status;

        const complaints = await Complaint.find(filter)
            .populate({
                path: 'userId',
                select: 'fullName username role classId',
                populate: { path: 'classId', select: 'name' }
            })
            .populate('resolvedBy', 'fullName')
            .sort({ createdAt: -1 });

        res.json(complaints);
    } catch (error) {
        console.error('HOD complaints error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/hod/complaints/:id
// @desc    Resolve complaint
router.put('/complaints/:id', async (req, res) => {
    try {
        const { status, remark } = req.body;
        const departmentId = req.departmentId;

        if (!['in-progress', 'resolved'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Verify complaint is from department member
        const complaint = await Complaint.findById(req.params.id).populate('userId');
        if (!complaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        if (complaint.userId.departmentId?.toString() !== departmentId.toString()) {
            return res.status(403).json({ message: 'Can only update department complaints' });
        }

        complaint.status = status;
        if (remark) complaint.remark = remark;

        if (status === 'resolved') {
            complaint.resolvedBy = req.user._id;
            complaint.resolvedAt = new Date();
        }

        await complaint.save();

        const populated = await Complaint.findById(complaint._id)
            .populate({
                path: 'userId',
                select: 'fullName username role classId',
                populate: { path: 'classId', select: 'name' }
            })
            .populate('resolvedBy', 'fullName');

        res.json(populated);

        // Notify user about complaint status
        const statusLabel = status === 'resolved' ? 'Resolved' : 'In Progress';
        createNotification(
            complaint.userId._id,
            status === 'resolved' ? 'complaint_resolved' : 'general',
            `Complaint ${statusLabel}`,
            `Your complaint "${complaint.subject}" is now ${status}.`,
            complaint._id
        );
    } catch (error) {
        console.error('HOD complaint update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// DEFAULTERS
// ============================================

// @route   GET /api/hod/defaulters
// @desc    Get all students in department with overall attendance percentage
router.get('/defaulters', async (req, res) => {
    try {
        const departmentId = req.departmentId;
        const { year, classId, percentageRange } = req.query;

        // Get classes in department
        const classFilter = { departmentId };
        if (year) classFilter.year = parseInt(year);

        const deptClasses = await Class.find(classFilter);
        let classIds = deptClasses.map(c => c._id);

        if (classId) {
            const validClass = deptClasses.find(c => c._id.toString() === classId);
            if (!validClass) {
                return res.status(403).json({ message: 'Class not in your department' });
            }
            classIds = [classId];
        }

        // Get students
        const students = await User.find({
            role: 'student',
            classId: { $in: classIds }
        })
            .select('fullName username classId rollNo')
            .populate({ path: 'classId', populate: { path: 'departmentId' } })
            .sort({ rollNo: 1 });

        // Get all attendance records for these classes
        const allAttendance = await Attendance.find({ classId: { $in: classIds } });

        // Calculate overall attendance for each student
        const result = [];
        for (const student of students) {
            const sid = student._id.toString();
            let totalLectures = 0;
            let attended = 0;

            for (const record of allAttendance) {
                if (record.classId.toString() !== (student.classId?._id || student.classId)?.toString()) continue;
                const sr = record.records.find(r => r.studentId.toString() === sid);
                if (sr) {
                    totalLectures++;
                    if (sr.status === 'present') attended++;
                }
            }

            const overallPercentage = totalLectures > 0 ? Math.round((attended / totalLectures) * 100) : 0;

            // Apply percentage filter
            if (percentageRange) {
                const [min, max] = percentageRange.split('-').map(Number);
                if (overallPercentage < min || overallPercentage > max) continue;
            }

            // Determine batch name
            let batchName = '';
            if (student.classId?.batches) {
                for (const batch of student.classId.batches) {
                    if (batch.studentIds.some(id => id.toString() === sid)) {
                        batchName = batch.name;
                        break;
                    }
                }
            }

            result.push({
                studentId: student._id,
                rollNo: student.rollNo || '',
                fullName: student.fullName,
                username: student.username,
                year: student.classId?.year || '',
                className: student.classId?.name || '',
                batch: batchName,
                overallPercentage
            });
        }

        // Sort results by year ascending then rollNo ascending
        result.sort((a, b) => {
            if (a.year !== b.year) return (a.year || 0) - (b.year || 0);
            return (a.rollNo || 999999) - (b.rollNo || 999999);
        });

        // Get class list for filter
        const classList = deptClasses.map(c => ({ _id: c._id, name: c.name, year: c.year }));

        res.json({ students: result, classes: classList });
    } catch (error) {
        console.error('HOD defaulters error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/hod/defaulters/export
// @desc    Export defaulters list as Excel sheet
router.get('/defaulters/export', async (req, res) => {
    try {
        const ExcelJS = require('exceljs');
        const departmentId = req.departmentId;
        const { year, classId, percentageRange } = req.query;

        // Get department name
        const Department = require('../models/Department');
        const dept = await Department.findById(departmentId);

        // Get classes in department
        const classFilter = { departmentId };
        if (year) classFilter.year = parseInt(year);

        const deptClasses = await Class.find(classFilter);
        let classIds = deptClasses.map(c => c._id);
        let filterClassName = 'All Classes';
        let filterYear = year ? `Year ${year}` : 'All Years';

        if (classId) {
            const validClass = deptClasses.find(c => c._id.toString() === classId);
            if (validClass) {
                classIds = [classId];
                filterClassName = validClass.name;
                filterYear = `Year ${validClass.year}`;
            }
        }

        // Get students
        const students = await User.find({
            role: 'student',
            classId: { $in: classIds }
        })
            .select('fullName username classId rollNo')
            .populate({ path: 'classId', populate: { path: 'departmentId' } })
            .sort({ rollNo: 1 });

        // Get all attendance records
        const allAttendance = await Attendance.find({ classId: { $in: classIds } });

        // Build student data
        const studentData = [];
        for (const student of students) {
            const sid = student._id.toString();
            let totalLectures = 0;
            let attended = 0;

            for (const record of allAttendance) {
                if (record.classId.toString() !== (student.classId?._id || student.classId)?.toString()) continue;
                const sr = record.records.find(r => r.studentId.toString() === sid);
                if (sr) {
                    totalLectures++;
                    if (sr.status === 'present') attended++;
                }
            }

            const overallPercentage = totalLectures > 0 ? Math.round((attended / totalLectures) * 100) : 0;

            if (percentageRange) {
                const [min, max] = percentageRange.split('-').map(Number);
                if (overallPercentage < min || overallPercentage > max) continue;
            }

            let batchName = '';
            if (student.classId?.batches) {
                for (const batch of student.classId.batches) {
                    if (batch.studentIds.some(id => id.toString() === sid)) {
                        batchName = batch.name;
                        break;
                    }
                }
            }

            studentData.push({
                rollNo: student.rollNo || '',
                fullName: student.fullName,
                className: student.classId?.name || '',
                year: student.classId?.year || '',
                batch: batchName,
                overallPercentage
            });
        }

        // Sort by year ascending then rollNo ascending
        studentData.sort((a, b) => {
            if (a.year !== b.year) return (a.year || 0) - (b.year || 0);
            return (a.rollNo || 999999) - (b.rollNo || 999999);
        });

        // Build Excel
        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Defaulters');

        const thinBorder = { style: 'thin' };
        const allBorders = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };

        // Header rows
        const titleRow = ws.addRow(['DEFAULTERS REPORT']);
        titleRow.getCell(1).font = { bold: true, size: 14 };
        ws.addRow([`Department: ${dept?.name || 'N/A'}`]).font = { bold: true };
        ws.addRow([`Class: ${filterClassName}`]).font = { bold: true };
        ws.addRow([`Year: ${filterYear}`]).font = { bold: true };
        ws.addRow([]);

        // Table header
        const headerRow = ws.addRow(['Roll No', 'Student Name', 'Batch', 'Attendance %']);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true };
            cell.border = allBorders;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        });

        // Data rows
        for (const s of studentData) {
            const row = ws.addRow([s.rollNo, s.fullName, s.batch, `${s.overallPercentage}%`]);
            row.eachCell((cell, colNumber) => {
                cell.border = allBorders;
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                // Red highlight for below 75%
                if (colNumber === 4 && s.overallPercentage < 75) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
                    cell.font = { color: { argb: 'FF9C0006' }, bold: true };
                }
            });
        }

        // Column widths
        ws.getColumn(1).width = 10;
        ws.getColumn(2).width = 30;
        ws.getColumn(3).width = 15;
        ws.getColumn(4).width = 18;

        // Send
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Disposition', `attachment; filename="Defaulters_Report.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('HOD defaulters export error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
