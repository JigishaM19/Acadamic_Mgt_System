import { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { FiPlus, FiEdit2, FiSearch, FiUsers, FiUser, FiRefreshCw, FiXCircle, FiFolder, FiCheckCircle } from 'react-icons/fi';
import { FaBook } from 'react-icons/fa';

const HodClasses = () => {
    const [classes, setClasses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [formData, setFormData] = useState({ name: '', year: 1, coordinatorId: '', maxCapacity: 75 });

    // Bulk upload state
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkFile, setBulkFile] = useState(null);
    const [bulkResult, setBulkResult] = useState(null);
    const [uploading, setUploading] = useState(false);

    // View Students Modal State
    const [studentsModalOpen, setStudentsModalOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);
    const [classStudents, setClassStudents] = useState(null);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [activeBatchTab, setActiveBatchTab] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchClasses();
        fetchTeachers();
    }, []);

    const fetchClasses = async () => {
        try {
            setLoading(true);
            const response = await api.get('/hod/classes');
            setClasses(response.data);
        } catch (error) {
            console.error('Failed to fetch classes:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTeachers = async () => {
        try {
            const response = await api.get('/hod/teachers');
            setTeachers(response.data);
        } catch (error) {
            console.error('Failed to fetch teachers:', error);
        }
    };

    const handleCreate = () => {
        setEditingClass(null);
        setFormData({ name: '', year: 1, coordinatorId: '', maxCapacity: 75 });
        setShowModal(true);
    };

    const handleEdit = (cls) => {
        setEditingClass(cls);
        setFormData({
            name: cls.name,
            year: cls.year,
            coordinatorId: cls.coordinatorId?._id || '',
            maxCapacity: cls.maxCapacity || 75
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingClass) {
                await api.put(`/hod/classes/${editingClass._id}`, formData);
            } else {
                await api.post('/hod/classes', formData);
            }
            setShowModal(false);
            fetchClasses();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to save class');
        }
    };

    const handleViewStudents = async (cls) => {
        setSelectedClass(cls);
        setStudentsModalOpen(true);
        setLoadingStudents(true);
        setActiveBatchTab(0);
        try {
            const response = await api.get(`/hod/classes/${cls._id}/students`);
            setClassStudents(response.data);
        } catch (error) {
            console.error('Failed to fetch students:', error);
            alert('Failed to load students');
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleReorganizeClass = async () => {
        if (!selectedClass) return;
        if (!confirm('This will sort students by last name, assign roll numbers, and reorganize batches. Continue?')) return;

        setLoadingStudents(true);
        try {
            const response = await api.post(`/hod/classes/${selectedClass._id}/reorganize`);
            setClassStudents(response.data);
            alert('Class reorganized successfully!');
            fetchClasses(); // Refresh the main list
        } catch (error) {
            console.error('Failed to reorganize class:', error);
            alert(error.response?.data?.message || 'Failed to reorganize class');
        } finally {
            setLoadingStudents(false);
        }
    };

    const closeStudentsModal = () => {
        setStudentsModalOpen(false);
        setSelectedClass(null);
        setClassStudents(null);
        setSearchQuery('');
    };

    const filterStudents = (students) => {
        if (!searchQuery.trim()) return students;
        const query = searchQuery.toLowerCase();
        return students.filter(student =>
            student.fullName?.toLowerCase().includes(query) ||
            student.username?.toLowerCase().includes(query) ||
            student.email?.toLowerCase().includes(query) ||
            student.rollNo?.toString().toLowerCase().includes(query)
        );
    };

    const handleBulkUpload = async () => {
        if (!bulkFile) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', bulkFile);
        try {
            const response = await api.post('/hod/classes/bulk-upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setBulkResult(response.data);
            fetchClasses();
        } catch (error) {
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const response = await api.get('/hod/classes/template', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'class_upload_template.xlsx');
            link.click();
        } catch (error) {
            alert('Failed to download template');
        }
    };

    return (
        <div>
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Class Management</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={handleDownloadTemplate}>Template</button>
                        <button className="btn btn-secondary" onClick={() => setBulkModalOpen(true)}>Import</button>
                        <button className="btn btn-primary" onClick={handleCreate}>
                            <FiPlus style={{ marginRight: '4px' }} /> Add Class
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="loading"><div className="spinner"></div></div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Class Name</th>
                                    <th>Year</th>
                                    <th>Coordinator</th>
                                    <th>Students</th>
                                    <th>Capacity</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classes.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="empty-state">
                                            <div className="empty-icon"><FaBook size={48} /></div>
                                            <h3>No classes found</h3>
                                        </td>
                                    </tr>
                                ) : (
                                    classes.map(cls => (
                                        <tr key={cls._id}>
                                            <td><strong>{cls.name}</strong></td>
                                            <td>{cls.year}{cls.year === 1 ? 'st' : cls.year === 2 ? 'nd' : cls.year === 3 ? 'rd' : 'th'} Year</td>
                                            <td>
                                                {cls.coordinatorId?.fullName || (
                                                    <span className="no-data">Not assigned</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`badge ${cls.studentCount > 0 ? 'badge-success' : 'badge-secondary'}`}>
                                                    {cls.studentCount || 0} students
                                                </span>
                                            </td>
                                            <td>
                                                <span className="badge badge-info">
                                                    Max: {cls.maxCapacity || 75}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="actions-cell">
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        onClick={() => handleViewStudents(cls)}
                                                        title="View Students"
                                                    >
                                                        <FiUsers style={{ marginRight: '4px' }} /> View
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        onClick={() => handleEdit(cls)}
                                                    >
                                                        <FiEdit2 style={{ marginRight: '4px' }} /> Edit
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingClass ? 'Edit Class' : 'Add New Class'}
            >
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Class Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="e.g., CS-A"
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Year</label>
                            <select
                                value={formData.year}
                                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                            >
                                <option value={1}>1st Year</option>
                                <option value={2}>2nd Year</option>
                                <option value={3}>3rd Year</option>
                                <option value={4}>4th Year</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Max Capacity</label>
                            <input
                                type="number"
                                value={formData.maxCapacity}
                                onChange={(e) => setFormData({ ...formData, maxCapacity: parseInt(e.target.value) })}
                                min={15}
                                max={75}
                                required
                            />
                            <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                Min: 15, Max: 75
                            </small>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Class Coordinator</label>
                        <select
                            value={formData.coordinatorId}
                            onChange={(e) => setFormData({ ...formData, coordinatorId: e.target.value })}
                        >
                            <option value="">Select Coordinator (Optional)</option>
                            {teachers.map(teacher => (
                                <option key={teacher._id} value={teacher._id}>
                                    {teacher.fullName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {editingClass ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Students Modal */}
            <Modal
                isOpen={studentsModalOpen}
                onClose={closeStudentsModal}
                title={`Students in ${selectedClass?.name || 'Class'}`}
                size="extra-large"
            >
                {loadingStudents ? (
                    <div className="loading"><div className="spinner"></div></div>
                ) : classStudents ? (
                    <div>
                        {/* Search Bar */}
                        <div style={{ marginBottom: '20px' }}>
                            <div className="search-box" style={{ maxWidth: '100%' }}>
                                <span className="search-icon"><FiSearch /></span>
                                <input
                                    type="text"
                                    placeholder="Search students by name, username, email, or roll number..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ paddingLeft: '40px' }}
                                />
                            </div>
                        </div>

                        {/* Class Summary */}
                        <div style={{
                            display: 'flex',
                            gap: '16px',
                            marginBottom: '20px',
                            padding: '16px',
                            background: 'var(--bg-secondary)',
                            borderRadius: '8px',
                            flexWrap: 'wrap',
                            alignItems: 'center'
                        }}>
                            <div>
                                <strong>Total Students:</strong> {classStudents.class.totalStudents}
                            </div>
                            <div>
                                <strong>Max Capacity:</strong> {classStudents.class.maxCapacity}
                            </div>
                            <div>
                                <strong>Batches:</strong> {classStudents.batches.length}
                            </div>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={handleReorganizeClass}
                                style={{ marginLeft: 'auto' }}
                            >
                                <FiRefreshCw style={{ marginRight: '4px' }} /> Reorganize Class
                            </button>
                        </div>

                        {/* Batch Tabs */}
                        {classStudents.batches.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                    <button
                                        className={`btn ${activeBatchTab === -1 ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                                        onClick={() => setActiveBatchTab(-1)}
                                    >
                                        All Students ({classStudents.allStudents.length})
                                    </button>
                                    {classStudents.batches.map((batch, index) => (
                                        <button
                                            key={batch._id}
                                            className={`btn ${activeBatchTab === index ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                                            onClick={() => setActiveBatchTab(index)}
                                        >
                                            {batch.name} ({batch.studentCount})
                                        </button>
                                    ))}
                                </div>

                                {/* Students Table */}
                                <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Roll No</th>
                                                <th>Name</th>
                                                <th>Username</th>
                                                <th>Email</th>
                                                <th>Phone</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filterStudents(activeBatchTab === -1
                                                ? classStudents.allStudents
                                                : classStudents.batches[activeBatchTab]?.students || []
                                            ).map((student) => (
                                                <tr key={student._id}>
                                                    <td>
                                                        <span className="badge badge-primary">
                                                            {student.rollNo || '-'}
                                                        </span>
                                                    </td>
                                                    <td><strong>{student.fullName}</strong></td>
                                                    <td>{student.username}</td>
                                                    <td>{student.email || '-'}</td>
                                                    <td>{student.phone || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {filterStudents(activeBatchTab === -1
                                        ? classStudents.allStudents
                                        : classStudents.batches[activeBatchTab]?.students || []
                                    ).length === 0 && (
                                            <div className="empty-state">
                                                <div className="empty-icon"><FiUser size={48} /></div>
                                                <h3>No students found</h3>
                                                <p>{searchQuery ? 'No students match your search criteria' : `No students assigned to this ${activeBatchTab === -1 ? 'class' : 'batch'} yet`}</p>
                                            </div>
                                        )}
                                </div>
                            </div>
                        )}

                        {classStudents.batches.length === 0 && classStudents.allStudents.length === 0 && (
                            <div className="empty-state">
                                <div className="empty-icon"><FiUser size={48} /></div>
                                <h3>No students</h3>
                                <p>No students assigned to this class yet</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon"><FiXCircle size={48} /></div>
                        <h3>Failed to load</h3>
                        <p>Could not load student data</p>
                    </div>
                )}
            </Modal>

            {/* Bulk Upload Modal */}
            <Modal isOpen={bulkModalOpen} onClose={() => { setBulkModalOpen(false); setBulkResult(null); setBulkFile(null); }} title="Bulk Upload Classes"
                footer={!bulkResult && (<><button className="btn btn-secondary" onClick={() => setBulkModalOpen(false)} disabled={uploading}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleBulkUpload} disabled={!bulkFile || uploading}>
                        {uploading ? <><span className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }}></span>Uploading...</> : 'Upload'}
                    </button></>)}>
                {!bulkResult ? (
                    <>
                        <p style={{ marginBottom: '16px', color: 'var(--gray-600)' }}>
                            Upload Excel file with columns: name, year, coordinatorUsername, maxCapacity
                        </p>
                        <div className="file-upload" onClick={() => document.getElementById('bulkHodClassFile').click()}>
                            <input id="bulkHodClassFile" type="file" accept=".xlsx,.xls" onChange={(e) => setBulkFile(e.target.files[0])} />
                            <div className="file-upload-icon"><FiFolder size={48} /></div>
                            <p>{bulkFile ? bulkFile.name : 'Click to select file'}</p>
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '48px' }}><FiCheckCircle size={48} /></div>
                        <h3>Upload Complete</h3>
                        <p>{bulkResult.successCount} classes created, {bulkResult.failedCount} failed</p>
                        {bulkResult.errors?.length > 0 && (
                            <div className="credentials-box" style={{ maxHeight: '200px', overflowY: 'auto', textAlign: 'left' }}>
                                <h4>Errors:</h4>
                                {bulkResult.errors.map((err, i) => (
                                    <div key={i} style={{ marginBottom: '4px', padding: '4px 8px', background: 'white', borderRadius: '4px', fontSize: '13px' }}>
                                        {err}
                                    </div>
                                ))}
                            </div>
                        )}
                        <button className="btn btn-primary" style={{ marginTop: '16px', width: '100%' }} onClick={() => { setBulkModalOpen(false); setBulkResult(null); setBulkFile(null); }}>Done</button>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default HodClasses;
