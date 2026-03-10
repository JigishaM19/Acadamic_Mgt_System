import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import { FaBuilding } from 'react-icons/fa';
import Modal from '../components/Modal';

const Departments = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState(null);
    const [formData, setFormData] = useState({ name: '', code: '' });

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const response = await api.get('/departments');
            setDepartments(response.data);
        } catch (error) {
            console.error('Failed to fetch departments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingDept) {
                await api.put(`/departments/${editingDept._id}`, formData);
            } else {
                await api.post('/departments', formData);
            }
            fetchDepartments();
            closeModal();
        } catch (error) {
            alert(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleEdit = (dept) => {
        setEditingDept(dept);
        setFormData({ name: dept.name, code: dept.code });
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this department?')) return;
        try {
            await api.delete(`/departments/${id}`);
            fetchDepartments();
        } catch (error) {
            alert(error.response?.data?.message || 'Delete failed');
        }
    };

    const openAddModal = () => {
        setEditingDept(null);
        setFormData({ name: '', code: '' });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingDept(null);
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Departments</h2>
                    <button className="btn btn-primary" onClick={openAddModal}>
                        <FiPlus style={{ marginRight: '4px' }} /> Add Department
                    </button>
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Department Name</th>
                                <th>Code</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {departments.map((dept) => (
                                <tr key={dept._id}>
                                    <td><strong>{dept.name}</strong></td>
                                    <td><span className="badge badge-primary">{dept.code}</span></td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="btn-icon" onClick={() => handleEdit(dept)} title="Edit"><FiEdit2 /></button>
                                            <button className="btn-icon" onClick={() => handleDelete(dept._id)} title="Delete"><FiTrash2 /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {departments.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-icon"><FaBuilding size={48} /></div>
                            <h3>No departments yet</h3>
                            <p>Create your first department to get started</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={modalOpen}
                onClose={closeModal}
                title={editingDept ? 'Edit Department' : 'Add Department'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            {editingDept ? 'Update' : 'Create'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Department Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Computer Science"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Department Code *</label>
                        <input
                            type="text"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            placeholder="e.g., CSE"
                            required
                        />
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Departments;
