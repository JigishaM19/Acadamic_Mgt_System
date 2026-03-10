import { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [credentials, setCredentials] = useState(null);
    const [formData, setFormData] = useState({
        firstName: '',
        fatherName: '',
        lastName: '',
        role: 'student',
        dob: '',
        email: '',
        phone: '',
        departmentId: '',
        classId: ''
    });
    const [bulkFile, setBulkFile] = useState(null);
    const [bulkResult, setBulkResult] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, deptsRes, classesRes] = await Promise.all([
                api.get('/users'),
                api.get('/departments'),
                api.get('/classes')
            ]);
            setUsers(usersRes.data);
            setDepartments(deptsRes.data);
            setClasses(classesRes.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter((user) => {
        const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`;
        const matchesSearch = fullName.toLowerCase().includes(search.toLowerCase()) ||
            user.username.toLowerCase().includes(search.toLowerCase());
        const matchesRole = !roleFilter || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await api.put(`/users/${editingUser._id}`, formData);
                setCredentials(null);
            } else {
                const response = await api.post('/users', formData);
                setCredentials(response.data.credentials);
            }
            fetchData();
            if (editingUser) {
                closeModal();
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({
            firstName: user.firstName || '',
            fatherName: user.fatherName || '',
            lastName: user.lastName || '',
            role: user.role,
            dob: user.dob ? user.dob.split('T')[0] : '',
            email: user.email || '',
            phone: user.phone || '',
            departmentId: user.departmentId?._id || '',
            classId: user.classId?._id || ''
        });
        setCredentials(null);
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.delete(`/users/${id}`);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Delete failed');
        }
    };

    const handleResetPassword = async (id) => {
        if (!confirm('Reset password for this user?')) return;
        try {
            const response = await api.post(`/users/${id}/reset-password`);
            alert(`New password: ${response.data.credentials.password}`);
        } catch (error) {
            alert('Reset failed');
        }
    };

    const handleBulkUpload = async () => {
        if (!bulkFile) return;

        const formData = new FormData();
        formData.append('file', bulkFile);

        try {
            const response = await api.post('/users/bulk-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setBulkResult(response.data);
            fetchData();
        } catch (error) {
            alert('Upload failed');
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const response = await api.get('/users/template', {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'user_upload_template.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert('Failed to download template');
        }
    };

    const openAddModal = () => {
        setEditingUser(null);
        setFormData({
            firstName: '',
            fatherName: '',
            lastName: '',
            role: 'student',
            dob: '',
            email: '',
            phone: '',
            departmentId: '',
            classId: ''
        });
        setCredentials(null);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingUser(null);
        setCredentials(null);
    };

    const formatRole = (role) => {
        const roles = {
            admin: 'Admin',
            hod: 'HOD',
            classcoordinator: 'Class Coordinator',
            teacher: 'Teacher',
            student: 'Student',
            parent: 'Parent'
        };
        return roles[role] || role;
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="card">
                <div className="toolbar">
                    <div className="search-box">
                        <span className="search-icon"></span>
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                            <option value="">All Roles</option>
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="hod">HOD</option>
                            <option value="classcoordinator">Class Coordinator</option>
                            <option value="parent">Parent</option>
                        </select>
                        <button className="btn btn-secondary" onClick={handleDownloadTemplate}>
                            Template
                        </button>
                        <button className="btn btn-secondary" onClick={() => setBulkModalOpen(true)}>
                            Bulk Upload
                        </button>
                        <button className="btn btn-primary" onClick={openAddModal}>
                            + Add User
                        </button>
                    </div>
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Username</th>
                                <th>Role</th>
                                <th>Department</th>
                                <th>Class</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user._id}>
                                    <td><strong>{user.fullName || `${user.firstName} ${user.lastName}`}</strong></td>
                                    <td>{user.username}</td>
                                    <td><span className="badge badge-primary">{formatRole(user.role)}</span></td>
                                    <td>{user.departmentId?.name || '-'}</td>
                                    <td>{user.classId?.name || '-'}</td>
                                    <td>
                                        <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="btn-icon" onClick={() => handleEdit(user)} title="Edit">Edit</button>
                                            <button className="btn-icon" onClick={() => handleResetPassword(user._id)} title="Reset Password">Reset</button>
                                            <button className="btn-icon" onClick={() => handleDelete(user._id)} title="Delete">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredUsers.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-icon"></div>
                            <h3>No users found</h3>
                            <p>Try adjusting your search or filters</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit User Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={closeModal}
                title={editingUser ? 'Edit User' : 'Add New User'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            {editingUser ? 'Update' : 'Create User'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">First Name *</label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                placeholder="First Name"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Father's Name</label>
                            <input
                                type="text"
                                value={formData.fatherName}
                                onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                                placeholder="Father's Name"
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Last Name *</label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                placeholder="Last Name"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date of Birth *</label>
                            <input
                                type="date"
                                value={formData.dob}
                                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Role *</label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="hod">HOD</option>
                                <option value="classcoordinator">Class Coordinator</option>
                                <option value="parent">Parent</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="e.g., 9876543210"
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="e.g., user@example.com"
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Department</label>
                            <select
                                value={formData.departmentId}
                                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                            >
                                <option value="">Select Department</option>
                                {departments.map((dept) => (
                                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Class</label>
                            <select
                                value={formData.classId}
                                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                            >
                                <option value="">Select Class</option>
                                {classes.map((cls) => (
                                    <option key={cls._id} value={cls._id}>{cls.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </form>

                {credentials && (
                    <div className="credentials-box">
                        <h4>Generated Credentials</h4>
                        <div className="credential-item">
                            <span className="credential-label">Username:</span>
                            <span className="credential-value">{credentials.username}</span>
                        </div>
                        <div className="credential-item">
                            <span className="credential-label">Password:</span>
                            <span className="credential-value">{credentials.password}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '8px' }}>
                            Save these credentials. User must change password on first login.
                        </p>
                    </div>
                )}
            </Modal>

            {/* Bulk Upload Modal */}
            <Modal
                isOpen={bulkModalOpen}
                onClose={() => { setBulkModalOpen(false); setBulkResult(null); setBulkFile(null); }}
                title="Bulk Upload Users"
                footer={
                    !bulkResult && (
                        <>
                            <button className="btn btn-secondary" onClick={() => setBulkModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleBulkUpload} disabled={!bulkFile}>
                                Upload & Process
                            </button>
                        </>
                    )
                }
            >
                {!bulkResult ? (
                    <>
                        <p style={{ marginBottom: '16px', color: 'var(--gray-600)' }}>
                            Upload an Excel file (.xlsx) with columns: <strong>firstName, fatherName, lastName, dob, role, email, phone</strong>
                        </p>
                        <p style={{ marginBottom: '16px', color: 'var(--gray-500)', fontSize: '13px' }}>
                            Click "Template" button to download a sample file with correct format
                        </p>
                        <div className="file-upload" onClick={() => document.getElementById('bulkFile').click()}>
                            <input
                                id="bulkFile"
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={(e) => setBulkFile(e.target.files[0])}
                            />
                            <div className="file-upload-icon"></div>
                            <p>{bulkFile ? bulkFile.name : 'Click to select file or drag and drop'}</p>
                        </div>
                    </>
                ) : (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ fontSize: '48px' }}></div>
                            <h3>Upload Complete</h3>
                            <p style={{ color: 'var(--gray-600)' }}>
                                {bulkResult.successCount} users created, {bulkResult.failedCount} failed
                            </p>
                        </div>
                        {bulkResult.credentials?.length > 0 && (
                            <div className="credentials-box" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                <h4>Generated Credentials</h4>
                                {bulkResult.credentials.map((cred, i) => (
                                    <div key={i} style={{ marginBottom: '8px', padding: '8px', background: 'white', borderRadius: '4px' }}>
                                        <strong>{cred.fullName}</strong><br />
                                        <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                                            {cred.username} / {cred.password}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '16px' }}
                            onClick={() => { setBulkModalOpen(false); setBulkResult(null); setBulkFile(null); }}
                        >
                            Done
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Users;
