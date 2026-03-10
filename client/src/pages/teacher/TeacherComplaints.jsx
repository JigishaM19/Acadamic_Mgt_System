import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiFileText, FiClipboard, FiCheckCircle } from 'react-icons/fi';
import { FaBullhorn, FaHourglass } from 'react-icons/fa';

const TeacherComplaints = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [formData, setFormData] = useState({
        subject: '',
        description: '',
        category: 'other'
    });

    const categories = [
        { value: 'academic', label: 'Academic' },
        { value: 'infrastructure', label: 'Infrastructure' },
        { value: 'faculty', label: 'Faculty' },
        { value: 'administrative', label: 'Administrative' },
        { value: 'other', label: 'Other' }
    ];

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        try {
            const response = await api.get('/teacher/complaints');
            setComplaints(response.data);
        } catch (error) {
            console.error('Failed to fetch complaints:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.subject.trim() || !formData.description.trim()) {
            setMessage({ type: 'error', text: 'Please fill in all fields' });
            return;
        }

        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            await api.post('/teacher/complaints', formData);
            setMessage({ type: 'success', text: 'Complaint submitted successfully!' });
            setShowForm(false);
            setFormData({ subject: '', description: '', category: 'other' });
            fetchComplaints();
        } catch (error) {
            console.error('Failed to submit complaint:', error);
            setMessage({ type: 'error', text: 'Failed to submit complaint' });
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getStatusBadge = (status) => {
        const styles = {
            open: { background: 'var(--warning-light)', color: 'var(--warning)' },
            'in-progress': { background: 'var(--primary-light)', color: 'var(--primary)' },
            resolved: { background: 'var(--success-light)', color: 'var(--success)' }
        };
        return (
            <span className="badge" style={{
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                textTransform: 'capitalize',
                ...styles[status]
            }}>
                {status}
            </span>
        );
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
                        <h2 className="card-title"><FaBullhorn style={{ marginRight: '6px' }} /> Complaints</h2>
                        <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                            Submit and track your complaints
                        </p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowForm(true)}
                        disabled={showForm}
                    >
                        + New Complaint
                    </button>
                </div>
            </div>

            {/* Messages */}
            {message.text && (
                <div className={`alert alert-${message.type}`} style={{ marginTop: '24px' }}>
                    {message.text}
                </div>
            )}

            {/* New Complaint Form */}
            {showForm && (
                <div className="card" style={{ marginTop: '24px' }}>
                    <div className="card-header">
                        <h3 className="card-title"><FiFileText style={{ marginRight: '6px' }} /> Submit Complaint</h3>
                    </div>
                    <form onSubmit={handleSubmit} style={{ padding: '0 24px 24px' }}>
                        <div className="form-row" style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                            <div className="form-group" style={{ flex: '2', minWidth: '200px' }}>
                                <label className="form-label">Subject</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.subject}
                                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                    placeholder="Brief subject of your complaint"
                                />
                            </div>
                            <div className="form-group" style={{ flex: '1', minWidth: '150px' }}>
                                <label className="form-label">Category</label>
                                <select
                                    className="form-input"
                                    value={formData.category}
                                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                >
                                    {categories.map(cat => (
                                        <option key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                                className="form-input"
                                rows="4"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Please describe your complaint in detail..."
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Submitting...' : 'Submit Complaint'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Complaints List */}
            <div className="card" style={{ marginTop: '24px' }}>
                <div className="card-header">
                    <h3 className="card-title"><FiClipboard style={{ marginRight: '6px' }} /> My Complaints</h3>
                </div>

                {complaints.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Subject</th>
                                    <th>Category</th>
                                    <th>Status</th>
                                    <th>Admin Remark</th>
                                </tr>
                            </thead>
                            <tbody>
                                {complaints.map(complaint => (
                                    <tr key={complaint._id}>
                                        <td>{formatDate(complaint.createdAt)}</td>
                                        <td>
                                            <div style={{ fontWeight: '500' }}>{complaint.subject}</div>
                                            <div style={{
                                                fontSize: '0.85rem',
                                                color: 'var(--gray-500)',
                                                maxWidth: '300px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {complaint.description}
                                            </div>
                                        </td>
                                        <td style={{ textTransform: 'capitalize' }}>{complaint.category}</td>
                                        <td>{getStatusBadge(complaint.status)}</td>
                                        <td style={{ color: 'var(--gray-600)', fontSize: '0.9rem' }}>
                                            {complaint.remark || '—'}
                                            {complaint.resolvedBy && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '4px' }}>
                                                    Resolved by: {complaint.resolvedBy?.fullName}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}><FaBullhorn size={48} /></div>
                        <p>No complaints submitted yet. Click "New Complaint" to submit one.</p>
                    </div>
                )}
            </div>

            {/* Stats */}
            {complaints.length > 0 && (
                <div className="stats-grid" style={{ marginTop: '24px' }}>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}><FiClipboard /></div>
                        <div className="stat-info">
                            <h3>{complaints.filter(c => c.status === 'open').length}</h3>
                            <p>Open</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}><FaHourglass /></div>
                        <div className="stat-info">
                            <h3>{complaints.filter(c => c.status === 'in-progress').length}</h3>
                            <p>In Progress</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}><FiCheckCircle /></div>
                        <div className="stat-info">
                            <h3>{complaints.filter(c => c.status === 'resolved').length}</h3>
                            <p>Resolved</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherComplaints;
