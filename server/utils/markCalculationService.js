/**
 * Mark Calculation Service
 * Centralized calculation logic — IA1 & IA2 only
 * ALL mark/grade calculation logic lives here. No calculation anywhere else.
 */

// ============================================
// FIXED TEST TYPES — only IA1 and IA2
// ============================================
const FIXED_TEST_TYPES = [
    { key: 'IA1', name: 'IA1', label: 'Internal Assessment 1', maxScore: 20, editable: true },
    { key: 'IA2', name: 'IA2', label: 'Internal Assessment 2', maxScore: 20, editable: true }
];

// ============================================
// GRADE TABLE — Mumbai University CBSGS
// ============================================
const GRADE_TABLE = [
    { min: 70, grade: 'O', label: 'Outstanding', gp: 10 },
    { min: 60, grade: 'A', label: 'Excellent', gp: 9 },
    { min: 55, grade: 'B', label: 'Very Good', gp: 8 },
    { min: 50, grade: 'C', label: 'Good', gp: 7 },
    { min: 45, grade: 'D', label: 'Average', gp: 6 },
    { min: 40, grade: 'E', label: 'Pass', gp: 5 },
    { min: 0, grade: 'F', label: 'Fail', gp: 0 }
];

// ============================================
// CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate Final IA Score
 * FinalIA = (IA1 + IA2) / 2, rounded to 2 decimal places, out of 20
 */
function calcFinalIA(ia1, ia2) {
    if (ia1 === null || ia1 === undefined) return ia2 ?? null;
    if (ia2 === null || ia2 === undefined) return ia1 ?? null;
    return Math.round(((ia1 + ia2) / 2) * 100) / 100;
}

/**
 * Scale a set of scores to a target max
 * e.g. avg of experiments (out of 10 each) scaled to 10
 */
function scaleAverage(scores, sourceMax, targetMax) {
    if (!scores || scores.length === 0) return null;
    const valid = scores.filter(s => s !== null && s !== undefined);
    if (valid.length === 0) return null;
    const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
    const scaled = (avg / sourceMax) * targetMax;
    return Math.min(Math.round(scaled * 100) / 100, targetMax);
}

/**
 * Calculate Total Marks (IA only)
 * Total = FinalIA, out of 20
 */
function calcTotal(finalIA) {
    return finalIA ?? 0;
}

/**
 * Calculate Percentage
 * Percentage = (Total / 20) × 100, rounded to 2 decimal places
 */
function calcPercentage(total) {
    if (total === null || total === undefined) return null;
    return Math.round((total / 20) * 100 * 100) / 100;
}

/**
 * Get Grade based on percentage
 */
function getGrade(percentage) {
    if (percentage === null || percentage === undefined) return null;
    for (const entry of GRADE_TABLE) {
        if (percentage >= entry.min) {
            return { grade: entry.grade, label: entry.label, gp: entry.gp };
        }
    }
    return { grade: 'F', label: 'Fail', gp: 0 };
}

/**
 * Determine result status
 * - "PASS"       → IA percentage >= 40%
 * - "FAIL"       → IA percentage < 40%
 * - "DETAINED"   → Attendance < 75% (override)
 * - "INCOMPLETE" → IA1 or IA2 not yet filled
 */
function getResultStatus(marks, attendancePercent) {
    const { ia1, ia2 } = marks;

    // Check if both IAs are filled
    const allFilled = ia1 !== null && ia1 !== undefined &&
        ia2 !== null && ia2 !== undefined;

    if (!allFilled) return 'INCOMPLETE';

    // Check attendance — detained overrides pass/fail
    if (attendancePercent !== null && attendancePercent !== undefined && attendancePercent < 75) {
        return 'DETAINED';
    }

    const finalIA = calcFinalIA(ia1, ia2);
    const percentage = calcPercentage(finalIA);

    return percentage >= 40 ? 'PASS' : 'FAIL';
}

/**
 * Calculate complete final score for a student in a subject
 * This is the single entry point for all mark calculations
 */
function calcFinalScore(marks, attendancePercent) {
    const { ia1, ia2 } = marks;

    const finalIA = calcFinalIA(ia1, ia2);
    const total = calcTotal(finalIA);
    const percentage = calcPercentage(total);
    const gradeInfo = getGrade(percentage);
    const status = getResultStatus(marks, attendancePercent);

    return {
        ia1: ia1 ?? null,
        ia2: ia2 ?? null,
        finalIA,
        total,
        percentage,
        grade: gradeInfo?.grade ?? null,
        gradeLabel: gradeInfo?.label ?? null,
        gradePoint: gradeInfo?.gp ?? null,
        status,
        attendancePercent: attendancePercent ?? null
    };
}

/**
 * Build TW breakdown from assignment/experiment data
 * Returns { journal, assignments, labAttendance, internalViva, total }
 * (kept for assignment display purposes only)
 */
function buildTWBreakdown(experimentScores, experimentMax, assignmentScores, assignmentMax, labAttendanceScore, internalVivaScore) {
    const journal = scaleAverage(experimentScores, experimentMax || 10, 10);
    const assignments = scaleAverage(assignmentScores, assignmentMax || 10, 5);
    const labAttendance = Math.min(labAttendanceScore ?? 0, 5);
    const internalViva = Math.min(internalVivaScore ?? 0, 5);

    const j = journal ?? 0;
    const a = assignments ?? 0;
    const la = labAttendance;
    const iv = internalViva;
    const total = Math.min(Math.round((j + a + la + iv) * 100) / 100, 25);

    return { journal, assignments, labAttendance, internalViva, total };
}

module.exports = {
    FIXED_TEST_TYPES,
    GRADE_TABLE,
    calcFinalIA,
    scaleAverage,
    calcTotal,
    calcPercentage,
    getGrade,
    getResultStatus,
    calcFinalScore,
    buildTWBreakdown
};
