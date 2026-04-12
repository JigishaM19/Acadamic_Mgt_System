/**
 * Mark Calculation Service
 * Centralized calculation logic for Mumbai University CBSGS
 * ALL mark/grade calculation logic lives here. No calculation anywhere else.
 */

// ============================================
// FIXED TEST TYPES — hardcoded, cannot be modified
// ============================================
const FIXED_TEST_TYPES = [
    { key: 'IA1', name: 'IA1', label: 'Internal Assessment 1', maxScore: 20, editable: true },
    { key: 'IA2', name: 'IA2', label: 'Internal Assessment 2', maxScore: 20, editable: true },
    { key: 'ESE', name: 'ESE', label: 'End Semester Exam', maxScore: 80, editable: true },
    { key: 'ORAL', name: 'Oral Exam', label: 'Oral / Practical Exam', maxScore: 25, editable: true },
    { key: 'TW', name: 'Term Work', label: 'Term Work (Auto)', maxScore: 25, editable: false }
];

// ============================================
// TERM WORK SUB-COMPONENTS
// ============================================
const TW_COMPONENTS = [
    { key: 'journal', label: 'Journal / Experiment Records', maxScore: 10, source: 'experiment' },
    { key: 'assignments', label: 'Assignment Submissions', maxScore: 5, source: 'assignment' },
    { key: 'labAttendance', label: 'Lab Attendance Marks', maxScore: 5, source: 'manual' },
    { key: 'internalViva', label: 'Internal Viva / Participation', maxScore: 5, source: 'manual' }
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
 * Calculate Term Work Score from sub-components
 * TW = Journal(10) + Assignments(5) + LabAttendance(5) + InternalViva(5)
 * Capped at 25
 */
function calcTermWork(twBreakdown) {
    if (!twBreakdown) return null;
    const j = twBreakdown.journal ?? 0;
    const a = twBreakdown.assignments ?? 0;
    const la = twBreakdown.labAttendance ?? 0;
    const iv = twBreakdown.internalViva ?? 0;
    const total = j + a + la + iv;
    return Math.min(Math.round(total * 100) / 100, 25);
}

/**
 * Calculate Total Marks
 * Total = FinalIA + TW + OralExam + ESE
 * Max possible = 20 + 25 + 25 + 80 = 150
 */
function calcTotal(finalIA, tw, oralExam, ese) {
    const fia = finalIA ?? 0;
    const t = tw ?? 0;
    const o = oralExam ?? 0;
    const e = ese ?? 0;
    return Math.round((fia + t + o + e) * 100) / 100;
}

/**
 * Calculate Percentage
 * Percentage = (Total / 150) × 100, rounded to 2 decimal places
 */
function calcPercentage(total) {
    if (total === null || total === undefined) return null;
    return Math.round((total / 150) * 100 * 100) / 100;
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
 * Check individual passing conditions
 * - ESE marks >= 32 (40% of 80)
 * - TW marks >= 10 (40% of 25)
 * - Total marks >= 60 (40% of 150)
 */
function checkPassingConditions(ese, tw, total) {
    return {
        esePassed: ese !== null && ese !== undefined && ese >= 32,
        twPassed: tw !== null && tw !== undefined && tw >= 10,
        totalPassed: total !== null && total !== undefined && total >= 60,
        allPassed: (ese !== null && ese >= 32) &&
                   (tw !== null && tw >= 10) &&
                   (total !== null && total >= 60)
    };
}

/**
 * Determine result status
 * - "PASS"       → All 3 passing conditions met
 * - "FAIL"       → One or more passing conditions not met
 * - "DETAINED"   → Attendance < 75% (override)
 * - "INCOMPLETE" → Any of the 5 test types not yet filled
 */
function getResultStatus(marks, attendancePercent) {
    const { ia1, ia2, ese, oralExam, tw } = marks;

    // Check if all marks are filled
    const allFilled = ia1 !== null && ia1 !== undefined &&
        ia2 !== null && ia2 !== undefined &&
        ese !== null && ese !== undefined &&
        oralExam !== null && oralExam !== undefined &&
        tw !== null && tw !== undefined;

    if (!allFilled) return 'INCOMPLETE';

    // Check attendance — detained overrides pass/fail
    if (attendancePercent !== null && attendancePercent !== undefined && attendancePercent < 75) {
        return 'DETAINED';
    }

    const finalIA = calcFinalIA(ia1, ia2);
    const total = calcTotal(finalIA, tw, oralExam, ese);
    const passing = checkPassingConditions(ese, tw, total);

    return passing.allPassed ? 'PASS' : 'FAIL';
}

/**
 * Calculate complete final score for a student in a subject
 * This is the single entry point for all mark calculations
 */
function calcFinalScore(marks, attendancePercent) {
    const { ia1, ia2, ese, oralExam, tw, twBreakdown } = marks;

    const finalIA = calcFinalIA(ia1, ia2);
    const total = calcTotal(finalIA, tw, oralExam, ese);
    const percentage = calcPercentage(total);
    const gradeInfo = getGrade(percentage);
    const passing = checkPassingConditions(ese, tw, total);
    const status = getResultStatus(marks, attendancePercent);

    return {
        ia1: ia1 ?? null,
        ia2: ia2 ?? null,
        finalIA,
        tw: tw ?? null,
        twBreakdown: twBreakdown || null,
        oralExam: oralExam ?? null,
        ese: ese ?? null,
        total,
        percentage,
        grade: gradeInfo?.grade ?? null,
        gradeLabel: gradeInfo?.label ?? null,
        gradePoint: gradeInfo?.gp ?? null,
        passing,
        status,
        attendancePercent: attendancePercent ?? null
    };
}

/**
 * Build TW breakdown from assignment/experiment data
 * Returns { journal, assignments, labAttendance, internalViva, total }
 */
function buildTWBreakdown(experimentScores, experimentMax, assignmentScores, assignmentMax, labAttendanceScore, internalVivaScore) {
    const journal = scaleAverage(experimentScores, experimentMax || 10, 10);
    const assignments = scaleAverage(assignmentScores, assignmentMax || 10, 5);
    const labAttendance = Math.min(labAttendanceScore ?? 0, 5);
    const internalViva = Math.min(internalVivaScore ?? 0, 5);

    const breakdown = { journal, assignments, labAttendance, internalViva };
    const total = calcTermWork(breakdown);

    return { ...breakdown, total };
}

module.exports = {
    FIXED_TEST_TYPES,
    TW_COMPONENTS,
    GRADE_TABLE,
    calcFinalIA,
    scaleAverage,
    calcTermWork,
    calcTotal,
    calcPercentage,
    getGrade,
    checkPassingConditions,
    getResultStatus,
    calcFinalScore,
    buildTWBreakdown
};
