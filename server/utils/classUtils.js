const User = require('../models/User');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');

/**
 * Calculate how many batches should be created based on student count
 * Rules:
 * - Each batch: min 15 students, max 25 students
 * - Max 3 batches per class
 * - If 24 or fewer students: 1 batch
 * - If 25-45 students: 2 batches
 * - If more than 45 students: 3 batches
 */
const calculateBatchCount = (studentCount) => {
    if (studentCount <= 24) {
        return 1;
    } else if (studentCount <= 45) {
        return 2;
    } else {
        return 3;
    }
};

/**
 * Distribute students evenly across batches
 * @param {Array} studentIds - Array of student ObjectIds
 * @param {Number} batchCount - Number of batches to create
 * @returns {Array} - Array of arrays, each containing student IDs for that batch
 */
const distributeStudentsToBatches = (studentIds, batchCount) => {
    const batches = [];
    const studentsPerBatch = Math.ceil(studentIds.length / batchCount);

    for (let i = 0; i < batchCount; i++) {
        const start = i * studentsPerBatch;
        const end = Math.min(start + studentsPerBatch, studentIds.length);
        batches.push(studentIds.slice(start, end));
    }

    return batches;
};

/**
 * Reorganize a class's students:
 * 1. Sort students by last name (ascending)
 * 2. Assign roll numbers (1, 2, 3, ...)
 * 3. Divide into batches based on count
 * 
 * @param {String} classId - The class ID to reorganize
 * @param {Array} existingBatchNames - Optional array of existing batch names to preserve
 * @returns {Object} - Updated class with batches
 */
const reorganizeClass = async (classId, existingBatchNames = null) => {
    // Get all students in this class, sorted by lastName ascending
    const students = await User.find({
        classId: classId,
        role: 'student'
    }).sort({ lastName: 1, firstName: 1 });

    // Assign roll numbers based on sorted order
    for (let i = 0; i < students.length; i++) {
        students[i].rollNo = i + 1;
        await students[i].save();
    }

    // Get the class
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
        throw new Error('Class not found');
    }

    // Calculate batch count
    const batchCount = calculateBatchCount(students.length);

    // Get student IDs
    const studentIds = students.map(s => s._id);

    // Distribute students to batches
    const distributedBatches = distributeStudentsToBatches(studentIds, batchCount);

    // Determine batch names
    const defaultNames = ['Batch 1', 'Batch 2', 'Batch 3'];
    const batchNames = existingBatchNames || classDoc.batches?.map(b => b.name) || defaultNames;

    // Update existing batches IN-PLACE to preserve _id references
    // This is critical: creating new batch objects generates new _ids,
    // which would orphan all batchId references in Attendance and Timetable records.
    for (let i = 0; i < batchCount; i++) {
        if (i < classDoc.batches.length) {
            // Update existing batch subdocument - preserves its _id
            classDoc.batches[i].name = batchNames[i] || defaultNames[i];
            classDoc.batches[i].studentIds = distributedBatches[i];
        } else {
            // Only create a new batch if we need more batches than before
            classDoc.batches.push({
                name: batchNames[i] || defaultNames[i],
                studentIds: distributedBatches[i]
            });
        }
    }

    // Remove extra batches if batch count decreased (rare edge case)
    while (classDoc.batches.length > batchCount) {
        classDoc.batches.pop();
    }

    await classDoc.save();

    return classDoc;
};

/**
 * Get students in a class with their roll numbers and batch assignments
 * @param {String} classId - The class ID
 * @returns {Object} - Class info with students organized by batches
 */
const getClassStudents = async (classId) => {
    const classDoc = await Class.findById(classId)
        .populate('departmentId')
        .populate('coordinatorId', 'fullName username');

    if (!classDoc) {
        throw new Error('Class not found');
    }

    // Get all students sorted by rollNo
    const students = await User.find({
        classId: classId,
        role: 'student'
    })
        .select('firstName fatherName lastName fullName username rollNo email phone')
        .sort({ rollNo: 1 });

    // Map students to their batches
    const batchesWithStudents = classDoc.batches.map(batch => {
        const batchStudentIds = batch.studentIds.map(id => id.toString());
        const batchStudents = students.filter(s => batchStudentIds.includes(s._id.toString()));
        return {
            _id: batch._id,
            name: batch.name,
            students: batchStudents,
            studentCount: batchStudents.length
        };
    });

    return {
        class: {
            _id: classDoc._id,
            name: classDoc.name,
            year: classDoc.year,
            department: classDoc.departmentId,
            coordinator: classDoc.coordinatorId,
            maxCapacity: classDoc.maxCapacity,
            totalStudents: students.length
        },
        batches: batchesWithStudents,
        allStudents: students
    };
};

/**
 * Update batch names for a class
 * @param {String} classId - The class ID
 * @param {Array} batchUpdates - Array of {batchId, name} objects
 */
const updateBatchNames = async (classId, batchUpdates) => {
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
        throw new Error('Class not found');
    }

    for (const update of batchUpdates) {
        const batch = classDoc.batches.id(update.batchId);
        if (batch) {
            batch.name = update.name;
        }
    }

    await classDoc.save();
    return classDoc;
};

/**
 * Sync a student into all existing attendance records for a class.
 * When a student is added to a class, this backfills them into all
 * historical attendance records as 'absent' so the data is consistent.
 * The teacher can then edit individual records as needed.
 *
 * @param {String} studentId - The student's user ID
 * @param {String} classId - The class ID
 */
const syncStudentAttendance = async (studentId, classId) => {
    try {
        const classDoc = await Class.findById(classId);
        if (!classDoc) return;

        // 1. Add student to all non-batch (lecture) attendance records
        //    where the student doesn't already have an entry
        await Attendance.updateMany(
            {
                classId,
                $or: [{ batchId: null }, { batchId: { $exists: false } }],
                records: { $not: { $elemMatch: { studentId: studentId } } }
            },
            {
                $push: { records: { studentId, status: 'absent' } },
                $inc: { absentCount: 1, totalCount: 1 }
            }
        );

        // 2. Add student to batch-specific attendance records
        //    (only for the batch the student currently belongs to)
        if (classDoc.batches && classDoc.batches.length > 0) {
            for (const batch of classDoc.batches) {
                const isInBatch = batch.studentIds.some(
                    id => id.toString() === studentId.toString()
                );
                if (isInBatch) {
                    await Attendance.updateMany(
                        {
                            classId,
                            batchId: batch._id,
                            records: { $not: { $elemMatch: { studentId: studentId } } }
                        },
                        {
                            $push: { records: { studentId, status: 'absent' } },
                            $inc: { absentCount: 1, totalCount: 1 }
                        }
                    );
                    break; // Student can only be in one batch
                }
            }
        }

        console.log(`Synced attendance for student ${studentId} in class ${classId}`);
    } catch (error) {
        console.error('syncStudentAttendance error:', error);
        // Don't throw - this is a best-effort sync
    }
};

module.exports = {
    calculateBatchCount,
    distributeStudentsToBatches,
    reorganizeClass,
    getClassStudents,
    updateBatchNames,
    syncStudentAttendance
};
