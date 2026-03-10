import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiEdit2, FiTrash2, FiPlus, FiUsers, FiSearch, FiRefreshCw, FiUser, FiXCircle, FiFolder, FiCheckCircle } from 'react-icons/fi';
import { FaBook } from 'react-icons/fa';
import Modal from '../components/Modal';
import Pagination, { usePagination } from '../components/Pagination';

const Classes = () => {
    const [classes, setClasses] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [coordinators, setCoordinators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        year: 1,
        departmentId: '',
        coordinatorId: '',
        maxCapacity: 75
    });

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
    const { currentPage, pageSize, handlePageChange, handlePageSizeChange, paginateData } = usePagination(30);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [classesRes, deptsRes, usersRes] = await Promise.all([
                api.get('/classes'),
                api.get('/departments'),
                api.get('/users?role=classcoordinator')
            ]);
            setClasses(classesRes.data);
            setDepartments(deptsRes.data);
            setCoordinators(usersRes.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingClass) {
                await api.put(`/classes/${editingClass._id}`, formData);
            } else {
                await api.post('/classes', formData);
            }
            fetchData();
            closeModal();
        } catch (error) {
            alert(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleEdit = (cls) => {
        setEditingClass(cls);
        setFormData({
            name: cls.name,
            year: cls.year,
            departmentId: cls.departmentId?._id || '',
            coordinatorId: cls.coordinatorId?._id || '',
            maxCapacity: cls.maxCapacity || 75
        });
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this class?')) return;
        try {
            await api.delete(`/classes/${id}`);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Delete failed');
        }
    };

    const openAddModal = () => {
        setEditingClass(null);
        setFormData({ name: '', year: 1, departmentId: '', coordinatorId: '', maxCapacity: 75 });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingClass(null);
    };

    const handleViewStudents = async (cls) => {
        setSelectedClass(cls);
        setStudentsModalOpen(true);
        setLoadingStudents(true);
        setActiveBatchTab(0);
        try {
            const response = await api.get(`/classes/${cls._id}/students`);
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
            const response = await api.post(`/classes/${selectedClass._id}/reorganize`);
            setClassStudents(response.data);
            alert('Class reorganized successfully!');
            fetchData(); // Refresh the main list
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
            const response = await api.post('/classes/bulk-upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setBulkResult(response.data);
            fetchData();
        } catch (error) {
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const response = await api.get('/classes/template', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'class_upload_template.xlsx');
            link.click();
        } catch (error) {
            alert('Failed to download template');
        }
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Classes</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={handleDownloadTemplate}>Template</button>
                        <button className="btn btn-secondary" onClick={() => setBulkModalOpen(true)}>Import</button>
                        <button className="btn btn-primary" onClick={openAddModal}>
                            <FiPlus style={{ marginRight: '4px' }} /> Add Class
                        </button>
                    </div>
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalItems={classes.length}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                >
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Class Name</th>
                                    <th>Year</th>
                                    <th>Department</th>
                                    <th>Coordinator</th>
                                    <th>Students</th>
                                    <th>Capacity</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginateData(classes).map((cls) => (
                                    <tr key={cls._id}>
                                        <td><strong>{cls.name}</strong></td>
                                        <td><span className="badge badge-primary">Year {cls.year}</span></td>
                                        <td>{cls.departmentId?.name || '-'}</td>
                                        <td>{cls.coordinatorId?.fullName || '-'}</td>
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
                                                    <FiUsers style={{ marginRight: '4px' }} /> View Students
                                                </button>
                                                <button className="btn-icon" onClick={() => handleEdit(cls)} title="Edit"><FiEdit2 /></button>
                                                <button className="btn-icon" onClick={() => handleDelete(cls._id)} title="Delete"><FiTrash2 /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {classes.length === 0 && (
                            <div className="empty-state">
                                <div className="empty-icon"><FaBook size={48} /></div>
                                <h3>No classes yet</h3>
                                <p>Create your first class to get started</p>
                            </div>
                        )}
                    </div>
                </Pagination>
            </div>

            {/* Add/Edit Class Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={closeModal}
                title={editingClass ? 'Edit Class' : 'Add Class'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            {editingClass ? 'Update' : 'Create'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Class Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., FY-CSE-A"
                            required
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Year *</label>
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
                            <label className="form-label">Department *</label>
                            <select
                                value={formData.departmentId}
                                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                                required
                            >
                                <option value="">Select Department</option>
                                {departments.map((dept) => (
                                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Max Capacity *</label>
                            <input
                                type="number"
                                value={formData.maxCapacity}
                                onChange={(e) => setFormData({ ...formData, maxCapacity: parseInt(e.target.value) })}
                                min={15}
                                max={75}
                                required
                            />
                            <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                Min: 15, Max: 75 (allows up to 3 batches of 25 students)
                            </small>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Class Coordinator</label>
                            <select
                                value={formData.coordinatorId}
                                onChange={(e) => setFormData({ ...formData, coordinatorId: e.target.value })}
                            >
                                <option value="">Select Coordinator</option>
                                {coordinators.map((coordinator) => (
                                    <option key={coordinator._id} value={coordinator._id}>
                                        {coordinator.fullName || `${coordinator.firstName} ${coordinator.lastName}`}
                                    </option>
                                ))}
                            </select>
                        </div>
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
                            borderRadius: '8px'
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
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
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
                                                <div className="empty-icon"><FiUser size={32} /></div>
                                                <h3>No students found</h3>
                                                <p>{searchQuery ? 'No students match your search criteria' : `No students assigned to this ${activeBatchTab === -1 ? 'class' : 'batch'} yet`}</p>
                                            </div>
                                        )}
                                </div>
                            </div>
                        )}

                        {classStudents.batches.length === 0 && classStudents.allStudents.length === 0 && (
                            <div className="empty-state">
                                <div className="empty-icon"><FiUser size={32} /></div>
                                <h3>No students</h3>
                                <p>No students assigned to this class yet</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon"><FiXCircle size={32} /></div>
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
                            Upload Excel file with columns: name, year, departmentCode, coordinatorUsername, maxCapacity
                        </p>
                        <div className="file-upload" onClick={() => document.getElementById('bulkClassFile').click()}>
                            <input id="bulkClassFile" type="file" accept=".xlsx,.xls" onChange={(e) => setBulkFile(e.target.files[0])} />
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

export default Classes;
