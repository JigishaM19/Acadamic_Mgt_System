import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiCheckCircle } from 'react-icons/fi';
import { FaBullhorn } from 'react-icons/fa';
import DetailModal from '../../components/DetailModal';

const CCComplaints = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('student');
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        subject: '',
        description: '',
        category: 'other'
    });
    const [submitting, setSubmitting] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState(null);

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        try {
            const response = await api.get('/cc/complaints');
            setComplaints(response.data);
        } catch (error) {
            console.error('Failed to fetch complaints:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (id) => {
        const remark = prompt('Enter resolution remark (optional):');
        try {
            await api.put(`/cc/complaints/${id}/resolve`, { remark });
            await fetchComplaints();
        } catch (error) {
            console.error('Failed to resolve complaint:', error);
            alert('Failed to resolve complaint');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await api.post('/cc/complaints', formData);
            await fetchComplaints();
            setShowModal(false);
            setFormData({ subject: '', description: '', category: 'other' });
        } catch (error) {
            console.error('Failed to submit complaint:', error);
            alert('Failed to submit complaint');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusBadge = (status) => {
        const styles = {
            'open': { background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' },
            'in-progress': { background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' },
            'resolved': { background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }
        };
        return styles[status] || styles.open;
    };

    // Split complaints
    const myComplaints = complaints.filter(c => c.userId?.role === 'classcoordinator');
    const studentComplaints = complaints.filter(c => c.userId?.role === 'student');

    const currentComplaints = activeTab === 'student' ? studentComplaints : myComplaints;

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
                <div className="card-header">
                    <h2 className="card-title"><FaBullhorn style={{ marginRight: '6px' }} /> Complaints</h2>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        + Submit Complaint
                    </button>
                </div>

                {/* Tabs */}
                <div className="tabs" style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    <button
                        className={`tab-btn ${activeTab === 'student' ? 'active' : ''}`}
                        onClick={() => setActiveTab('student')}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            background: activeTab === 'student' ? 'var(--primary)' : 'var(--bg-secondary)',
                            color: activeTab === 'student' ? 'white' : 'var(--text)'
                        }}
                    >
                        Student Complaints ({studentComplaints.length})
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`}
                        onClick={() => setActiveTab('my')}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            background: activeTab === 'my' ? 'var(--primary)' : 'var(--bg-secondary)',
                            color: activeTab === 'my' ? 'white' : 'var(--text)'
                        }}
                    >
                        My Complaints ({myComplaints.length})
                    </button>
                </div>

                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Submitted By</th>
                                <th>Category</th>
                                <th>Subject</th>
                                <th>Description</th>
                                <th>Date</th>
                                <th>Status</th>
                                {activeTab === 'student' && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {currentComplaints.map(complaint => (
                                <tr key={complaint._id} onClick={() => setSelectedDetail(complaint)} style={{ cursor: 'pointer' }}>
                                    <td>
                                        <div style={{ fontWeight: '500' }}>
                                            {complaint.userId?.fullName || `${complaint.userId?.firstName} ${complaint.userId?.lastName}`}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            {complaint.userId?.role}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                                            {complaint.category}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: '500' }}>{complaint.subject}</td>
                                    <td style={{ maxWidth: '200px' }}>
                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {complaint.description}
                                        </div>
                                    </td>
                                    <td>{formatDate(complaint.createdAt)}</td>
                                    <td>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            ...getStatusBadge(complaint.status)
                                        }}>
                                            {complaint.status}
                                        </span>
                                    </td>
                                    {activeTab === 'student' && (
                                        <td onClick={(e) => e.stopPropagation()}>
                                            {complaint.status !== 'resolved' ? (
                                                <button
                                                    className="btn btn-success"
                                                    style={{ padding: '4px 12px', fontSize: '12px' }}
                                                    onClick={() => handleResolve(complaint._id)}
                                                >
                                                    Mark Resolved
                                                </button>
                                            ) : (
                                                <span style={{ color: 'var(--text-tertiary)' }}>
                                                    <FiCheckCircle style={{ marginRight: '2px' }} /> Resolved
                                                </span>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {currentComplaints.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No complaints found
                    </div>
                )}
            </div>

            {/* Submit Complaint Modal */}
            {showModal && (
                <div className="modal-overlay show" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>Submit Complaint</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Category</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    required
                                >
                                    <option value="academic">Academic</option>
                                    <option value="infrastructure">Infrastructure</option>
                                    <option value="faculty">Faculty</option>
                                    <option value="administrative">Administrative</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Subject</label>
                                <input
                                    type="text"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    required
                                    placeholder="Brief subject of complaint"
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={4}
                                    required
                                    placeholder="Describe your complaint in detail..."
                                />
                            </div>
                            <div className="form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Submitting...' : 'Submit Complaint'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <DetailModal
                isOpen={!!selectedDetail}
                onClose={() => setSelectedDetail(null)}
                title="Complaint Details"
                fields={selectedDetail ? [
                    { label: 'Submitted By', value: selectedDetail.userId?.fullName },
                    { label: 'Role', value: selectedDetail.userId?.role },
                    { label: 'Category', value: selectedDetail.category },
                    { label: 'Subject', value: selectedDetail.subject },
                    { label: 'Description', value: selectedDetail.description },
                    { label: 'Date', value: formatDate(selectedDetail.createdAt) },
                    { label: 'Status', value: selectedDetail.status, badge: true, badgeStyle: { ...getStatusBadge(selectedDetail.status) } },
                    { label: 'Resolution Remark', value: selectedDetail.remark || '—' }
                ] : []}
            />
        </div>
    );
};

export default CCComplaints;
