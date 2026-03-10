import { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import { FaBullhorn } from 'react-icons/fa';

const HodComplaints = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [resolvingComplaint, setResolvingComplaint] = useState(null);
    const [resolveData, setResolveData] = useState({ status: 'resolved', remark: '' });

    useEffect(() => {
        fetchComplaints();
    }, [filter]);

    const fetchComplaints = async () => {
        try {
            setLoading(true);
            const params = filter ? `?status=${filter}` : '';
            const response = await api.get(`/hod/complaints${params}`);
            setComplaints(response.data);
        } catch (error) {
            console.error('Failed to fetch complaints:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = (complaint) => {
        setResolvingComplaint(complaint);
        setResolveData({ status: 'resolved', remark: '' });
    };

    const handleMarkInProgress = async (complaint) => {
        try {
            await api.put(`/hod/complaints/${complaint._id}`, { status: 'in-progress' });
            fetchComplaints();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update');
        }
    };

    const submitResolve = async () => {
        try {
            await api.put(`/hod/complaints/${resolvingComplaint._id}`, resolveData);
            setResolvingComplaint(null);
            fetchComplaints();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to resolve');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            open: 'badge-danger',
            'in-progress': 'badge-warning',
            resolved: 'badge-success'
        };
        const labels = {
            open: 'Open',
            'in-progress': 'In Progress',
            resolved: 'Resolved'
        };
        return <span className={`badge ${styles[status]}`}>{labels[status]}</span>;
    };

    const formatDate = (date) => new Date(date).toLocaleDateString();

    return (
        <div>
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Complaints</h2>
                </div>

                <div className="toolbar">
                    <div className="filter-group">
                        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                            <option value="">All Status</option>
                            <option value="open">Open</option>
                            <option value="in-progress">In Progress</option>
                            <option value="resolved">Resolved</option>
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
                                    <th>Submitted By</th>
                                    <th>Role</th>
                                    <th>Subject</th>
                                    <th>Category</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {complaints.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="empty-state">
                                            <div className="empty-icon"><FaBullhorn size={48} /></div>
                                            <h3>No complaints</h3>
                                        </td>
                                    </tr>
                                ) : (
                                    complaints.map(complaint => (
                                        <tr key={complaint._id}>
                                            <td><strong>{complaint.userId?.fullName}</strong></td>
                                            <td>
                                                <span className="badge badge-primary">
                                                    {complaint.userId?.role}
                                                </span>
                                            </td>
                                            <td>
                                                <span title={complaint.description}>
                                                    {complaint.subject}
                                                </span>
                                            </td>
                                            <td>{complaint.category}</td>
                                            <td>{formatDate(complaint.createdAt)}</td>
                                            <td>{getStatusBadge(complaint.status)}</td>
                                            <td className="actions-cell">
                                                {complaint.status === 'open' && (
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        onClick={() => handleMarkInProgress(complaint)}
                                                    >
                                                        <FiRefreshCw style={{ marginRight: '2px' }} /> In Progress
                                                    </button>
                                                )}
                                                {complaint.status !== 'resolved' && (
                                                    <button
                                                        className="btn btn-sm btn-success"
                                                        onClick={() => handleResolve(complaint)}
                                                    >
                                                        <FiCheckCircle style={{ marginRight: '2px' }} /> Resolve
                                                    </button>
                                                )}
                                                {complaint.status === 'resolved' && (
                                                    <span className="no-data">Resolved</span>
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

            {/* Resolve Modal */}
            <Modal
                isOpen={!!resolvingComplaint}
                onClose={() => setResolvingComplaint(null)}
                title="Resolve Complaint"
            >
                <div>
                    <p style={{ marginBottom: '8px' }}>
                        <strong>Subject:</strong> {resolvingComplaint?.subject}
                    </p>
                    <p style={{ marginBottom: '16px', color: 'var(--gray-600)' }}>
                        <strong>Description:</strong> {resolvingComplaint?.description}
                    </p>
                    <div className="form-group">
                        <label className="form-label">Resolution Remark</label>
                        <textarea
                            value={resolveData.remark}
                            onChange={(e) => setResolveData({ ...resolveData, remark: e.target.value })}
                            rows={3}
                            placeholder="Describe the resolution..."
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setResolvingComplaint(null)}>Cancel</button>
                    <button className="btn btn-success" onClick={submitResolve}>
                        <FiCheckCircle style={{ marginRight: '2px' }} /> Mark Resolved
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default HodComplaints;
