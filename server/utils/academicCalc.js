/**
 * Academic Calculation Utility
 * ATTENDANCE-ONLY functions (slab system preserved)
 * 
 * For marks/grades/IA calculations, see markCalculationService.js
 */

/**
 * Calculate subject-level attendance percentage
 * @param {number} attended - Classes attended
 * @param {number} conducted - Total classes conducted
 * @returns {number} Percentage (0-100)
 */
function calcAttendancePercent(attended, conducted) {
    if (conducted <= 0) return 0;
    return Math.round((attended / conducted) * 100 * 100) / 100;
}

/**
 * Calculate overall attendance across all subjects
 * @param {{ attended: number, conducted: number }[]} subjectStats
 * @returns {number} Overall percentage
 */
function calcOverallAttendance(subjectStats) {
    const totalAttended = subjectStats.reduce((sum, s) => sum + (s.attended || 0), 0);
    const totalConducted = subjectStats.reduce((sum, s) => sum + (s.conducted || 0), 0);
    if (totalConducted <= 0) return 0;
    return Math.round((totalAttended / totalConducted) * 100 * 100) / 100;
}

/**
 * Look up slab multiplier based on attendance percentage
 * Slabs must be sorted descending by `min`
 * @param {number} percentage
 * @param {{ min: number, multiplier: number }[]} slabs
 * @returns {number} Multiplier (0 to 1)
 */
function getAttendanceSlab(percentage, slabs) {
    if (!slabs || slabs.length === 0) return 0;
    const sorted = [...slabs].sort((a, b) => b.min - a.min);
    for (const slab of sorted) {
        if (percentage >= slab.min) {
            return slab.multiplier;
        }
    }
    return 0;
}

/**
 * Calculate Attendance Marks using slab multiplier
 * @param {number} percentage - Attendance percentage
 * @param {number} attendanceWeight - Weight for attendance component (e.g., 5)
 * @param {{ min: number, multiplier: number }[]} slabs
 * @returns {number}
 */
function calcAttendanceMarks(percentage, attendanceWeight, slabs) {
    const multiplier = getAttendanceSlab(percentage, slabs);
    return Math.round((attendanceWeight * multiplier) * 100) / 100;
}

/**
 * Check eligibility based on attendance
 * @param {number} attendancePercent
 * @param {number} minPercent - Minimum required (e.g., 75)
 * @returns {boolean}
 */
function isEligible(attendancePercent, minPercent) {
    return attendancePercent >= minPercent;
}

/**
 * Calculate required classes to reach minimum attendance
 * @param {number} conducted - Total classes conducted
 * @param {number} attended - Classes attended
 * @param {number} minPercent - Minimum required percentage (e.g., 75)
 * @returns {number} Number of additional classes needed (0 if already eligible)
 */
function requiredClasses(conducted, attended, minPercent) {
    const minFraction = minPercent / 100;
    if (minFraction >= 1) return Infinity;

    const currentPercent = conducted > 0 ? (attended / conducted) * 100 : 0;
    if (currentPercent >= minPercent) return 0;

    const needed = ((minFraction * conducted) - attended) / (1 - minFraction);
    return Math.ceil(Math.max(0, needed));
}

module.exports = {
    calcAttendancePercent,
    calcOverallAttendance,
    getAttendanceSlab,
    calcAttendanceMarks,
    isEligible,
    requiredClasses
};
