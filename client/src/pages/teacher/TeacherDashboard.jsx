import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { FiBook, FiClock, FiAlertCircle, FiCheck, FiClipboard, FiFileText, FiCalendar, FiTarget } from 'react-icons/fi';
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
        // Handle numeric percentage
        if (typeof statusOrPercentage === 'number') {
            if (statusOrPercentage >= 75) return 'var(--success)';
            if (statusOrPercentage >= 60) return 'var(--warning)';
            return 'var(--danger)';
        }
        // Handle string status
        switch (statusOrPercentage) {
            case 'good': return 'var(--success)';
            case 'warning': return 'var(--warning)';
            case 'low': return 'var(--danger)';
            default: return 'var(--gray-400)';
        }
    };

    const getStatusClass = (statusOrPercentage) => {
        // Handle numeric percentage
        if (typeof statusOrPercentage === 'number') {
            if (statusOrPercentage >= 75) return 'good';
            if (statusOrPercentage >= 60) return 'warning';
            return 'critical';
        }
        // Handle string status
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

    return (
        <div>
            {/* Announcements Banner */}
            <DashboardAnnouncementsBanner />

            {/* Current Lecture Card */}
            {currentLecture && (
                <div className="card current-lecture-card" style={{
                    marginBottom: '24px',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                    color: 'white'
                }}>
                    <div className="card-header" style={{ borderBottom: 'none' }}>
                        <h2 className="card-title" style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FiTarget size={20} /> Current Lecture
                        </h2>
                    </div>
                    <div style={{ padding: '0 24px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{currentLecture.className}</h3>
                                <p style={{ margin: '8px 0 0', opacity: 0.9 }}>
                                    {currentLecture.subject} • Room {currentLecture.room} • {currentLecture.type}
                                </p>
                                <p style={{ margin: '4px 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
                                    {currentLecture.timeSlot?.startTime} - {currentLecture.timeSlot?.endTime}
                                </p>
                            </div>
                            <button
                                className="btn btn-secondary"
                                onClick={handleTakeAttendance}
                                disabled={currentLecture.attendanceTaken}
                                style={{
                                    background: currentLecture.attendanceTaken ? 'rgba(255,255,255,0.3)' : 'white',
                                    color: currentLecture.attendanceTaken ? 'white' : 'var(--primary)',
                                    cursor: currentLecture.attendanceTaken ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {currentLecture.attendanceTaken ? <><FiCheck /> Attendance Taken</> : <><FiClipboard /> Take Attendance</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Stats Row */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon classes"><FiBook size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats?.totalClasses || 0}</h3>
                        <p>Assigned Classes</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}><FiClock size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats?.pendingLeaves || 0}</h3>
                        <p>Pending Leaves</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #f87171)' }}><FiAlertCircle size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats?.openComplaints || 0}</h3>
                        <p>Open Complaints</p>
                    </div>
                </div>
            </div>

            {/* Attendance & Performance Overview */}
            <div className="card" style={{ marginTop: '24px' }}>
                <div className="card-header">
                    <h2 className="card-title">Attendance & Performance Overview</h2>
                </div>
                <div className="year-cards-grid">
                    {stats?.classStats?.length > 0 ? (
                        stats.classStats.map((cls, index) => (
                            <div
                                key={index}
                                className="year-card"
                                style={{ cursor: 'pointer' }}
                                onClick={() => navigate(`/teacher/attendance/${cls.classId}/${encodeURIComponent(cls.subject)}`)}
                            >
                                <div className="year-header">
                                    <span className="year-number">{cls.subject}</span>
                                    <span className={`attendance-badge ${getStatusClass(cls.avgAttendance || 0)}`}>
                                        {cls.avgAttendance || 0}%
                                    </span>
                                </div>
                                <div style={{ padding: '8px 0', color: 'var(--gray-600)', fontSize: '0.85rem' }}>
                                    {cls.className} • {cls.department} • Year {cls.year}
                                </div>
                                <div className="year-stats">
                                    <div className="year-stat">
                                        <span className="stat-value">{cls.avgAttendance || 0}%</span>
                                        <span className="stat-label">Attendance</span>
                                    </div>
                                    <div className="year-stat">
                                        <span className="stat-value">{cls.avgTestScore || 0}%</span>
                                        <span className="stat-label">IA Avg</span>
                                    </div>
                                </div>
                                <div className="year-stats" style={{ marginTop: '8px' }}>
                                    <div className="year-stat">
                                        <span className="stat-value">{cls.totalLectures || 0}</span>
                                        <span className="stat-label">Lectures</span>
                                    </div>
                                    <div className="year-stat">
                                        <span className="stat-value">{cls.totalTests || 0}</span>
                                        <span className="stat-label">Tests</span>
                                    </div>
                                </div>
                                <div className="attendance-bar">
                                    <div
                                        className="attendance-fill"
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

            {/* Quick Actions */}
            <div className="dashboard-grid" style={{ marginTop: '24px' }}>
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Quick Actions</h2>
                    </div>
                    <div className="quick-actions">
                        <a href="/teacher/attendance" className="action-btn">
                            <span className="action-icon"><FiClipboard size={18} /></span>
                            <span>Take Attendance</span>
                        </a>
                        <a href="/teacher/tests" className="action-btn">
                            <span className="action-icon"><FiFileText size={18} /></span>
                            <span>Record Tests</span>
                        </a>
                        <a href="/teacher/timetable" className="action-btn">
                            <span className="action-icon"><FiCalendar size={18} /></span>
                            <span>View Timetable</span>
                        </a>
                        <a href="/teacher/leave-requests" className="action-btn">
                            <span className="action-icon"><FiClock size={18} /></span>
                            <span>Leave Requests</span>
                        </a>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Status Overview</h2>
                    </div>
                    <div className="pending-list">
                        <div className="pending-item">
                            <div className="pending-icon warning"><FiClock size={18} /></div>
                            <div className="pending-info">
                                <span className="pending-count">{stats?.pendingLeaves || 0}</span>
                                <span className="pending-label">Leave Requests Pending</span>
                            </div>
                        </div>
                        <div className="pending-item">
                            <div className="pending-icon danger"><FiAlertCircle size={18} /></div>
                            <div className="pending-info">
                                <span className="pending-count">{stats?.openComplaints || 0}</span>
                                <span className="pending-label">Open Complaints</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;

