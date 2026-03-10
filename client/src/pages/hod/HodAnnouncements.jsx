import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiSend, FiTrash2 } from 'react-icons/fi';
import { FaBullhorn } from 'react-icons/fa';

const HodAnnouncements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        targetType: 'all',
        targetYear: '',
        targetClassId: '',
        displayDuration: 24
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchAnnouncements();
        fetchClasses();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const response = await api.get('/announcements/hod');
            setAnnouncements(response.data);
        } catch (error) {
            console.error('Failed to fetch announcements:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchClasses = async () => {
        try {
            const response = await api.get('/announcements/hod/classes');
            setClasses(response.data);
        } catch (error) {
            console.error('Failed to fetch classes:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const payload = {
                title: formData.title,
                message: formData.message,
                targetType: formData.targetType,
                displayDuration: parseInt(formData.displayDuration)
            };

            if (formData.targetType === 'year') {
                payload.targetYear = parseInt(formData.targetYear);
            }
            if (formData.targetType === 'class') {
                payload.targetClassId = formData.targetClassId;
            }

            await api.post('/announcements/hod', payload);
            await fetchAnnouncements();
            setShowModal(false);
            setFormData({ title: '', message: '', targetType: 'all', targetYear: '', targetClassId: '', displayDuration: 24 });
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
            await api.delete(`/announcements/hod/${id}`);
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

    const getTargetLabel = (ann) => {
        if (ann.targetType === 'all') return 'All Students';
        if (ann.targetType === 'year') return `Year ${ann.targetYear} Students`;
        if (ann.targetType === 'class') return ann.targetClassId?.name || 'Specific Class';
        return ann.targetType;
    };

    const getTargetBadgeStyle = (targetType) => {
        const styles = {
            'all': { background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' },
            'year': { background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' },
            'class': { background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' }
        };
        return styles[targetType] || styles.all;
    };

    // Get unique years from classes
    const years = [...new Set(classes.map(c => c.year))].sort();

    // Filter classes by selected year
    const filteredClasses = formData.targetYear
        ? classes.filter(c => c.year === parseInt(formData.targetYear))
        : classes;

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
                                transition: 'var(--transition)'
                            }}>
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
                                            ...getTargetBadgeStyle(ann.targetType)
                                        }}>
                                            {getTargetLabel(ann)}
                                        </span>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            style={{ padding: '4px 8px' }}
                                            onClick={() => handleDelete(ann._id)}
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
                                    <label className="form-label">Target Audience</label>
                                    <select
                                        value={formData.targetType}
                                        onChange={(e) => setFormData({ ...formData, targetType: e.target.value, targetYear: '', targetClassId: '' })}
                                        required
                                    >
                                        <option value="all">All Students (Department-wide)</option>
                                        <option value="year">Specific Year</option>
                                        <option value="class">Specific Class</option>
                                    </select>
                                </div>

                                {formData.targetType === 'year' && (
                                    <div className="form-group">
                                        <label className="form-label">Select Year</label>
                                        <select
                                            value={formData.targetYear}
                                            onChange={(e) => setFormData({ ...formData, targetYear: e.target.value, targetClassId: '' })}
                                            required
                                        >
                                            <option value="">-- Select Year --</option>
                                            {years.map(y => (
                                                <option key={y} value={y}>Year {y}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {formData.targetType === 'class' && (
                                    <div className="form-group">
                                        <label className="form-label">Select Class</label>
                                        <select
                                            value={formData.targetClassId}
                                            onChange={(e) => setFormData({ ...formData, targetClassId: e.target.value })}
                                            required
                                        >
                                            <option value="">-- Select Class --</option>
                                            {classes.map(c => (
                                                <option key={c._id} value={c._id}>
                                                    {c.name} (Year {c.year})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

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

export default HodAnnouncements;
