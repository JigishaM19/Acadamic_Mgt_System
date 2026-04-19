import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { FiUsers, FiClipboard, FiFileText, FiCalendar, FiClock, FiAlertCircle, FiAlertTriangle, FiTrendingUp, FiBarChart2, FiActivity } from 'react-icons/fi';
import DashboardAnnouncementsBanner from '../../components/DashboardAnnouncementsBanner';

const CCDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/cc/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch CC stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (percentage) => {
        if (percentage >= 75) return 'var(--success)';
        if (percentage >= 60) return 'var(--warning)';
        return 'var(--danger)';
    };

    const getStatusClass = (statusOrPct) => {
        // Handle numeric
        if (typeof statusOrPct === 'number') {
            if (statusOrPct >= 75) return 'good';
            if (statusOrPct >= 60) return 'warning';
            return 'critical';
        }
        // Handle string status from backend
        if (statusOrPct === 'good') return 'good';
        if (statusOrPct === 'warning') return 'warning';
        return 'critical'; // handles 'low', 'critical', or anything else
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
            icon: <FiUsers size={22} />,
            value: stats?.totalStudents || 0,
            label: 'Total Students',
            gradient: 'linear-gradient(135deg, #6366f1, #818cf8)',
            bgTint: 'rgba(99, 102, 241, 0.08)',
            borderColor: 'rgba(99, 102, 241, 0.2)'
        },
        {
            icon: <FiClipboard size={22} />,
            value: `${stats?.overallAttendance || 0}%`,
            label: 'Class Attendance',
            gradient: `linear-gradient(135deg, ${(stats?.overallAttendance || 0) >= 75 ? '#22c55e, #4ade80' : (stats?.overallAttendance || 0) >= 60 ? '#f59e0b, #fbbf24' : '#ef4444, #f87171'})`,
            bgTint: (stats?.overallAttendance || 0) >= 75
                ? 'rgba(34, 197, 94, 0.08)'
                : (stats?.overallAttendance || 0) >= 60
                    ? 'rgba(245, 158, 11, 0.08)'
                    : 'rgba(239, 68, 68, 0.08)',
            borderColor: (stats?.overallAttendance || 0) >= 75
                ? 'rgba(34, 197, 94, 0.2)'
                : (stats?.overallAttendance || 0) >= 60
                    ? 'rgba(245, 158, 11, 0.2)'
                    : 'rgba(239, 68, 68, 0.2)'
        },
        {
            icon: <FiFileText size={22} />,
            value: `${stats?.overallIAPerformance || 0}%`,
            label: 'IA Performance',
            gradient: `linear-gradient(135deg, ${(stats?.overallIAPerformance || 0) >= 75 ? '#22c55e, #4ade80' : (stats?.overallIAPerformance || 0) >= 60 ? '#f59e0b, #fbbf24' : '#ef4444, #f87171'})`,
            bgTint: (stats?.overallIAPerformance || 0) >= 75
                ? 'rgba(34, 197, 94, 0.08)'
                : (stats?.overallIAPerformance || 0) >= 60
                    ? 'rgba(245, 158, 11, 0.08)'
                    : 'rgba(239, 68, 68, 0.08)',
            borderColor: (stats?.overallIAPerformance || 0) >= 75
                ? 'rgba(34, 197, 94, 0.2)'
                : (stats?.overallIAPerformance || 0) >= 60
                    ? 'rgba(245, 158, 11, 0.2)'
                    : 'rgba(239, 68, 68, 0.2)'
        },
        {
            icon: <FiClock size={22} />,
            value: stats?.pendingLeaves || 0,
            label: 'Pending Leaves',
            gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
            bgTint: 'rgba(245, 158, 11, 0.08)',
            borderColor: 'rgba(245, 158, 11, 0.2)'
        }
    ];

    return (
        <div className="hod-dash">
            {/* Announcements Banner */}
            <DashboardAnnouncementsBanner />

            {/* Class Info Header */}
            <div className="cc-class-header">
                <div className="cc-class-header-left">
                    <h2 className="cc-class-name">{stats?.className || 'My Class'}</h2>
                    <span className="cc-class-badge">
                        Year {stats?.year} — {stats?.department}
                    </span>
                </div>
            </div>

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

            {/* Subject-wise Overview */}
            <div className="hod-section-card">
                <div className="hod-section-header">
                    <div className="hod-section-title-group">
                        <div className="hod-section-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>
                            <FiBarChart2 size={18} />
                        </div>
                        <h2>Subject-wise Overview</h2>
                    </div>
                </div>
                <div className="hod-year-grid">
                    {stats?.subjectStats?.map((subject, index) => (
                        <div key={index} className="hod-year-card">
                            <div className="hod-year-top">
                                <span className="hod-year-label">{subject.subject}</span>
                                <span className={`hod-badge ${getStatusClass(subject.status)}`}>
                                    {(subject.status || 'N/A').toUpperCase()}
                                </span>
                            </div>
                            <div className="hod-year-metrics">
                                <div className="hod-year-metric">
                                    <span className="hod-metric-num">{subject.avgAttendance}%</span>
                                    <span className="hod-metric-label">Attendance</span>
                                </div>
                                <div className="hod-year-metric-divider"></div>
                                <div className="hod-year-metric">
                                    <span className="hod-metric-num">{subject.avgIAScore}%</span>
                                    <span className="hod-metric-label">IA Avg</span>
                                </div>
                            </div>
                            <div className="hod-year-metrics" style={{ marginTop: '4px' }}>
                                <div className="hod-year-metric">
                                    <span className="hod-metric-num">{subject.totalLectures}</span>
                                    <span className="hod-metric-label">Lectures</span>
                                </div>
                                <div className="hod-year-metric-divider"></div>
                                <div className="hod-year-metric">
                                    <span className="hod-metric-num">{subject.totalTests}</span>
                                    <span className="hod-metric-label">Tests</span>
                                </div>
                            </div>
                            <div className="hod-progress-track">
                                <div
                                    className="hod-progress-fill"
                                    style={{
                                        width: `${subject.avgAttendance}%`,
                                        background: getStatusColor(subject.avgAttendance)
                                    }}
                                ></div>
                            </div>
                        </div>
                    ))}
                    {(!stats?.subjectStats || stats.subjectStats.length === 0) && (
                        <div style={{ gridColumn: '1 / -1', padding: '30px', color: 'var(--gray-500)', textAlign: 'center' }}>
                            No subjects found for this class
                        </div>
                    )}
                </div>
            </div>

            {/* At-Risk Students */}
            {stats?.atRiskStudents && stats.atRiskStudents.length > 0 && (
                <div className="hod-section-card">
                    <div className="hod-section-header">
                        <div className="hod-section-title-group">
                            <div className="hod-section-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #f87171)' }}>
                                <FiAlertTriangle size={18} />
                            </div>
                            <div>
                                <h2>At-Risk Students</h2>
                                <p className="hod-section-subtitle">
                                    {stats.atRiskStudents.length} student{stats.atRiskStudents.length !== 1 ? 's' : ''} below threshold
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Roll No</th>
                                    <th>Name</th>
                                    <th>Subject</th>
                                    <th style={{ textAlign: 'center' }}>Attendance %</th>
                                    <th style={{ textAlign: 'center' }}>Classes Needed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.atRiskStudents.map((s, i) => (
                                    <tr key={i}>
                                        <td>{s.username || '—'}</td>
                                        <td style={{ fontWeight: 500 }}>{s.fullName}</td>
                                        <td>{s.subject}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className="cc-risk-pill">
                                                {s.attendancePercent?.toFixed(0)}%
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                                            {s.classesNeeded || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Quick Actions & Alerts */}
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
                        <a href="/cc/attendance" className="hod-action-btn">
                            <span className="hod-action-icon"><FiClipboard size={20} /></span>
                            <span>View Attendance</span>
                        </a>
                        <a href="/cc/tests" className="hod-action-btn">
                            <span className="hod-action-icon"><FiFileText size={20} /></span>
                            <span>View Test Scores</span>
                        </a>
                        <a href="/cc/students" className="hod-action-btn">
                            <span className="hod-action-icon"><FiUsers size={20} /></span>
                            <span>View Students</span>
                        </a>
                        <a href="/cc/timetable" className="hod-action-btn">
                            <span className="hod-action-icon"><FiCalendar size={20} /></span>
                            <span>View Timetable</span>
                        </a>
                    </div>
                </div>

                <div className="hod-section-card">
                    <div className="hod-section-header">
                        <div className="hod-section-title-group">
                            <div className="hod-section-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #f87171)' }}>
                                <FiAlertCircle size={18} />
                            </div>
                            <h2>Pending Items</h2>
                        </div>
                    </div>
                    <div className="hod-pending-list">
                        <div className="hod-pending-row" onClick={() => navigate('/cc/leave-requests')} style={{ cursor: 'pointer' }}>
                            <div className="hod-pending-icon warning"><FiClock size={20} /></div>
                            <div className="hod-pending-body">
                                <span className="hod-pending-count">{stats?.pendingLeaves || 0}</span>
                                <span className="hod-pending-label">Leave Requests Pending</span>
                            </div>
                        </div>
                        <div className="hod-pending-row" onClick={() => navigate('/cc/complaints')} style={{ cursor: 'pointer' }}>
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

export default CCDashboard;
