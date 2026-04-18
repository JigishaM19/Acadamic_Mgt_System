const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const User = require('../models/User');
const Class = require('../models/Class');
const Timetable = require('../models/Timetable');
const Attendance = require('../models/Attendance');
const Test = require('../models/Test');
const { FIXED_TEST_TYPES, calcFinalScore } = require('../utils/markCalculationService');
const TimeSlot = require('../models/TimeSlot');
const LeaveRequest = require('../models/LeaveRequest');
const Complaint = require('../models/Complaint');
const AcademicSettings = require('../models/AcademicSettings');
const AssignmentMark = require('../models/AssignmentMark');
const SubjectConfig = require('../models/SubjectConfig');
const academicCalc = require('../utils/academicCalc');
const { auth } = require('../middleware/auth');
const { createNotification } = require('../utils/notificationUtils');

const upload = multer({ storage: multer.memoryStorage() });

// Middleware to ensure teacher access
const teacherOnly = async (req, res, next) => {
    try {
        const activeRole = req.activeRole || req.user.role;
        if (!req.user || (activeRole !== 'teacher' && activeRole !== 'classcoordinator')) {
            return res.status(403).json({ message: 'Access denied. Teachers only.' });
        }
        req.teacherId = req.user._id;
        next();
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Apply teacher middleware to all routes
router.use(auth, teacherOnly);

// ============================================
// DASHBOARD STATS
// ============================================

// @route   GET /api/teacher/stats
// @desc    Get teacher dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const teacherId = req.teacherId;

        // Get teacher's timetable entries to find assigned classes
        const timetableEntries = await Timetable.find({ teacherId })
            .populate('classId')
            .populate('timeSlotId');

        // Group by class and subject
        const classSubjectMap = new Map();
        for (const entry of timetableEntries) {
            if (!entry.classId) continue;
            const key = `${entry.classId._id}-${entry.subject}`;
            if (!classSubjectMap.has(key)) {
                classSubjectMap.set(key, {
                    classId: entry.classId._id,
                    className: entry.classId.name,
                    year: entry.classId.year,
                    subject: entry.subject,
                    departmentId: entry.classId.departmentId
                });
            }
        }

        // Calculate stats for each class-subject combination
        const classStats = [];
        for (const [key, data] of classSubjectMap) {
            // Get student count for this class
            const studentCount = await User.countDocuments({
                role: 'student',
                classId: data.classId
            });

            // Get attendance records for this class-subject
            const attendanceRecords = await Attendance.find({
                classId: data.classId,
                subject: data.subject,
                teacherId: teacherId
            });

            let totalPresent = 0;
            let totalRecords = 0;
            for (const record of attendanceRecords) {
                for (const r of record.records) {
                    totalRecords++;
                    if (r.status === 'present') totalPresent++;
                }
            }

            const avgAttendance = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

            let status = 'good';
            if (avgAttendance < 75) status = 'warning';
            if (avgAttendance < 60) status = 'low';

            // Get department name
            const classDoc = await Class.findById(data.classId).populate('departmentId');
            const departmentName = classDoc?.departmentId?.name || 'N/A';

            classStats.push({
                classId: data.classId,
                className: data.className,
                year: data.year,
                department: departmentName,
                subject: data.subject,
                totalStudents: studentCount,
                avgAttendance,
                status
            });
        }

        // Get pending leave requests count
        const pendingLeaves = await LeaveRequest.countDocuments({
            userId: teacherId,
            status: 'pending'
        });

        // Get open complaints count
        const openComplaints = await Complaint.countDocuments({
            userId: teacherId,
            status: 'open'
        });

        res.json({
            classStats,
            totalClasses: classStats.length,
            pendingLeaves,
            openComplaints
        });
    } catch (error) {
        console.error('Teacher stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/teacher/current-lecture
// @desc    Get current ongoing lecture for teacher
router.get('/current-lecture', async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const now = new Date();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = days[now.getDay()];
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

        // Get all time slots
        const timeSlots = await TimeSlot.find({ type: { $ne: 'break' } });

        // Find current time slot
        let currentTimeSlot = null;
        for (const slot of timeSlots) {
            if (slot.startTime <= currentTime && slot.endTime > currentTime) {
                currentTimeSlot = slot;
                break;
            }
        }

        if (!currentTimeSlot) {
            return res.json({ currentLecture: null });
        }

        // Find teacher's lecture at current time
        const currentLecture = await Timetable.findOne({
            teacherId,
            day: currentDay,
            timeSlotId: currentTimeSlot._id
        })
            .populate('classId')
            .populate('timeSlotId')
            .populate('roomId');

        if (!currentLecture) {
            return res.json({ currentLecture: null });
        }

        // Check if attendance already taken for today
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        const existingAttendance = await Attendance.findOne({
            classId: currentLecture.classId._id,
            subject: currentLecture.subject,
            teacherId,
            timeSlotId: currentTimeSlot._id,
            date: { $gte: todayStart, $lte: todayEnd }
        });

        res.json({
            currentLecture: {
                _id: currentLecture._id,
                classId: currentLecture.classId._id,
                className: currentLecture.classId.name,
                year: currentLecture.classId.year,
                subject: currentLecture.subject,
                room: currentLecture.roomId?.roomNumber || 'N/A',
                type: currentLecture.type,
                timeSlot: {
                    _id: currentTimeSlot._id,
                    label: currentTimeSlot.label,
                    startTime: currentTimeSlot.startTime,
                    endTime: currentTimeSlot.endTime
                },
                attendanceTaken: !!existingAttendance
            }
        });
    } catch (error) {
        console.error('Current lecture error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// TIMETABLE
// ============================================

// @route   GET /api/teacher/timetable
// @desc    Get teacher's weekly timetable
router.get('/timetable', async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const AcademicSettings = require('../models/AcademicSettings');

        // Get current semester type
        const settings = await AcademicSettings.findOne();
        const semesterType = settings?.currentSemesterType || 'odd';

        // Filter: odd semesters are 1,3,5,7; even are 2,4,6,8
        const semesterFilter = semesterType === 'odd' ? [1, 3, 5, 7] : [2, 4, 6, 8];

        const timetable = await Timetable.find({ teacherId, semester: { $in: semesterFilter } })
            .populate({ path: 'classId', populate: { path: 'departmentId' } })
            .populate('timeSlotId')
            .populate('roomId')
            .sort({ day: 1 });

        res.json(timetable);
    } catch (error) {
        console.error('Teacher timetable error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// ATTENDANCE
// ============================================

// @route   GET /api/teacher/attendance
// @desc    Get attendance overview for teacher's classes
router.get('/attendance', async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const { classId, subject } = req.query;

        // Get teacher's timetable entries
        const timetableFilter = { teacherId };
        if (classId) timetableFilter.classId = classId;

        const timetableEntries = await Timetable.find(timetableFilter)
            .populate('classId')
            .populate('timeSlotId');

        // Group by class, subject, and batchId
        const classSubjectMap = new Map();
        for (const entry of timetableEntries) {
            if (!entry.classId) continue;
            if (subject && entry.subject !== subject) continue;

            const batchKey = entry.batchId ? entry.batchId.toString() : 'all';
            const key = `${entry.classId._id}-${entry.subject}-${batchKey}`;
            if (!classSubjectMap.has(key)) {
                classSubjectMap.set(key, {
                    classId: entry.classId._id,
                    className: entry.classId.name,
                    year: entry.classId.year,
                    departmentId: entry.classId.departmentId,
                    subject: entry.subject,
                    batchId: entry.batchId || null,
                    batches: entry.classId.batches || []
                });
            }
        }

        // Get attendance data for each class-subject-batch
        const attendanceData = [];
        for (const [key, data] of classSubjectMap) {
            let studentCount;
            let batchName = null;

            if (data.batchId) {
                // Find batch in class to get student count and name
                const batch = data.batches.find(b => b._id.toString() === data.batchId.toString());
                studentCount = batch ? batch.studentIds.length : 0;
                batchName = batch ? batch.name : 'Unknown Batch';
            } else {
                studentCount = await User.countDocuments({
                    role: 'student',
                    classId: data.classId
                });
            }

            // Get last attendance record
            const attendanceFilter = {
                classId: data.classId,
                subject: data.subject,
                teacherId
            };
            if (data.batchId) {
                attendanceFilter.batchId = data.batchId;
            } else {
                attendanceFilter.batchId = null;
            }
            const lastAttendance = await Attendance.findOne(attendanceFilter).sort({ date: -1 });

            // Get department name
            const classDoc = await Class.findById(data.classId).populate('departmentId');

            attendanceData.push({
                classId: data.classId,
                className: data.className,
                year: data.year,
                department: classDoc?.departmentId?.name || 'N/A',
                subject: data.subject,
                batchId: data.batchId || null,
                batchName,
                totalStudents: studentCount,
                lastAttendanceDate: lastAttendance?.date || null
            });
        }

        res.json(attendanceData);
    } catch (error) {
        console.error('Teacher attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/teacher/attendance/:classId/:subject
// @desc    Get attendance sheet for specific class and subject
router.get('/attendance/:classId/:subject', async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const { classId, subject } = req.params;
        const { batchId } = req.query;

        // Verify teacher teaches this class-subject
        const timetableEntry = await Timetable.findOne({
            teacherId,
            classId,
            subject
        });

        if (!timetableEntry) {
            return res.status(403).json({ message: 'You do not teach this class-subject combination' });
        }

        let students;
        let batchInfo = null;

        if (batchId) {
            // Get batch students only
            const classDoc = await Class.findById(classId);
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
        const attendanceFilter = {
            classId,
            subject,
            teacherId
        };
        if (batchId) {
            attendanceFilter.batchId = batchId;
        } else {
            attendanceFilter.$or = [{ batchId: null }, { batchId: { $exists: false } }];
        }

        const attendanceRecords = await Attendance.find(attendanceFilter)
            .populate('timeSlotId')
            .sort({ date: -1 });

        // Get class details
        const classDoc = await Class.findById(classId).populate('departmentId');

        res.json({
            classInfo: {
                classId,
                className: classDoc?.name || 'N/A',
                year: classDoc?.year,
                department: classDoc?.departmentId?.name || 'N/A',
                subject
            },
            batchInfo,
            batches: classDoc?.batches || [],
            students,
            attendanceRecords
        });
    } catch (error) {
        console.error('Attendance sheet error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/teacher/attendance
// @desc    Create new attendance record
router.post('/attendance', async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const { classId, subject, date, timeSlotId, records, batchId } = req.body;

        // Verify teacher teaches this class-subject
        const timetableEntry = await Timetable.findOne({
            teacherId,
            classId,
            subject
        });

        if (!timetableEntry) {
            return res.status(403).json({ message: 'You do not teach this class-subject combination' });
        }

        // Check for duplicate attendance
        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);
        const endOfDay = new Date(attendanceDate);
        endOfDay.setHours(23, 59, 59, 999);

        const duplicateFilter = {
            classId,
            subject,
            timeSlotId,
            date: { $gte: attendanceDate, $lte: endOfDay }
        };
        if (batchId) {
            duplicateFilter.batchId = batchId;
        } else {
            duplicateFilter.$or = [{ batchId: null }, { batchId: { $exists: false } }];
        }

        const existingAttendance = await Attendance.findOne(duplicateFilter);

        if (existingAttendance) {
            return res.status(400).json({ message: 'Attendance already exists for this class, subject, date, and time slot' });
        }

        // Calculate counts
        const presentCount = records.filter(r => r.status === 'present').length;
        const absentCount = records.filter(r => r.status === 'absent').length;

        const attendance = new Attendance({
            classId,
            subject,
            teacherId,
            batchId: batchId || null,
            timeSlotId,
            date: attendanceDate,
            records,
            presentCount,
            absentCount,
            totalCount: records.length,
            createdBy: teacherId
        });

        await attendance.save();
        res.status(201).json(attendance);
    } catch (error) {
        console.error('Create attendance error:', error);
        if (error.code === 11000) {
            return res.status(400).json({
                message: 'Attendance already exists for this class, subject, date, and time slot. Please choose a different time slot or edit the existing record.'
            });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/teacher/attendance/:id
// @desc    Update attendance record
router.put('/attendance/:id', async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const { records } = req.body;

        const attendance = await Attendance.findOne({
            _id: req.params.id,
            teacherId
        });

        if (!attendance) {
            return res.status(404).json({ message: 'Attendance record not found or access denied' });
        }

        // Update records and counts
        const presentCount = records.filter(r => r.status === 'present').length;
        const absentCount = records.filter(r => r.status === 'absent').length;

        attendance.records = records;
        attendance.presentCount = presentCount;
        attendance.absentCount = absentCount;
        attendance.totalCount = records.length;

        await attendance.save();
        res.json(attendance);
    } catch (error) {
        console.error('Update attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/teacher/attendance/:id
// @desc    Delete attendance record
router.delete('/attendance/:id', async (req, res) => {
    try {
        const teacherId = req.teacherId;

        const attendance = await Attendance.findOneAndDelete({
            _id: req.params.id,
            teacherId
        });

        if (!attendance) {
            return res.status(404).json({ message: 'Attendance record not found or access denied' });
        }

        res.json({ message: 'Attendance record deleted' });
    } catch (error) {
        console.error('Delete attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/teacher/attendance/:classId/:subject/export
// @desc    Export attendance sheet as Excel file
router.get('/attendance/:classId/:subject/export', async (req, res) => {
    try {
        const ExcelJS = require('exceljs');
        const teacherId = req.teacherId;
        const { classId, subject } = req.params;
        const { batchId } = req.query;
        const decodedSubject = decodeURIComponent(subject);

        // Verify teacher teaches this class-subject
        const timetableEntry = await Timetable.findOne({
            teacherId,
            classId,
            subject: decodedSubject
        });

        if (!timetableEntry) {
            return res.status(403).json({ message: 'You do not teach this class-subject combination' });
        }

        // Get class details
        const classDoc = await Class.findById(classId).populate('departmentId');

        let students;
        let batchInfo = null;

        if (batchId) {
            const batch = classDoc?.batches?.find(b => b._id.toString() === batchId);
            if (batch) {
                batchInfo = { _id: batch._id, name: batch.name };
                students = await User.find({
                    _id: { $in: batch.studentIds },
                    role: 'student'
                }).select('fullName firstName lastName fatherName username rollNo').sort({ lastName: 1 });
            } else {
                students = [];
            }
        } else {
            students = await User.find({
                role: 'student',
                classId
            }).select('fullName firstName lastName fatherName username rollNo').sort({ lastName: 1 });
        }

        // Get attendance records
        const attendanceFilter = {
            classId,
            subject: decodedSubject,
            teacherId
        };
        if (batchId) {
            attendanceFilter.batchId = batchId;
        } else {
            attendanceFilter.$or = [{ batchId: null }, { batchId: { $exists: false } }];
        }

        const attendanceRecords = await Attendance.find(attendanceFilter)
            .populate('timeSlotId')
            .sort({ date: 1 });

        // Get teacher name
        const teacher = await User.findById(teacherId).select('fullName');

        // Build Excel using ExcelJS
        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Attendance');

        const totalCols = 5 + attendanceRecords.length;
        const thinBorder = { style: 'thin' };
        const allBorders = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };

        // --- Header rows (no borders) ---
        // Row 1: Title
        const titleRow = ws.addRow([]);
        titleRow.getCell(6).value = 'LECTURE ATTENDANCE SHEET';
        titleRow.getCell(6).font = { bold: true, size: 14 };

        // Row 2: Department
        ws.addRow([`Department: ${classDoc?.departmentId?.name || 'N/A'}`]).font = { bold: true };
        // Row 3: Subject
        ws.addRow([`Subject : ${decodedSubject}`]).font = { bold: true };
        // Row 4: Class
        ws.addRow([`Class : ${classDoc?.name || 'N/A'}${batchInfo ? ` - ${batchInfo.name}` : ''}`]).font = { bold: true };
        // Row 5: Faculty
        ws.addRow([`Faculty : ${teacher?.fullName || 'N/A'}`]).font = { bold: true };

        // Row 6: Empty gap row
        ws.addRow([]);

        // Row 7: Column headers - Dates
        const headerValues1 = ['R.No', 'Last Name', 'First Name', 'Middle Name', 'Batch'];
        for (const record of attendanceRecords) {
            const dateStr = new Date(record.date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            headerValues1.push(dateStr);
        }
        const headerRow1 = ws.addRow(headerValues1);
        headerRow1.eachCell((cell) => {
            cell.font = { bold: true };
            cell.border = allBorders;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        });

        // Row 8: Column headers - Time slots
        const headerValues2 = ['', '', '', '', ''];
        for (const record of attendanceRecords) {
            const slot = record.timeSlotId;
            headerValues2.push(slot ? `${slot.startTime} - ${slot.endTime}` : '');
        }
        const headerRow2 = ws.addRow(headerValues2);
        headerRow2.eachCell((cell, colNumber) => {
            cell.border = allBorders;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.font = { size: 9, italic: true };
        });

        // Student rows
        students.forEach((student, idx) => {
            // Determine batch name for student
            let studentBatch = '';
            if (classDoc?.batches) {
                for (const batch of classDoc.batches) {
                    if (batch.studentIds.some(sid => sid.toString() === student._id.toString())) {
                        studentBatch = batch.name;
                        break;
                    }
                }
            }

            const rowValues = [
                idx + 1,
                student.lastName || '',
                student.firstName || '',
                student.fatherName || '',
                studentBatch
            ];

            for (const record of attendanceRecords) {
                const studentRecord = record.records?.find(r =>
                    r.studentId.toString() === student._id.toString()
                );
                rowValues.push(studentRecord?.status === 'present' ? 'P' : 'A');
            }

            const dataRow = ws.addRow(rowValues);
            dataRow.eachCell((cell, colNumber) => {
                cell.border = allBorders;
                cell.alignment = { horizontal: 'center', vertical: 'middle' };

                // Color P/A cells (columns after the first 5)
                if (colNumber > 5) {
                    const val = cell.value;
                    if (val === 'P') {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } }; // Light green
                        cell.font = { color: { argb: 'FF006100' }, bold: true };
                    } else if (val === 'A') {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } }; // Light red
                        cell.font = { color: { argb: 'FF9C0006' }, bold: true };
                    }
                }
            });
        });

        // Set column widths
        ws.getColumn(1).width = 6;    // R.No
        ws.getColumn(2).width = 16;   // Last Name
        ws.getColumn(3).width = 16;   // First Name
        ws.getColumn(4).width = 16;   // Middle Name
        ws.getColumn(5).width = 12;   // Batch
        for (let i = 6; i <= totalCols; i++) {
            ws.getColumn(i).width = 14;
        }

        // Write to buffer and send
        const buffer = await workbook.xlsx.writeBuffer();

        const batchSuffix = batchInfo ? `_${batchInfo.name}` : '';
        res.setHeader('Content-Disposition', `attachment; filename="${decodedSubject}${batchSuffix}_Attendance.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('Export attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// TESTS
// ============================================

// @route   GET /api/teacher/test-types
// @desc    Get fixed test types (hardcoded)
router.get('/test-types', async (req, res) => {
    try {
        res.json(FIXED_TEST_TYPES);
    } catch (error) {
        console.error('Get test types error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/teacher/tests
// @desc    Get tests overview for teacher's classes
router.get('/tests', async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const { classId, subject } = req.query;

        // Get teacher's timetable entries
        const timetableFilter = { teacherId };
        if (classId) timetableFilter.classId = classId;

        const timetableEntries = await Timetable.find(timetableFilter)
            .populate('classId');

        // Group by class and subject
        const classSubjectMap = new Map();
        for (const entry of timetableEntries) {
            if (!entry.classId) continue;
            if (subject && entry.subject !== subject) continue;

            const key = `${entry.classId._id}-${entry.subject}`;
            if (!classSubjectMap.has(key)) {
                classSubjectMap.set(key, {
                    classId: entry.classId._id,
                    className: entry.classId.name,
                    year: entry.classId.year,
                    departmentId: entry.classId.departmentId,
                    subject: entry.subject
                });
            }
        }

        // Get test data for each class-subject
        const testsData = [];
        for (const [key, data] of classSubjectMap) {
            // Get all tests for this class-subject
            const tests = await Test.find({
                classId: data.classId,
                subject: data.subject,
                teacherId
            }).sort({ date: -1 });

            // Get department name
            const classDoc = await Class.findById(data.classId).populate('departmentId');

            testsData.push({
                classId: data.classId,
                className: data.className,
                year: data.year,
                department: classDoc?.departmentId?.name || 'N/A',
                subject: data.subject,
                testCount: tests.length,
                tests: tests.map(t => ({
                    _id: t._id,
                    testType: t.testType,
                    date: t.date,
                    maxScore: t.maxScore
                }))
            });
        }

        res.json(testsData);
    } catch (error) {
        console.error('Teacher tests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/teacher/tests/:classId/:subject
// @desc    Get test sheet for specific class and subject
router.get('/tests/:classId/:subject', async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const { classId, subject } = req.params;
        const { testId } = req.query;

        // Verify teacher teaches this class-subject
        const timetableEntry = await Timetable.findOne({
            teacherId,
            classId,
            subject
        });

        if (!timetableEntry) {
            return res.status(403).json({ message: 'You do not teach this class-subject combination' });
        }

        // Get students in this class
        const students = await User.find({
            role: 'student',
            classId
        }).select('fullName lastName username').sort({ lastName: 1 });

        // Get class details
        const classDoc = await Class.findById(classId).populate('departmentId');

        // Get specific test if testId provided, else get all tests
        let tests;
        if (testId) {
            const test = await Test.findOne({ _id: testId, teacherId });
            tests = test ? [test] : [];
        } else {
            tests = await Test.find({
                classId,
                subject,
                teacherId
            }).sort({ date: -1 });
        }

        res.json({
            classInfo: {
                classId,
                className: classDoc?.name || 'N/A',
                year: classDoc?.year,
                department: classDoc?.departmentId?.name || 'N/A',
                subject
            },
            students,
            tests
        });

        // Note: IA preview is computed client-side or via separate endpoint below
    } catch (error) {
        console.error('Test sheet error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/teacher/tests/:classId/:subject/marks-summary
// @desc    Get full marks summary for all students in a class-subject (new system)
router.get('/tests/:classId/:subject/marks-summary', async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const { classId, subject } = req.params;

        // Verify teacher teaches this class-subject
        const timetableEntry = await Timetable.findOne({ teacherId, classId, subject });
        if (!timetableEntry) {
            return res.status(403).json({ message: 'You do not teach this class-subject combination' });
        }

        const settings = await AcademicSettings.getSettings();
        const students = await User.find({ role: 'student', classId })
            .select('fullName lastName username').sort({ lastName: 1 });
        const tests = await Test.find({ classId, subject });
        const attendanceRecords = await Attendance.find({ classId, subject });

        const marksSummary = [];
        for (const student of students) {
            const sid = student._id.toString();

            // Attendance
            let totalLectures = 0, attended = 0;
            for (const record of attendanceRecords) {
                const sr = record.records.find(r => r.studentId.toString() === sid);
                if (sr) { totalLectures++; if (sr.status === 'present') attended++; }
            }
            const attPercent = academicCalc.calcAttendancePercent(attended, totalLectures);
            const attendanceMarks = academicCalc.calcAttendanceMarks(attPercent, settings.attendanceWeight, settings.attendanceSlabs);

            // Get test scores by type
            const getTestScore = (testType) => {
                const test = tests.find(t => t.testType === testType);
                if (!test) return null;
                const mark = test.marks.find(m => m.studentId.toString() === sid);
                return mark?.score ?? null;
            };

            const ia1 = getTestScore('IA1');
            const ia2 = getTestScore('IA2');

            const marks = { ia1, ia2 };
            const finalScore = calcFinalScore(marks, attPercent);

            marksSummary.push({
                studentId: student._id,
                fullName: student.fullName,
                username: student.username,
                ...finalScore,
                attendanceMarks,
                eligible: academicCalc.isEligible(attPercent, settings.minAttendancePercent),
                classesNeeded: academicCalc.requiredClasses(totalLectures, attended, settings.minAttendancePercent)
            });
        }

        res.json({ marksSummary, testTypes: FIXED_TEST_TYPES });
    } catch (error) {
        console.error('Marks summary error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/teacher/tests
// @desc    Create or update test record (upsert by classId+subject+testType)
router.post('/tests', async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const { classId, subject, testType, marks } = req.body;

        // Validate test type is one of the fixed types (exclude Term Work)
        const validType = FIXED_TEST_TYPES.find(t => t.name === testType && t.editable);
        if (!validType) {
            return res.status(400).json({ message: `Invalid test type: ${testType}. Must be one of: ${FIXED_TEST_TYPES.filter(t => t.editable).map(t => t.name).join(', ')}` });
        }

        // Verify teacher teaches this class-subject
        const timetableEntry = await Timetable.findOne({ teacherId, classId, subject });
        if (!timetableEntry) {
            return res.status(403).json({ message: 'You do not teach this class-subject combination' });
        }

        const maxScore = validType.maxScore;

        // Validate marks don't exceed maxScore
        for (const mark of marks) {
            if (mark.score !== null && mark.score !== undefined && mark.score > maxScore) {
                return res.status(400).json({ message: `Score cannot exceed max score of ${maxScore}` });
            }
        }

        // Upsert: one test per classId+subject+testType
        const test = await Test.findOneAndUpdate(
            { classId, subject, testType },
            { teacherId, maxScore, marks, date: new Date() },
            { upsert: true, new: true }
        );

        res.status(201).json(test);
    } catch (error) {
        console.error('Create test error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/teacher/tests/:id
// @desc    Update test record marks
router.put('/tests/:id', async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const { marks } = req.body;

        const test = await Test.findOne({
            _id: req.params.id,
            teacherId
        });

        if (!test) {
            return res.status(404).json({ message: 'Test record not found or access denied' });
        }

        // maxScore is fixed by the test type, cannot be changed
        for (const mark of marks) {
            if (mark.score !== null && mark.score !== undefined && mark.score > test.maxScore) {
                return res.status(400).json({ message: `Score cannot exceed max score of ${test.maxScore}` });
            }
        }

        test.marks = marks;
        await test.save();
        res.json(test);
    } catch (error) {
        console.error('Update test error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/teacher/tests/:id
// @desc    Delete test record
router.delete('/tests/:id', async (req, res) => {
    try {
        const teacherId = req.teacherId;

        const test = await Test.findOneAndDelete({
            _id: req.params.id,
            teacherId
        });

        if (!test) {
            return res.status(404).json({ message: 'Test record not found or access denied' });
        }

        res.json({ message: 'Test record deleted' });
    } catch (error) {
        console.error('Delete test error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/teacher/tests/:classId/:subject/template
// @desc    Download Excel template for test marks bulk upload
router.get('/tests/:classId/:subject/template', async (req, res) => {
    try {
        const ExcelJS = require('exceljs');
        const teacherId = req.teacherId;
        const { classId, subject } = req.params;
        const decodedSubject = decodeURIComponent(subject);

        const timetableEntry = await Timetable.findOne({ teacherId, classId, subject: decodedSubject });
        if (!timetableEntry) return res.status(403).json({ message: 'Access denied' });

        const students = await User.find({ role: 'student', classId })
            .select('fullName lastName username').sort({ lastName: 1 });

        const testTypes = [
            { name: 'IA1', maxScore: 20 },
            { name: 'IA2', maxScore: 20 }
        ];

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Test Marks Template');
        const thinBorder = { style: 'thin' };
        const allBorders = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };

        ws.addRow([`Test Marks Template - ${decodedSubject}`]).font = { bold: true, size: 14 };
        ws.addRow(['IA1: /20, IA2: /20']).font = { bold: true, color: { argb: 'FFFF0000' } };
        ws.addRow(['Instructions: Fill scores within max limits. Do NOT change Roll No column.']).font = { italic: true, color: { argb: 'FF666666' } };
        ws.addRow([]);

        const headers = ['Roll No', 'Student Name', ...testTypes.map(t => `${t.name} (/${t.maxScore})`)];
        const headerRow = ws.addRow(headers);
        headerRow.eachCell(cell => {
            cell.font = { bold: true };
            cell.border = allBorders;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            cell.alignment = { horizontal: 'center' };
        });

        for (let idx = 0; idx < students.length; idx++) {
            const student = students[idx];
            const row = [student.username || (idx + 1), student.fullName, '', ''];
            const dataRow = ws.addRow(row);
            dataRow.eachCell((cell, colNumber) => {
                cell.border = allBorders;
                cell.alignment = { horizontal: 'center' };
                if (colNumber > 2) {
                    const tt = testTypes[colNumber - 3];
                    if (tt) {
                        cell.dataValidation = {
                            type: 'decimal', operator: 'between',
                            formulae: [0, tt.maxScore],
                            showErrorMessage: true,
                            errorTitle: 'Invalid Score',
                            error: `Score must be between 0 and ${tt.maxScore}`
                        };
                    }
                }
            });
        }

        ws.getColumn(1).width = 14;
        ws.getColumn(2).width = 28;
        for (let i = 3; i <= 4; i++) ws.getColumn(i).width = 18;

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Disposition', `attachment; filename="${decodedSubject}_Test_Marks_Template.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('Test template error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/teacher/tests/:classId/:subject/export
// @desc    Export test marks to Excel
router.get('/tests/:classId/:subject/export', async (req, res) => {
    try {
        const ExcelJS = require('exceljs');
        const teacherId = req.teacherId;
        const { classId, subject } = req.params;
        const decodedSubject = decodeURIComponent(subject);

        const timetableEntry = await Timetable.findOne({ teacherId, classId, subject: decodedSubject });
        if (!timetableEntry) return res.status(403).json({ message: 'Access denied' });

        const students = await User.find({ role: 'student', classId })
            .select('fullName lastName username').sort({ lastName: 1 });
        const classDoc = await Class.findById(classId).populate('departmentId');
        const tests = await Test.find({ classId, subject: decodedSubject, teacherId });

        const testTypes = [
            { name: 'IA1', maxScore: 20 },
            { name: 'IA2', maxScore: 20 }
        ];

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Test Marks');
        const thinBorder = { style: 'thin' };
        const allBorders = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };

        ws.addRow([`Test Marks - ${decodedSubject}`]).font = { bold: true, size: 14 };
        ws.addRow([`Class: ${classDoc?.name || 'N/A'} | Department: ${classDoc?.departmentId?.name || 'N/A'}`]).font = { bold: true };
        ws.addRow(['IA1: /20, IA2: /20']).font = { bold: true };
        ws.addRow([]);

        const headers = ['Roll No', 'Student Name', ...testTypes.map(t => `${t.name} (/${t.maxScore})`)];
        const headerRow = ws.addRow(headers);
        headerRow.eachCell(cell => {
            cell.font = { bold: true };
            cell.border = allBorders;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            cell.alignment = { horizontal: 'center' };
        });

        for (let idx = 0; idx < students.length; idx++) {
            const student = students[idx];
            const row = [student.username || (idx + 1), student.fullName];
            for (const tt of testTypes) {
                const test = tests.find(t => t.testType === tt.name);
                const mark = test?.marks?.find(m => m.studentId.toString() === student._id.toString());
                row.push(mark?.score ?? '');
            }
            const dataRow = ws.addRow(row);
            dataRow.eachCell((cell, colNumber) => {
                cell.border = allBorders;
                cell.alignment = { horizontal: 'center' };
                if (colNumber > 2 && cell.value !== '' && cell.value !== null) {
                    const tt = testTypes[colNumber - 3];
                    const pct = tt ? (cell.value / tt.maxScore) * 100 : 0;
                    if (pct < 40) {
                        cell.font = { color: { argb: 'FFFF0000' } };
                    }
                }
            });
        }

        ws.getColumn(1).width = 14;
        ws.getColumn(2).width = 28;
        for (let i = 3; i <= 4; i++) ws.getColumn(i).width = 18;

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Disposition', `attachment; filename="${decodedSubject}_Test_Marks.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('Test export error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/teacher/tests/upload
// @desc    Upload Excel for bulk test marks
router.post('/tests/upload', upload.single('file'), async (req, res) => {
    try {
        const teacherId = req.teacherId;
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const { classId, subject } = req.body;
        const decodedSubject = subject;
        const timetableEntry = await Timetable.findOne({ teacherId, classId, subject: decodedSubject });
        if (!timetableEntry) return res.status(403).json({ message: 'Access denied' });

        const testTypes = [
            { name: 'IA1', maxScore: 20 },
            { name: 'IA2', maxScore: 20 }
        ];

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        let data = XLSX.utils.sheet_to_json(sheet, { range: 4 });
        if (data.length === 0 || (!data[0]?.['Roll No'] && !data[0]?.['Username'] && !data[0]?.['Student Name'])) {
            data = XLSX.utils.sheet_to_json(sheet);
        }

        const students = await User.find({ role: 'student', classId }).select('fullName username').sort({ lastName: 1 });
        const usernameMap = {};
        const nameMap = {};
        students.forEach(s => {
            if (s.username) usernameMap[s.username.toLowerCase()] = s._id.toString();
            if (s.fullName) nameMap[s.fullName.toLowerCase().trim()] = s._id.toString();
        });

        let savedCount = 0;
        const errors = [];

        // Find columns in uploaded data matching test type names
        const sampleRow = data[0] || {};
        const colKeys = Object.keys(sampleRow);

        for (const tt of testTypes) {
            // Match column like "IA1 (/20)" or "IA1" or "IA1 (20)"
            const colName = colKeys.find(k => k.startsWith(tt.name));
            if (!colName) continue;

            const marks = [];
            for (const row of data) {
                const rollNo = (row['Roll No'] || row['rollNo'] || row['Username'] || '').toString().trim().toLowerCase();
                const studentName = (row['Student Name'] || row['Name'] || '').toString().trim().toLowerCase();
                let studentId = usernameMap[rollNo] || nameMap[studentName] || nameMap[rollNo];
                if (!studentId && /^\d+$/.test(rollNo)) {
                    const idx = parseInt(rollNo) - 1;
                    if (idx >= 0 && idx < students.length) studentId = students[idx]._id.toString();
                }
                if (!studentId) { if (rollNo) errors.push(`Student not found: ${rollNo}`); continue; }
                const score = row[colName];
                if (score !== '' && score !== undefined && score !== null) {
                    const numScore = parseFloat(score);
                    if (numScore > tt.maxScore) {
                        errors.push(`${tt.name}: Score ${numScore} exceeds max ${tt.maxScore} for ${rollNo}`);
                        continue;
                    }
                    marks.push({ studentId, score: numScore });
                } else {
                    marks.push({ studentId, score: null });
                }
            }

            if (marks.length > 0) {
                await Test.findOneAndUpdate(
                    { classId, subject: decodedSubject, testType: tt.name, teacherId },
                    { maxScore: tt.maxScore, marks, date: new Date() },
                    { upsert: true, new: true }
                );
                savedCount++;
            }
        }

        res.json({ message: `Uploaded ${savedCount} test type(s) successfully`, errors });
    } catch (error) {
        console.error('Test upload error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// ASSIGNMENTS & EXPERIMENTS
// ============================================

// @route   GET /api/teacher/assignment-config
// @desc    Get subject configs for teacher's classes
router.get('/assignment-config', async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const timetableEntries = await Timetable.find({ teacherId }).populate('classId');

        const classSubjectMap = new Map();
        for (const entry of timetableEntries) {
            if (!entry.classId) continue;
            const key = `${entry.classId._id}-${entry.subject}`;
            if (!classSubjectMap.has(key)) {
                classSubjectMap.set(key, {
                    classId: entry.classId._id,
                    className: entry.classId.name,
                    year: entry.classId.year,
                    subject: entry.subject,
                    departmentId: entry.classId.departmentId
                });
            }
        }

        const result = [];
        for (const [key, data] of classSubjectMap) {
            const config = await SubjectConfig.findOne({ classId: data.classId, subject: data.subject });
            const classDoc = await Class.findById(data.classId).populate('departmentId');
            const assignmentCount = await AssignmentMark.countDocuments({ classId: data.classId, subject: data.subject, type: 'assignment' });
            const experimentCount = await AssignmentMark.countDocuments({ classId: data.classId, subject: data.subject, type: 'experiment' });

            result.push({
                classId: data.classId,
                className: data.className,
                year: data.year,
                department: classDoc?.departmentId?.name || 'N/A',
                subject: data.subject,
                totalAssignments: config?.totalAssignments || 0,
                totalExperiments: config?.totalExperiments || 0,
                assignmentMaxScore: config?.assignmentMaxScore || 10,
                experimentMaxScore: config?.experimentMaxScore || 10,
                assignmentsEntered: assignmentCount,
                experimentsEntered: experimentCount
            });
        }

        res.json(result);
    } catch (error) {
        console.error('Assignment config error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/teacher/assignment-config
// @desc    Set total assignments/experiments for a subject
router.post('/assignment-config', async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const { classId, subject, totalAssignments, totalExperiments, assignmentMaxScore, experimentMaxScore } = req.body;

        // Verify teacher teaches this class-subject
        const timetableEntry = await Timetable.findOne({ teacherId, classId, subject });
        if (!timetableEntry) {
            return res.status(403).json({ message: 'You do not teach this class-subject' });
        }

        const config = await SubjectConfig.findOneAndUpdate(
            { classId, subject },
            {
                totalAssignments: totalAssignments || 0,
                totalExperiments: totalExperiments || 0,
                assignmentMaxScore: assignmentMaxScore || 10,
                experimentMaxScore: experimentMaxScore || 10,
                updatedBy: teacherId,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );

        res.json(config);
    } catch (error) {
        console.error('Save assignment config error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/teacher/assignments/:classId/:subject
// @desc    Get all assignment/experiment marks for a class-subject
//          Supports ?type=lab_attendance or ?type=internal_viva for TW sub-components
router.get('/assignments/:classId/:subject', async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const { classId, subject } = req.params;
        const decodedSubject = decodeURIComponent(subject);
        const queryType = req.query.type;

        const timetableEntry = await Timetable.findOne({ teacherId, classId, subject: decodedSubject });
        if (!timetableEntry) {
            return res.status(403).json({ message: 'You do not teach this class-subject' });
        }

        const students = await User.find({ role: 'student', classId })
            .select('fullName lastName username').sort({ lastName: 1 });
        const classDoc = await Class.findById(classId).populate('departmentId');
        const config = await SubjectConfig.findOne({ classId, subject: decodedSubject });

        // If a specific type is requested (e.g., lab_attendance, internal_viva)
        if (queryType && ['lab_attendance', 'internal_viva'].includes(queryType)) {
            const records = await AssignmentMark.find({ classId, subject: decodedSubject, type: queryType }).sort({ number: 1 });
            return res.json({
                classInfo: {
                    classId,
                    className: classDoc?.name || 'N/A',
                    year: classDoc?.year,
                    department: classDoc?.departmentId?.name || 'N/A',
                    subject: decodedSubject
                },
                config: config || { totalAssignments: 0, totalExperiments: 0, assignmentMaxScore: 10, experimentMaxScore: 10 },
                students,
                assignments: records,
                experiments: []
            });
        }

        const assignments = await AssignmentMark.find({ classId, subject: decodedSubject, type: 'assignment' }).sort({ number: 1 });
        const experiments = await AssignmentMark.find({ classId, subject: decodedSubject, type: 'experiment' }).sort({ number: 1 });

        res.json({
            classInfo: {
                classId,
                className: classDoc?.name || 'N/A',
                year: classDoc?.year,
                department: classDoc?.departmentId?.name || 'N/A',
                subject: decodedSubject
            },
            config: config || { totalAssignments: 0, totalExperiments: 0, assignmentMaxScore: 10, experimentMaxScore: 10 },
            students,
            assignments,
            experiments
        });
    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/teacher/assignments
// @desc    Create or update assignment/experiment marks
router.post('/assignments', async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const { classId, subject, type, number, maxScore, marks } = req.body;

        const timetableEntry = await Timetable.findOne({ teacherId, classId, subject });
        if (!timetableEntry) {
            return res.status(403).json({ message: 'You do not teach this class-subject' });
        }

        // Validate marks
        for (const mark of marks) {
            if (mark.score !== null && mark.score !== undefined && mark.score > maxScore) {
                return res.status(400).json({ message: `Score cannot exceed max of ${maxScore}` });
            }
        }

        const result = await AssignmentMark.findOneAndUpdate(
            { classId, subject, type, number },
            { maxScore, marks, teacherId },
            { upsert: true, new: true }
        );

        res.json(result);
    } catch (error) {
        console.error('Save assignment marks error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/teacher/assignments/upload
// @desc    Upload Excel for bulk assignment/experiment/lab_attendance/internal_viva marks
router.post('/assignments/upload', upload.single('file'), async (req, res) => {
    try {
        const teacherId = req.teacherId;
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const { classId, subject, type } = req.body;
        const timetableEntry = await Timetable.findOne({ teacherId, classId, subject });
        if (!timetableEntry) {
            return res.status(403).json({ message: 'You do not teach this class-subject' });
        }

        const isTWComponent = type === 'lab_attendance' || type === 'internal_viva';
        const config = await SubjectConfig.findOne({ classId, subject });
        const totalCount = isTWComponent ? 1 : (type === 'assignment' ? (config?.totalAssignments || 0) : (config?.totalExperiments || 0));
        const maxScore = isTWComponent ? 5 : (type === 'assignment' ? (config?.assignmentMaxScore || 10) : (config?.experimentMaxScore || 10));

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        // Template has 4 header rows (title, max score, instructions, blank) before actual column headers
        let data = XLSX.utils.sheet_to_json(sheet, { range: 4 });
        if (data.length === 0 || (!data[0]?.['Roll No'] && !data[0]?.['Username'] && !data[0]?.['Student Name'])) {
            data = XLSX.utils.sheet_to_json(sheet);
        }

        const students = await User.find({ role: 'student', classId }).select('fullName username').sort({ lastName: 1 });
        const usernameMap = {};
        const nameMap = {};
        students.forEach((s, idx) => {
            if (s.username) usernameMap[s.username.toLowerCase()] = s._id.toString();
            if (s.fullName) nameMap[s.fullName.toLowerCase().trim()] = s._id.toString();
        });

        let savedCount = 0;
        const errors = [];
        const label = type === 'assignment' ? 'Assignment' : type === 'experiment' ? 'Experiment' : type === 'lab_attendance' ? 'Lab Attendance' : 'Internal Viva';

        // For TW components (lab_attendance, internal_viva): single "Score" column → number=1
        if (isTWComponent) {
            const marks = [];
            for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
                const row = data[rowIdx];
                const rollNo = (row['Roll No'] || row['rollNo'] || row['Username'] || '').toString().trim().toLowerCase();
                const studentName = (row['Student Name'] || row['Name'] || '').toString().trim().toLowerCase();
                let studentId = usernameMap[rollNo] || nameMap[studentName] || nameMap[rollNo];
                if (!studentId && /^\d+$/.test(rollNo)) {
                    const idx = parseInt(rollNo) - 1;
                    if (idx >= 0 && idx < students.length) studentId = students[idx]._id.toString();
                }
                if (!studentId) { if (rollNo) errors.push(`Student not found: ${rollNo}`); continue; }
                const score = row['Score'] ?? row['score'] ?? row[Object.keys(row).find(k => k !== 'Roll No' && k !== 'Student Name' && k !== 'Username' && k !== 'Name')];
                marks.push({ studentId, score: (score === '' || score === undefined || score === null) ? null : Math.min(parseFloat(score), maxScore) });
            }
            if (marks.length > 0) {
                await AssignmentMark.findOneAndUpdate(
                    { classId, subject, type, number: 1 },
                    { maxScore, marks, teacherId },
                    { upsert: true, new: true }
                );
                savedCount++;
            }
        } else {
            // Standard assignment/experiment upload with numbered columns
            const sampleRow = data[0] || {};
            const numberCols = Object.keys(sampleRow).filter(k => k.startsWith(label));

            for (let num = 1; num <= totalCount; num++) {
                const colName = `${label} ${num}`;
                if (!numberCols.includes(colName)) continue;

                const marks = [];
                for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
                    const row = data[rowIdx];
                    const rollNo = (row['Roll No'] || row['rollNo'] || row['Username'] || '').toString().trim().toLowerCase();
                    const studentName = (row['Student Name'] || row['Name'] || '').toString().trim().toLowerCase();
                    let studentId = usernameMap[rollNo] || nameMap[studentName] || nameMap[rollNo];
                    if (!studentId && /^\d+$/.test(rollNo)) {
                        const idx = parseInt(rollNo) - 1;
                        if (idx >= 0 && idx < students.length) studentId = students[idx]._id.toString();
                    }
                    if (!studentId) { if (rollNo) errors.push(`Student not found: ${rollNo}`); continue; }
                    const score = row[colName];
                    marks.push({ studentId, score: (score === '' || score === undefined || score === null) ? null : parseFloat(score) });
                }

                if (marks.length > 0) {
                    await AssignmentMark.findOneAndUpdate(
                        { classId, subject, type, number: num },
                        { maxScore, marks, teacherId },
                        { upsert: true, new: true }
                    );
                    savedCount++;
                }
            }
        }

        res.json({ message: `Uploaded ${savedCount} ${label.toLowerCase()} entries successfully`, errors });
    } catch (error) {
        console.error('Upload assignments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/teacher/assignments/:classId/:subject/template
// @desc    Download Excel template for bulk upload (assignment, experiment, lab_attendance, internal_viva)
router.get('/assignments/:classId/:subject/template', async (req, res) => {
    try {
        const ExcelJS = require('exceljs');
        const teacherId = req.teacherId;
        const { classId, subject } = req.params;
        const { type } = req.query;
        const decodedSubject = decodeURIComponent(subject);

        const timetableEntry = await Timetable.findOne({ teacherId, classId, subject: decodedSubject });
        if (!timetableEntry) return res.status(403).json({ message: 'Access denied' });

        const students = await User.find({ role: 'student', classId })
            .select('fullName lastName username').sort({ lastName: 1 });
        const config = await SubjectConfig.findOne({ classId, subject: decodedSubject });

        const markType = type || 'assignment';
        const isTWComponent = markType === 'lab_attendance' || markType === 'internal_viva';
        const total = isTWComponent ? 1 : (markType === 'assignment' ? (config?.totalAssignments || 0) : (config?.totalExperiments || 0));
        const maxScore = isTWComponent ? 5 : (markType === 'assignment' ? (config?.assignmentMaxScore || 10) : (config?.experimentMaxScore || 10));
        const label = markType === 'assignment' ? 'Assignment' : markType === 'experiment' ? 'Experiment' : markType === 'lab_attendance' ? 'Lab Attendance' : 'Internal Viva';

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet(`${label} Template`);
        const thinBorder = { style: 'thin' };
        const allBorders = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };

        ws.addRow([`${label} Marks Template - ${decodedSubject}`]).font = { bold: true, size: 14 };
        ws.addRow([`Max Score: ${maxScore}`]).font = { bold: true, color: { argb: 'FFFF0000' } };
        ws.addRow([`Instructions: Fill scores (0-${maxScore}). Do NOT change Roll No column.`]).font = { italic: true, color: { argb: 'FF666666' } };
        ws.addRow([]);

        // Header row
        const headers = ['Roll No', 'Student Name'];
        if (isTWComponent) {
            headers.push('Score');
        } else {
            for (let i = 1; i <= total; i++) headers.push(`${label} ${i}`);
        }
        const headerRow = ws.addRow(headers);
        headerRow.eachCell(cell => {
            cell.font = { bold: true };
            cell.border = allBorders;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            cell.alignment = { horizontal: 'center' };
        });

        // Student rows
        const colCount = isTWComponent ? 1 : total;
        for (let idx = 0; idx < students.length; idx++) {
            const student = students[idx];
            const row = [student.username || (idx + 1), student.fullName];
            for (let i = 0; i < colCount; i++) row.push('');
            const dataRow = ws.addRow(row);
            dataRow.eachCell((cell, colNumber) => {
                cell.border = allBorders;
                cell.alignment = { horizontal: 'center' };
                if (colNumber > 2) {
                    cell.dataValidation = {
                        type: 'decimal', operator: 'between',
                        formulae: [0, maxScore],
                        showErrorMessage: true,
                        errorTitle: 'Invalid Score',
                        error: `Score must be between 0 and ${maxScore}`
                    };
                }
            });
        }

        ws.getColumn(1).width = 14;
        ws.getColumn(2).width = 28;
        for (let i = 3; i <= 2 + colCount; i++) ws.getColumn(i).width = 14;

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Disposition', `attachment; filename="${decodedSubject}_${label.replace(/\s/g, '_')}_Template.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('Template download error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/teacher/assignments/:classId/:subject/export
// @desc    Export assignment/experiment/lab_attendance/internal_viva marks to Excel
router.get('/assignments/:classId/:subject/export', async (req, res) => {
    try {
        const ExcelJS = require('exceljs');
        const teacherId = req.teacherId;
        const { classId, subject } = req.params;
        const { type } = req.query;
        const decodedSubject = decodeURIComponent(subject);

        const timetableEntry = await Timetable.findOne({ teacherId, classId, subject: decodedSubject });
        if (!timetableEntry) return res.status(403).json({ message: 'Access denied' });

        const students = await User.find({ role: 'student', classId })
            .select('fullName firstName lastName username').sort({ lastName: 1 });
        const classDoc = await Class.findById(classId).populate('departmentId');
        const config = await SubjectConfig.findOne({ classId, subject: decodedSubject });

        const markType = type || 'assignment';
        const isTWComponent = markType === 'lab_attendance' || markType === 'internal_viva';
        const total = isTWComponent ? 1 : (markType === 'assignment' ? (config?.totalAssignments || 0) : (config?.totalExperiments || 0));
        const maxScore = isTWComponent ? 5 : (markType === 'assignment' ? (config?.assignmentMaxScore || 10) : (config?.experimentMaxScore || 10));
        const label = markType === 'assignment' ? 'Assignment' : markType === 'experiment' ? 'Experiment' : markType === 'lab_attendance' ? 'Lab Attendance' : 'Internal Viva';
        const records = await AssignmentMark.find({ classId, subject: decodedSubject, type: markType }).sort({ number: 1 });

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet(`${label} Marks`);
        const thinBorder = { style: 'thin' };
        const allBorders = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };

        ws.addRow([`${label} Marks - ${decodedSubject}`]).font = { bold: true, size: 14 };
        ws.addRow([`Class: ${classDoc?.name || 'N/A'} | Department: ${classDoc?.departmentId?.name || 'N/A'}`]).font = { bold: true };
        ws.addRow([`Max Score: ${maxScore}`]).font = { bold: true };
        ws.addRow([]);

        // Header row
        const headers = ['Roll No', 'Student Name'];
        if (isTWComponent) {
            headers.push('Score');
        } else {
            const colCount = Math.max(total, records.length);
            for (let i = 1; i <= colCount; i++) headers.push(`${label} ${i}`);
            headers.push('Average', 'Percentage');
        }
        const headerRow = ws.addRow(headers);
        headerRow.eachCell(cell => {
            cell.font = { bold: true };
            cell.border = allBorders;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            cell.alignment = { horizontal: 'center' };
        });

        // Data rows
        for (let idx = 0; idx < students.length; idx++) {
            const student = students[idx];
            const row = [idx + 1, student.fullName || `${student.firstName} ${student.lastName}`];

            if (isTWComponent) {
                const record = records.find(r => r.number === 1);
                const mark = record?.marks?.find(m => m.studentId.toString() === student._id.toString());
                row.push(mark?.score ?? '');
            } else {
                let totalScore = 0, count = 0;
                const colCount = Math.max(total, records.length);
                for (let i = 1; i <= colCount; i++) {
                    const record = records.find(r => r.number === i);
                    const mark = record?.marks?.find(m => m.studentId.toString() === student._id.toString());
                    if (mark?.score !== null && mark?.score !== undefined) {
                        row.push(mark.score);
                        totalScore += mark.score;
                        count++;
                    } else {
                        row.push('');
                    }
                }
                const avg = count > 0 ? (totalScore / count).toFixed(1) : '';
                const pct = count > 0 ? ((totalScore / (count * maxScore)) * 100).toFixed(0) + '%' : '';
                row.push(avg, pct);
            }

            const dataRow = ws.addRow(row);
            dataRow.eachCell(cell => {
                cell.border = allBorders;
                cell.alignment = { horizontal: 'center' };
            });
        }

        ws.getColumn(1).width = 12;
        ws.getColumn(2).width = 25;
        for (let i = 3; i <= headers.length; i++) ws.getColumn(i).width = 14;

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Disposition', `attachment; filename="${decodedSubject}_${label.replace(/\s/g, '_')}_Marks.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('Export assignments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// LEAVE REQUESTS
// ============================================

// @route   GET /api/teacher/leave-requests
// @desc    Get teacher's leave requests
router.get('/leave-requests', async (req, res) => {
    try {
        const teacherId = req.teacherId;

        const leaveRequests = await LeaveRequest.find({ userId: teacherId })
            .populate('reviewedBy', 'fullName')
            .sort({ createdAt: -1 });

        res.json(leaveRequests);
    } catch (error) {
        console.error('Teacher leave requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/teacher/leave-requests
// @desc    Submit new leave request
router.post('/leave-requests', async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const { type, startDate, endDate, reason } = req.body;

        const leaveRequest = new LeaveRequest({
            userId: teacherId,
            type,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason
        });

        await leaveRequest.save();
        res.status(201).json(leaveRequest);

        // Notify HOD about teacher leave request
        const teacher = await User.findById(teacherId);
        if (teacher?.departmentId) {
            const hod = await User.findOne({ role: 'hod', departmentId: teacher.departmentId });
            if (hod) {
                createNotification(
                    hod._id,
                    'leave_received',
                    'New Leave Request',
                    `${teacher.fullName} (Teacher) has submitted a leave request.`,
                    leaveRequest._id
                );
            }
        }
    } catch (error) {
        console.error('Create leave request error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/teacher/leave-requests/:id
// @desc    Cancel leave request (only if pending)
router.delete('/leave-requests/:id', async (req, res) => {
    try {
        const teacherId = req.teacherId;

        const leaveRequest = await LeaveRequest.findOne({
            _id: req.params.id,
            userId: teacherId,
            status: 'pending'
        });

        if (!leaveRequest) {
            return res.status(404).json({ message: 'Leave request not found or cannot be cancelled' });
        }

        await leaveRequest.deleteOne();
        res.json({ message: 'Leave request cancelled' });
    } catch (error) {
        console.error('Cancel leave request error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/teacher/student-leaves
// @desc    View student leave requests (read-only)
router.get('/student-leaves', async (req, res) => {
    try {
        const teacherId = req.teacherId;

        // Get classes the teacher teaches
        const timetableEntries = await Timetable.find({ teacherId }).distinct('classId');

        // Get student leave requests for those classes
        const students = await User.find({
            role: 'student',
            classId: { $in: timetableEntries }
        }).select('_id');

        const studentIds = students.map(s => s._id);

        const leaveRequests = await LeaveRequest.find({
            userId: { $in: studentIds }
        })
            .populate('userId', 'fullName classId')
            .populate({
                path: 'userId',
                populate: { path: 'classId', select: 'name' }
            })
            .sort({ createdAt: -1 });

        res.json(leaveRequests);
    } catch (error) {
        console.error('Student leaves error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// COMPLAINTS
// ============================================

// @route   GET /api/teacher/complaints
// @desc    Get teacher's complaints
router.get('/complaints', async (req, res) => {
    try {
        const teacherId = req.teacherId;

        const complaints = await Complaint.find({ userId: teacherId })
            .populate('resolvedBy', 'fullName')
            .sort({ createdAt: -1 });

        res.json(complaints);
    } catch (error) {
        console.error('Teacher complaints error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/teacher/complaints
// @desc    Submit new complaint
router.post('/complaints', async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const { subject, description, category } = req.body;

        const complaint = new Complaint({
            userId: teacherId,
            subject,
            description,
            category: category || 'other'
        });

        await complaint.save();
        res.status(201).json(complaint);

        // Notify HOD about teacher complaint
        const teacher = await User.findById(teacherId);
        if (teacher?.departmentId) {
            const hod = await User.findOne({ role: 'hod', departmentId: teacher.departmentId });
            if (hod) {
                createNotification(
                    hod._id,
                    'complaint_received',
                    'New Complaint Received',
                    `${teacher.fullName} (Teacher) has submitted a complaint: "${subject}"`,
                    complaint._id
                );
            }
        }
    } catch (error) {
        console.error('Create complaint error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/teacher/students/:classId
// @desc    Get students for a specific class
router.get('/students/:classId', async (req, res) => {
    try {
        const { classId } = req.params;
        const teacherId = req.teacherId;

        // Verify teacher teaches this class
        const timetableEntry = await Timetable.findOne({
            teacherId,
            classId
        });

        if (!timetableEntry) {
            return res.status(403).json({ message: 'You do not teach this class' });
        }

        const students = await User.find({
            role: 'student',
            classId
        }).select('fullName username').sort({ fullName: 1 });

        res.json(students);
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/teacher/timeslots
// @desc    Get all time slots (for attendance)
router.get('/timeslots', async (req, res) => {
    try {
        const timeSlots = await TimeSlot.find({ type: { $ne: 'break' } }).sort({ startTime: 1 });
        res.json(timeSlots);
    } catch (error) {
        console.error('Get time slots error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// DEFAULTERS
// ============================================

// @route   GET /api/teacher/defaulters
// @desc    Get all subjects teacher is teaching (grouped by class+subject)
router.get('/defaulters', async (req, res) => {
    try {
        const teacherId = req.teacherId;

        const timetableEntries = await Timetable.find({ teacherId })
            .populate({ path: 'classId', populate: { path: 'departmentId' } });

        // Group by class and subject
        const classSubjectMap = new Map();
        for (const entry of timetableEntries) {
            if (!entry.classId) continue;
            const key = `${entry.classId._id}-${entry.subject}`;
            if (!classSubjectMap.has(key)) {
                classSubjectMap.set(key, {
                    classId: entry.classId._id,
                    className: entry.classId.name,
                    year: entry.classId.year,
                    department: entry.classId.departmentId?.name || 'N/A',
                    subject: entry.subject
                });
            }
        }

        const classSubjects = Array.from(classSubjectMap.values());

        // Get avg attendance for each
        for (const cs of classSubjects) {
            const records = await Attendance.find({
                classId: cs.classId,
                subject: cs.subject,
                teacherId
            });

            let totalPresent = 0;
            let totalRecords = 0;
            for (const record of records) {
                for (const r of record.records) {
                    totalRecords++;
                    if (r.status === 'present') totalPresent++;
                }
            }
            cs.avgAttendance = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
            cs.totalLectures = records.length;
        }

        res.json(classSubjects);
    } catch (error) {
        console.error('Teacher defaulters error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/teacher/defaulters/:classId/:subject
// @desc    Get student attendance for a specific subject taught by teacher
router.get('/defaulters/:classId/:subject', async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const { classId, subject } = req.params;
        const { percentageRange } = req.query;
        const decodedSubject = decodeURIComponent(subject);

        // Verify teacher teaches this
        const timetableEntry = await Timetable.findOne({
            teacherId,
            classId,
            subject: decodedSubject
        });
        if (!timetableEntry) {
            return res.status(403).json({ message: 'You do not teach this class-subject combination' });
        }

        const classDoc = await Class.findById(classId).populate('departmentId');

        // Get students
        const students = await User.find({
            role: 'student',
            classId
        })
            .select('fullName username rollNo')
            .sort({ rollNo: 1 });

        // Get attendance records for this subject by this teacher
        const attendanceRecords = await Attendance.find({
            classId,
            subject: decodedSubject,
            teacherId
        });

        const result = [];
        for (const student of students) {
            const sid = student._id.toString();
            let totalLectures = 0;
            let attended = 0;

            for (const record of attendanceRecords) {
                const sr = record.records.find(r => r.studentId.toString() === sid);
                if (sr) {
                    totalLectures++;
                    if (sr.status === 'present') attended++;
                }
            }

            const percentage = totalLectures > 0 ? Math.round((attended / totalLectures) * 100) : 0;

            // Filter by percentage range
            if (percentageRange) {
                const [min, max] = percentageRange.split('-').map(Number);
                if (percentage < min || percentage > max) continue;
            }

            // Batch name
            let batchName = '';
            if (classDoc?.batches) {
                for (const batch of classDoc.batches) {
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
                batch: batchName,
                attendancePercentage: percentage
            });
        }

        // Get teacher name
        const teacher = await User.findById(teacherId).select('fullName');

        res.json({
            students: result,
            className: classDoc?.name || '',
            year: classDoc?.year || '',
            department: classDoc?.departmentId?.name || '',
            subject: decodedSubject,
            facultyName: teacher?.fullName || 'N/A'
        });
    } catch (error) {
        console.error('Teacher defaulters detail error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/teacher/defaulters/:classId/:subject/export
// @desc    Export teacher defaulters list as Excel sheet
router.get('/defaulters/:classId/:subject/export', async (req, res) => {
    try {
        const ExcelJS = require('exceljs');
        const teacherId = req.teacherId;
        const { classId, subject } = req.params;
        const { percentageRange } = req.query;
        const decodedSubject = decodeURIComponent(subject);

        // Verify teacher teaches this
        const timetableEntry = await Timetable.findOne({
            teacherId,
            classId,
            subject: decodedSubject
        });
        if (!timetableEntry) {
            return res.status(403).json({ message: 'You do not teach this class-subject combination' });
        }

        const classDoc = await Class.findById(classId).populate('departmentId');
        const teacher = await User.findById(teacherId).select('fullName');

        const students = await User.find({
            role: 'student',
            classId
        })
            .select('fullName username rollNo')
            .sort({ rollNo: 1 });

        const attendanceRecords = await Attendance.find({
            classId,
            subject: decodedSubject,
            teacherId
        });

        const studentData = [];
        for (const student of students) {
            const sid = student._id.toString();
            let totalLectures = 0;
            let attended = 0;

            for (const record of attendanceRecords) {
                const sr = record.records.find(r => r.studentId.toString() === sid);
                if (sr) {
                    totalLectures++;
                    if (sr.status === 'present') attended++;
                }
            }

            const percentage = totalLectures > 0 ? Math.round((attended / totalLectures) * 100) : 0;

            if (percentageRange) {
                const [min, max] = percentageRange.split('-').map(Number);
                if (percentage < min || percentage > max) continue;
            }

            let batchName = '';
            if (classDoc?.batches) {
                for (const batch of classDoc.batches) {
                    if (batch.studentIds.some(id => id.toString() === sid)) {
                        batchName = batch.name;
                        break;
                    }
                }
            }

            studentData.push({
                rollNo: student.rollNo || '',
                fullName: student.fullName,
                batch: batchName,
                percentage
            });
        }

        // Build Excel
        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Defaulters');

        const thinBorder = { style: 'thin' };
        const allBorders = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };

        // Header rows
        const titleRow = ws.addRow(['DEFAULTERS REPORT']);
        titleRow.getCell(1).font = { bold: true, size: 14 };
        ws.addRow([`Department: ${classDoc?.departmentId?.name || 'N/A'}`]).font = { bold: true };
        ws.addRow([`Class: ${classDoc?.name || 'N/A'}`]).font = { bold: true };
        ws.addRow([`Year: ${classDoc?.year || 'N/A'}`]).font = { bold: true };
        ws.addRow([`Subject: ${decodedSubject}`]).font = { bold: true };
        ws.addRow([`Faculty: ${teacher?.fullName || 'N/A'}`]).font = { bold: true };
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
            const row = ws.addRow([s.rollNo, s.fullName, s.batch, `${s.percentage}%`]);
            row.eachCell((cell, colNumber) => {
                cell.border = allBorders;
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                if (colNumber === 4 && s.percentage < 75) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
                    cell.font = { color: { argb: 'FF9C0006' }, bold: true };
                }
            });
        }

        ws.getColumn(1).width = 10;
        ws.getColumn(2).width = 30;
        ws.getColumn(3).width = 15;
        ws.getColumn(4).width = 18;

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Disposition', `attachment; filename="${decodedSubject}_Defaulters_Report.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('Teacher defaulters export error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
