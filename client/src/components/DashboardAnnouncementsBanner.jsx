import { useState, useEffect } from 'react';
import api from '../services/api';
import { FaBullhorn } from 'react-icons/fa';

const DashboardAnnouncementsBanner = () => {
    const [announcements, setAnnouncements] = useState([]);

    useEffect(() => {
        fetchFeed();
    }, []);

    const fetchFeed = async () => {
        try {
            const response = await api.get('/announcements/feed');
            setAnnouncements(response.data);
        } catch (error) {
            // Silently fail - banner is optional
            console.error('Failed to fetch announcement feed:', error);
        }
    };

    const formatTime = (date) => {
        const now = new Date();
        const d = new Date(date);
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHrs = Math.floor(diffMins / 60);
        if (diffHrs < 24) return `${diffHrs}h ago`;
        const diffDays = Math.floor(diffHrs / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    };

    const getRoleBadge = (role) => {
        const labels = {
            'hod': 'HOD',
            'classcoordinator': 'CC',
            'teacher': 'Teacher'
        };
        return labels[role] || role;
    };

    if (announcements.length === 0) return null;

    return (
        <div className="dashboard-announcements-banner">
            <div className="banner-header">
                <h3><FaBullhorn /> Active Announcements</h3>
                <span className="banner-count">{announcements.length}</span>
            </div>
            <div className="banner-body">
                {announcements.map(ann => (
                    <div key={ann._id} className="banner-item">
                        <span className="banner-item-icon"><FaBullhorn size={16} /></span>
                        <div className="banner-item-content">
                            <h4>{ann.title}</h4>
                            <p>{ann.message}</p>
                            <div className="banner-item-meta">
                                <span>{ann.createdBy?.fullName || 'Unknown'} ({getRoleBadge(ann.createdBy?.role)})</span>
                                <span>•</span>
                                <span>{formatTime(ann.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DashboardAnnouncementsBanner;
