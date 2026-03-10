import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FaBullhorn } from 'react-icons/fa';
import { FiUser } from 'react-icons/fi';

const StudentAnnouncements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const response = await api.get('/announcements/student');
            setAnnouncements(response.data);
        } catch (error) {
            console.error('Failed to fetch announcements:', error);
        } finally {
            setLoading(false);
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
        if (ann.targetType === 'year') return `Year ${ann.targetYear}`;
        if (ann.targetType === 'class') return ann.targetClassId?.name || 'Your Class';
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

    const getRoleBadge = (role) => {
        const labels = {
            'hod': 'HOD',
            'classcoordinator': 'Class Coordinator',
            'teacher': 'Teacher'
        };
        return labels[role] || role;
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
                    <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
                        {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {announcements.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No announcements at the moment.
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--gray-500)' }}>
                                            <span>{formatDate(ann.createdAt)}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <FiUser size={12} />
                                                {ann.createdBy?.fullName || 'Unknown'} ({getRoleBadge(ann.createdBy?.role)})
                                            </span>
                                        </div>
                                    </div>
                                    <span style={{
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        whiteSpace: 'nowrap',
                                        ...getTargetBadgeStyle(ann.targetType)
                                    }}>
                                        {getTargetLabel(ann)}
                                    </span>
                                </div>
                                <p style={{ color: 'var(--gray-600)', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                    {ann.message}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentAnnouncements;
