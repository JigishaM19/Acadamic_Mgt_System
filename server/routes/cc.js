const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Class = require('../models/Class');
const Timetable = require('../models/Timetable');
const Attendance = require('../models/Attendance');
const Test = require('../models/Test');
const TestType = require('../models/TestType');
const TimeSlot = require('../models/TimeSlot');
const LeaveRequest = require('../models/LeaveRequest');
const Complaint = require('../models/Complaint');
const Subject = require('../models/Subject');
const AcademicSettings = require('../models/AcademicSettings');
const academicCalc = require('../utils/academicCalc');
const { auth } = require('../middleware/auth');
const { createNotification } = require('../utils/notificationUtils');

// Middleware to ensure Class Coordinator access and get their assigned class
const ccOnly = async (req, res, next) => {
    try {
        if (req.user.role !== 'classcoordinator') {
            return res.status(403).json({ message: 'Access denied. Class Coordinators only.' });
        }

        // Find the class where this user is the coordinator
        const assignedClass = await Class.findOne({ coordinatorId: req.user._id })
            .populate('departmentId');

        if (!assignedClass) {
            return res.status(403).json({ message: 'No class assigned to this coordinator.' });
        }

        req.classId = assignedClass._id;
        req.assignedClass = assignedClass;
        next();
    } catch (error) {
        console.error('CC middleware error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Apply middleware to all routes
router.use(auth, ccOnly);

// ============================================
// DASHBOARD STATS
// ============================================

// @route   GET /api/cc/stats
// @desc    Get CC dashboard stats for assigned class
router.get('/stats', async (req, res) => {
    try {
        const classId = req.classId;

        // Get total students in class
        const totalStudents = await User.countDocuments({
            role: 'student',
            classId: classId
        });

        // Get all attendance records for this class
        const attendanceRecords = await Attendance.find({ classId });

        // Calculate overall attendance percentage
        let totalPresent = 0;
        let totalRecords = 0;
        attendanceRecords.forEach(record => {
            totalPresent += record.presentCount || 0;
            totalRecords += record.totalCount || 0;
        });
        const overallAttendance = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

        // Get all tests for this class
        const tests = await Test.find({ classId });

        // Calculate overall test performance
        let totalScore = 0;
        let totalMaxScore = 0;
        tests.forEach(test => {
            test.marks.forEach(mark => {
                if (mark.score !== undefined && mark.score !== null) {
                    totalScore += mark.score;
                    totalMaxScore += test.maxScore;
                }
            });
        });
        const overallTestPerformance = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

        // Get subject-wise data
        const subjects = await Subject.find({
            $or: [
                { classId: classId },
                { year: req.assignedClass.year, departmentId: req.assignedClass.departmentId }
            ]
        });

        // Also get subjects from timetable
        const timetableEntries = await Timetable.find({ classId }).distinct('subject');

        // Combine unique subjects
        const allSubjects = [...new Set([
            ...subjects.map(s => s.name),
            ...timetableEntries
        ])];

        const subjectStats = [];
        for (const subjectName of allSubjects) {
            // Get attendance for this subject
            const subjectAttendance = attendanceRecords.filter(r => r.subject === subjectName);
            let subjPresent = 0;
            let subjTotal = 0;
            subjectAttendance.forEach(record => {
                subjPresent += record.presentCount || 0;
                subjTotal += record.totalCount || 0;
            });
            const avgAttendance = subjTotal > 0 ? Math.round((subjPresent / subjTotal) * 100) : 0;

            // Get tests for this subject
            const subjectTests = tests.filter(t => t.subject === subjectName);
            let subjScore = 0;
            let subjMaxScore = 0;
            subjectTests.forEach(test => {
                test.marks.forEach(mark => {
                    if (mark.score !== undefined && mark.score !== null) {
                        subjScore += mark.score;
                        subjMaxScore += test.maxScore;
                    }
                });
            });
            const avgTestScore = subjMaxScore > 0 ? Math.round((subjScore / subjMaxScore) * 100) : 0;

            // Determine status
            let status = 'good';
            if (avgAttendance < 60 || avgTestScore < 50) status = 'low';
            else if (avgAttendance < 75 || avgTestScore < 65) status = 'warning';

            subjectStats.push({
                subject: subjectName,
                avgAttendance,
                avgTestScore,
                totalLectures: subjectAttendance.length,
                totalTests: subjectTests.length,
                status
            });
        }

        // Get pending leave requests count
        const students = await User.find({ role: 'student', classId }).select('_id');
        const studentIds = students.map(s => s._id);

        const pendingLeaves = await LeaveRequest.countDocuments({
            userId: { $in: studentIds },
            status: 'pending'
        });

        // Get open complaints count
        const openComplaints = await Complaint.countDocuments({
            userId: { $in: studentIds },
            status: 'open'
        });

        // Calculate at-risk students
        const settings = await AcademicSettings.getSettings();
        const allStudents = await User.find({ role: 'student', classId })
            .select('fullName username');
        const timetableSubjects = await Timetable.find({ classId }).distinct('subject');
        const allAttendance = await Attendance.find({ classId });
        const allTests = await Test.find({ classId });

        const atRiskStudents = [];
        for (const student of allStudents) {
            const sid = student._id.toString();
            for (const subj of timetableSubjects) {
                // Calculate attendance for this subject
                const subjRecords = allAttendance.filter(r => r.subject === subj);
                let total = 0, attended = 0;
                for (const record of subjRecords) {
                    const sr = record.records.find(r => r.studentId.toString() === sid);
                    if (sr) { total++; if (sr.status === 'present') attended++; }
                }
                const attPercent = academicCalc.calcAttendancePercent(attended, total);

                if (attPercent < settings.minAttendancePercent && total > 0) {
                    // Calculate IA for this student-subject
                    const subjTests = allTests.filter(t => t.subject === subj);
                    const utScores = [], assignScores = [];
                    let utMax = 20, assignMax = 0;
                    for (const test of subjTests) {
                        const sm = test.marks.find(m => m.studentId.toString() === sid);
                        const score = sm?.score;
                        const tl = (test.testType || '').toLowerCase();
                        if (tl.includes('ut') || tl.includes('unit test')) {
                            if (score != null) utScores.push(score);
                            utMax = test.maxScore;
                        } else if (tl.includes('assignment')) {
                            if (score != null) assignScores.push(score);
                            assignMax = Math.max(assignMax, test.maxScore);
                        }
                    }
                    const utIA = academicCalc.calcUTIA(utScores, utMax, settings.utWeight);
                    const assignIA = assignScores.length > 0
                        ? academicCalc.calcAssignmentIA(assignScores.reduce((a, b) => a + b, 0) / assignScores.length, assignMax, settings.assignmentWeight) : 0;
                    const attIA = academicCalc.calcAttendanceIA(attPercent, settings.attendanceWeight, settings.attendanceSlabs);
                    const totalIA = academicCalc.calcTotalIA(utIA, assignIA, attIA);

                    atRiskStudents.push({
                        studentId: student._id,
                        fullName: student.fullName,
                        username: student.username,
                        subject: subj,
                        attendancePercent: attPercent,
                        totalIA,
                        iaTotal: settings.iaTotal,
                        classesNeeded: academicCalc.requiredClasses(total, attended, settings.minAttendancePercent),
                        status: attPercent < 60 ? 'critical' : 'warning'
                    });
                }
            }
        }

        res.json({
            className: req.assignedClass.name,
            year: req.assignedClass.year,
            department: req.assignedClass.departmentId?.name || 'N/A',
            totalStudents,
            overallAttendance,
            overallTestPerformance,
            subjectStats,
            pendingLeaves,
            openComplaints,
            atRiskStudents
        });
    } catch (error) {
        console.error('CC stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// TIMETABLE
// ============================================

// @route   GET /api/cc/timetable
// @desc    Get class timetable (read-only)
router.get('/timetable', async (req, res) => {
    try {
        const AcademicSettings = require('../models/AcademicSettings');

        // Get current semester type
        const settings = await AcademicSettings.findOne();
        const semesterType = settings?.currentSemesterType || 'odd';
        const semesterFilter = semesterType === 'odd' ? [1, 3, 5, 7] : [2, 4, 6, 8];

        const timetable = await Timetable.find({ classId: req.classId, semester: { $in: semesterFilter } })
            .populate('teacherId', 'fullName firstName lastName')
            .populate('roomId', 'roomNumber roomType')
            .populate('timeSlotId')
            .populate('classId');

        // Get all time slots for proper ordering
        const timeSlots = await TimeSlot.find().sort({ startTime: 1 });

        res.json({ timetable, timeSlots });
    } catch (error) {
        console.error('CC timetable error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// ATTENDANCE
// ============================================

// @route   GET /api/cc/attendance
// @desc    Get attendance overview for the class (batch-aware)
router.get('/attendance', async (req, res) => {
    try {
        const classId = req.classId;
        const classDoc = await Class.findById(classId).populate('departmentId');

        // Get all timetable entries for this class to know which subjects and batches exist
        const timetableEntries = await Timetable.find({ classId });

        // Group by subject + batchId
        const subjectBatchMap = new Map();
        for (const entry of timetableEntries) {
            const batchKey = entry.batchId ? entry.batchId.toString() : 'all';
            const key = `${entry.subject}-${batchKey}`;
            if (!subjectBatchMap.has(key)) {
                subjectBatchMap.set(key, {
                    subject: entry.subject,
                    batchId: entry.batchId || null
                });
            }
        }

        const attendanceData = [];
        for (const [key, data] of subjectBatchMap) {
            let studentCount;
            let batchName = null;

            if (data.batchId) {
                const batch = (classDoc?.batches || []).find(b => b._id.toString() === data.batchId.toString());
                studentCount = batch ? batch.studentIds.length : 0;
                batchName = batch ? batch.name : 'Unknown Batch';
            } else {
                studentCount = await User.countDocuments({ role: 'student', classId });
            }

            // Get attendance records for this subject + batch
            const attendanceFilter = { classId, subject: data.subject };
            if (data.batchId) {
                attendanceFilter.batchId = data.batchId;
            } else {
                attendanceFilter.$or = [{ batchId: null }, { batchId: { $exists: false } }];
            }

            const records = await Attendance.find(attendanceFilter);
            const totalLectures = records.length;
            let totalPresent = 0;
            let totalRecords = 0;
            for (const rec of records) {
                totalPresent += rec.presentCount || 0;
                totalRecords += rec.totalCount || 0;
            }
            const avgAttendance = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

            // Last attendance
            const lastAttendance = await Attendance.findOne(attendanceFilter).sort({ date: -1 });

            attendanceData.push({
                subject: data.subject,
                batchId: data.batchId || null,
                batchName,
                totalStudents: studentCount,
                totalLectures,
                avgAttendance,
                status: avgAttendance >= 75 ? 'good' : avgAttendance >= 60 ? 'warning' : 'low',
                lastAttendanceDate: lastAttendance?.date || null
            });
        }

        res.json(attendanceData);
    } catch (error) {
        console.error('CC attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/cc/attendance/:subject
// @desc    Get detailed attendance records for a subject (batch-aware)
router.get('/attendance/:subject', async (req, res) => {
    try {
        const { subject } = req.params;
        const { batchId } = req.query;
        const classId = req.classId;

        let students;
        let batchInfo = null;
        const classDoc = await Class.findById(classId);

        if (batchId) {
            // Get batch students only
            const batch = classDoc?.batches?.find(b => b._id.toString() === batchId);
            if (batch) {
                batchInfo = { _id: batch._id, name: batch.name };
                students = await User.find({
                    _id: { $in: batch.studentIds },
                    role: 'student'
                }).select('fullName firstName lastName username').sort({ fullName: 1 });
            } else {
                students = [];
            }
        } else {
            // Get all students in this class
            students = await User.find({
                role: 'student',
                classId
            }).select('fullName firstName lastName username').sort({ fullName: 1 });
        }

        // Get attendance records filtered by batchId
        const attendanceFilter = { classId, subject };
        if (batchId) {
            attendanceFilter.batchId = batchId;
        } else {
            attendanceFilter.$or = [{ batchId: null }, { batchId: { $exists: false } }];
        }

        const records = await Attendance.find(attendanceFilter)
            .populate('timeSlotId')
            .sort({ date: -1 });

        // Get time slots
        const timeSlots = await TimeSlot.find();

        res.json({
            students,
            records,
            timeSlots,
            batchInfo,
            batches: classDoc?.batches || []
        });
    } catch (error) {
        console.error('CC attendance detail error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/cc/attendance/:id
// @desc    Update attendance record
router.put('/attendance/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { records } = req.body;

        const attendance = await Attendance.findById(id);
        if (!attendance) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }

        // Verify this attendance belongs to CC's class
        if (attendance.classId.toString() !== req.classId.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Update records
        attendance.records = records;

        // Recalculate counts
        let presentCount = 0;
        let absentCount = 0;
        records.forEach(r => {
            if (r.status === 'present' || r.status === 'late') presentCount++;
            else absentCount++;
        });

        attendance.presentCount = presentCount;
        attendance.absentCount = absentCount;
        attendance.totalCount = records.length;

        await attendance.save();

        res.json(attendance);
    } catch (error) {
        console.error('CC attendance update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// TESTS
// ============================================

// @route   GET /api/cc/tests
// @desc    Get test overview for the class
router.get('/tests', async (req, res) => {
    try {
        const classId = req.classId;

        // Get all tests for this class
        const tests = await Test.find({ classId }).sort({ date: -1 });

        // Group by subject
        const subjectMap = new Map();
        tests.forEach(test => {
            const subject = test.subject;
            if (!subjectMap.has(subject)) {
                subjectMap.set(subject, {
                    subject,
                    totalTests: 0,
                    totalScore: 0,
                    totalMaxScore: 0
                });
            }
            const data = subjectMap.get(subject);
            data.totalTests++;
            test.marks.forEach(mark => {
                if (mark.score !== undefined && mark.score !== null) {
                    data.totalScore += mark.score;
                    data.totalMaxScore += test.maxScore;
                }
            });
        });

        const testData = [];
        for (const [subject, data] of subjectMap) {
            const avgScore = data.totalMaxScore > 0
                ? Math.round((data.totalScore / data.totalMaxScore) * 100)
                : 0;

            testData.push({
                subject,
                totalTests: data.totalTests,
                avgScore,
                status: avgScore >= 70 ? 'good' : avgScore >= 50 ? 'warning' : 'low'
            });
        }

        res.json(testData);
    } catch (error) {
        console.error('CC tests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/cc/tests/:subject
// @desc    Get detailed test records for a subject
router.get('/tests/:subject', async (req, res) => {
    try {
        const { subject } = req.params;
        const classId = req.classId;

        // Get students in this class
        const students = await User.find({
            role: 'student',
            classId
        }).select('fullName firstName lastName username').sort({ fullName: 1 });

        // Get test records for this subject
        const tests = await Test.find({
            classId,
            subject
        }).sort({ date: -1 });

        // Get test types
        const testTypes = await TestType.find();

        res.json({ students, tests, testTypes });
    } catch (error) {
        console.error('CC tests detail error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/cc/tests/:id
// @desc    Update test scores
router.put('/tests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { marks } = req.body;

        const test = await Test.findById(id);
        if (!test) {
            return res.status(404).json({ message: 'Test record not found' });
        }

        // Verify this test belongs to CC's class
        if (test.classId.toString() !== req.classId.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Validate scores
        for (const mark of marks) {
            if (mark.score !== undefined && mark.score !== null) {
                if (mark.score < 0 || mark.score > test.maxScore) {
                    return res.status(400).json({
                        message: `Score must be between 0 and ${test.maxScore}`
                    });
                }
            }
        }

        // Update marks
        test.marks = marks;
        await test.save();

        res.json(test);
    } catch (error) {
        console.error('CC test update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// STUDENTS
// ============================================

// @route   GET /api/cc/students
// @desc    Get all students in the class (read-only)
router.get('/students', async (req, res) => {
    try {
        const students = await User.find({
            role: 'student',
            classId: req.classId
        })
            .populate('classId', 'name year')
            .populate('departmentId', 'name')
            .select('fullName firstName lastName username phone email classId departmentId')
            .sort({ fullName: 1 });

        res.json(students);
    } catch (error) {
        console.error('CC students error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// LEAVE REQUESTS
// ============================================

// @route   GET /api/cc/leave-requests
// @desc    Get leave requests (own + class students)
router.get('/leave-requests', async (req, res) => {
    try {
        // Get class students
        const students = await User.find({
            role: 'student',
            classId: req.classId
        }).select('_id');
        const studentIds = students.map(s => s._id);

        // Get all leave requests (CC's own + students)
        const leaveRequests = await LeaveRequest.find({
            $or: [
                { userId: req.user._id },
                { userId: { $in: studentIds } }
            ]
        })
            .populate('userId', 'fullName firstName lastName role')
            .populate('reviewedBy', 'fullName')
            .sort({ createdAt: -1 });

        res.json(leaveRequests);
    } catch (error) {
        console.error('CC leave requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/cc/leave-requests
// @desc    Submit own leave request
router.post('/leave-requests', async (req, res) => {
    try {
        const { type, startDate, endDate, reason } = req.body;

        const leaveRequest = new LeaveRequest({
            userId: req.user._id,
            type,
            startDate,
            endDate,
            reason
        });

        await leaveRequest.save();
        await leaveRequest.populate('userId', 'fullName firstName lastName role');

        res.status(201).json(leaveRequest);
    } catch (error) {
        console.error('CC leave request create error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/cc/leave-requests/:id/status
// @desc    Approve/Reject student leave request
router.put('/leave-requests/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reviewRemark } = req.body;

        const leaveRequest = await LeaveRequest.findById(id).populate('userId');
        if (!leaveRequest) {
            return res.status(404).json({ message: 'Leave request not found' });
        }

        // Verify this is a student from CC's class (not CC's own request)
        if (leaveRequest.userId._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'Cannot approve your own leave request' });
        }

        // Verify student belongs to CC's class
        const student = await User.findById(leaveRequest.userId._id);
        if (!student || student.classId?.toString() !== req.classId.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        leaveRequest.status = status;
        leaveRequest.reviewedBy = req.user._id;
        leaveRequest.reviewedAt = new Date();
        if (reviewRemark) leaveRequest.reviewRemark = reviewRemark;

        await leaveRequest.save();
        await leaveRequest.populate('userId', 'fullName firstName lastName role');
        await leaveRequest.populate('reviewedBy', 'fullName');

        res.json(leaveRequest);

        // Notify student about leave request status
        const statusText = status === 'approved' ? 'approved' : 'rejected';
        createNotification(
            leaveRequest.userId._id,
            status === 'approved' ? 'leave_approved' : 'leave_rejected',
            `Leave Request ${statusText}`,
            `Your leave request has been ${statusText} by ${req.user.fullName}.`,
            leaveRequest._id
        );
    } catch (error) {
        console.error('CC leave request status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// COMPLAINTS
// ============================================

// @route   GET /api/cc/complaints
// @desc    Get complaints (own + class students)
router.get('/complaints', async (req, res) => {
    try {
        // Get class students
        const students = await User.find({
            role: 'student',
            classId: req.classId
        }).select('_id');
        const studentIds = students.map(s => s._id);

        // Get all complaints (CC's own + students)
        const complaints = await Complaint.find({
            $or: [
                { userId: req.user._id },
                { userId: { $in: studentIds } }
            ]
        })
            .populate('userId', 'fullName firstName lastName role')
            .populate('resolvedBy', 'fullName')
            .sort({ createdAt: -1 });

        res.json(complaints);
    } catch (error) {
        console.error('CC complaints error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/cc/complaints
// @desc    Submit own complaint
router.post('/complaints', async (req, res) => {
    try {
        const { subject, description, category } = req.body;

        const complaint = new Complaint({
            userId: req.user._id,
            subject,
            description,
            category
        });

        await complaint.save();
        await complaint.populate('userId', 'fullName firstName lastName role');

        res.status(201).json(complaint);
    } catch (error) {
        console.error('CC complaint create error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/cc/complaints/:id/resolve
// @desc    Resolve student complaint
router.put('/complaints/:id/resolve', async (req, res) => {
    try {
        const { id } = req.params;
        const { remark } = req.body;

        const complaint = await Complaint.findById(id).populate('userId');
        if (!complaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        // Verify student belongs to CC's class
        const user = await User.findById(complaint.userId._id);
        if (user.role === 'student' && user.classId?.toString() !== req.classId.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        complaint.status = 'resolved';
        complaint.resolvedBy = req.user._id;
        complaint.resolvedAt = new Date();
        if (remark) complaint.remark = remark;

        await complaint.save();
        await complaint.populate('userId', 'fullName firstName lastName role');
        await complaint.populate('resolvedBy', 'fullName');

        res.json(complaint);

        // Notify student about complaint resolution
        createNotification(
            complaint.userId._id,
            'complaint_resolved',
            'Complaint Resolved',
            `Your complaint "${complaint.subject}" has been resolved by ${req.user.fullName}.`,
            complaint._id
        );
    } catch (error) {
        console.error('CC complaint resolve error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
