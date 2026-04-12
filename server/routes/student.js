const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Class = require('../models/Class');
const Timetable = require('../models/Timetable');
const Attendance = require('../models/Attendance');
const Test = require('../models/Test');
const { FIXED_TEST_TYPES, calcFinalScore, buildTWBreakdown } = require('../utils/markCalculationService');
const TimeSlot = require('../models/TimeSlot');
const LeaveRequest = require('../models/LeaveRequest');
const Complaint = require('../models/Complaint');
const Subject = require('../models/Subject');
const AcademicSettings = require('../models/AcademicSettings');
const AssignmentMark = require('../models/AssignmentMark');
const SubjectConfig = require('../models/SubjectConfig');
const academicCalc = require('../utils/academicCalc');
const { auth } = require('../middleware/auth');
const { createNotification } = require('../utils/notificationUtils');

// Middleware to ensure student or parent access
const studentParentOnly = (req, res, next) => {
    const activeRole = req.activeRole || req.user.role;
    if (activeRole !== 'student' && activeRole !== 'parent') {
        return res.status(403).json({ message: 'Access denied. Student or Parent only.' });
    }

    // For students, use their own ID
    // For parents, use their linked child's ID
    if (activeRole === 'student') {
        req.studentId = req.user._id;
        req.studentClassId = req.user.classId;
    } else if (activeRole === 'parent') {
        if (!req.user.childUserId) {
            return res.status(400).json({ message: 'Parent account not linked to any student.' });
        }
        req.studentId = req.user.childUserId;
        // We'll fetch the student's classId when needed
        req.isParent = true;
    }

    next();
};

// Apply middleware to all routes
router.use(auth, studentParentOnly);

// ============================================
// DASHBOARD STATS
// ============================================

