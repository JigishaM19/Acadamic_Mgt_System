import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiDownload, FiFilter, FiAlertTriangle, FiSearch, FiArrowLeft, FiBook } from 'react-icons/fi';
import Pagination, { usePagination } from '../../components/Pagination';

const PERCENTAGE_RANGES = [
    { label: 'All', value: '' },
    { label: '1 - 40%', value: '1-40' },
    { label: '41 - 74%', value: '41-74' },
    { label: '75 - 79%', value: '75-79' },
    { label: '80 - 89%', value: '80-89' },
    { label: '90 - 100%', value: '90-100' },
];

const TeacherDefaulters = () => {
    const [classSubjects, setClassSubjects] = useState([]);
    const [loading, setLoading] = useState(true);

    // Selected class-subject view
    const [selectedCS, setSelectedCS] = useState(null);
    const [students, setStudents] = useState([]);
    const [detailInfo, setDetailInfo] = useState({});
    const [detailLoading, setDetailLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Filters
    const [percentageFilter, setPercentageFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination
    const { currentPage, pageSize, handlePageChange, handlePageSizeChange, resetPage, paginateData } = usePagination(30);

    useEffect(() => {
        fetchClassSubjects();
    }, []);

    // Reset page when filters change
    useEffect(() => {
        resetPage();
    }, [percentageFilter, searchQuery]);

    const fetchClassSubjects = async () => {
        try {
            setLoading(true);
            const response = await api.get('/teacher/defaulters');
            setClassSubjects(response.data || []);
        } catch (error) {
            console.error('Failed to fetch class subjects:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentDetails = async (classId, subject) => {
        try {
            setDetailLoading(true);
            const params = {};
            if (percentageFilter) params.percentageRange = percentageFilter;

            const response = await api.get(`/teacher/defaulters/${classId}/${encodeURIComponent(subject)}`, { params });
            setStudents(response.data.students || []);
            setDetailInfo({
                className: response.data.className,
                year: response.data.year,
                department: response.data.department,
                subject: response.data.subject,
                facultyName: response.data.facultyName
            });
        } catch (error) {
            console.error('Failed to fetch student details:', error);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleSelectCS = (cs) => {
        setSelectedCS(cs);
        setPercentageFilter('');
        setSearchQuery('');
        resetPage();
        fetchStudentDetails(cs.classId, cs.subject);
    };

    const handleBack = () => {
        setSelectedCS(null);
        setStudents([]);
        setDetailInfo({});
        setPercentageFilter('');
        setSearchQuery('');
        resetPage();
    };

    // Re-fetch when filter changes
    useEffect(() => {
        if (selectedCS) {
            fetchStudentDetails(selectedCS.classId, selectedCS.subject);
        }
    }, [percentageFilter]);

    const handleExport = async () => {
        try {
            setExporting(true);
            const params = {};
            if (percentageFilter) params.percentageRange = percentageFilter;

            const response = await api.get(`/teacher/defaulters/${selectedCS.classId}/${encodeURIComponent(selectedCS.subject)}/export`, {
                params,
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${selectedCS.subject}_Defaulters_Report.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export:', error);
        } finally {
            setExporting(false);
        }
    };

    const getPercentageColor = (pct) => {
        if (pct >= 90) return 'var(--success)';
        if (pct >= 75) return '#22c55e';
        if (pct >= 60) return 'var(--warning)';
        return 'var(--danger)';
    };

    const getPercentageBg = (pct) => {
        if (pct >= 90) return 'rgba(34,197,94,0.1)';
        if (pct >= 75) return 'rgba(34,197,94,0.08)';
        if (pct >= 60) return 'rgba(245,158,11,0.1)';
        return 'rgba(239,68,68,0.1)';
    };

    const getStatusClass = (pct) => {
        if (pct >= 75) return 'good';
        if (pct >= 60) return 'warning';
        return 'critical';
    };

    // Client-side search
    const searchedStudents = searchQuery
        ? students.filter(s =>
            s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.rollNo && s.rollNo.toString().includes(searchQuery)) ||
            s.username.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : students;

    // Sort by roll number ascending
    const sortedStudents = [...searchedStudents].sort((a, b) => {
        const rollA = a.rollNo || 999999;
        const rollB = b.rollNo || 999999;
        return rollA - rollB;
    });

    // Count defaulters (below 75%)
    const defaulterCount = sortedStudents.filter(s => s.attendancePercentage < 75).length;

    // Paginate
    const paginatedStudents = paginateData(sortedStudents);

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    // If no class-subject selected, show the list
    if (!selectedCS) {
        return (
            <div>
                {/* Header */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FiAlertTriangle size={22} style={{ color: 'var(--danger)' }} />
                            <h2 className="card-title" style={{ margin: 0 }}>Defaulters</h2>
                        </div>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Select a class and subject to view student attendance
                        </p>
                    </div>
                </div>

                {/* Class-Subject Cards */}
                <div className="year-cards-grid">
                    {classSubjects.length > 0 ? (
                        classSubjects.map((cs, idx) => (
                            <div
                                key={idx}
                                className="year-card"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleSelectCS(cs)}
                            >
                                <div className="year-header">
                                    <span className="year-number">{cs.subject}</span>
                                    <span className={`attendance-badge ${getStatusClass(cs.avgAttendance || 0)}`}>
                                        {cs.avgAttendance || 0}%
                                    </span>
                                </div>
                                <div style={{ padding: '8px 0', color: 'var(--gray-600)', fontSize: '0.85rem' }}>
                                    {cs.className} • {cs.department} • Year {cs.year}
                                </div>
                                <div className="year-stats">
                                    <div className="year-stat">
                                        <span className="stat-value">{cs.totalLectures || 0}</span>
                                        <span className="stat-label">Lectures</span>
                                    </div>
                                    <div className="year-stat">
                                        <span className="stat-value" style={{ color: getPercentageColor(cs.avgAttendance || 0) }}>
                                            {cs.avgAttendance || 0}%
                                        </span>
                                        <span className="stat-label">Avg Attendance</span>
                                    </div>
                                </div>
                                <div className="attendance-bar">
                                    <div
                                        className="attendance-fill"
                                        style={{
                                            width: `${cs.avgAttendance || 0}%`,
                                            background: getPercentageColor(cs.avgAttendance || 0)
                                        }}
                                    ></div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
                            <FiBook size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
                            <p>No classes assigned yet.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Detail view - student list for selected class-subject
    return (
        <div>
            {/* Header */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={handleBack}
                                style={{ padding: '6px 10px', display: 'flex', alignItems: 'center' }}
                            >
                                <FiArrowLeft size={16} />
                            </button>
                            <FiAlertTriangle size={22} style={{ color: 'var(--danger)' }} />
                            <h2 className="card-title" style={{ margin: 0 }}>
                                Defaulters — {detailInfo.subject}
                            </h2>
                            <span className="badge" style={{
                                background: 'rgba(239,68,68,0.1)',
                                color: 'var(--danger)',
                                marginLeft: '8px'
                            }}>
                                {defaulterCount} defaulter{defaulterCount !== 1 ? 's' : ''} (below 75%)
                            </span>
                        </div>
                        <p style={{ margin: '4px 0 0 40px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {detailInfo.className} • Year {detailInfo.year} • {detailInfo.department}
                        </p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={handleExport}
                        disabled={exporting || sortedStudents.length === 0}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <FiDownload size={16} />
                        {exporting ? 'Exporting...' : 'Export Excel'}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FiFilter size={16} /> Filters
                    </h2>
                </div>
                <div style={{ padding: '16px 24px 24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: '1', minWidth: '200px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                            Search
                        </label>
                        <div style={{ position: 'relative' }}>
                            <FiSearch size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Search by name, roll no..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ paddingLeft: '34px' }}
                            />
                        </div>
                    </div>
                    <div style={{ minWidth: '160px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                            Attendance %
                        </label>
                        <select
                            className="form-input"
                            value={percentageFilter}
                            onChange={(e) => setPercentageFilter(e.target.value)}
                        >
                            {PERCENTAGE_RANGES.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Student Table with Pagination */}
            {detailLoading ? (
                <div className="loading">
                    <div className="spinner"></div>
                </div>
            ) : (
                <div className="card">
                    <Pagination
                        currentPage={currentPage}
                        totalItems={sortedStudents.length}
                        pageSize={pageSize}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                    >
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Roll No</th>
                                        <th>Name</th>
                                        <th style={{ textAlign: 'center' }}>Attendance %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedStudents.length > 0 ? (
                                        paginatedStudents.map((s, i) => (
                                            <tr key={s.studentId || i}>
                                                <td>{s.rollNo || '—'}</td>
                                                <td>{s.fullName}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '12px',
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                        background: getPercentageBg(s.attendancePercentage),
                                                        color: getPercentageColor(s.attendancePercentage)
                                                    }}>
                                                        {s.attendancePercentage}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                                No students found matching the selected filters
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Pagination>
                </div>
            )}
        </div>
    );
};

export default TeacherDefaulters;
