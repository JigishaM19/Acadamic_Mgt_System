import { useState, useEffect } from 'react';

const StudentComplaints = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        subject: '',
        category: 'other',
        description: ''
    });

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/student/complaints', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setComplaints(data.complaints || []);
            } else {
                setError(data.message || 'Failed to fetch complaints');
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
            const response = await fetch('http://localhost:5000/api/student/complaints', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (response.ok) {
                setSuccess('Complaint submitted successfully!');
                setFormData({ subject: '', category: 'other', description: '' });
                setShowForm(false);
                fetchComplaints();
            } else {
                setError(data.message || 'Failed to submit complaint');
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
            case 'resolved': return 'status-approved';
            case 'in-progress': return 'status-pending';
            case 'open': return 'status-open';
            default: return '';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'resolved': return 'Resolved';
            case 'in-progress': return 'In Progress';
            case 'open': return 'Open';
            default: return status;
        }
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>Complaints</h2>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? 'Cancel' : '+ New Complaint'}
                </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Complaint Form */}
            {showForm && (
                <div className="form-card">
                    <h3>Submit Complaint</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Subject</label>
                                <input
                                    type="text"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleInputChange}
                                    placeholder="Brief subject of your complaint"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Category</label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="academic">Academic</option>
                                    <option value="infrastructure">Infrastructure</option>
                                    <option value="faculty">Faculty</option>
                                    <option value="administrative">Administrative</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Please describe your complaint in detail..."
                                rows="5"
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
                                {submitting ? 'Submitting...' : 'Submit Complaint'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Complaints History */}
            <div className="section">
                <h3 className="section-title">Complaint History</h3>
                {complaints.length > 0 ? (
                    <div className="complaints-list">
                        {complaints.map((complaint, index) => (
                            <div key={complaint._id} className="complaint-card">
                                <div className="complaint-header">
                                    <div className="complaint-title">
                                        <span className="complaint-number">#{index + 1}</span>
                                        <h4>{complaint.subject}</h4>
                                    </div>
                                    <span className={`status-badge ${getStatusClass(complaint.status)}`}>
                                        {getStatusLabel(complaint.status)}
                                    </span>
                                </div>
                                <div className="complaint-body">
                                    <p className="complaint-description">{complaint.description}</p>
                                    <div className="complaint-meta">
                                        <span className="badge">{complaint.category}</span>
                                        <span className="complaint-date">Submitted: {formatDate(complaint.createdAt)}</span>
                                    </div>
                                </div>
                                {complaint.remark && (
                                    <div className="complaint-response">
                                        <strong>Response:</strong>
                                        <p>{complaint.remark}</p>
                                        {complaint.resolvedBy && (
                                            <span className="resolved-by">By: {complaint.resolvedBy}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">No complaints submitted yet</div>
                )}
            </div>
        </div>
    );
};

export default StudentComplaints;
