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
const AcademicSettings = require('../models/AcademicSettings');
const academicCalc = require('../utils/academicCalc');
const { auth } = require('../middleware/auth');
const { createNotification } = require('../utils/notificationUtils');

// Middleware to ensure teacher access
const teacherOnly = async (req, res, next) => {
    try {
        if (!req.user || (req.user.role !== 'teacher' && req.user.role !== 'classcoordinator')) {
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
// @desc    Get available test types
router.get('/test-types', async (req, res) => {
    try {
        const testTypes = await TestType.find({ isActive: true }).sort({ name: 1 });
        res.json(testTypes);
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
        }).select('fullName username').sort({ fullName: 1 });

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

// @route   GET /api/teacher/tests/:classId/:subject/ia-preview
// @desc    Get IA preview for all students in a class-subject
router.get('/tests/:classId/:subject/ia-preview', async (req, res) => {
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
            .select('fullName username').sort({ fullName: 1 });
        const tests = await Test.find({ classId, subject });
        const attendanceRecords = await Attendance.find({ classId, subject });

        // Build category map from TestType collection
        const allTestTypes = await TestType.find({});
        const categoryMap = {};
        for (const tt of allTestTypes) {
            categoryMap[tt.name] = tt.category || 'ut';
        }

        const iaPreview = [];
        for (const student of students) {
            const sid = student._id.toString();

            // Attendance
            let totalLectures = 0;
            let attended = 0;
            for (const record of attendanceRecords) {
                const sr = record.records.find(r => r.studentId.toString() === sid);
                if (sr) {
                    totalLectures++;
                    if (sr.status === 'present') attended++;
                }
            }
            const attPercent = academicCalc.calcAttendancePercent(attended, totalLectures);

            // Scores by category
            const utScores = [];
            let utMaxMarks = 20;
            const assignmentScores = [];
            let assignmentMax = 0;

            for (const test of tests) {
                const studentMark = test.marks.find(m => m.studentId.toString() === sid);
                const score = studentMark?.score;
                const cat = categoryMap[test.testType] || 'ut';

                if (cat === 'ut') {
                    if (score !== null && score !== undefined) utScores.push(score);
                    utMaxMarks = test.maxScore;
                } else if (cat === 'assignment') {
                    if (score !== null && score !== undefined) assignmentScores.push(score);
                    assignmentMax = Math.max(assignmentMax, test.maxScore);
                }
            }

            const utIA = academicCalc.calcUTIA(utScores, utMaxMarks, settings.utWeight);
            const assignmentIA = assignmentScores.length > 0
                ? academicCalc.calcAssignmentIA(
                    assignmentScores.reduce((a, b) => a + b, 0) / assignmentScores.length,
                    assignmentMax,
                    settings.assignmentWeight
                ) : 0;
            const attendanceIA = academicCalc.calcAttendanceIA(attPercent, settings.attendanceWeight, settings.attendanceSlabs);
            const totalIA = academicCalc.calcTotalIA(utIA, assignmentIA, attendanceIA);

            iaPreview.push({
                studentId: student._id,
                fullName: student.fullName,
                username: student.username,
                utIA,
                assignmentIA,
                attendanceIA,
                totalIA,
                iaTotal: settings.iaTotal,
                attendancePercent: attPercent,
                eligible: academicCalc.isEligible(attPercent, settings.minAttendancePercent)
            });
        }

        res.json({ iaPreview, settings: { iaTotal: settings.iaTotal } });
    } catch (error) {
        console.error('IA preview error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/teacher/tests
// @desc    Create new test record
router.post('/tests', async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const { classId, subject, testType, date, maxScore, marks } = req.body;

        // Verify teacher teaches this class-subject
        const timetableEntry = await Timetable.findOne({
            teacherId,
            classId,
            subject
        });

        if (!timetableEntry) {
            return res.status(403).json({ message: 'You do not teach this class-subject combination' });
        }

        // Validate marks don't exceed maxScore
        for (const mark of marks) {
            if (mark.score !== null && mark.score !== undefined && mark.score > maxScore) {
                return res.status(400).json({ message: `Score cannot exceed max score of ${maxScore}` });
            }
        }

        const test = new Test({
            classId,
            subject,
            teacherId,
            testType,
            date: new Date(date),
            maxScore,
            marks
        });

        await test.save();
        res.status(201).json(test);
    } catch (error) {
        console.error('Create test error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'A test with this type already exists for this class-subject on this date' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/teacher/tests/:id
// @desc    Update test record
router.put('/tests/:id', async (req, res) => {
    try {
        const teacherId = req.teacherId;
        const { marks, maxScore } = req.body;

        const test = await Test.findOne({
            _id: req.params.id,
            teacherId
        });

        if (!test) {
            return res.status(404).json({ message: 'Test record not found or access denied' });
        }

        // Validate marks don't exceed maxScore
        const effectiveMaxScore = maxScore !== undefined ? maxScore : test.maxScore;
        for (const mark of marks) {
            if (mark.score !== null && mark.score !== undefined && mark.score > effectiveMaxScore) {
                return res.status(400).json({ message: `Score cannot exceed max score of ${effectiveMaxScore}` });
            }
        }

        if (maxScore !== undefined) test.maxScore = maxScore;
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

module.exports = router;
