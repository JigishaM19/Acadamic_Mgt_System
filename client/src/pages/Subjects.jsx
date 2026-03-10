import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiEdit2, FiTrash2, FiPlus, FiBookOpen, FiFolder, FiCheckCircle } from 'react-icons/fi';
import Modal from '../components/Modal';
import Pagination, { usePagination } from '../components/Pagination';

const Subjects = () => {
    const [subjects, setSubjects] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkFile, setBulkFile] = useState(null);
    const [bulkResult, setBulkResult] = useState(null);
    const [uploading, setUploading] = useState(false);
    const { currentPage, pageSize, handlePageChange, handlePageSizeChange, paginateData } = usePagination(30);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        type: 'both',
        practicalName: '',
        practicalCode: '',
        year: 1,
        semester: 1,
        departmentId: ''
    });

    // Helper to get semester options for a given year
    const getSemesterOptions = (year) => {
        const yr = parseInt(year) || 1;
        const sem1 = (yr - 1) * 2 + 1;
        const sem2 = sem1 + 1;
        return [
            { value: sem1, label: `SEM-${sem1}` },
            { value: sem2, label: `SEM-${sem2}` }
        ];
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [subjectsRes, departmentsRes] = await Promise.all([
                api.get('/subjects'),
                api.get('/departments')
            ]);
            setSubjects(subjectsRes.data);
            setDepartments(departmentsRes.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingSubject(null);
        setFormData({
            name: '',
            code: '',
            type: 'both',
            practicalName: '',
            practicalCode: '',
            year: 1,
            semester: 1,
            departmentId: ''
        });
        setModalOpen(true);
    };

    const openEditModal = (subject) => {
        setEditingSubject(subject);
        setFormData({
            name: subject.name,
            code: subject.code,
            type: subject.type,
            practicalName: subject.practicalName || '',
            practicalCode: subject.practicalCode || '',
            year: subject.year || 1,
            semester: subject.semester || 1,
            departmentId: subject.departmentId?._id || ''
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingSubject) {
                await api.put(`/subjects/${editingSubject._id}`, formData);
            } else {
                await api.post('/subjects', formData);
            }
            fetchData();
            setModalOpen(false);
        } catch (error) {
            alert(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this subject?')) return;
        try {
            await api.delete(`/subjects/${id}`);
            fetchData();
        } catch (error) {
            alert('Delete failed');
        }
    };

    const handleYearChange = (newYear) => {
        const yr = parseInt(newYear);
        const defaultSem = (yr - 1) * 2 + 1;
        setFormData({ ...formData, year: yr, semester: defaultSem });
    };

    const handleBulkUpload = async () => {
        if (!bulkFile) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', bulkFile);
        try {
            const response = await api.post('/subjects/bulk-upload', fd, {
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
            const response = await api.get('/subjects/template', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'subject_upload_template.xlsx');
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
                    <h2 className="card-title">Subjects Management</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={handleDownloadTemplate}>Template</button>
                        <button className="btn btn-secondary" onClick={() => setBulkModalOpen(true)}>Import</button>
                        <button className="btn btn-primary" onClick={openAddModal}>
                            <FiPlus style={{ marginRight: '4px' }} /> Add Subject
                        </button>
                    </div>
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalItems={subjects.length}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                >
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Subject Name</th>
                                    <th>Code</th>
                                    <th>Year</th>
                                    <th>Semester</th>
                                    <th>Type</th>
                                    <th>Practical Name</th>
                                    <th>Practical Code</th>
                                    <th>Department</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subjects.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="empty-state">
                                            <div className="empty-icon"><FiBookOpen size={48} /></div>
                                            <h3>No subjects found</h3>
                                            <p>Add subjects to get started</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginateData(subjects).map((subject) => (
                                        <tr key={subject._id}>
                                            <td><strong>{subject.name}</strong></td>
                                            <td>
                                                <span className="badge badge-primary">{subject.code}</span>
                                            </td>
                                            <td>
                                                <span className="badge badge-info">Year {subject.year}</span>
                                            </td>
                                            <td>
                                                <span className="badge badge-secondary">SEM-{subject.semester}</span>
                                            </td>
                                            <td>
                                                <span className={`badge ${subject.type === 'practical' ? 'badge-warning' : subject.type === 'both' ? 'badge-info' : 'badge-success'}`}>
                                                    {subject.type}
                                                </span>
                                            </td>
                                            <td>{subject.practicalName || '-'}</td>
                                            <td>
                                                {subject.practicalCode ? (
                                                    <span className="badge badge-warning">{subject.practicalCode}</span>
                                                ) : '-'}
                                            </td>
                                            <td>{subject.departmentId?.name || 'All Departments'}</td>
                                            <td className="actions-cell">
                                                <button
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={() => openEditModal(subject)}
                                                >
                                                    <FiEdit2 />
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => handleDelete(subject._id)}
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Pagination>
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingSubject ? 'Edit Subject' : 'Add New Subject'}
            >
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Subject Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Data Structures"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Subject Code *</label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="e.g., CS301"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Year *</label>
                            <select
                                value={formData.year}
                                onChange={(e) => handleYearChange(e.target.value)}
                                required
                            >
                                <option value={1}>1st Year</option>
                                <option value={2}>2nd Year</option>
                                <option value={3}>3rd Year</option>
                                <option value={4}>4th Year</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Semester *</label>
                            <select
                                value={formData.semester}
                                onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                                required
                            >
                                {getSemesterOptions(formData.year).map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="both">Both</option>
                                <option value="theory">Theory</option>
                                <option value="practical">Practical</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Department (Optional)</label>
                            <select
                                value={formData.departmentId}
                                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                            >
                                <option value="">All Departments</option>
                                {departments.map((dept) => (
                                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Practical Name (if applicable)</label>
                            <input
                                type="text"
                                value={formData.practicalName}
                                onChange={(e) => setFormData({ ...formData, practicalName: e.target.value })}
                                placeholder="e.g., DS Lab"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Practical Code</label>
                            <input
                                type="text"
                                value={formData.practicalCode}
                                onChange={(e) => setFormData({ ...formData, practicalCode: e.target.value.toUpperCase() })}
                                placeholder="e.g., CS301P"
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {editingSubject ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Bulk Upload Modal */}
            <Modal isOpen={bulkModalOpen} onClose={() => { setBulkModalOpen(false); setBulkResult(null); setBulkFile(null); }} title="Bulk Upload Subjects"
                footer={!bulkResult && (<><button className="btn btn-secondary" onClick={() => setBulkModalOpen(false)} disabled={uploading}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleBulkUpload} disabled={!bulkFile || uploading}>
                        {uploading ? <><span className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }}></span>Uploading...</> : 'Upload'}
                    </button></>)}>
                {!bulkResult ? (
                    <>
                        <p style={{ marginBottom: '16px', color: 'var(--gray-600)' }}>
                            Upload Excel file with columns: name, code, type, practicalName, practicalCode, departmentCode, year, semester
                        </p>
                        <div className="file-upload" onClick={() => document.getElementById('bulkSubjectFile').click()}>
                            <input id="bulkSubjectFile" type="file" accept=".xlsx,.xls" onChange={(e) => setBulkFile(e.target.files[0])} />
                            <div className="file-upload-icon"><FiFolder size={48} /></div>
                            <p>{bulkFile ? bulkFile.name : 'Click to select file'}</p>
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '48px' }}><FiCheckCircle size={48} /></div>
                        <h3>Upload Complete</h3>
                        <p>{bulkResult.successCount} subjects created, {bulkResult.failedCount} failed</p>
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

export default Subjects;
