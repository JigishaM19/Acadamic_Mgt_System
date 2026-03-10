import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiSearch, FiEdit2, FiTrash2, FiKey, FiFolder, FiCheckCircle } from 'react-icons/fi';
import { FaUserGraduate, FaLock, FaExclamationTriangle } from 'react-icons/fa';
import Modal from '../components/Modal';
import Pagination, { usePagination } from '../components/Pagination';

const Students = () => {
    const [students, setStudents] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const { currentPage, pageSize, handlePageChange, handlePageSizeChange, resetPage, paginateData } = usePagination(30);
    const [modalOpen, setModalOpen] = useState(false);
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [credentials, setCredentials] = useState(null);
    const [bulkFile, setBulkFile] = useState(null);
    const [bulkResult, setBulkResult] = useState(null);
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '', fatherName: '', lastName: '', motherName: '',
        dob: '', phone: '', email: '', parentPhone: '', parentEmail: '',
        departmentId: '', classId: '', year: 1, gender: ''
    });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [studentsRes, deptsRes, classesRes] = await Promise.all([
                api.get('/students'),
                api.get('/departments'),
                api.get('/classes')
            ]);
            setStudents(studentsRes.data);
            setDepartments(deptsRes.data);
            setClasses(classesRes.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter((student) => {
        const matchesSearch = student.fullName?.toLowerCase().includes(search.toLowerCase()) ||
            student.username?.toLowerCase().includes(search.toLowerCase());
        const matchesDept = !deptFilter || student.departmentId?._id === deptFilter;
        const matchesYear = !yearFilter || student.year === parseInt(yearFilter);
        return matchesSearch && matchesDept && matchesYear;
    });

    const paginatedStudents = paginateData(filteredStudents);

    // Reset page when filters change
    useEffect(() => { resetPage(); }, [search, deptFilter, yearFilter]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingStudent) {
                await api.put(`/students/${editingStudent._id}`, formData);
                setCredentials(null);
            } else {
                const response = await api.post('/students', formData);
                setCredentials(response.data.credentials);
            }
            fetchData();
            if (editingStudent) closeModal();
        } catch (error) {
            alert(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleEdit = (student) => {
        setEditingStudent(student);
        setFormData({
            firstName: student.firstName || '',
            fatherName: student.fatherName || '',
            lastName: student.lastName || '',
            motherName: student.motherName || '',
            dob: student.dob ? student.dob.split('T')[0] : '',
            phone: student.phone || '',
            email: student.email || '',
            parentPhone: student.parentPhone || '',
            parentEmail: student.parentEmail || '',
            departmentId: student.departmentId?._id || '',
            classId: student.classId?._id || '',
            year: student.year || 1,
            gender: student.gender || ''
        });
        setCredentials(null);
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this student? This will also delete their parent account.')) return;
        try {
            await api.delete(`/students/${id}`);
            fetchData();
        } catch (error) {
            alert('Delete failed');
        }
    };

    const handleResetPassword = async (id) => {
        if (!confirm('Reset password for this student and their parent?')) return;
        try {
            const response = await api.post(`/students/${id}/reset-password`);
            alert(`Student password reset to: ${response.data.credentials.student.password}\n${response.data.credentials.parent ? `Parent password: ${response.data.credentials.parent.password}` : ''}`);
        } catch (error) {
            alert('Reset failed');
        }
    };

    const handleBulkUpload = async () => {
        if (!bulkFile) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', bulkFile);
        try {
            const response = await api.post('/students/bulk-upload', fd, {
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
            const response = await api.get('/students/template', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'student_upload_template.xlsx');
            link.click();
        } catch (error) {
            alert('Failed to download template');
        }
    };

    const openAddModal = () => {
        setEditingStudent(null);
        setFormData({
            firstName: '', fatherName: '', lastName: '', motherName: '',
            dob: '', phone: '', email: '', parentPhone: '', parentEmail: '',
            departmentId: '', classId: '', year: 1, gender: ''
        });
        setCredentials(null);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingStudent(null);
        setCredentials(null);
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="card">
                {/* Student Count Display */}
                <div style={{
                    padding: '16px 24px',
                    background: 'linear-gradient(135deg, var(--success-light, #2d8021ff) 10%, var(--success, #ffffffff) 100%)',
                    borderRadius: '12px',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '2rem' }}></span>
                        <div>
                            <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{filteredStudents.length}</div>
                            <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                                {filteredStudents.length === students.length ? 'Total Students' : `Filtered (of ${students.length} total)`}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="toolbar">
                    <div className="search-box">
                        <span className="search-icon"><FiSearch /></span>
                        <input type="text" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="filter-group">
                        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                            <option value="">All Departments</option>
                            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                        </select>
                        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                            <option value="">All Years</option>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                        </select>
                        <button className="btn btn-secondary" onClick={handleDownloadTemplate}>Template</button>
                        <button className="btn btn-secondary" onClick={() => setBulkModalOpen(true)}>Import</button>
                        <button className="btn btn-primary" onClick={openAddModal}>Add Student</button>
                    </div>
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalItems={filteredStudents.length}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                >
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Username</th>
                                    <th>Department</th>
                                    <th>Class</th>
                                    <th>Year</th>
                                    <th>Parent</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedStudents.map((student) => (
                                    <tr key={student._id}>
                                        <td><strong>{student.fullName}</strong></td>
                                        <td>{student.username}</td>
                                        <td>{student.departmentId?.name || '-'}</td>
                                        <td>{student.classId?.name || '-'}</td>
                                        <td>{student.year || '-'}</td>
                                        <td>{student.parentId?.username || '-'}</td>
                                        <td>
                                            <div className="actions-cell">
                                                <button className="btn-icon" onClick={() => handleEdit(student)} title="Edit"><FiEdit2 /></button>
                                                <button className="btn-icon" onClick={() => handleResetPassword(student._id)} title="Reset Password"><FiKey /></button>
                                                <button className="btn-icon" onClick={() => handleDelete(student._id)} title="Delete"><FiTrash2 /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredStudents.length === 0 && (
                            <div className="empty-state">
                                <div className="empty-icon"><FaUserGraduate size={48} /></div>
                                <h3>No students found</h3>
                            </div>
                        )}
                    </div>
                </Pagination>
            </div>

            {/* Add/Edit Modal */}
            <Modal isOpen={modalOpen} onClose={closeModal} title={editingStudent ? 'Edit Student' : 'Add New Student'}
                footer={<><button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit}>{editingStudent ? 'Update' : 'Create Student'}</button></>}>
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">First Name *</label>
                            <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Middle Name (Father)</label>
                            <input type="text" value={formData.fatherName} onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })} placeholder="Father's first name" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Last Name *</label>
                            <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Mother's Name</label>
                            <input type="text" value={formData.motherName} onChange={(e) => setFormData({ ...formData, motherName: e.target.value })} placeholder="Mother's first name" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Date of Birth *</label>
                            <input type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Gender *</label>
                            <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} required>
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Student Phone</label>
                            <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Student Email</label>
                            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Parent Phone</label>
                            <input type="tel" value={formData.parentPhone} onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Parent Email</label>
                            <input type="email" value={formData.parentEmail} onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Department *</label>
                            <select value={formData.departmentId} onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })} required>
                                <option value="">Select Department</option>
                                {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Year *</label>
                            <select value={formData.year} onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })} required>
                                <option value={1}>1st Year</option>
                                <option value={2}>2nd Year</option>
                                <option value={3}>3rd Year</option>
                                <option value={4}>4th Year</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Class</label>
                        <select value={formData.classId} onChange={(e) => setFormData({ ...formData, classId: e.target.value })}>
                            <option value="">Select Class</option>
                            {classes.filter(c => !formData.departmentId || c.departmentId?._id === formData.departmentId).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                    </div>
                </form>

                {credentials && (
                    <div className="credentials-box">
                        <h4><FaLock style={{ marginRight: '6px' }} /> Generated Credentials</h4>
                        <div style={{ marginBottom: '12px' }}>
                            <strong>Student:</strong>
                            <div className="credential-item">
                                <span className="credential-label">Username:</span>
                                <span className="credential-value">{credentials.student?.username}</span>
                            </div>
                            <div className="credential-item">
                                <span className="credential-label">Password:</span>
                                <span className="credential-value">{credentials.student?.password}</span>
                            </div>
                        </div>
                        {credentials.parent && (
                            <div>
                                <strong>Parent:</strong>
                                <div className="credential-item">
                                    <span className="credential-label">Username:</span>
                                    <span className="credential-value">{credentials.parent.username}</span>
                                </div>
                                <div className="credential-item">
                                    <span className="credential-label">Password:</span>
                                    <span className="credential-value">{credentials.parent.password}</span>
                                </div>
                            </div>
                        )}
                        <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '8px' }}>
                            <FaExclamationTriangle style={{ marginRight: '4px' }} /> Save these credentials. Users must change password on first login.
                        </p>
                    </div>
                )}
            </Modal>

            {/* Bulk Upload Modal */}
            <Modal isOpen={bulkModalOpen} onClose={() => { setBulkModalOpen(false); setBulkResult(null); setBulkFile(null); }} title="Bulk Upload Students"
                footer={!bulkResult && (<><button className="btn btn-secondary" onClick={() => setBulkModalOpen(false)} disabled={uploading}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleBulkUpload} disabled={!bulkFile || uploading}>
                        {uploading ? <><span className="spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }}></span>Uploading...</> : 'Upload'}
                    </button></>)}>
                {!bulkResult ? (
                    <>
                        <p style={{ marginBottom: '16px', color: 'var(--gray-600)' }}>
                            Upload Excel file with columns: firstName, fatherName, lastName, motherName, dob, studentPhone, studentEmail, parentPhone, parentEmail, departmentCode, year, gender
                        </p>
                        <div className="file-upload" onClick={() => document.getElementById('bulkFile').click()}>
                            <input id="bulkFile" type="file" accept=".xlsx,.xls" onChange={(e) => setBulkFile(e.target.files[0])} />
                            <div className="file-upload-icon"><FiFolder size={48} /></div>
                            <p>{bulkFile ? bulkFile.name : 'Click to select file'}</p>
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '48px' }}><FiCheckCircle size={48} /></div>
                        <h3>Upload Complete</h3>
                        <p>{bulkResult.successCount} students created, {bulkResult.failedCount} failed</p>
                        {bulkResult.credentials?.length > 0 && (
                            <div className="credentials-box" style={{ maxHeight: '300px', overflowY: 'auto', textAlign: 'left' }}>
                                <h4>Generated Credentials</h4>
                                {bulkResult.credentials.map((cred, i) => (
                                    <div key={i} style={{ marginBottom: '8px', padding: '8px', background: 'white', borderRadius: '4px' }}>
                                        <strong>Student: {cred.student?.fullName}</strong> - {cred.student?.username} / {cred.student?.password}
                                        {cred.parent && <><br /><span style={{ fontSize: '12px' }}>Parent: {cred.parent.username} / {cred.parent.password}</span></>}
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

export default Students;
