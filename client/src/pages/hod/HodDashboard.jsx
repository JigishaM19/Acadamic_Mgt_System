import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiUsers, FiUser, FiLayers, FiFileText, FiCalendar, FiMessageSquare, FiClock, FiAlertCircle, FiCheckCircle, FiAlertTriangle, FiTrendingUp, FiBarChart2, FiActivity } from 'react-icons/fi';
import DashboardAnnouncementsBanner from '../../components/DashboardAnnouncementsBanner';

const HodDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/hod/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch HOD stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (percentage) => {
        if (percentage >= 75) return 'var(--success)';
        if (percentage >= 60) return 'var(--warning)';
        return 'var(--danger)';
    };

    const getStatusClass = (percentage) => {
        if (percentage >= 75) return 'good';
        if (percentage >= 60) return 'warning';
        return 'critical';
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    const statCards = [
        {
            icon: <FiUsers size={22} />,
            value: stats?.totalStudents || 0,
            label: 'Total Students',
            gradient: 'linear-gradient(135deg, #6366f1, #818cf8)',
            bgTint: 'rgba(99, 102, 241, 0.08)',
            borderColor: 'rgba(99, 102, 241, 0.2)'
        },
        {
            icon: <FiUser size={22} />,
            value: stats?.totalTeachers || 0,
            label: 'Total Teachers',
            gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
            bgTint: 'rgba(14, 165, 233, 0.08)',
            borderColor: 'rgba(14, 165, 233, 0.2)'
        },
        {
            icon: <FiLayers size={22} />,
            value: stats?.totalClasses || 0,
            label: 'Classes',
            gradient: 'linear-gradient(135deg, #22c55e, #4ade80)',
            bgTint: 'rgba(34, 197, 94, 0.08)',
            borderColor: 'rgba(34, 197, 94, 0.2)'
        },
        {
            icon: <FiFileText size={22} />,
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

            {/* Quick Stats Row — Enhanced */}
            <div className="hod-stats-row">
                {statCards.map((card, i) => (
                    <div
                        key={i}
                        className="hod-stat-card"
                        style={{
                            background: card.bgTint,
                            borderColor: card.borderColor,
                            '--card-accent': card.gradient
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

            {/* Year-wise Attendance Overview */}
            <div className="hod-section-card">
                <div className="hod-section-header">
                    <div className="hod-section-title-group">
                        <div className="hod-section-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>
                            <FiActivity size={18} />
                        </div>
                        <h2>Year-wise Attendance Overview</h2>
                    </div>
                </div>
                <div className="hod-year-grid">
                    {[1, 2, 3, 4].map(year => {
                        const yearData = stats?.yearStats?.[year] || { classCount: 0, studentCount: 0, avgAttendance: 0, avgTestScore: 0 };
                        const ordinal = year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th';
                        return (
                            <div key={year} className="hod-year-card">
                                <div className="hod-year-top">
                                    <span className="hod-year-label">{year}{ordinal} Year</span>
                                    <span className={`hod-badge ${getStatusClass(yearData.avgAttendance)}`}>
                                        {yearData.avgAttendance}%
                                    </span>
                                </div>
                                <div className="hod-year-metrics">
                                    <div className="hod-year-metric">
                                        <span className="hod-metric-num">{yearData.classCount}</span>
                                        <span className="hod-metric-label">Classes</span>
                                    </div>
                                    <div className="hod-year-metric-divider"></div>
                                    <div className="hod-year-metric">
                                        <span className="hod-metric-num">{yearData.studentCount}</span>
                                        <span className="hod-metric-label">Students</span>
                                    </div>
                                </div>
                                <div className="hod-progress-track">
                                    <div
                                        className="hod-progress-fill"
                                        style={{
                                            width: `${yearData.avgAttendance}%`,
                                            background: getStatusColor(yearData.avgAttendance)
                                        }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Year-wise IA Performance */}
            <div className="hod-section-card">
                <div className="hod-section-header">
                    <div className="hod-section-title-group">
                        <div className="hod-section-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>
                            <FiBarChart2 size={18} />
                        </div>
                        <h2>Year-wise IA Performance</h2>
                    </div>
                </div>
                <div className="hod-year-grid">
                    {[1, 2, 3, 4].map(year => {
                        const yearData = stats?.yearStats?.[year] || { classCount: 0, studentCount: 0, avgAttendance: 0, avgTestScore: 0 };
                        const avgTestScore = yearData.avgTestScore || 0;
                        const ordinal = year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th';
                        return (
                            <div key={year} className="hod-year-card">
                                <div className="hod-year-top">
                                    <span className="hod-year-label">{year}{ordinal} Year</span>
                                    <span className={`hod-badge ${getStatusClass(avgTestScore)}`}>
                                        {avgTestScore}%
                                    </span>
                                </div>
                                <div className="hod-year-metrics">
                                    <div className="hod-year-metric">
                                        <span className="hod-metric-num">{yearData.totalTests || 0}</span>
                                        <span className="hod-metric-label">Total Tests</span>
                                    </div>
                                    <div className="hod-year-metric-divider"></div>
                                    <div className="hod-year-metric">
                                        <span className="hod-metric-num" style={{ color: getStatusColor(avgTestScore) }}>{avgTestScore}%</span>
                                        <span className="hod-metric-label">IA Avg</span>
                                    </div>
                                </div>
                                <div className="hod-progress-track">
                                    <div
                                        className="hod-progress-fill"
                                        style={{
                                            width: `${avgTestScore}%`,
                                            background: getStatusColor(avgTestScore)
                                        }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* At-Risk Students by Year */}
            {stats?.atRiskByYear && (
                <div className="hod-section-card">
                    <div className="hod-section-header">
                        <div className="hod-section-title-group">
                            <div className="hod-section-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #f87171)' }}>
                                <FiAlertTriangle size={18} />
                            </div>
                            <div>
                                <h2>At-Risk Students by Year</h2>
                                <p className="hod-section-subtitle">Students below minimum attendance threshold</p>
                            </div>
                        </div>
                    </div>
                    <div className="hod-year-grid">
                        {[1, 2, 3, 4].map(year => {
                            const data = stats.atRiskByYear[year] || { count: 0, students: [] };
                            const ordinal = year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th';
                            return (
                                <div key={year} className="hod-year-card">
                                    <div className="hod-year-top">
                                        <span className="hod-year-label">{year}{ordinal} Year</span>
                                        <span className={`hod-badge ${data.count > 0 ? 'critical' : 'good'}`}>
                                            {data.count} at risk
                                        </span>
                                    </div>
                                    {data.students && data.students.length > 0 ? (
                                        <div className="hod-risk-list">
                                            {data.students.map((s, i) => (
                                                <div key={i} className="hod-risk-student">
                                                    <span className="hod-risk-name">{s.fullName}</span>
                                                    <span className="hod-risk-pct">
                                                        {s.lowestAttendance !== undefined ? s.lowestAttendance.toFixed(0) : (s.attendancePercent?.toFixed(0) || '—')}%
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="hod-risk-empty">
                                            <FiCheckCircle size={16} /> No at-risk students
                                        </div>
                                    )}
                                </div>
                            );
                        })}
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
                        <a href="/hod/students" className="hod-action-btn">
                            <span className="hod-action-icon"><FiUsers size={20} /></span>
                            <span>Manage Students</span>
                        </a>
                        <a href="/hod/timetable" className="hod-action-btn">
                            <span className="hod-action-icon"><FiCalendar size={20} /></span>
                            <span>View Timetable</span>
                        </a>
                        <a href="/hod/leave-requests" className="hod-action-btn">
                            <span className="hod-action-icon"><FiFileText size={20} /></span>
                            <span>Review Leaves</span>
                        </a>
                        <a href="/hod/complaints" className="hod-action-btn">
                            <span className="hod-action-icon"><FiMessageSquare size={20} /></span>
                            <span>View Complaints</span>
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

export default HodDashboard;
