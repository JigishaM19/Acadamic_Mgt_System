import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiFileText } from 'react-icons/fi';
import { FaUmbrellaBeach } from 'react-icons/fa';
import DetailModal from '../../components/DetailModal';

const TeacherLeaveRequests = () => {
    const [myLeaves, setMyLeaves] = useState([]);
    const [studentLeaves, setStudentLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState('my');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [selectedDetail, setSelectedDetail] = useState(null);

    const [formData, setFormData] = useState({
        type: 'personal',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: ''
    });

    const leaveTypes = [
        { value: 'sick', label: 'Sick Leave' },
        { value: 'personal', label: 'Personal Leave' },
        { value: 'emergency', label: 'Emergency' },
        { value: 'academic', label: 'Academic' },
        { value: 'other', label: 'Other' }
    ];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [myResponse, studentResponse] = await Promise.all([
                api.get('/teacher/leave-requests'),
                api.get('/teacher/student-leaves')
            ]);
            setMyLeaves(myResponse.data);
            setStudentLeaves(studentResponse.data);
        } catch (error) {
            console.error('Failed to fetch leave requests:', error);
        } finally {
            setLoading(false);
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

        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            await api.post('/teacher/leave-requests', formData);
            setMessage({ type: 'success', text: 'Leave request submitted successfully!' });
            setShowForm(false);
            setFormData({
                type: 'personal',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                reason: ''
            });
            fetchData();
        } catch (error) {
            console.error('Failed to submit leave request:', error);
            setMessage({ type: 'error', text: 'Failed to submit leave request' });
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Are you sure you want to cancel this leave request?')) return;

        try {
            await api.delete(`/teacher/leave-requests/${id}`);
            setMessage({ type: 'success', text: 'Leave request cancelled' });
            fetchData();
        } catch (error) {
            console.error('Failed to cancel leave request:', error);
            setMessage({ type: 'error', text: 'Failed to cancel leave request' });
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
            pending: { background: 'var(--warning-light)', color: 'var(--warning)' },
            approved: { background: 'var(--success-light)', color: 'var(--success)' },
            rejected: { background: 'var(--danger-light)', color: 'var(--danger)' }
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
                        <h2 className="card-title"><FaUmbrellaBeach style={{ marginRight: '6px' }} /> Leave Requests</h2>
                        <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                            Submit and manage your leave requests
                        </p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowForm(true)}
                        disabled={showForm}
                    >
                        + New Leave Request
                    </button>
                </div>
            </div>

            {/* Messages */}
            {message.text && (
                <div className={`alert alert-${message.type}`} style={{ marginTop: '24px' }}>
                    {message.text}
                </div>
            )}

            {/* New Leave Form */}
            {showForm && (
                <div className="card" style={{ marginTop: '24px' }}>
                    <div className="card-header">
                        <h3 className="card-title"><FiFileText style={{ marginRight: '6px' }} /> Submit Leave Request</h3>
                    </div>
                    <form onSubmit={handleSubmit} style={{ padding: '0 24px 24px' }}>
                        <div className="form-row" style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                            <div className="form-group" style={{ flex: '1', minWidth: '150px' }}>
                                <label className="form-label">Leave Type</label>
                                <select
                                    className="form-input"
                                    value={formData.type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                >
                                    {leaveTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: '1', minWidth: '150px' }}>
                                <label className="form-label">Start Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                />
                            </div>
                            <div className="form-group" style={{ flex: '1', minWidth: '150px' }}>
                                <label className="form-label">End Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Reason</label>
                            <textarea
                                className="form-input"
                                rows="3"
                                value={formData.reason}
                                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                                placeholder="Please provide a detailed reason for your leave..."
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Tabs */}
            <div className="card" style={{ marginTop: '24px' }}>
                <div style={{ borderBottom: '1px solid var(--gray-200)' }}>
                    <div style={{ display: 'flex', padding: '0 24px' }}>
                        <button
                            className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`}
                            onClick={() => setActiveTab('my')}
                            style={{
                                padding: '16px 24px',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                fontWeight: activeTab === 'my' ? '600' : '400',
                                color: activeTab === 'my' ? 'var(--primary)' : 'var(--gray-600)',
                                borderBottom: activeTab === 'my' ? '2px solid var(--primary)' : '2px solid transparent',
                                marginBottom: '-1px'
                            }}
                        >
                            My Leaves ({myLeaves.length})
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'student' ? 'active' : ''}`}
                            onClick={() => setActiveTab('student')}
                            style={{
                                padding: '16px 24px',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                fontWeight: activeTab === 'student' ? '600' : '400',
                                color: activeTab === 'student' ? 'var(--primary)' : 'var(--gray-600)',
                                borderBottom: activeTab === 'student' ? '2px solid var(--primary)' : '2px solid transparent',
                                marginBottom: '-1px'
                            }}
                        >
                            Student Leaves ({studentLeaves.length})
                        </button>
                    </div>
                </div>

                {/* My Leaves Tab */}
                {activeTab === 'my' && (
                    <div>
                        {myLeaves.length > 0 ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Type</th>
                                            <th>Date Range</th>
                                            <th>Reason</th>
                                            <th>Status</th>
                                            <th>Remark</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {myLeaves.map(leave => (
                                            <tr key={leave._id} onClick={() => setSelectedDetail(leave)} style={{ cursor: 'pointer' }}>
                                                <td style={{ textTransform: 'capitalize' }}>{leave.type}</td>
                                                <td>
                                                    {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                                                </td>
                                                <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {leave.reason}
                                                </td>
                                                <td>{getStatusBadge(leave.status)}</td>
                                                <td style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                                                    {leave.reviewRemark || '—'}
                                                </td>
                                                <td onClick={(e) => e.stopPropagation()}>
                                                    {leave.status === 'pending' && (
                                                        <button
                                                            className="btn btn-ghost"
                                                            onClick={() => handleCancel(leave._id)}
                                                            style={{ color: 'var(--danger)', fontSize: '0.85rem' }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>
                                <p>No leave requests yet. Click "New Leave Request" to submit one.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Student Leaves Tab */}
                {activeTab === 'student' && (
                    <div>
                        {studentLeaves.length > 0 ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Class</th>
                                            <th>Type</th>
                                            <th>Date Range</th>
                                            <th>Reason</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentLeaves.map(leave => (
                                            <tr key={leave._id} onClick={() => setSelectedDetail(leave)} style={{ cursor: 'pointer' }}>
                                                <td>{leave.userId?.fullName || 'N/A'}</td>
                                                <td>{leave.userId?.classId?.name || 'N/A'}</td>
                                                <td style={{ textTransform: 'capitalize' }}>{leave.type}</td>
                                                <td>
                                                    {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                                                </td>
                                                <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {leave.reason}
                                                </td>
                                                <td>{getStatusBadge(leave.status)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>
                                <p>No student leave requests found.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <DetailModal
                isOpen={!!selectedDetail}
                onClose={() => setSelectedDetail(null)}
                title="Leave Request Details"
                fields={selectedDetail ? [
                    { label: 'Name', value: selectedDetail.userId?.fullName || 'You' },
                    { label: 'Leave Type', value: selectedDetail.type },
                    { label: 'Duration', value: `${formatDate(selectedDetail.startDate)} — ${formatDate(selectedDetail.endDate)}` },
                    { label: 'Reason', value: selectedDetail.reason },
                    { label: 'Status', value: selectedDetail.status, badge: true, badgeStyle: selectedDetail.status === 'approved' ? { background: 'var(--success-light)', color: 'var(--success)' } : selectedDetail.status === 'rejected' ? { background: 'var(--danger-light)', color: 'var(--danger)' } : { background: 'var(--warning-light)', color: 'var(--warning)' } },
                    { label: 'Reviewer Remark', value: selectedDetail.reviewRemark || '—' }
                ] : []}
            />
        </div>
    );
};

export default TeacherLeaveRequests;
