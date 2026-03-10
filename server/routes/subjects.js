const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const Department = require('../models/Department');
const { auth, adminOnly } = require('../middleware/auth');
const multer = require('multer');
const xlsx = require('xlsx');

const upload = multer({ storage: multer.memoryStorage() });

// @route   GET /api/subjects
// @desc    Get all subjects
router.get('/', auth, async (req, res) => {
    try {
        const { departmentId, type, semester, year } = req.query;
        const filter = { isActive: true };

        if (departmentId) filter.departmentId = departmentId;
        if (type) filter.type = type;
        if (semester) filter.semester = parseInt(semester);
        if (year) filter.year = parseInt(year);

        const subjects = await Subject.find(filter)
            .populate('departmentId')
            .sort({ name: 1 });

        res.json(subjects);
    } catch (error) {
        console.error('Get subjects error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/subjects/template
// @desc    Download subject upload template
router.get('/template', auth, adminOnly, (req, res) => {
    const template = [
        {
            name: 'Data Structures',
            code: 'CS301',
            type: 'both',
            practicalName: 'DS Lab',
            practicalCode: 'CS301P',
            departmentCode: 'CS',
            year: 2,
            semester: 3
        }
    ];

    const ws = xlsx.utils.json_to_sheet(template);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Subjects');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=subject_upload_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

// @route   POST /api/subjects/bulk-upload
// @desc    Bulk upload subjects
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
                const deptCode = row.departmentCode?.toString().toLowerCase();
                const deptId = deptCode ? deptMap[deptCode] : null;
                if (deptCode && !deptId) {
                    results.errors.push(`Row: ${row.name} - Department not found: ${row.departmentCode}`);
                    results.failedCount++;
                    continue;
                }

                const code = row.code?.toString().toUpperCase();
                if (!row.name || !code) {
                    results.errors.push(`Row: ${row.name || 'unknown'} - Name and code are required`);
                    results.failedCount++;
                    continue;
                }

                // Check if code already exists
                const existing = await Subject.findOne({ code, departmentId: deptId || null });
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
                    departmentId: deptId || null
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
        console.error('Bulk upload subjects error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/subjects/:id
// @desc    Get single subject
router.get('/:id', auth, async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.id)
            .populate('departmentId');

        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        res.json(subject);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/subjects
// @desc    Create subject (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
    try {
        const { name, code, type, practicalName, practicalCode, departmentId, year, semester } = req.body;

        // Check if code already exists
        const existing = await Subject.findOne({
            code: code.toUpperCase(),
            departmentId: departmentId || null
        });

        if (existing) {
            return res.status(400).json({ message: 'Subject code already exists' });
        }

        const subject = new Subject({
            name,
            code: code.toUpperCase(),
            type: type || 'both',
            practicalName: practicalName || '',
            practicalCode: practicalCode ? practicalCode.toUpperCase() : '',
            year: year || 1,
            semester: semester || 1,
            departmentId: departmentId || null
        });

        await subject.save();

        const populated = await Subject.findById(subject._id)
            .populate('departmentId');

        res.status(201).json(populated);
    } catch (error) {
        console.error('Create subject error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/subjects/:id
// @desc    Update subject
router.put('/:id', auth, adminOnly, async (req, res) => {
    try {
        const { name, code, type, practicalName, practicalCode, departmentId, year, semester, isActive } = req.body;

        // Check if code already exists (excluding current)
        const existing = await Subject.findOne({
            code: code.toUpperCase(),
            departmentId: departmentId || null,
            _id: { $ne: req.params.id }
        });

        if (existing) {
            return res.status(400).json({ message: 'Subject code already exists' });
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
                departmentId: departmentId || null,
                isActive: isActive !== undefined ? isActive : true
            },
            { new: true }
        ).populate('departmentId');

        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        res.json(subject);
    } catch (error) {
        console.error('Update subject error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/subjects/:id
// @desc    Delete subject
router.delete('/:id', auth, adminOnly, async (req, res) => {
    try {
        const subject = await Subject.findByIdAndDelete(req.params.id);

        if (!subject) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        res.json({ message: 'Subject deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
