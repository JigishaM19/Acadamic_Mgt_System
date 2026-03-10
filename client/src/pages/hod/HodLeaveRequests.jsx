import { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { FiFileText, FiCheckCircle, FiXCircle } from 'react-icons/fi';

const HodLeaveRequests = () => {
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [reviewingRequest, setReviewingRequest] = useState(null);
    const [reviewData, setReviewData] = useState({ status: '', reviewRemark: '' });

    useEffect(() => {
        fetchLeaveRequests();
    }, [filter]);

    const fetchLeaveRequests = async () => {
        try {
            setLoading(true);
            const params = filter ? `?status=${filter}` : '';
            const response = await api.get(`/hod/leave-requests${params}`);
            setLeaveRequests(response.data);
        } catch (error) {
            console.error('Failed to fetch leave requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReview = (request, action) => {
        setReviewingRequest(request);
        setReviewData({ status: action, reviewRemark: '' });
    };

    const submitReview = async () => {
        try {
            await api.put(`/hod/leave-requests/${reviewingRequest._id}`, reviewData);
            setReviewingRequest(null);
            fetchLeaveRequests();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update request');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'badge-warning',
            approved: 'badge-success',
            rejected: 'badge-danger'
        };
        return <span className={`badge ${styles[status]}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
    };

    const formatDate = (date) => new Date(date).toLocaleDateString();

    return (
        <div>
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Leave Requests</h2>
                </div>

                <div className="toolbar">
                    <div className="filter-group">
                        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="loading"><div className="spinner"></div></div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Requester</th>
                                    <th>Role</th>
                                    <th>Class</th>
                                    <th>Type</th>
                                    <th>Duration</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaveRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="empty-state">
                                            <div className="empty-icon"><FiFileText size={48} /></div>
                                            <h3>No leave requests</h3>
                                        </td>
                                    </tr>
                                ) : (
                                    leaveRequests.map(req => (
                                        <tr key={req._id}>
                                            <td><strong>{req.userId?.fullName}</strong></td>
                                            <td>
                                                <span className="badge badge-primary">
                                                    {req.userId?.role}
                                                </span>
                                            </td>
                                            <td>{req.userId?.classId?.name || '-'}</td>
                                            <td>{req.type}</td>
                                            <td>
                                                {formatDate(req.startDate)} - {formatDate(req.endDate)}
                                            </td>
                                            <td>
                                                <span className="reason-text" title={req.reason}>
                                                    {req.reason.length > 30 ? req.reason.substring(0, 30) + '...' : req.reason}
                                                </span>
                                            </td>
                                            <td>{getStatusBadge(req.status)}</td>
                                            <td className="actions-cell">
                                                {req.status === 'pending' ? (
                                                    <>
                                                        <button
                                                            className="btn btn-sm btn-success"
                                                            onClick={() => handleReview(req, 'approved')}
                                                        >
                                                            <FiCheckCircle />
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => handleReview(req, 'rejected')}
                                                        >
                                                            <FiXCircle />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="no-data">Reviewed</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Review Modal */}
            <Modal
                isOpen={!!reviewingRequest}
                onClose={() => setReviewingRequest(null)}
                title={`${reviewData.status === 'approved' ? 'Approve' : 'Reject'} Leave Request`}
            >
                <div>
                    <p style={{ marginBottom: '16px' }}>
                        <strong>{reviewingRequest?.userId?.fullName}</strong> requested leave from{' '}
                        <strong>{reviewingRequest && formatDate(reviewingRequest.startDate)}</strong> to{' '}
                        <strong>{reviewingRequest && formatDate(reviewingRequest.endDate)}</strong>
                    </p>
                    <p style={{ marginBottom: '16px', color: 'var(--gray-600)' }}>
                        <strong>Reason:</strong> {reviewingRequest?.reason}
                    </p>
                    <div className="form-group">
                        <label className="form-label">Remark (Optional)</label>
                        <textarea
                            value={reviewData.reviewRemark}
                            onChange={(e) => setReviewData({ ...reviewData, reviewRemark: e.target.value })}
                            rows={3}
                            placeholder="Add a note..."
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setReviewingRequest(null)}>Cancel</button>
                    <button
                        className={`btn ${reviewData.status === 'approved' ? 'btn-success' : 'btn-danger'}`}
                        onClick={submitReview}
                    >
                        {reviewData.status === 'approved' ? 'Approve' : 'Reject'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default HodLeaveRequests;
