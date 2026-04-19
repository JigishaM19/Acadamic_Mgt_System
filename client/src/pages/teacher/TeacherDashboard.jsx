import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { FiBook, FiClock, FiAlertCircle, FiCheck, FiClipboard, FiFileText, FiCalendar, FiTarget, FiTrendingUp, FiBarChart2 } from 'react-icons/fi';
import DashboardAnnouncementsBanner from '../../components/DashboardAnnouncementsBanner';

const TeacherDashboard = () => {
    const [stats, setStats] = useState(null);
    const [currentLecture, setCurrentLecture] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
        // Check for current lecture every minute
        const interval = setInterval(fetchCurrentLecture, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            await Promise.all([fetchStats(), fetchCurrentLecture()]);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.get('/teacher/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch teacher stats:', error);
        }
    };

    const fetchCurrentLecture = async () => {
        try {
            const response = await api.get('/teacher/current-lecture');
            setCurrentLecture(response.data.currentLecture);
        } catch (error) {
            console.error('Failed to fetch current lecture:', error);
        }
    };

    const getStatusColor = (statusOrPercentage) => {
        if (typeof statusOrPercentage === 'number') {
            if (statusOrPercentage >= 75) return 'var(--success)';
            if (statusOrPercentage >= 60) return 'var(--warning)';
            return 'var(--danger)';
        }
        switch (statusOrPercentage) {
            case 'good': return 'var(--success)';
            case 'warning': return 'var(--warning)';
            case 'low': return 'var(--danger)';
            default: return 'var(--gray-400)';
        }
    };

    const getStatusClass = (statusOrPercentage) => {
        if (typeof statusOrPercentage === 'number') {
            if (statusOrPercentage >= 75) return 'good';
            if (statusOrPercentage >= 60) return 'warning';
            return 'critical';
        }
        switch (statusOrPercentage) {
            case 'good': return 'good';
            case 'warning': return 'warning';
            case 'low': return 'critical';
            default: return '';
        }
    };

    const handleTakeAttendance = () => {
        if (currentLecture) {
            navigate(`/teacher/attendance/${currentLecture.classId}/${encodeURIComponent(currentLecture.subject)}`);
        }
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    const topCards = [
        {
            icon: <FiBook size={22} />,
            value: stats?.totalClasses || 0,
            label: 'Assigned Classes',
            gradient: 'linear-gradient(135deg, #6366f1, #818cf8)',
            bgTint: 'rgba(99, 102, 241, 0.08)',
            borderColor: 'rgba(99, 102, 241, 0.2)'
        },
        {
            icon: <FiClock size={22} />,
            value: stats?.pendingLeaves || 0,
            label: 'Pending Leaves',
            gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
            bgTint: 'rgba(245, 158, 11, 0.08)',
            borderColor: 'rgba(245, 158, 11, 0.2)'
        },
        {
            icon: <FiAlertCircle size={22} />,
            value: stats?.openComplaints || 0,
            label: 'Open Complaints',
            gradient: 'linear-gradient(135deg, #ef4444, #f87171)',
            bgTint: 'rgba(239, 68, 68, 0.08)',
            borderColor: 'rgba(239, 68, 68, 0.2)'
        }
    ];

    return (
        <div className="hod-dash">
            {/* Announcements Banner */}
            <DashboardAnnouncementsBanner />

            {/* Current Lecture Card */}
            {currentLecture && (
                <div className="tch-live-card">
                    <div className="tch-live-pulse"></div>
                    <div className="tch-live-content">
                        <div className="tch-live-left">
                            <div className="tch-live-badge">
                                <FiTarget size={14} /> LIVE NOW
                            </div>
                            <h3 className="tch-live-class">{currentLecture.className}</h3>
                            <p className="tch-live-detail">
                                {currentLecture.subject} &bull; Room {currentLecture.room} &bull; {currentLecture.type}
                            </p>
                            <p className="tch-live-time">
                                {currentLecture.timeSlot?.startTime} – {currentLecture.timeSlot?.endTime}
                            </p>
                        </div>
                        <button
                            className="tch-live-btn"
                            onClick={handleTakeAttendance}
                            disabled={currentLecture.attendanceTaken}
                        >
                            {currentLecture.attendanceTaken
                                ? <><FiCheck size={18} /> Attendance Taken</>
                                : <><FiClipboard size={18} /> Take Attendance</>
                            }
                        </button>
                    </div>
                </div>
            )}

            {/* Quick Stats Row */}
            <div className="hod-stats-row">
                {topCards.map((card, i) => (
                    <div
                        key={i}
                        className="hod-stat-card"
                        style={{
                            background: card.bgTint,
                            borderColor: card.borderColor,
                        }}
                    >
                        <div className="hod-stat-icon" style={{ background: card.gradient }}>
                            {card.icon}
                        </div>
                        <div className="hod-stat-body">
                            <span className="hod-stat-value">{card.value}</span>
                            <span className="hod-stat-label">{card.label}</span>
                        </div>
                        <div className="hod-stat-accent" style={{ background: card.gradient }}></div>
                    </div>
                ))}
            </div>

            {/* Attendance & Performance Overview */}
            <div className="hod-section-card">
                <div className="hod-section-header">
                    <div className="hod-section-title-group">
                        <div className="hod-section-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>
                            <FiBarChart2 size={18} />
                        </div>
                        <h2>Attendance & Performance Overview</h2>
                    </div>
                </div>
                <div className="hod-year-grid">
                    {stats?.classStats?.length > 0 ? (
                        stats.classStats.map((cls, index) => (
                            <div
                                key={index}
                                className="hod-year-card hod-year-card--clickable"
                                onClick={() => navigate(`/teacher/attendance/${cls.classId}/${encodeURIComponent(cls.subject)}`)}
                            >
                                <div className="hod-year-top">
                                    <span className="hod-year-label">{cls.subject}</span>
                                    <span className={`hod-badge ${getStatusClass(cls.avgAttendance || 0)}`}>
                                        {cls.avgAttendance || 0}%
                                    </span>
                                </div>
                                <p className="tch-class-meta">
                                    {cls.className} &bull; {cls.department} &bull; Year {cls.year}
                                </p>
                                <div className="hod-year-metrics">
                                    <div className="hod-year-metric">
                                        <span className="hod-metric-num">{cls.avgAttendance || 0}%</span>
                                        <span className="hod-metric-label">Attendance</span>
                                    </div>
                                    <div className="hod-year-metric-divider"></div>
                                    <div className="hod-year-metric">
                                        <span className="hod-metric-num">{cls.avgTestScore || 0}%</span>
                                        <span className="hod-metric-label">IA Avg</span>
                                    </div>
                                </div>
                                <div className="hod-year-metrics" style={{ marginTop: '4px' }}>
                                    <div className="hod-year-metric">
                                        <span className="hod-metric-num">{cls.totalLectures || 0}</span>
                                        <span className="hod-metric-label">Lectures</span>
                                    </div>
                                    <div className="hod-year-metric-divider"></div>
                                    <div className="hod-year-metric">
                                        <span className="hod-metric-num">{cls.totalTests || 0}</span>
                                        <span className="hod-metric-label">Tests</span>
                                    </div>
                                </div>
                                <div className="hod-progress-track">
                                    <div
                                        className="hod-progress-fill"
                                        style={{
                                            width: `${cls.avgAttendance || 0}%`,
                                            background: getStatusColor(cls.avgAttendance || 0)
                                        }}
                                    ></div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
                            <p>No classes assigned yet. Classes will appear here once you're assigned in the timetable.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions & Status */}
            <div className="hod-bottom-grid">
                <div className="hod-section-card">
                    <div className="hod-section-header">
                        <div className="hod-section-title-group">
                            <div className="hod-section-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>
                                <FiTrendingUp size={18} />
                            </div>
                            <h2>Quick Actions</h2>
                        </div>
                    </div>
                    <div className="hod-actions-grid">
                        <a href="/teacher/attendance" className="hod-action-btn">
                            <span className="hod-action-icon"><FiClipboard size={20} /></span>
                            <span>Take Attendance</span>
                        </a>
                        <a href="/teacher/tests" className="hod-action-btn">
                            <span className="hod-action-icon"><FiFileText size={20} /></span>
                            <span>Record Tests</span>
                        </a>
                        <a href="/teacher/timetable" className="hod-action-btn">
                            <span className="hod-action-icon"><FiCalendar size={20} /></span>
                            <span>View Timetable</span>
                        </a>
                        <a href="/teacher/leave-requests" className="hod-action-btn">
                            <span className="hod-action-icon"><FiClock size={20} /></span>
                            <span>Leave Requests</span>
                        </a>
                    </div>
                </div>

                <div className="hod-section-card">
                    <div className="hod-section-header">
                        <div className="hod-section-title-group">
                            <div className="hod-section-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #f87171)' }}>
                                <FiAlertCircle size={18} />
                            </div>
                            <h2>Status Overview</h2>
                        </div>
                    </div>
                    <div className="hod-pending-list">
                        <div className="hod-pending-row">
                            <div className="hod-pending-icon warning"><FiClock size={20} /></div>
                            <div className="hod-pending-body">
                                <span className="hod-pending-count">{stats?.pendingLeaves || 0}</span>
                                <span className="hod-pending-label">Leave Requests Pending</span>
                            </div>
                        </div>
                        <div className="hod-pending-row">
                            <div className="hod-pending-icon danger"><FiAlertCircle size={20} /></div>
                            <div className="hod-pending-body">
                                <span className="hod-pending-count">{stats?.openComplaints || 0}</span>
                                <span className="hod-pending-label">Open Complaints</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;
