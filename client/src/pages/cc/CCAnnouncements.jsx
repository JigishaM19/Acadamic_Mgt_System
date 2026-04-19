import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiSend, FiTrash2 } from 'react-icons/fi';
import { FaBullhorn } from 'react-icons/fa';
import DetailModal from '../../components/DetailModal';

const CCAnnouncements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        displayDuration: 24
    });
    const [submitting, setSubmitting] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState(null);

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const response = await api.get('/announcements/cc');
            setAnnouncements(response.data);
        } catch (error) {
            console.error('Failed to fetch announcements:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await api.post('/announcements/cc', {
                title: formData.title,
                message: formData.message,
                displayDuration: parseInt(formData.displayDuration)
            });
            await fetchAnnouncements();
            setShowModal(false);
            setFormData({ title: '', message: '', displayDuration: 24 });
        } catch (error) {
            console.error('Failed to create announcement:', error);
            alert(error.response?.data?.message || 'Failed to create announcement');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this announcement?')) return;
        try {
            await api.delete(`/announcements/cc/${id}`);
            await fetchAnnouncements();
        } catch (error) {
            console.error('Failed to delete announcement:', error);
            alert('Failed to delete announcement');
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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
                <div className="card-header">
                    <h2 className="card-title"><FaBullhorn style={{ marginRight: '6px' }} /> Announcements</h2>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        + New Announcement
                    </button>
                </div>

                <p style={{ color: 'var(--gray-500)', fontSize: '14px', marginBottom: '20px' }}>
                    Announcements will be visible to all students in your class.
                </p>

                {announcements.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No announcements yet. Create your first announcement!
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {announcements.map(ann => (
                            <div key={ann._id} style={{
                                border: '1px solid var(--gray-200)',
                                borderRadius: '12px',
                                padding: '20px',
                                background: 'var(--gray-50)',
                                transition: 'var(--transition)',
                                cursor: 'pointer'
                            }} onClick={() => setSelectedDetail(ann)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--gray-800)', marginBottom: '4px' }}>
                                            {ann.title}
                                        </h3>
                                        <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                                            {formatDate(ann.createdAt)}
                                            {ann.createdBy && <span> • By {ann.createdBy.fullName}</span>}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            background: 'rgba(14, 165, 233, 0.1)',
                                            color: '#0ea5e9'
                                        }}>
                                            {ann.targetClassId?.name || 'My Class'}
                                        </span>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            style={{ padding: '4px 8px' }}
                                            onClick={(e) => { e.stopPropagation(); handleDelete(ann._id); }}
                                        >
                                            <FiTrash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <p style={{ color: 'var(--gray-600)', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                    {ann.message}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <DetailModal
                isOpen={!!selectedDetail}
                onClose={() => setSelectedDetail(null)}
                title="Announcement Details"
                fields={selectedDetail ? [
                    { label: 'Title', value: selectedDetail.title },
                    { label: 'Class', value: selectedDetail.targetClassId?.name || 'My Class' },
                    { label: 'Posted By', value: selectedDetail.createdBy?.fullName || 'You' },
                    { label: 'Date', value: formatDate(selectedDetail.createdAt) },
                    { label: 'Message', value: selectedDetail.message }
                ] : []}
            />

            {/* Create Announcement Modal */}
            {showModal && (
                <div className="modal-overlay show" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
                        <div className="modal-header">
                            <h3>New Announcement</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Title</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        required
                                        placeholder="Announcement title"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Message</label>
                                    <textarea
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        rows={5}
                                        required
                                        placeholder="Write your announcement message..."
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Display Duration</label>
                                    <select
                                        value={formData.displayDuration}
                                        onChange={(e) => setFormData({ ...formData, displayDuration: e.target.value })}
                                    >
                                        <option value={8}>8 Hours</option>
                                        <option value={24}>24 Hours</option>
                                        <option value={72}>3 Days</option>
                                        <option value={120}>5 Days</option>
                                        <option value={168}>1 Week</option>
                                    </select>
                                    <small style={{ color: 'var(--gray-500)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                        How long the announcement stays on the dashboard home page
                                    </small>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    <FiSend size={14} />
                                    {submitting ? 'Publishing...' : 'Publish Announcement'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CCAnnouncements;
