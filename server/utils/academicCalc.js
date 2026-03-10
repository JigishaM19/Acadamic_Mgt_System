/**
 * Academic Calculation Utility
 * Centralized IA, attendance, and eligibility calculations
 */

/**
 * Calculate Unit Test IA contribution
 * If multiple UTs: average them first, then scale to weight
 * @param {number[]} utScores - Array of UT scores obtained
 * @param {number} maxMarks - Max marks for each UT (e.g., 20)
 * @param {number} utWeight - IA weight for UT component (e.g., 10)
 * @returns {number} UT IA marks (rounded to 2 decimal places)
 */
function calcUTIA(utScores, maxMarks, utWeight) {
    if (!utScores || utScores.length === 0 || maxMarks <= 0) return 0;
    const validScores = utScores.filter(s => s !== null && s !== undefined);
    if (validScores.length === 0) return 0;

    const average = validScores.reduce((sum, s) => sum + s, 0) / validScores.length;
    return Math.round(((average / maxMarks) * utWeight) * 100) / 100;
}

/**
 * Calculate Assignment IA contribution
 * @param {number} marksObtained
 * @param {number} maxMarks
 * @param {number} assignmentWeight - IA weight for assignment component (e.g., 5)
 * @returns {number}
 */
function calcAssignmentIA(marksObtained, maxMarks, assignmentWeight) {
    if (marksObtained === null || marksObtained === undefined || maxMarks <= 0) return 0;
    return Math.round(((marksObtained / maxMarks) * assignmentWeight) * 100) / 100;
}

/**
 * Calculate Practical IA contribution
 * @param {number} marksObtained
 * @param {number} maxMarks
 * @param {number} practicalWeight
 * @returns {number}
 */
function calcPracticalIA(marksObtained, maxMarks, practicalWeight) {
    if (marksObtained === null || marksObtained === undefined || maxMarks <= 0) return 0;
    return Math.round(((marksObtained / maxMarks) * practicalWeight) * 100) / 100;
}

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
    // Sort descending by min to ensure correct lookup
    const sorted = [...slabs].sort((a, b) => b.min - a.min);
    for (const slab of sorted) {
        if (percentage >= slab.min) {
            return slab.multiplier;
        }
    }
    return 0;
}

/**
 * Calculate Attendance IA contribution
 * @param {number} percentage - Attendance percentage
 * @param {number} attendanceWeight - IA weight for attendance component (e.g., 5)
 * @param {{ min: number, multiplier: number }[]} slabs
 * @returns {number}
 */
function calcAttendanceIA(percentage, attendanceWeight, slabs) {
    const multiplier = getAttendanceSlab(percentage, slabs);
    return Math.round((attendanceWeight * multiplier) * 100) / 100;
}

/**
 * Calculate total IA
 * @param {number} utIA
 * @param {number} assignmentIA
 * @param {number} attendanceIA
 * @returns {number}
 */
function calcTotalIA(utIA, assignmentIA, attendanceIA) {
    return Math.round((utIA + assignmentIA + attendanceIA) * 100) / 100;
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
 * Formula: required = ((minPercent/100 * totalConducted) - attended) / (1 - minPercent/100)
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
    calcUTIA,
    calcAssignmentIA,
    calcPracticalIA,
    calcAttendancePercent,
    calcOverallAttendance,
    getAttendanceSlab,
    calcAttendanceIA,
    calcTotalIA,
    isEligible,
    requiredClasses
};
