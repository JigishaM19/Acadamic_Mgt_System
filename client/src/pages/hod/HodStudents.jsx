import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { FiAlertTriangle, FiUpload, FiDownload, FiEdit2, FiSearch, FiUsers } from 'react-icons/fi';
import { FaHourglass } from 'react-icons/fa';

const HodStudents = () => {
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ year: '', classId: '', search: '' });
    const [editingStudent, setEditingStudent] = useState(null);
    const [selectedClass, setSelectedClass] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        fetchStudents();
    }, [filters]);

    const fetchClasses = async () => {
        try {
            const response = await api.get('/hod/classes');
            setClasses(response.data);
        } catch (error) {
            console.error('Failed to fetch classes:', error);
        }
    };

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.year) params.append('year', Number(filters.year));
            if (filters.classId) params.append('classId', filters.classId);
            if (filters.search) params.append('search', filters.search);

            const response = await api.get(`/hod/students?${params}`);
            setStudents(response.data);
        } catch (error) {
            console.error('Failed to fetch students:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClass = (student) => {
        setEditingStudent(student);
        setSelectedClass(student.classId?._id || '');
    };

    const handleSaveClass = async () => {
        try {
            await api.put(`/hod/students/${editingStudent._id}`, { classId: selectedClass });
            setEditingStudent(null);
            fetchStudents();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update student');
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setUploadResult(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/hod/students/bulk-assign', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadResult(response.data);
            fetchStudents();
        } catch (error) {
            setUploadResult({ error: error.response?.data?.message || 'Upload failed' });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const downloadTemplate = () => {
        // Template format: Student Name | Username | Current Class | Year
        const headers = ['Student Name', 'Username', 'Current Class', 'Year'];
        const exampleRow = ['Example Student', 'student_username', 'Class-A', '1'];

        const csvContent = [
            headers.join(','),
            exampleRow.join(',')
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'student_class_assignment_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const exportUnassignedStudents = async () => {
        setExporting(true);
        try {
            // Build params with current filters
            const params = new URLSearchParams();
            if (filters.year) params.append('year', filters.year);
            // Don't filter by classId - we want unassigned students

            const response = await api.get(`/hod/students?${params}`);
            const allStudents = response.data;

            // Filter to only unassigned students (no classId or classId is null)
            const unassignedStudents = allStudents.filter(s => !s.classId);

            if (unassignedStudents.length === 0) {
                alert(filters.year
                    ? `No unassigned students found for Year ${filters.year}.`
                    : 'No unassigned students found.');
                setExporting(false);
                return;
            }

            // Create Excel-compatible CSV with format: Student Name | Username | Current Class (blank) | Year
            const headers = ['Student Name', 'Username', 'Current Class', 'Year'];
            const rows = unassignedStudents.map(student => [
                student.fullName || '',
                student.username || '',
                '', // Current Class - blank for unassigned
                student.year || ''
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Create and download the file
            const yearSuffix = filters.year ? `_year${filters.year}` : '';
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `unassigned_students${yearSuffix}_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export students:', error);
            alert('Failed to export students');
        } finally {
            setExporting(false);
        }
    };

    // Count unassigned students
    const unassignedCount = students.filter(s => !s.classId).length;

    return (
        <div>
            <div className="card">
                {/* Student Count Display */}
                <div style={{
                    padding: '16px 24px',
                    background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--primary) 100%)',
                    borderRadius: '12px',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '2rem' }}></span>
                        <div>
                            <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{students.length}</div>
                            <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                                {(filters.year || filters.classId || filters.search) ? 'Filtered Students' : 'Total Students'}
                            </div>
                        </div>
                    </div>
                    {unassignedCount > 0 && (
                        <div style={{
                            background: 'rgba(255,255,255,0.2)',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '0.875rem'
                        }}>
                            <FiAlertTriangle style={{ marginRight: '4px' }} /> {unassignedCount} unassigned
                        </div>
                    )}
                </div>

                <div className="card-header">
                    <h2 className="card-title">Student Management</h2>
                    <div className="header-actions" style={{ display: 'flex', gap: '8px' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={downloadTemplate}
                            title="Download template for bulk assignment"
                        >
                            <FiDownload style={{ marginRight: '4px' }} /> Template
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={exportUnassignedStudents}
                            disabled={exporting}
                            title={filters.year
                                ? `Export Year ${filters.year} students not yet assigned to a class`
                                : 'Export students not yet assigned to a class'}
                        >
                            {exporting ? <><FaHourglass style={{ marginRight: '4px' }} /> Exporting...</> : <><FiUpload style={{ marginRight: '4px' }} /> Export Unassigned{filters.year ? ` (Year ${filters.year})` : ''}</>}
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowUploadModal(true)}
                        >
                            <FiUpload style={{ marginRight: '4px' }} /> Bulk Assign
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="toolbar">
                    <div className="search-box">
                        <span className="search-icon"><FiSearch /></span>
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>
                    <div className="filter-group">
                        <select
                            value={filters.year}
                            onChange={(e) => setFilters({ ...filters, year: e.target.value, classId: '' })}
                        >
                            <option value="">All Years</option>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                        </select>
                        <select
                            value={filters.classId}
                            onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
                        >
                            <option value="">All Classes</option>
                            {classes
                                .filter(c => !filters.year || c.year === parseInt(filters.year))
                                .map(cls => (
                                    <option key={cls._id} value={cls._id}>{cls.name}</option>
                                ))
                            }
                        </select>
                    </div>
                </div>



                {loading ? (
                    <div className="loading"><div className="spinner"></div></div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Student Name</th>
                                    <th>Username</th>
                                    <th>Current Class</th>
                                    <th>Year</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="empty-state">
                                            <div className="empty-icon"><FiUsers size={48} /></div>
                                            <h3>No students found</h3>
                                        </td>
                                    </tr>
                                ) : (
                                    students.map(student => (
                                        <tr key={student._id}>
                                            <td><strong>{student.fullName}</strong></td>
                                            <td>{student.username}</td>
                                            <td>
                                                <span className={`badge ${student.classId ? 'badge-primary' : 'badge-warning'}`}>
                                                    {student.classId?.name || 'Not Assigned'}
                                                </span>
                                            </td>
                                            <td>{student.classId?.year || student.year || '-'}</td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={() => handleEditClass(student)}
                                                >
                                                    <FiEdit2 style={{ marginRight: '4px' }} /> Edit Class
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Class Modal */}
            <Modal
                isOpen={!!editingStudent}
                onClose={() => setEditingStudent(null)}
                title={`Assign Class - ${editingStudent?.fullName}`}
            >
                <div className="form-group">
                    <label className="form-label">Select Class</label>
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                    >
                        <option value="">Select a class</option>
                        {classes.map(cls => (
                            <option key={cls._id} value={cls._id}>
                                {cls.name} (Year {cls.year})
                            </option>
                        ))}
                    </select>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setEditingStudent(null)}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleSaveClass}>
                        Save
                    </button>
                </div>
            </Modal>

            {/* Bulk Upload Modal */}
            <Modal
                isOpen={showUploadModal}
                onClose={() => { setShowUploadModal(false); setUploadResult(null); }}
                title="Bulk Class Assignment"
            >
                <div className="upload-section">
                    <p style={{ marginBottom: '16px', color: 'var(--gray-600)' }}>
                        Upload an Excel/CSV file to assign students to classes in bulk.
                        Required columns: <strong>Username</strong> and <strong>Current Class</strong> (or Class Name).
                    </p>

                    <div style={{
                        background: 'var(--gray-50)',
                        padding: '16px',
                        borderRadius: '8px',
                        marginBottom: '16px'
                    }}>
                        <strong style={{ fontSize: '14px', color: 'var(--gray-700)' }}>
                            Expected Format:
                        </strong>
                        <div style={{
                            marginTop: '8px',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            color: 'var(--gray-600)'
                        }}>
                            Student Name | Username | Current Class | Year
                        </div>
                    </div>

                    <button className="btn btn-secondary" onClick={downloadTemplate} style={{ marginBottom: '16px' }}>
                        <FiDownload style={{ marginRight: '4px' }} /> Download Template
                    </button>

                    <div className="file-upload-area">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            {uploading ? (
                                <>
                                    <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
                                    Uploading...
                                </>
                            ) : <><FiUpload style={{ marginRight: '4px' }} /> Select File & Upload</>}
                        </button>
                    </div>

                    {uploadResult && (
                        <div className="upload-result" style={{ marginTop: '20px' }}>
                            {uploadResult.error ? (
                                <div className="error-message">{uploadResult.error}</div>
                            ) : (
                                <>
                                    <div className="result-summary">
                                        <div className="result-item success">
                                            <span className="result-count">{uploadResult.successCount}</span>
                                            <span>Successful</span>
                                        </div>
                                        <div className="result-item danger">
                                            <span className="result-count">{uploadResult.failedCount}</span>
                                            <span>Failed</span>
                                        </div>
                                    </div>
                                    {uploadResult.errors?.length > 0 && (
                                        <div className="error-list" style={{ marginTop: '16px', maxHeight: '150px', overflow: 'auto' }}>
                                            <strong>Errors:</strong>
                                            {uploadResult.errors.map((err, idx) => (
                                                <div key={idx} className="error-item" style={{ fontSize: '12px', color: 'var(--danger)' }}>
                                                    Row: {JSON.stringify(err.row)} - {err.error}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default HodStudents;
