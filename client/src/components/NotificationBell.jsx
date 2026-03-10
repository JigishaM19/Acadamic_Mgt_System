import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { FiBell, FiCheck, FiCheckCircle, FiTrash2, FiAlertTriangle, FiFileText, FiXCircle, FiTrendingDown, FiBarChart2 } from 'react-icons/fi';
import { FaBullhorn } from 'react-icons/fa';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchNotifications();
        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await api.get('/notifications');
            setNotifications(response.data.notifications);
            setUnreadCount(response.data.unreadCount);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    const markAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const markOneRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const deleteNotification = async (id) => {
        try {
            await api.delete(`/notifications/${id}`);
            const removed = notifications.find(n => n._id === id);
            setNotifications(prev => prev.filter(n => n._id !== id));
            if (removed && !removed.read) setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to delete notification:', error);
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

    const getIcon = (type) => {
        switch (type) {
            case 'announcement': return <FaBullhorn size={16} style={{ color: 'var(--primary)' }} />;
            case 'complaint_received': return <FiAlertTriangle size={16} style={{ color: '#f59e0b' }} />;
            case 'complaint_resolved': return <FiCheckCircle size={16} style={{ color: '#10b981' }} />;
            case 'leave_received': return <FiFileText size={16} style={{ color: '#6366f1' }} />;
            case 'leave_approved': return <FiCheckCircle size={16} style={{ color: '#10b981' }} />;
            case 'leave_rejected': return <FiXCircle size={16} style={{ color: '#ef4444' }} />;
            case 'low_attendance': return <FiTrendingDown size={16} style={{ color: '#ef4444' }} />;
            case 'low_performance': return <FiBarChart2 size={16} style={{ color: '#f59e0b' }} />;
            default: return <FiBell size={16} style={{ color: 'var(--gray-500)' }} />;
        }
    };

    return (
        <div className="notification-bell-wrapper" ref={dropdownRef}>
            <button
                className="notification-bell-btn"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Notifications"
            >
                <FiBell size={20} />
                {unreadCount > 0 && (
                    <span className="notification-badge-count">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-dropdown-header">
                        <h4>Notifications</h4>
                        {unreadCount > 0 && (
                            <button className="notification-mark-all" onClick={markAllRead}>
                                <FiCheckCircle size={14} /> Mark all read
                            </button>
                        )}
                    </div>
                    <div className="notification-dropdown-body">
                        {notifications.length === 0 ? (
                            <div className="notification-empty">
                                <FiBell size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n._id}
                                    className={`notification-item ${!n.read ? 'unread' : ''}`}
                                    onClick={() => !n.read && markOneRead(n._id)}
                                >
                                    <span className="notification-item-icon">{getIcon(n.type)}</span>
                                    <div className="notification-item-content">
                                        <div className="notification-item-title">{n.title}</div>
                                        <div className="notification-item-message">{n.message}</div>
                                        <div className="notification-item-time">{formatTime(n.createdAt)}</div>
                                    </div>
                                    <button
                                        className="notification-item-delete"
                                        onClick={(e) => { e.stopPropagation(); deleteNotification(n._id); }}
                                        title="Delete"
                                    >
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
