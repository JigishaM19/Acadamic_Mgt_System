import { useState, useEffect } from 'react';

const StudentLeaveRequests = () => {
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        type: 'personal',
        startDate: '',
        endDate: '',
        reason: ''
    });

    useEffect(() => {
        fetchLeaveRequests();
    }, []);

    const fetchLeaveRequests = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/student/leave-requests', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setLeaveRequests(data.leaveRequests || []);
            } else {
                setError(data.message || 'Failed to fetch leave requests');
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/student/leave-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (response.ok) {
                setSuccess('Leave request submitted successfully!');
                setFormData({ type: 'personal', startDate: '', endDate: '', reason: '' });
                setShowForm(false);
                fetchLeaveRequests();
            } else {
                setError(data.message || 'Failed to submit leave request');
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setSubmitting(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'approved': return 'status-approved';
            case 'rejected': return 'status-rejected';
            case 'pending': return 'status-pending';
            default: return '';
        }
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>Leave Requests</h2>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? 'Cancel' : '+ New Request'}
                </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Leave Request Form */}
            {showForm && (
                <div className="form-card">
                    <h3>Submit Leave Request</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Leave Type</label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="personal">Personal</option>
                                    <option value="sick">Sick Leave</option>
                                    <option value="emergency">Emergency</option>
                                    <option value="academic">Academic</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Start Date</label>
                                <input
                                    type="date"
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>End Date</label>
                                <input
                                    type="date"
                                    name="endDate"
                                    value={formData.endDate}
                                    onChange={handleInputChange}
                                    min={formData.startDate}
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Reason</label>
                            <textarea
                                name="reason"
                                value={formData.reason}
                                onChange={handleInputChange}
                                placeholder="Please provide a reason for your leave request..."
                                rows="4"
                                required
                            ></textarea>
                        </div>
                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowForm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={submitting}
                            >
                                {submitting ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Leave Requests History */}
            <div className="section">
                <h3 className="section-title">Leave History</h3>
                {leaveRequests.length > 0 ? (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Type</th>
                                    <th>From</th>
                                    <th>To</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Remark</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaveRequests.map((request, index) => (
                                    <tr key={request._id}>
                                        <td>{index + 1}</td>
                                        <td><span className="badge">{request.type}</span></td>
                                        <td>{formatDate(request.startDate)}</td>
                                        <td>{formatDate(request.endDate)}</td>
                                        <td className="reason-cell">{request.reason}</td>
                                        <td>
                                            <span className={`status-badge ${getStatusClass(request.status)}`}>
                                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                            </span>
                                        </td>
                                        <td>{request.reviewRemark || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">No leave requests submitted yet</div>
                )}
            </div>
        </div>
    );
};

export default StudentLeaveRequests;