// @route   GET /api/student/stats
// @desc    Get student dashboard stats (attendance + test overview)
router.get('/stats', async (req, res) => {
    try {
        let studentId = req.studentId;
        let classId = req.studentClassId;

        // For parent, fetch student's classId
        if (req.isParent) {
            const student = await User.findById(studentId);
            if (!student) {
                return res.status(404).json({ message: 'Linked student not found' });
            }
            classId = student.classId;
        }

        if (!classId) {
            return res.status(400).json({ message: 'Student is not assigned to a class' });
        }

        // Get class info
        const classInfo = await Class.findById(classId).populate('departmentId');
        if (!classInfo) {
            return res.status(404).json({ message: 'Class not found' });
        }

        // Get all subjects for this class (from timetable entries)
        const timetableEntries = await Timetable.find({ classId }).distinct('subject');

        // Get academic settings for IA calculations
        const settings = await AcademicSettings.getSettings();

        // Calculate attendance stats per subject
        const attendanceStats = [];
        for (const subject of timetableEntries) {
            const attendanceRecords = await Attendance.find({
                classId,
                subject
            });

            let totalLectures = 0;
            let attended = 0;

            for (const record of attendanceRecords) {
                const studentRecord = record.records.find(
                    r => r.studentId.toString() === studentId.toString()
                );
                if (studentRecord) {
                    totalLectures++;
                    if (studentRecord.status === 'present') {
                        attended++;
                    }
                }
            }

            const percentage = academicCalc.calcAttendancePercent(attended, totalLectures);
            const eligible = academicCalc.isEligible(percentage, settings.minAttendancePercent);
            const classesNeeded = academicCalc.requiredClasses(totalLectures, attended, settings.minAttendancePercent);
            let status = 'good';
            if (percentage < 75) status = 'warning';
            if (percentage < 60) status = 'low';

            attendanceStats.push({
                subject,
                totalLectures,
                attended,
                percentage,
                status,
                eligible,
                classesNeeded
            });
        }

        // Calculate marks per subject (new system)
        const marksStats = [];
        for (const subject of timetableEntries) {
            const tests = await Test.find({ classId, subject });

            // Get test scores by type
            const getTestScore = (testType) => {
                const test = tests.find(t => t.testType === testType);
                if (!test) return null;
                const mark = test.marks.find(m => m.studentId.toString() === studentId.toString());
                return mark?.score ?? null;
            };

            const ia1 = getTestScore('IA1');
            const ia2 = getTestScore('IA2');
            const ese = getTestScore('ESE');
            const oralExam = getTestScore('Oral Exam');

            // Build TW from assignment/experiment data
            const experimentRecords = await AssignmentMark.find({ classId, subject, type: 'experiment' });
            const assignmentRecords = await AssignmentMark.find({ classId, subject, type: 'assignment' });
            const labAttRecords = await AssignmentMark.find({ classId, subject, type: 'lab_attendance' });
            const vivaRecords = await AssignmentMark.find({ classId, subject, type: 'internal_viva' });
            const config = await SubjectConfig.findOne({ classId, subject });

            const expScores = experimentRecords.map(em => {
                const sm = em.marks.find(m => m.studentId.toString() === studentId.toString());
                return sm?.score ?? null;
            }).filter(s => s !== null);
            const assignScores = assignmentRecords.map(am => {
                const sm = am.marks.find(m => m.studentId.toString() === studentId.toString());
                return sm?.score ?? null;
            }).filter(s => s !== null);

            let labAttScore = 0;
            if (labAttRecords.length > 0) {
                const sm = labAttRecords[0].marks.find(m => m.studentId.toString() === studentId.toString());
                labAttScore = sm?.score ?? 0;
            }
            let vivaScore = 0;
            if (vivaRecords.length > 0) {
                const sm = vivaRecords[0].marks.find(m => m.studentId.toString() === studentId.toString());
                vivaScore = sm?.score ?? 0;
            }

            const twData = buildTWBreakdown(
                expScores, config?.experimentMaxScore || 10,
                assignScores, config?.assignmentMaxScore || 10,
                labAttScore, vivaScore
            );

            // Get attendance for this subject
            const subjectAtt = attendanceStats.find(a => a.subject === subject);
            const attPercent = subjectAtt ? subjectAtt.percentage : 0;
            const attendanceMarks = academicCalc.calcAttendanceMarks(attPercent, settings.attendanceWeight, settings.attendanceSlabs);

            const marks = { ia1, ia2, ese, oralExam, tw: twData.total, twBreakdown: twData };
            const finalScore = calcFinalScore(marks, attPercent);

            marksStats.push({
                subject,
                ...finalScore,
                attendanceMarks,
                eligible: subjectAtt ? subjectAtt.eligible : false
            });
        }

        // Calculate test stats per subject
        const testStats = [];
        for (const subject of timetableEntries) {
            const tests = await Test.find({
                classId,
                subject
            }).sort({ date: -1 });

            // Get latest test for this student
            let latestTest = null;
            for (const test of tests) {
                const studentMark = test.marks.find(
                    m => m.studentId.toString() === studentId.toString()
                );
                if (studentMark && studentMark.score !== undefined) {
                    latestTest = {
                        testType: test.testType,
                        score: studentMark.score,
                        maxScore: test.maxScore,
                        date: test.date,
                        percentage: Math.round((studentMark.score / test.maxScore) * 100)
                    };
                    break;
                }
            }

            if (latestTest) {
                testStats.push({
                    subject,
                    ...latestTest
                });
            }
        }

        // Get today's timetable
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[new Date().getDay()];

        const todaysTimetable = await Timetable.find({
            classId,
            day: today
        })
            .populate('teacherId', 'fullName firstName lastName')
            .populate('timeSlotId')
            .populate('roomId')
            .sort({ 'timeSlotId.startTime': 1 });

        const formattedTimetable = todaysTimetable.map(entry => ({
            subject: entry.subject,
            teacher: entry.teacherId?.fullName || `${entry.teacherId?.firstName || ''} ${entry.teacherId?.lastName || ''}`.trim(),
            time: entry.timeSlotId ? `${entry.timeSlotId.startTime} - ${entry.timeSlotId.endTime}` : 'N/A',
            room: entry.roomId?.roomNumber || 'N/A',
            type: entry.type
        }));

        // Calculate overall attendance
        const overallAttendance = academicCalc.calcOverallAttendance(
            attendanceStats.map(s => ({ attended: s.attended, conducted: s.totalLectures }))
        );

        res.json({
            className: classInfo.name,
            year: classInfo.year,
            department: classInfo.departmentId?.name || 'N/A',
            attendanceStats,
            testStats,
            marksStats,
            overallAttendance,
            todaysTimetable: formattedTimetable
        });

    } catch (error) {
        console.error('Student stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// TIMETABLE
// ============================================

// @route   GET /api/student/timetable
// @desc    Get student's weekly timetable
router.get('/timetable', async (req, res) => {
    try {
        let classId = req.studentClassId;

        // For parent, fetch student's classId
        if (req.isParent) {
            const student = await User.findById(req.studentId);
            if (!student) {
                return res.status(404).json({ message: 'Linked student not found' });
            }
            classId = student.classId;
        }

        if (!classId) {
            return res.status(400).json({ message: 'Student is not assigned to a class' });
        }

        // Get current semester type
        const settings = await AcademicSettings.findOne();
        const semesterType = settings?.currentSemesterType || 'odd';
        const semesterFilter = semesterType === 'odd' ? [1, 3, 5, 7] : [2, 4, 6, 8];

        const timetable = await Timetable.find({ classId, semester: { $in: semesterFilter } })
            .populate('teacherId', 'fullName firstName lastName')
            .populate('timeSlotId')
            .populate('roomId')
            .populate('classId');

        // Return entries in a format compatible with the new timetable grid
        // (similar to how TeacherTimetable fetches data)
        res.json(timetable.map(entry => {
            // Resolve batch name from classId.batches subdocument
            let batchName = null;
            if (entry.batchId && entry.classId?.batches) {
                const batch = entry.classId.batches.find(b => b._id.toString() === entry.batchId.toString());
                if (batch) batchName = batch.name;
            }
            return {
                _id: entry._id,
                subject: entry.subject,
                teacher: entry.teacherId?.fullName || `${entry.teacherId?.firstName || ''} ${entry.teacherId?.lastName || ''}`.trim(),
                teacherId: entry.teacherId,
                day: entry.day,
                timeSlotId: entry.timeSlotId,
                room: entry.roomId?.roomNumber || 'N/A',
                roomId: entry.roomId,
                type: entry.type,
                batchId: entry.batchId || null,
                batchName: batchName
            };
        }));

    } catch (error) {
        console.error('Student timetable error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// ATTENDANCE
// ============================================

// @route   GET /api/student/attendance
// @desc    Get attendance summary per subject
router.get('/attendance', async (req, res) => {
    try {
        let studentId = req.studentId;
        let classId = req.studentClassId;

        if (req.isParent) {
            const student = await User.findById(studentId);
            if (!student) {
                return res.status(404).json({ message: 'Linked student not found' });
            }
            classId = student.classId;
        }

        if (!classId) {
            return res.status(400).json({ message: 'Student is not assigned to a class' });
        }

        // Get all subjects from timetable
        const subjects = await Timetable.find({ classId }).distinct('subject');

        // Get academic settings
        const settings = await AcademicSettings.getSettings();

        const attendanceSummary = [];
        for (const subject of subjects) {
            const attendanceRecords = await Attendance.find({
                classId,
                subject
            });

            let totalLectures = 0;
            let attended = 0;

            for (const record of attendanceRecords) {
                const studentRecord = record.records.find(
                    r => r.studentId.toString() === studentId.toString()
                );
                if (studentRecord) {
                    totalLectures++;
                    if (studentRecord.status === 'present') {
                        attended++;
                    }
                }
            }

            const percentage = academicCalc.calcAttendancePercent(attended, totalLectures);
            const eligible = academicCalc.isEligible(percentage, settings.minAttendancePercent);
            const classesNeeded = academicCalc.requiredClasses(totalLectures, attended, settings.minAttendancePercent);
            let status = 'good';
            if (percentage < 75) status = 'warning';
            if (percentage < 60) status = 'low';

            attendanceSummary.push({
                subject,
                totalLectures,
                attended,
                absent: totalLectures - attended,
                percentage,
                status,
                eligible,
                classesNeeded
            });
        }

        res.json({ attendanceSummary });

    } catch (error) {
        console.error('Student attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/student/attendance/:subject
// @desc    Get detailed attendance history for a subject
router.get('/attendance/:subject', async (req, res) => {
    try {
        let studentId = req.studentId;
        let classId = req.studentClassId;
        const { subject } = req.params;

        if (req.isParent) {
            const student = await User.findById(studentId);
            if (!student) {
                return res.status(404).json({ message: 'Linked student not found' });
            }
            classId = student.classId;
        }

        if (!classId) {
            return res.status(400).json({ message: 'Student is not assigned to a class' });
        }

        const attendanceRecords = await Attendance.find({
            classId,
            subject: decodeURIComponent(subject)
        })
            .populate('timeSlotId')
            .sort({ date: -1 });

        const history = [];
        for (const record of attendanceRecords) {
            const studentRecord = record.records.find(
                r => r.studentId.toString() === studentId.toString()
            );
            if (studentRecord) {
                history.push({
                    date: record.date,
                    timeSlot: record.timeSlotId ? `${record.timeSlotId.startTime} - ${record.timeSlotId.endTime}` : 'N/A',
                    status: studentRecord.status
                });
            }
        }

        res.json({ subject: decodeURIComponent(subject), history });

    } catch (error) {
        console.error('Student attendance detail error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// IA SUMMARY
// ============================================

// @route   GET /api/student/marks-summary
// @desc    Get full marks calculation breakdown per subject (new system)
router.get('/marks-summary', async (req, res) => {
    try {
        let studentId = req.studentId;
        let classId = req.studentClassId;

        if (req.isParent) {
            const student = await User.findById(studentId);
            if (!student) return res.status(404).json({ message: 'Linked student not found' });
            classId = student.classId;
        }

        if (!classId) return res.status(400).json({ message: 'Student is not assigned to a class' });

        const settings = await AcademicSettings.getSettings();
        const subjects = await Timetable.find({ classId }).distinct('subject');

        const marksSummary = [];
        for (const subject of subjects) {
            // Attendance
            const attendanceRecords = await Attendance.find({ classId, subject });
            let totalLectures = 0, attended = 0;
            for (const record of attendanceRecords) {
                const sr = record.records.find(r => r.studentId.toString() === studentId.toString());
                if (sr) { totalLectures++; if (sr.status === 'present') attended++; }
            }
            const attPercent = academicCalc.calcAttendancePercent(attended, totalLectures);
            const attendanceMarks = academicCalc.calcAttendanceMarks(attPercent, settings.attendanceWeight, settings.attendanceSlabs);

            // Tests
            const tests = await Test.find({ classId, subject });
            const getTestScore = (testType) => {
                const test = tests.find(t => t.testType === testType);
                if (!test) return null;
                const mark = test.marks.find(m => m.studentId.toString() === studentId.toString());
                return mark?.score ?? null;
            };

            const ia1 = getTestScore('IA1');
            const ia2 = getTestScore('IA2');
            const ese = getTestScore('ESE');
            const oralExam = getTestScore('Oral Exam');

            // TW data
            const experimentRecords = await AssignmentMark.find({ classId, subject, type: 'experiment' });
            const assignmentRecords = await AssignmentMark.find({ classId, subject, type: 'assignment' });
            const labAttRecords = await AssignmentMark.find({ classId, subject, type: 'lab_attendance' });
            const vivaRecords = await AssignmentMark.find({ classId, subject, type: 'internal_viva' });
            const config = await SubjectConfig.findOne({ classId, subject });

            const expScores = experimentRecords.map(em => {
                const sm = em.marks.find(m => m.studentId.toString() === studentId.toString());
                return sm?.score ?? null;
            }).filter(s => s !== null);
            const assignScores = assignmentRecords.map(am => {
                const sm = am.marks.find(m => m.studentId.toString() === studentId.toString());
                return sm?.score ?? null;
            }).filter(s => s !== null);

            let labAttScore = 0;
            if (labAttRecords.length > 0) {
                const sm = labAttRecords[0].marks.find(m => m.studentId.toString() === studentId.toString());
                labAttScore = sm?.score ?? 0;
            }
            let vivaScore = 0;
            if (vivaRecords.length > 0) {
                const sm = vivaRecords[0].marks.find(m => m.studentId.toString() === studentId.toString());
                vivaScore = sm?.score ?? 0;
            }

            const twData = buildTWBreakdown(
                expScores, config?.experimentMaxScore || 10,
                assignScores, config?.assignmentMaxScore || 10,
                labAttScore, vivaScore
            );

            const marks = { ia1, ia2, ese, oralExam, tw: twData.total, twBreakdown: twData };
            const finalScore = calcFinalScore(marks, attPercent);

            marksSummary.push({
                subject,
                ...finalScore,
                attendanceMarks,
                eligible: academicCalc.isEligible(attPercent, settings.minAttendancePercent),
                classesNeeded: academicCalc.requiredClasses(totalLectures, attended, settings.minAttendancePercent)
            });
        }

        res.json({ marksSummary, testTypes: FIXED_TEST_TYPES });
    } catch (error) {
        console.error('Student marks summary error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// TESTS
// ============================================

// @route   GET /api/student/tests
// @desc    Get test scores summary
router.get('/tests', async (req, res) => {
    try {
        let studentId = req.studentId;
        let classId = req.studentClassId;
        const { subject: filterSubject, testType: filterTestType } = req.query;

        if (req.isParent) {
            const student = await User.findById(studentId);
            if (!student) {
                return res.status(404).json({ message: 'Linked student not found' });
            }
            classId = student.classId;
        }

        if (!classId) {
            return res.status(400).json({ message: 'Student is not assigned to a class' });
        }

        // Build query
        const query = { classId };
        if (filterSubject) query.subject = filterSubject;
        if (filterTestType) query.testType = filterTestType;

        const tests = await Test.find(query).sort({ date: -1 });

        // Get unique subjects for filter dropdown
        const subjects = await Test.find({ classId }).distinct('subject');
        const testTypes = await Test.find({ classId }).distinct('testType');

        const testScores = [];
        for (const test of tests) {
            const studentMark = test.marks.find(
                m => m.studentId.toString() === studentId.toString()
            );

            testScores.push({
                _id: test._id,
                subject: test.subject,
                testType: test.testType,
                date: test.date,
                score: studentMark?.score ?? null,
                maxScore: test.maxScore,
                percentage: studentMark?.score !== undefined ? Math.round((studentMark.score / test.maxScore) * 100) : null
            });
        }

        res.json({
            testScores,
            filters: {
                subjects,
                testTypes
            }
        });

    } catch (error) {
        console.error('Student tests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/student/tests/:subject
// @desc    Get detailed test scores for a subject
router.get('/tests/:subject', async (req, res) => {
    try {
        let studentId = req.studentId;
        let classId = req.studentClassId;
        const { subject } = req.params;

        if (req.isParent) {
            const student = await User.findById(studentId);
            if (!student) {
                return res.status(404).json({ message: 'Linked student not found' });
            }
            classId = student.classId;
        }

        if (!classId) {
            return res.status(400).json({ message: 'Student is not assigned to a class' });
        }

        const tests = await Test.find({
            classId,
            subject: decodeURIComponent(subject)
        }).sort({ date: -1 });

        const testScores = tests.map(test => {
            const studentMark = test.marks.find(
                m => m.studentId.toString() === studentId.toString()
            );

            return {
                _id: test._id,
                testType: test.testType,
                date: test.date,
                score: studentMark?.score ?? null,
                maxScore: test.maxScore,
                percentage: studentMark?.score !== undefined ? Math.round((studentMark.score / test.maxScore) * 100) : null
            };
        });

        res.json({ subject: decodeURIComponent(subject), testScores });

    } catch (error) {
        console.error('Student tests detail error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// ASSIGNMENTS & EXPERIMENTS (view)
// ============================================

// @route   GET /api/student/assignments
// @desc    Get own assignment/experiment marks
router.get('/assignments', async (req, res) => {
    try {
        let studentId = req.studentId;
        let classId = req.studentClassId;
        if (req.isParent) {
            const student = await User.findById(studentId);
            if (!student) return res.status(404).json({ message: 'Linked student not found' });
            classId = student.classId;
        }
        if (!classId) return res.status(400).json({ message: 'Student is not assigned to a class' });

        const subjects = await Timetable.find({ classId }).distinct('subject');
        const result = [];
        for (const subject of subjects) {
            const config = await SubjectConfig.findOne({ classId, subject });
            const assignments = await AssignmentMark.find({ classId, subject, type: 'assignment' }).sort({ number: 1 });
            const experiments = await AssignmentMark.find({ classId, subject, type: 'experiment' }).sort({ number: 1 });

            const assignmentMarks = assignments.map(a => {
                const mark = a.marks.find(m => m.studentId.toString() === studentId.toString());
                return { number: a.number, maxScore: a.maxScore, score: mark?.score ?? null, percentage: mark?.score != null ? Math.round((mark.score / a.maxScore) * 100) : null };
            });
            const experimentMarks = experiments.map(e => {
                const mark = e.marks.find(m => m.studentId.toString() === studentId.toString());
                return { number: e.number, maxScore: e.maxScore, score: mark?.score ?? null, percentage: mark?.score != null ? Math.round((mark.score / e.maxScore) * 100) : null };
            });

            if (assignmentMarks.length > 0 || experimentMarks.length > 0 || (config?.totalAssignments > 0) || (config?.totalExperiments > 0)) {
                result.push({
                    subject,
                    totalAssignments: config?.totalAssignments || 0,
                    totalExperiments: config?.totalExperiments || 0,
                    assignmentMarks,
                    experimentMarks
                });
            }
        }
        res.json(result);
    } catch (error) {
        console.error('Student assignments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// LEAVE REQUESTS
// ============================================

// @route   GET /api/student/leave-requests
// @desc    Get leave request history
router.get('/leave-requests', async (req, res) => {
    try {
        // Use the actual user ID (student or parent) for leave requests
        const userId = req.user._id;

        const leaveRequests = await LeaveRequest.find({ userId })
            .populate('reviewedBy', 'fullName firstName lastName')
            .sort({ createdAt: -1 });

        res.json({
            leaveRequests: leaveRequests.map(lr => ({
                _id: lr._id,
                type: lr.type,
                startDate: lr.startDate,
                endDate: lr.endDate,
                reason: lr.reason,
                status: lr.status,
                reviewedBy: lr.reviewedBy?.fullName || (lr.reviewedBy ? `${lr.reviewedBy.firstName || ''} ${lr.reviewedBy.lastName || ''}`.trim() : null),
                reviewRemark: lr.reviewRemark,
                createdAt: lr.createdAt
            }))
        });

    } catch (error) {
        console.error('Student leave requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/student/leave-requests
// @desc    Submit new leave request
router.post('/leave-requests', async (req, res) => {
    try {
        const { type, startDate, endDate, reason } = req.body;

        if (!startDate || !endDate || !reason) {
            return res.status(400).json({ message: 'Please provide start date, end date, and reason' });
        }

        const leaveRequest = new LeaveRequest({
            userId: req.user._id, // Use actual user ID (student or parent)
            type: type || 'personal',
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason
        });

        await leaveRequest.save();

        res.status(201).json({
            message: 'Leave request submitted successfully',
            leaveRequest: {
                _id: leaveRequest._id,
                type: leaveRequest.type,
                startDate: leaveRequest.startDate,
                endDate: leaveRequest.endDate,
                reason: leaveRequest.reason,
                status: leaveRequest.status,
                createdAt: leaveRequest.createdAt
            }
        });

        // Notify CC about new leave request
        const studentUser = await User.findById(req.user._id);
        if (studentUser?.classId) {
            const studentClass = await Class.findById(studentUser.classId);
            if (studentClass?.coordinatorId) {
                createNotification(
                    studentClass.coordinatorId,
                    'leave_received',
                    'New Leave Request',
                    `${req.user.fullName} has submitted a leave request.`,
                    leaveRequest._id
                );
            }
        }

    } catch (error) {
        console.error('Submit leave request error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// COMPLAINTS
// ============================================

// @route   GET /api/student/complaints
// @desc    Get complaint history
router.get('/complaints', async (req, res) => {
    try {
        const userId = req.user._id;

        const complaints = await Complaint.find({ userId })
            .populate('resolvedBy', 'fullName firstName lastName')
            .sort({ createdAt: -1 });

        res.json({
            complaints: complaints.map(c => ({
                _id: c._id,
                subject: c.subject,
                description: c.description,
                category: c.category,
                status: c.status,
                remark: c.remark,
                resolvedBy: c.resolvedBy?.fullName || (c.resolvedBy ? `${c.resolvedBy.firstName || ''} ${c.resolvedBy.lastName || ''}`.trim() : null),
                resolvedAt: c.resolvedAt,
                createdAt: c.createdAt
            }))
        });

    } catch (error) {
        console.error('Student complaints error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/student/complaints
// @desc    Submit new complaint
router.post('/complaints', async (req, res) => {
    try {
        const { subject, description, category } = req.body;

        if (!subject || !description) {
            return res.status(400).json({ message: 'Please provide subject and description' });
        }

        const complaint = new Complaint({
            userId: req.user._id,
            subject,
            description,
            category: category || 'other'
        });

        await complaint.save();

        res.status(201).json({
            message: 'Complaint submitted successfully',
            complaint: {
                _id: complaint._id,
                subject: complaint.subject,
                description: complaint.description,
                category: complaint.category,
                status: complaint.status,
                createdAt: complaint.createdAt
            }
        });

        // Notify CC and HOD about new complaint
        const studentUser = await User.findById(req.user._id);
        if (studentUser?.classId) {
            const studentClass = await Class.findById(studentUser.classId);
            if (studentClass?.coordinatorId) {
                createNotification(
                    studentClass.coordinatorId,
                    'complaint_received',
                    'New Complaint Received',
                    `${req.user.fullName} has submitted a complaint: "${subject}"`,
                    complaint._id
                );
            }
            if (studentClass?.departmentId) {
                const hod = await User.findOne({ role: 'hod', departmentId: studentClass.departmentId });
                if (hod) {
                    createNotification(
                        hod._id,
                        'complaint_received',
                        'New Complaint Received',
                        `${req.user.fullName} has submitted a complaint: "${subject}"`,
                        complaint._id
                    );
                }
            }
        }

    } catch (error) {
        console.error('Submit complaint error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/student/profile
// @desc    Get student profile info (useful for parents to see linked student)
router.get('/profile', async (req, res) => {
    try {
        const student = await User.findById(req.studentId)
            .populate('classId')
            .populate('departmentId')
            .select('-password');

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json({
            student: {
                _id: student._id,
                fullName: student.fullName,
                firstName: student.firstName,
                lastName: student.lastName,
                username: student.username,
                email: student.email,
                phone: student.phone,
                className: student.classId?.name || 'N/A',
                year: student.classId?.year || student.year,
                department: student.departmentId?.name || 'N/A'
            },
            isParentView: req.isParent
        });

    } catch (error) {
        console.error('Student profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
