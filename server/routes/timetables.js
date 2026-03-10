const express = require('express');
const router = express.Router();
const Timetable = require('../models/Timetable');
const Class = require('../models/Class');
const { auth, adminOnly } = require('../middleware/auth');

// @route   GET /api/timetables
router.get('/', auth, async (req, res) => {
    try {
        const { classId, teacherId, day, batchId, semester } = req.query;
        const filter = {};
        if (classId) filter.classId = classId;
        if (teacherId) filter.teacherId = teacherId;
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
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/timetables/lectures
// @desc    Get all lectures for timetable scheduling (admin access)
router.get('/lectures', auth, adminOnly, async (req, res) => {
    try {
        const Lecture = require('../models/Lecture');
        const { classId } = req.query;

        const filter = { isActive: true };
        if (classId) filter.classId = classId;

        const lectures = await Lecture.find(filter)
            .populate('subjectId', 'name code semester')
            .populate('teacherId', 'fullName username')
            .populate('classId', 'name year batches')
            .populate('departmentId', 'name')
            .sort({ createdAt: -1 });

        res.json(lectures);
    } catch (error) {
        console.error('Lectures fetch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/timetables/class-batches/:classId
// @desc    Get batches for a specific class
router.get('/class-batches/:classId', auth, async (req, res) => {
    try {
        const classData = await Class.findById(req.params.classId).select('batches name');
        if (!classData) {
            return res.status(404).json({ message: 'Class not found' });
        }
        res.json({ batches: classData.batches || [], className: classData.name });
    } catch (error) {
        console.error('Fetch batches error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/timetables
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const { classId, subject, teacherId, day, timeSlotId, timeSlotIds, roomId, type, lectureId, batchId, semester } = req.body;

        // For practicals, we may have multiple time slots
        const slotsToCheck = timeSlotIds && timeSlotIds.length > 0 ? timeSlotIds : [timeSlotId];

        // Check for room conflict for each slot (skip for blank entries with no room)
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
                    return res.status(400).json({ message: `Room is already booked for time slot` });
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
                    return res.status(400).json({ message: `Teacher is already assigned for this time slot` });
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
        console.error('Timetable create error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// @route   PUT /api/timetables/:id
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const { classId, subject, teacherId, day, timeSlotId, timeSlotIds, roomId, type, lectureId, batchId } = req.body;
        const timetableId = req.params.id;

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

        if (!timetable) {
            return res.status(404).json({ message: 'Timetable entry not found' });
        }

        res.json(timetable);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/timetables/:id
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const timetable = await Timetable.findByIdAndDelete(req.params.id);
        if (!timetable) {
            return res.status(404).json({ message: 'Timetable entry not found' });
        }
        res.json({ message: 'Timetable entry deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/timetables/class/:classId
// @desc    Delete all timetable entries for a class
router.delete('/class/:classId', auth, adminOnly, async (req, res) => {
    try {
        await Timetable.deleteMany({ classId: req.params.classId });
        res.json({ message: 'All timetable entries for class deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
