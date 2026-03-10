const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const User = require('../models/User');
const Class = require('../models/Class');
const Timetable = require('../models/Timetable');
const { auth } = require('../middleware/auth');
const { createNotification, createBulkNotifications } = require('../utils/notificationUtils');

// Apply auth middleware to all routes
router.use(auth);

// ============================================
// UNIFIED FEED - Dashboard active announcements
// ============================================

// @route   GET /api/announcements/feed
// @desc    Get active (non-expired) announcements for dashboard display
router.get('/feed', async (req, res) => {
    try {
        const filter = await buildAnnouncementFilter(req.user);
        // Only non-expired for dashboard
        filter.expiresAt = { $gt: new Date() };

        const announcements = await Announcement.find(filter)
            .populate('createdBy', 'fullName role')
            .populate('targetClassId', 'name year')
            .sort({ createdAt: -1 })
            .limit(10);

        res.json(announcements);
    } catch (error) {
        console.error('Announcement feed error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// HOD ANNOUNCEMENTS
// ============================================

// @route   GET /api/announcements/hod
// @desc    Get all announcements visible to HOD (own + CC/Teacher in dept)
router.get('/hod', async (req, res) => {
    try {
        if (req.user.role !== 'hod') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const filter = await buildAnnouncementFilter(req.user);

        const announcements = await Announcement.find(filter)
            .populate('createdBy', 'fullName role')
            .populate('targetClassId', 'name year')
            .sort({ createdAt: -1 });

        res.json(announcements);
    } catch (error) {
        console.error('HOD announcements fetch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/announcements/hod
// @desc    Create announcement by HOD
router.post('/hod', async (req, res) => {
    try {
        if (req.user.role !== 'hod') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { title, message, targetType, targetYear, targetClassId, displayDuration } = req.body;

        if (!title || !message || !targetType) {
            return res.status(400).json({ message: 'Title, message, and target type are required' });
        }

        if (targetType === 'year' && !targetYear) {
            return res.status(400).json({ message: 'Target year is required' });
        }

        if (targetType === 'class' && !targetClassId) {
            return res.status(400).json({ message: 'Target class is required' });
        }

        if (targetType === 'class') {
            const targetClass = await Class.findById(targetClassId);
            if (!targetClass || targetClass.departmentId.toString() !== req.user.departmentId.toString()) {
                return res.status(403).json({ message: 'Class not in your department' });
            }
        }

        const announcement = new Announcement({
            title,
            message,
            createdBy: req.user._id,
            createdByRole: 'hod',
            targetType,
            targetYear: targetType === 'year' ? targetYear : undefined,
            targetClassId: targetType === 'class' ? targetClassId : undefined,
            departmentId: req.user.departmentId,
            displayDuration: displayDuration || 24
        });

        await announcement.save();
        await announcement.populate('createdBy', 'fullName role');
        await announcement.populate('targetClassId', 'name year');

        // Send notifications to all teachers in the department
        const deptClasses = await Class.find({ departmentId: req.user.departmentId });
        const classIds = deptClasses.map(c => c._id);
        const teacherIds = await Timetable.find({ classId: { $in: classIds } }).distinct('teacherId');

        // Get students to notify based on target
        let studentFilter = { role: 'student', departmentId: req.user.departmentId };
        if (targetType === 'year') studentFilter.year = targetYear;
        if (targetType === 'class') studentFilter.classId = targetClassId;
        const students = await User.find(studentFilter).select('_id');
        const studentIds = students.map(s => s._id);

        // Get CCs for classes in dept
        const ccIds = deptClasses.filter(c => c.coordinatorId).map(c => c.coordinatorId);

        // Combine all unique recipient IDs (exclude sender)
        const allRecipients = [...new Set([...teacherIds.map(String), ...studentIds.map(String), ...ccIds.map(String)])]
            .filter(id => id !== req.user._id.toString());

        if (allRecipients.length > 0) {
            await createBulkNotifications(allRecipients, 'announcement', `${title}`, message, announcement._id);
        }

        res.status(201).json(announcement);
    } catch (error) {
        console.error('HOD announcement create error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/announcements/hod/:id
router.delete('/hod/:id', async (req, res) => {
    try {
        if (req.user.role !== 'hod') {
            return res.status(403).json({ message: 'Access denied' });
        }
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
        if (announcement.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You can only delete your own announcements' });
        }
        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ message: 'Announcement deleted' });
    } catch (error) {
        console.error('HOD announcement delete error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/announcements/hod/classes
router.get('/hod/classes', async (req, res) => {
    try {
        if (req.user.role !== 'hod') {
            return res.status(403).json({ message: 'Access denied' });
        }
        const classes = await Class.find({ departmentId: req.user.departmentId }).sort({ year: 1, name: 1 });
        res.json(classes);
    } catch (error) {
        console.error('HOD classes fetch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// CC ANNOUNCEMENTS
// ============================================

// @route   GET /api/announcements/cc
router.get('/cc', async (req, res) => {
    try {
        if (req.user.role !== 'classcoordinator') {
            return res.status(403).json({ message: 'Access denied' });
        }
        const filter = await buildAnnouncementFilter(req.user);

        const announcements = await Announcement.find(filter)
            .populate('createdBy', 'fullName role')
            .populate('targetClassId', 'name year')
            .sort({ createdAt: -1 });

        res.json(announcements);
    } catch (error) {
        console.error('CC announcements fetch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/announcements/cc
router.post('/cc', async (req, res) => {
    try {
        if (req.user.role !== 'classcoordinator') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const assignedClass = await Class.findOne({ coordinatorId: req.user._id });
        if (!assignedClass) {
            return res.status(403).json({ message: 'No class assigned' });
        }

        const { title, message, displayDuration } = req.body;
        if (!title || !message) {
            return res.status(400).json({ message: 'Title and message are required' });
        }

        const announcement = new Announcement({
            title,
            message,
            createdBy: req.user._id,
            createdByRole: 'classcoordinator',
            targetType: 'class',
            targetClassId: assignedClass._id,
            departmentId: assignedClass.departmentId,
            displayDuration: displayDuration || 24
        });

        await announcement.save();
        await announcement.populate('createdBy', 'fullName role');
        await announcement.populate('targetClassId', 'name year');

        // Notify: teachers who teach this class + HOD of dept + students of this class
        const teacherIds = await Timetable.find({ classId: assignedClass._id }).distinct('teacherId');
        const hod = await User.findOne({ role: 'hod', departmentId: assignedClass.departmentId }).select('_id');
        const students = await User.find({ role: 'student', classId: assignedClass._id }).select('_id');

        const recipients = [...new Set([
            ...teacherIds.map(String),
            ...(hod ? [hod._id.toString()] : []),
            ...students.map(s => s._id.toString())
        ])].filter(id => id !== req.user._id.toString());

        if (recipients.length > 0) {
            await createBulkNotifications(recipients, 'announcement', `${title}`, message, announcement._id);
        }

        res.status(201).json(announcement);
    } catch (error) {
        console.error('CC announcement create error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/announcements/cc/:id
router.delete('/cc/:id', async (req, res) => {
    try {
        if (req.user.role !== 'classcoordinator') {
            return res.status(403).json({ message: 'Access denied' });
        }
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
        if (announcement.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You can only delete your own announcements' });
        }
        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ message: 'Announcement deleted' });
    } catch (error) {
        console.error('CC announcement delete error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// TEACHER ANNOUNCEMENTS
// ============================================

// @route   GET /api/announcements/teacher
router.get('/teacher', async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const filter = await buildAnnouncementFilter(req.user);

        const announcements = await Announcement.find(filter)
            .populate('createdBy', 'fullName role')
            .populate('targetClassId', 'name year')
            .sort({ createdAt: -1 });

        res.json(announcements);
    } catch (error) {
        console.error('Teacher announcements fetch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/announcements/teacher/classes
router.get('/teacher/classes', async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ message: 'Access denied' });
        }
        const classIds = await Timetable.find({ teacherId: req.user._id }).distinct('classId');
        const classes = await Class.find({ _id: { $in: classIds } }).sort({ year: 1, name: 1 });
        res.json(classes);
    } catch (error) {
        console.error('Teacher classes fetch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/announcements/teacher
router.post('/teacher', async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { title, message, targetClassId, displayDuration } = req.body;
        if (!title || !message || !targetClassId) {
            return res.status(400).json({ message: 'Title, message, and target class are required' });
        }

        // Verify teacher teaches this class
        const teaches = await Timetable.findOne({ teacherId: req.user._id, classId: targetClassId });
        if (!teaches) {
            return res.status(403).json({ message: 'You do not teach this class' });
        }

        const targetClass = await Class.findById(targetClassId);

        const announcement = new Announcement({
            title,
            message,
            createdBy: req.user._id,
            createdByRole: 'teacher',
            targetType: 'class',
            targetClassId,
            departmentId: targetClass?.departmentId,
            displayDuration: displayDuration || 24
        });

        await announcement.save();
        await announcement.populate('createdBy', 'fullName role');
        await announcement.populate('targetClassId', 'name year');

        // Notify: CC of that class + HOD of dept + students of that class
        const recipients = [];
        if (targetClass?.coordinatorId) {
            recipients.push(targetClass.coordinatorId.toString());
        }
        const hod = await User.findOne({ role: 'hod', departmentId: targetClass?.departmentId }).select('_id');
        if (hod) recipients.push(hod._id.toString());

        const students = await User.find({ role: 'student', classId: targetClassId }).select('_id');
        students.forEach(s => recipients.push(s._id.toString()));

        const uniqueRecipients = [...new Set(recipients)].filter(id => id !== req.user._id.toString());
        if (uniqueRecipients.length > 0) {
            await createBulkNotifications(uniqueRecipients, 'announcement', `${title}`, message, announcement._id);
        }

        res.status(201).json(announcement);
    } catch (error) {
        console.error('Teacher announcement create error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/announcements/teacher/:id
router.delete('/teacher/:id', async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ message: 'Access denied' });
        }
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
        if (announcement.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You can only delete your own announcements' });
        }
        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ message: 'Announcement deleted' });
    } catch (error) {
        console.error('Teacher announcement delete error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// STUDENT / PARENT ANNOUNCEMENTS (View Only)
// ============================================

// @route   GET /api/announcements/student
router.get('/student', async (req, res) => {
    try {
        let studentUser = req.user;

        if (req.user.role === 'parent') {
            studentUser = await User.findById(req.user.childUserId);
            if (!studentUser) return res.status(404).json({ message: 'Student not found' });
        } else if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const filter = await buildAnnouncementFilter(studentUser);

        const announcements = await Announcement.find(filter)
            .populate('createdBy', 'fullName role')
            .populate('targetClassId', 'name year')
            .sort({ createdAt: -1 });

        res.json(announcements);
    } catch (error) {
        console.error('Student announcements fetch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// HELPER: Build announcement filter based on user role
// ============================================

async function buildAnnouncementFilter(user) {
    const role = user.role;
    const filter = { $or: [] };

    if (role === 'hod') {
        // HOD sees:
        // 1. Own announcements
        // 2. CC announcements in their department
        // 3. Teacher announcements in their department
        filter.$or.push({ createdBy: user._id });
        filter.$or.push({ departmentId: user.departmentId, createdByRole: 'classcoordinator' });
        filter.$or.push({ departmentId: user.departmentId, createdByRole: 'teacher' });
    } else if (role === 'classcoordinator') {
        const assignedClass = await Class.findOne({ coordinatorId: user._id });
        if (assignedClass) {
            // CC sees:
            // 1. Own announcements
            // 2. HOD announcements targeting all, their year, or their class
            // 3. Teacher announcements for their class
            filter.$or.push({ createdBy: user._id });
            filter.$or.push({ departmentId: assignedClass.departmentId, createdByRole: 'hod', targetType: 'all' });
            filter.$or.push({ departmentId: assignedClass.departmentId, createdByRole: 'hod', targetType: 'year', targetYear: assignedClass.year });
            filter.$or.push({ createdByRole: 'hod', targetType: 'class', targetClassId: assignedClass._id });
            filter.$or.push({ createdByRole: 'teacher', targetType: 'class', targetClassId: assignedClass._id });
        }
    } else if (role === 'teacher') {
        // Teacher sees:
        // 1. Own announcements
        // 2. HOD announcements for their department (all, year they teach, class they teach)
        // 3. CC announcements for classes they teach
        const classIds = await Timetable.find({ teacherId: user._id }).distinct('classId');
        const classes = await Class.find({ _id: { $in: classIds } });
        const deptIds = [...new Set(classes.map(c => c.departmentId?.toString()).filter(Boolean))];
        const years = [...new Set(classes.map(c => c.year))];

        filter.$or.push({ createdBy: user._id });
        // HOD dept-wide announcements
        deptIds.forEach(deptId => {
            filter.$or.push({ departmentId: deptId, createdByRole: 'hod', targetType: 'all' });
        });
        // HOD year-specific for years teacher teaches
        deptIds.forEach(deptId => {
            years.forEach(year => {
                filter.$or.push({ departmentId: deptId, createdByRole: 'hod', targetType: 'year', targetYear: year });
            });
        });
        // HOD/CC class-specific for classes teacher teaches
        classIds.forEach(classId => {
            filter.$or.push({ targetType: 'class', targetClassId: classId });
        });
    } else if (role === 'student') {
        // Student sees all announcements targeted at:
        // 1. All students in their department
        // 2. Their year in their department
        // 3. Their class
        const classId = user.classId;
        const year = user.year;
        let deptId = user.departmentId;

        if (!deptId && classId) {
            const cls = await Class.findById(classId);
            deptId = cls?.departmentId;
        }

        if (deptId) {
            filter.$or.push({ departmentId: deptId, targetType: 'all' });
            if (year) filter.$or.push({ departmentId: deptId, targetType: 'year', targetYear: year });
        }
        if (classId) {
            filter.$or.push({ targetType: 'class', targetClassId: classId });
        }
    }

    // If no conditions, return impossible filter
    if (filter.$or.length === 0) {
        return { _id: null };
    }

    return filter;
}

module.exports = router;
