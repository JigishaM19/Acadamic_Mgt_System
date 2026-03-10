import { useState, useEffect } from 'react';
import api from '../services/api';

const CATEGORY_LABELS = {
    ut: 'Unit Test',
    assignment: 'Assignment',
    practical: 'Practical',
    ese: 'ESE (End Semester)'
};

const CATEGORY_COLORS = {
    ut: { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' },
    assignment: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' },
    practical: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
    ese: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }
};

const TestTypes = () => {
    const [testTypes, setTestTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        maxScore: 20,
        category: 'ut'
    });

    useEffect(() => {
        fetchTestTypes();
    }, []);

    const fetchTestTypes = async () => {
        try {
            const response = await api.get('/test-types');
            setTestTypes(response.data);
        } catch (error) {
            console.error('Failed to fetch test types:', error);
            setMessage({ type: 'error', text: 'Failed to load test types' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (type = null) => {
        if (type) {
            setEditingType(type);
            setFormData({
                name: type.name,
                description: type.description || '',
                maxScore: type.maxScore || 20,
                category: type.category || 'ut'
            });
        } else {
            setEditingType(null);
            setFormData({ name: '', description: '', maxScore: 20, category: 'ut' });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingType(null);
        setFormData({ name: '', description: '', maxScore: 20, category: 'ut' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setMessage({ type: 'error', text: 'Test type name is required' });
            return;
        }

        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            if (editingType) {
                await api.put(`/test-types/${editingType._id}`, formData);
                setMessage({ type: 'success', text: 'Test type updated successfully' });
            } else {
                await api.post('/test-types', formData);
                setMessage({ type: 'success', text: 'Test type created successfully' });
            }
            handleCloseModal();
            fetchTestTypes();
        } catch (error) {
            console.error('Failed to save test type:', error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save test type' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this test type?')) return;

        try {
            await api.delete(`/test-types/${id}`);
            setMessage({ type: 'success', text: 'Test type deleted successfully' });
            fetchTestTypes();
        } catch (error) {
            console.error('Failed to delete test type:', error);
            setMessage({ type: 'error', text: 'Failed to delete test type' });
        }
    };

    const handleSeedDefaults = async () => {
        if (!window.confirm('This will create default test types (UT 1, UT 2, Assignment, Practical, ESE). Continue?')) return;

        try {
            const response = await api.post('/test-types/seed');
            setMessage({ type: 'success', text: response.data.message });
            fetchTestTypes();
        } catch (error) {
            console.error('Failed to seed test types:', error);
            setMessage({ type: 'error', text: 'Failed to create default test types' });
        }
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h2 className="card-title">Test Types</h2>
                        <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                            Manage examination types used for recording marks and IA calculation
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn btn-ghost" onClick={handleSeedDefaults}>
                            Seed Defaults
                        </button>
                        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                            + Add Test Type
                        </button>
                    </div>
                </div>
            </div>

            {/* Category Legend */}
            <div className="card" style={{ marginTop: '16px', padding: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontWeight: '500', fontSize: '0.85rem', color: 'var(--gray-600)' }}>IA Categories:</span>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <span key={key} style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            background: CATEGORY_COLORS[key].bg,
                            color: CATEGORY_COLORS[key].color
                        }}>
                            {label}
                        </span>
                    ))}
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                    UT scores are averaged then scaled • Assignment scores are averaged then scaled • Practical scores contribute separately • ESE is not part of IA
                </p>
            </div>

            {/* Messages */}
            {message.text && (
                <div className={`alert alert-${message.type}`} style={{ marginTop: '16px' }}>
                    {message.text}
                </div>
            )}

            {/* Test Types Table */}
            <div className="card" style={{ marginTop: '16px' }}>
                {testTypes.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>Default Max Score</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {testTypes.map(type => {
                                    const cat = type.category || 'ut';
                                    const catColor = CATEGORY_COLORS[cat] || CATEGORY_COLORS.ut;
                                    return (
                                        <tr key={type._id}>
                                            <td>
                                                <span style={{ fontWeight: '500' }}>
                                                    {type.name}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '500',
                                                    background: catColor.bg,
                                                    color: catColor.color
                                                }}>
                                                    {CATEGORY_LABELS[cat] || cat}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--gray-600)' }}>
                                                {type.description || '—'}
                                            </td>
                                            <td>
                                                <span className="badge" style={{
                                                    background: 'var(--primary-light)',
                                                    color: 'var(--primary)',
                                                    padding: '4px 12px',
                                                    borderRadius: '12px'
                                                }}>
                                                    {type.maxScore} marks
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        className="btn btn-ghost"
                                                        onClick={() => handleOpenModal(type)}
                                                        title="Edit"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="btn btn-ghost"
                                                        onClick={() => handleDelete(type._id)}
                                                        title="Delete"
                                                        style={{ color: 'var(--danger)' }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--gray-500)' }}>
                        <h3>No Test Types Yet</h3>
                        <p>Click "Seed Defaults" to create common test types or add them manually.</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {
                showModal && (
                    <div className="modal-overlay" style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000,
                        opacity: 1,
                        visibility: 'visible'
                    }}>
                        <div className="modal-content" style={{
                            background: 'white',
                            borderRadius: '12px',
                            width: '90%',
                            maxWidth: '500px',
                            overflow: 'hidden'
                        }}>
                            <div style={{ padding: '20px', borderBottom: '1px solid var(--gray-200)' }}>
                                <h3 style={{ margin: 0 }}>
                                    {editingType ? 'Edit Test Type' : 'Add Test Type'}
                                </h3>
                            </div>
                            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label className="form-label">Test Type Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g., UT 1, Assignment, Practical"
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label className="form-label">IA Category *</label>
                                    <select
                                        className="form-input"
                                        value={formData.category}
                                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                    >
                                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                                        Determines how this test contributes to IA marks calculation
                                    </p>
                                </div>
                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label className="form-label">Description</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Optional description"
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: '24px' }}>
                                    <label className="form-label">Default Max Score</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.maxScore}
                                        onChange={(e) => setFormData(prev => ({ ...prev, maxScore: parseInt(e.target.value) || 20 }))}
                                        min="1"
                                        placeholder="20"
                                    />
                                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                                        Teachers can override this when creating tests
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                    <button type="button" className="btn btn-ghost" onClick={handleCloseModal}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? 'Saving...' : (editingType ? 'Update' : 'Create')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div >
                )
            }
        </div >
    );
};

export default TestTypes;
