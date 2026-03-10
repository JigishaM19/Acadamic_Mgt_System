import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiSearch, FiEdit2, FiTrash2, FiKey, FiUser, FiFolder, FiCheckCircle, FiX } from 'react-icons/fi';
import { FaChalkboardTeacher, FaLock, FaExclamationTriangle } from 'react-icons/fa';
import Modal from '../components/Modal';

const Teachers = () => {
    const [teachers, setTeachers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState(null);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [credentials, setCredentials] = useState(null);
    const [bulkFile, setBulkFile] = useState(null);
    const [bulkResult, setBulkResult] = useState(null);
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '', fatherName: '', lastName: '',
        dob: '', phone: '', email: '', departmentId: ''
    });

    const roleLabels = {
        teacher: 'Teacher',
        hod: 'Head of Department',
        classcoordinator: 'Class Coordinator'
    };

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [teachersRes, deptsRes] = await Promise.all([
                api.get('/teachers'),
                api.get('/departments')
            ]);
            setTeachers(teachersRes.data);
            setDepartments(deptsRes.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredTeachers = teachers.filter((t) => {
        const matchesSearch = t.fullName?.toLowerCase().includes(search.toLowerCase()) ||
            t.username?.toLowerCase().includes(search.toLowerCase());
        const matchesDept = !deptFilter || t.departmentId?._id === deptFilter;
        return matchesSearch && matchesDept;
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTeacher) {
                await api.put(`/teachers/${editingTeacher._id}`, formData);
                setCredentials(null);
            } else {
                const response = await api.post('/teachers', formData);
                setCredentials(response.data.credentials);
            }
            fetchData();
            if (editingTeacher) closeModal();
        } catch (error) {
            alert(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleEdit = (teacher) => {
        setEditingTeacher(teacher);
        setFormData({
            firstName: teacher.firstName || '',
            fatherName: teacher.fatherName || '',
            lastName: teacher.lastName || '',
            dob: teacher.dob ? teacher.dob.split('T')[0] : '',
            phone: teacher.phone || '',
            email: teacher.email || '',
            departmentId: teacher.departmentId?._id || ''
        });
        setCredentials(null);
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this teacher?')) return;
        try {
            await api.delete(`/teachers/${id}`);
            fetchData();
        } catch (error) {
            alert('Delete failed');
        }
    };

    const handleResetPassword = async (id) => {
        if (!confirm('Reset password for this teacher?')) return;
        try {
            const response = await api.post(`/teachers/${id}/reset-password`);
            alert(`Password reset to: ${response.data.credentials.password}`);
        } catch (error) {
            alert('Reset failed');
        }
    };

    const openRoleModal = (teacher) => {
        setSelectedTeacher(teacher);
        setRoleModalOpen(true);
    };

    const handleAddRole = async (role) => {
        try {
            await api.post(`/teachers/${selectedTeacher._id}/add-role`, { role });
            fetchData();
            // Refresh selected teacher
            const updated = await api.get('/teachers');
            const t = updated.data.find(t => t._id === selectedTeacher._id);
            setSelectedTeacher(t);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to add role');
        }
    };

    const handleRemoveRole = async (role) => {
        try {
            await api.post(`/teachers/${selectedTeacher._id}/remove-role`, { role });
            fetchData();
            const updated = await api.get('/teachers');
            const t = updated.data.find(t => t._id === selectedTeacher._id);
            setSelectedTeacher(t);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to remove role');
        }
    };

    const handleBulkUpload = async () => {
        if (!bulkFile) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', bulkFile);
        try {
            const response = await api.post('/teachers/bulk-upload', fd, {
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
            const response = await api.get('/teachers/template', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'teacher_upload_template.xlsx');
            link.click();
        } catch (error) {
            alert('Failed to download template');
        }
    };

    const openAddModal = () => {
        setEditingTeacher(null);
        setFormData({
            firstName: '', fatherName: '', lastName: '',
            dob: '', phone: '', email: '', departmentId: ''
        });
        setCredentials(null);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingTeacher(null);
        setCredentials(null);
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="card">
                {/* Teacher Count Display */}
                <div style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, var(--success-light, #2d8021ff) 10%, var(--success, #ffffffff) 100%)',
                    borderRadius: '12px',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '2rem' }}></span>
                        <div>
                            <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{filteredTeachers.length}</div>
                            <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                                {filteredTeachers.length === teachers.length ? 'Total Teachers' : `Filtered (of ${teachers.length} total)`}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="toolbar">
                    <div className="search-box">
                        <span className="search-icon"><FiSearch /></span>
                        <input type="text" placeholder="Search teachers..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="filter-group">
                        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                            <option value="">All Departments</option>
                            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                        </select>
                        <button className="btn btn-secondary" onClick={handleDownloadTemplate}>Template</button>
                        <button className="btn btn-secondary" onClick={() => setBulkModalOpen(true)}>Import</button>
                        <button className="btn btn-primary" onClick={openAddModal}>Add Teacher</button>
                    </div>
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Username</th>
                                <th>Department</th>
                                <th>Roles</th>
                                <th>Contact</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTeachers.map((teacher) => (
                                <tr key={teacher._id}>
                                    <td><strong>{teacher.fullName}</strong></td>
                                    <td>{teacher.username}</td>
                                    <td>{teacher.departmentId?.name || '-'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {teacher.roles?.map((r) => (
                                                <span key={r} className={`badge ${r === 'hod' ? 'badge-warning' : r === 'classcoordinator' ? 'badge-info' : 'badge-primary'}`}>
                                                    {roleLabels[r] || r}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>{teacher.phone || teacher.email || '-'}</td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="btn-icon" onClick={() => handleEdit(teacher)} title="Edit"><FiEdit2 /></button>
                                            <button className="btn-icon" onClick={() => openRoleModal(teacher)} title="Manage Roles"><FiUser /></button>
                                            <button className="btn-icon" onClick={() => handleResetPassword(teacher._id)} title="Reset Password"><FiKey /></button>
                                            <button className="btn-icon" onClick={() => handleDelete(teacher._id)} title="Delete"><FiTrash2 /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredTeachers.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-icon"><FaChalkboardTeacher size={48} /></div>
                            <h3>No teachers found</h3>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            <Modal isOpen={modalOpen} onClose={closeModal} title={editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
                footer={<><button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit}>{editingTeacher ? 'Update' : 'Create Teacher'}</button></>}>
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">First Name *</label>
                            <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Middle Name</label>
                            <input type="text" value={formData.fatherName} onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Last Name *</label>
                            <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date of Birth *</label>
                            <input type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} required />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Department *</label>
                        <select value={formData.departmentId} onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })} required>
                            <option value="">Select Department</option>
                            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                        </select>
                    </div>
                </form>

                {credentials && (
                    <div className="credentials-box">
                        <h4><FaLock style={{ marginRight: '6px' }} /> Generated Credentials</h4>
                        <div className="credential-item">
                            <span className="credential-label">Username:</span>
                            <span className="credential-value">{credentials.username}</span>
                        </div>
                        <div className="credential-item">
                            <span className="credential-label">Password:</span>
                            <span className="credential-value">{credentials.password}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '8px' }}><FaExclamationTriangle style={{ marginRight: '4px' }} /> Save these credentials. User must change password on first login.</p>
                    </div>
                )}
            </Modal>

            {/* Role Management Modal */}
            <Modal isOpen={roleModalOpen} onClose={() => setRoleModalOpen(false)} title="Manage Roles"
                footer={<button className="btn btn-secondary" onClick={() => setRoleModalOpen(false)}>Close</button>}>
                {selectedTeacher && (
                    <div>
                        <h4 style={{ marginBottom: '16px' }}>{selectedTeacher.fullName}</h4>
                        <div style={{ marginBottom: '16px' }}>
                            <strong>Current Roles:</strong>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                {selectedTeacher.roles?.map((r) => (
                                    <span key={r} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--gray-100)', padding: '6px 12px', borderRadius: '20px' }}>
                                        {roleLabels[r] || r}
                                        {selectedTeacher.roles.length > 1 && (
                                            <button onClick={() => handleRemoveRole(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}><FiX /></button>
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <strong>Add Role:</strong>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                {['teacher', 'hod', 'classcoordinator'].filter(r => !selectedTeacher.roles?.includes(r)).map((r) => (
                                    <button key={r} className="btn btn-secondary" onClick={() => handleAddRole(r)}>
                                        + {roleLabels[r]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Bulk Upload Modal */}
            <Modal isOpen={bulkModalOpen} onClose={() => { setBulkModalOpen(false); setBulkResult(null); setBulkFile(null); }} title="Bulk Upload Teachers"
                footer={!bulkResult && (<><button className="btn btn-secondary" onClick={() => setBulkModalOpen(false)} disabled={uploading}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleBulkUpload} disabled={!bulkFile || uploading}>
                        {uploading ? <><span className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }}></span>Uploading...</> : 'Upload'}
                    </button></>)}>
                {!bulkResult ? (
                    <>
                        <p style={{ marginBottom: '16px', color: 'var(--gray-600)' }}>
                            Upload Excel file with columns: firstName, fatherName, lastName, phone, dob, email, departmentCode
                        </p>
                        <div className="file-upload" onClick={() => document.getElementById('bulkTeacherFile').click()}>
                            <input id="bulkTeacherFile" type="file" accept=".xlsx,.xls" onChange={(e) => setBulkFile(e.target.files[0])} />
                            <div className="file-upload-icon"><FiFolder size={48} /></div>
                            <p>{bulkFile ? bulkFile.name : 'Click to select file'}</p>
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '48px' }}><FiCheckCircle size={48} /></div>
                        <h3>Upload Complete</h3>
                        <p>{bulkResult.successCount} teachers created, {bulkResult.failedCount} failed</p>
                        {bulkResult.credentials?.length > 0 && (
                            <div className="credentials-box" style={{ maxHeight: '300px', overflowY: 'auto', textAlign: 'left' }}>
                                <h4>Generated Credentials</h4>
                                {bulkResult.credentials.map((cred, i) => (
                                    <div key={i} style={{ marginBottom: '8px', padding: '8px', background: 'white', borderRadius: '4px' }}>
                                        <strong>{cred.fullName}</strong> - {cred.username} / {cred.password}
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

export default Teachers;
