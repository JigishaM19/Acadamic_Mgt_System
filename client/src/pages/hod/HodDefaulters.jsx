import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiDownload, FiFilter, FiAlertTriangle, FiSearch } from 'react-icons/fi';
import Pagination, { usePagination } from '../../components/Pagination';

const PERCENTAGE_RANGES = [
    { label: 'All', value: '' },
    { label: '1 - 40%', value: '1-40' },
    { label: '41 - 74%', value: '41-74' },
    { label: '75 - 79%', value: '75-79' },
    { label: '80 - 89%', value: '80-89' },
    { label: '90 - 100%', value: '90-100' },
];

const HodDefaulters = () => {
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    // Filters
    const [yearFilter, setYearFilter] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [percentageFilter, setPercentageFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination
    const { currentPage, pageSize, handlePageChange, handlePageSizeChange, resetPage, paginateData } = usePagination(30);

    useEffect(() => {
        fetchDefaulters();
    }, [yearFilter, classFilter, percentageFilter]);

    // Reset page when filters change
    useEffect(() => {
        resetPage();
    }, [yearFilter, classFilter, percentageFilter, searchQuery]);

    const fetchDefaulters = async () => {
        try {
            setLoading(true);
            const params = {};
            if (yearFilter) params.year = yearFilter;
            if (classFilter) params.classId = classFilter;
            if (percentageFilter) params.percentageRange = percentageFilter;

            const response = await api.get('/hod/defaulters', { params });
            setStudents(response.data.students || []);
            setClasses(response.data.classes || []);
        } catch (error) {
            console.error('Failed to fetch defaulters:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            const params = {};
            if (yearFilter) params.year = yearFilter;
            if (classFilter) params.classId = classFilter;
            if (percentageFilter) params.percentageRange = percentageFilter;

            const response = await api.get('/hod/defaulters/export', {
                params,
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'Defaulters_Report.xlsx');
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

    // Get unique years from classes
    const years = [...new Set(classes.map(c => c.year))].sort();

    // Filter classes based on year
    const filteredClasses = yearFilter
        ? classes.filter(c => c.year === parseInt(yearFilter))
        : classes;

    // Client-side search filter
    const searchedStudents = searchQuery
        ? students.filter(s =>
            s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.rollNo && s.rollNo.toString().includes(searchQuery)) ||
            s.username.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : students;

    // Sort by year ascending, then roll number ascending
    const sortedStudents = [...searchedStudents].sort((a, b) => {
        const yearA = a.year || 0;
        const yearB = b.year || 0;
        if (yearA !== yearB) return yearA - yearB;
        const rollA = a.rollNo || 999999;
        const rollB = b.rollNo || 999999;
        return rollA - rollB;
    });

    // Count defaulters (below 75%)
    const defaulterCount = sortedStudents.filter(s => s.overallPercentage < 75).length;

    // Paginate
    const paginatedStudents = paginateData(sortedStudents);

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiAlertTriangle size={22} style={{ color: 'var(--danger)' }} />
                        <h2 className="card-title" style={{ margin: 0 }}>Defaulters</h2>
                        <span className="badge" style={{
                            background: 'rgba(239,68,68,0.1)',
                            color: 'var(--danger)',
                            marginLeft: '8px'
                        }}>
                            {defaulterCount} defaulter{defaulterCount !== 1 ? 's' : ''} (below 75%)
                        </span>
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
                    <div style={{ minWidth: '140px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                            Year
                        </label>
                        <select
                            className="form-input"
                            value={yearFilter}
                            onChange={(e) => {
                                setYearFilter(e.target.value);
                                setClassFilter('');
                            }}
                        >
                            <option value="">All Years</option>
                            {years.map(y => (
                                <option key={y} value={y}>Year {y}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ minWidth: '180px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                            Class
                        </label>
                        <select
                            className="form-input"
                            value={classFilter}
                            onChange={(e) => setClassFilter(e.target.value)}
                        >
                            <option value="">All Classes</option>
                            {filteredClasses.map(c => (
                                <option key={c._id} value={c._id}>{c.name} (Year {c.year})</option>
                            ))}
                        </select>
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
                                    <th>Year</th>
                                    <th>Class</th>
                                    <th style={{ textAlign: 'center' }}>Overall Attendance %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedStudents.length > 0 ? (
                                    paginatedStudents.map((s, i) => (
                                        <tr key={s.studentId || i}>
                                            <td>{s.rollNo || '—'}</td>
                                            <td>{s.fullName}</td>
                                            <td>{s.year}</td>
                                            <td>{s.className}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    background: getPercentageBg(s.overallPercentage),
                                                    color: getPercentageColor(s.overallPercentage)
                                                }}>
                                                    {s.overallPercentage}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                            No students found matching the selected filters
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Pagination>
            </div>
        </div>
    );
};

export default HodDefaulters;
