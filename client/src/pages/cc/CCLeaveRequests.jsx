import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FaUmbrellaBeach } from 'react-icons/fa';
import DetailModal from '../../components/DetailModal';

const CCLeaveRequests = () => {
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('student');
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        type: 'personal',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);
    const [selectedDetail, setSelectedDetail] = useState(null);

    useEffect(() => {
        fetchLeaveRequests();
    }, []);

    const fetchLeaveRequests = async () => {
        try {
            const response = await api.get('/cc/leave-requests');
            setLeaveRequests(response.data);
        } catch (error) {
            console.error('Failed to fetch leave requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id, status) => {
        try {
            await api.put(`/cc/leave-requests/${id}/status`, { status });
            await fetchLeaveRequests();
        } catch (error) {
            console.error('Failed to update leave request:', error);
            alert(error.response?.data?.message || 'Failed to update status');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.reason.trim()) {
            setMessage({ type: 'error', text: 'Please provide a reason' });
            return;
        }

        if (new Date(formData.endDate) < new Date(formData.startDate)) {
            setMessage({ type: 'error', text: 'End date cannot be before start date' });
            return;
        }

        setSubmitting(true);
        setMessage(null);

        try {
            await api.post('/cc/leave-requests', formData);
            await fetchLeaveRequests();
            setShowModal(false);
            setFormData({
                type: 'personal',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                reason: ''
            });
            setActiveTab('my'); // Switch to 'My Requests' to show the new request
            alert('Leave request submitted successfully!');
        } catch (error) {
            console.error('Failed to submit leave request:', error);
            const errorMsg = error.response?.data?.message || 'Failed to submit leave request';
            setMessage({ type: 'error', text: errorMsg });
            alert(errorMsg);
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
            pending: { background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' },
            approved: { background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' },
            rejected: { background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }
        };
        return styles[status] || styles.pending;
    };

    // Split requests
    const myRequests = leaveRequests.filter(r => r.userId?.role === 'classcoordinator');
    const studentRequests = leaveRequests.filter(r => r.userId?.role === 'student');

    const currentRequests = activeTab === 'student' ? studentRequests : myRequests;

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
                    <h2 className="card-title"><FaUmbrellaBeach style={{ marginRight: '6px' }} /> Leave Requests</h2>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        + Submit Leave Request
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
                        Student Requests ({studentRequests.length})
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
                        My Requests ({myRequests.length})
                    </button>
                </div>

                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Requester</th>
                                <th>Type</th>
                                <th>Date Range</th>
                                <th>Reason</th>
                                <th>Status</th>
                                {activeTab === 'student' && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {currentRequests.map(request => (
                                <tr key={request._id} onClick={() => setSelectedDetail(request)} style={{ cursor: 'pointer' }}>
                                    <td>
                                        <div style={{ fontWeight: '500' }}>
                                            {request.userId?.fullName || `${request.userId?.firstName} ${request.userId?.lastName}`}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            {request.userId?.role}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                                            {request.type}
                                        </span>
                                    </td>
                                    <td>
                                        {formatDate(request.startDate)} - {formatDate(request.endDate)}
                                    </td>
                                    <td style={{ maxWidth: '200px' }}>
                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {request.reason}
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            ...getStatusBadge(request.status)
                                        }}>
                                            {request.status}
                                        </span>
                                    </td>
                                    {activeTab === 'student' && (
                                        <td onClick={(e) => e.stopPropagation()}>
                                            {request.status === 'pending' ? (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        className="btn btn-success"
                                                        style={{ padding: '4px 12px', fontSize: '12px' }}
                                                        onClick={() => handleStatusChange(request._id, 'approved')}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        className="btn btn-danger"
                                                        style={{ padding: '4px 12px', fontSize: '12px' }}
                                                        onClick={() => handleStatusChange(request._id, 'rejected')}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {currentRequests.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No leave requests found
                    </div>
                )}
            </div>

            {/* Submit Leave Request Modal */}
            {showModal && (
                <div className="modal-overlay show" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>Submit Leave Request</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                            {message && (
                                <div className={`message ${message.type}`} style={{
                                    padding: '10px',
                                    borderRadius: '8px',
                                    marginBottom: '20px',
                                    background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                    color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
                                    fontSize: '14px',
                                    textAlign: 'center'
                                }}>
                                    {message.text}
                                </div>
                            )}
                            <div className="form-group">
                                <label>Leave Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    required
                                >
                                    <option value="personal">Personal</option>
                                    <option value="sick">Sick</option>
                                    <option value="emergency">Emergency</option>
                                    <option value="academic">Academic</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label>Start Date</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>End Date</label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Reason</label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    rows={4}
                                    required
                                    placeholder="Enter your reason for leave..."
                                />
                            </div>
                            <div className="form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <DetailModal
                isOpen={!!selectedDetail}
                onClose={() => setSelectedDetail(null)}
                title="Leave Request Details"
                fields={selectedDetail ? [
                    { label: 'Requester', value: selectedDetail.userId?.fullName },
                    { label: 'Role', value: selectedDetail.userId?.role },
                    { label: 'Leave Type', value: selectedDetail.type },
                    { label: 'Duration', value: `${formatDate(selectedDetail.startDate)} — ${formatDate(selectedDetail.endDate)}` },
                    { label: 'Reason', value: selectedDetail.reason },
                    { label: 'Status', value: selectedDetail.status, badge: true, badgeStyle: { ...getStatusBadge(selectedDetail.status) } },
                    { label: 'Reviewer Remark', value: selectedDetail.reviewRemark || '—' }
                ] : []}
            />
        </div>
    );
};

export default CCLeaveRequests;
