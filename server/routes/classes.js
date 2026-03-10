const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const User = require('../models/User');
const Department = require('../models/Department');
const { auth, adminOnly } = require('../middleware/auth');
const { reorganizeClass, getClassStudents, updateBatchNames } = require('../utils/classUtils');
const multer = require('multer');
const xlsx = require('xlsx');

const upload = multer({ storage: multer.memoryStorage() });

// @route   GET /api/classes
router.get('/', auth, async (req, res) => {
    try {
        const { departmentId } = req.query;
        const filter = {};
        if (departmentId) filter.departmentId = departmentId;

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
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/classes/template
// @desc    Download class upload template
router.get('/template', auth, adminOnly, (req, res) => {
    const template = [
        {
            name: 'FY-CSE-A',
            year: 1,
            departmentCode: 'CS',
            coordinatorUsername: '',
            maxCapacity: 75
        }
    ];

    const ws = xlsx.utils.json_to_sheet(template);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Classes');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=class_upload_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

// @route   POST /api/classes/bulk-upload
// @desc    Bulk upload classes
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
            created: [],
            errors: []
        };

        // Get departments for code lookup
        const departments = await Department.find();
        const deptMap = {};
        departments.forEach(d => { deptMap[d.code?.toLowerCase()] = d._id; });

        for (const row of data) {
            try {
                if (!row.name) {
                    results.errors.push(`Row: unknown - Class name is required`);
                    results.failedCount++;
                    continue;
                }

                const deptCode = row.departmentCode?.toString().toLowerCase();
                const deptId = deptCode ? deptMap[deptCode] : null;
                if (!deptId) {
                    results.errors.push(`Row: ${row.name} - Department not found: ${row.departmentCode}`);
                    results.failedCount++;
                    continue;
                }

                // Look up coordinator by username if provided
                let coordinatorId = null;
                if (row.coordinatorUsername) {
                    const coordinator = await User.findOne({
                        username: row.coordinatorUsername.toString().toLowerCase(),
                        role: { $in: ['teacher', 'classcoordinator'] }
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
                    departmentId: deptId,
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
        console.error('Bulk upload classes error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/classes/:id
router.get('/:id', auth, async (req, res) => {
    try {
        const classItem = await Class.findById(req.params.id)
            .populate('departmentId')
            .populate('coordinatorId', 'fullName username');
        if (!classItem) {
            return res.status(404).json({ message: 'Class not found' });
        }

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
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/classes/:id/students
// @desc    Get all students in a class with batches
router.get('/:id/students', auth, async (req, res) => {
    try {
        const result = await getClassStudents(req.params.id);
        res.json(result);
    } catch (error) {
        console.error('Get class students error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// @route   POST /api/classes/:id/reorganize
// @desc    Reorganize class - sort students, assign roll numbers, create batches
router.post('/:id/reorganize', auth, adminOnly, async (req, res) => {
    try {
        const classDoc = await reorganizeClass(req.params.id);
        const result = await getClassStudents(req.params.id);
        res.json({
            message: 'Class reorganized successfully',
            ...result
        });
    } catch (error) {
        console.error('Reorganize class error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// @route   PUT /api/classes/:id/batches
// @desc    Update batch names
router.put('/:id/batches', auth, adminOnly, async (req, res) => {
    try {
        const { batchUpdates } = req.body; // Array of {batchId, name}
        const classDoc = await updateBatchNames(req.params.id, batchUpdates);
        res.json({
            message: 'Batch names updated successfully',
            batches: classDoc.batches
        });
    } catch (error) {
        console.error('Update batch names error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// @route   POST /api/classes
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const { name, year, departmentId, coordinatorId, maxCapacity } = req.body;

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
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/classes/:id
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const { name, year, departmentId, coordinatorId, maxCapacity } = req.body;

        const updateData = {
            name,
            year,
            departmentId,
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

        if (!classItem) {
            return res.status(404).json({ message: 'Class not found' });
        }

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
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/classes/:id
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const classItem = await Class.findByIdAndDelete(req.params.id);
        if (!classItem) {
            return res.status(404).json({ message: 'Class not found' });
        }
        res.json({ message: 'Class deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
