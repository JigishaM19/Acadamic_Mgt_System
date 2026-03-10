import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiUsers, FiUser, FiLayers, FiFileText, FiCalendar, FiMessageSquare, FiClock, FiAlertCircle, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
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

    return (
        <div>
            {/* Announcements Banner */}
            <DashboardAnnouncementsBanner />

            {/* Quick Stats Row */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon students"><FiUsers size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats?.totalStudents || 0}</h3>
                        <p>Total Students</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon teachers"><FiUser size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats?.totalTeachers || 0}</h3>
                        <p>Total Teachers</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon classes"><FiLayers size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats?.totalClasses || 0}</h3>
                        <p>Classes</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}><FiFileText size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats?.pendingLeaves || 0}</h3>
                        <p>Pending Leaves</p>
                    </div>
                </div>
            </div>

            {/* Year-wise Attendance Overview */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h2 className="card-title">Year-wise Attendance Overview</h2>
                </div>
                <div className="year-cards-grid">
                    {[1, 2, 3, 4].map(year => {
                        const yearData = stats?.yearStats?.[year] || { classCount: 0, studentCount: 0, avgAttendance: 0, avgTestScore: 0 };
                        return (
                            <div key={year} className="year-card">
                                <div className="year-header">
                                    <span className="year-number">{year}{year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year</span>
                                    <span className={`attendance-badge ${getStatusClass(yearData.avgAttendance)}`}>
                                        {yearData.avgAttendance}%
                                    </span>
                                </div>
                                <div className="year-stats">
                                    <div className="year-stat">
                                        <span className="stat-value">{yearData.classCount}</span>
                                        <span className="stat-label">Classes</span>
                                    </div>
                                    <div className="year-stat">
                                        <span className="stat-value">{yearData.studentCount}</span>
                                        <span className="stat-label">Students</span>
                                    </div>
                                </div>
                                <div className="attendance-bar">
                                    <div
                                        className="attendance-fill"
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

            {/* Year-wise Performance Overview */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h2 className="card-title">Year-wise Performance Overview</h2>
                </div>
                <div className="year-cards-grid">
                    {[1, 2, 3, 4].map(year => {
                        const yearData = stats?.yearStats?.[year] || { classCount: 0, studentCount: 0, avgAttendance: 0, avgTestScore: 0 };
                        const avgTestScore = yearData.avgTestScore || 0;
                        return (
                            <div key={year} className="year-card">
                                <div className="year-header">
                                    <span className="year-number">{year}{year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year</span>
                                    <span className={`attendance-badge ${getStatusClass(avgTestScore)}`}>
                                        {avgTestScore}%
                                    </span>
                                </div>
                                <div className="year-stats">
                                    <div className="year-stat">
                                        <span className="stat-value">{yearData.totalTests || 0}</span>
                                        <span className="stat-label">Total Tests</span>
                                    </div>
                                    <div className="year-stat">
                                        <span className="stat-value" style={{ color: getStatusColor(avgTestScore) }}>{avgTestScore}%</span>
                                        <span className="stat-label">Avg Score</span>
                                    </div>
                                </div>
                                <div className="attendance-bar">
                                    <div
                                        className="attendance-fill"
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
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <h2 className="card-title"><FiAlertTriangle style={{ marginRight: '6px' }} /> At-Risk Students by Year</h2>
                        <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                            Students below minimum attendance threshold
                        </p>
                    </div>
                    <div className="year-cards-grid">
                        {[1, 2, 3, 4].map(year => {
                            const data = stats.atRiskByYear[year] || { count: 0, students: [] };
                            return (
                                <div key={year} className="year-card">
                                    <div className="year-header">
                                        <span className="year-number">
                                            {year}{year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year
                                        </span>
                                        <span className={`attendance-badge ${data.count > 0 ? 'critical' : 'good'}`}>
                                            {data.count} at risk
                                        </span>
                                    </div>
                                    {data.students && data.students.length > 0 ? (
                                        <div style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '8px' }}>
                                            {data.students.map((s, i) => (
                                                <div key={i} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '6px 0',
                                                    borderBottom: '1px solid var(--border)',
                                                    fontSize: '13px'
                                                }}>
                                                    <span>{s.fullName}</span>
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        borderRadius: '8px',
                                                        fontSize: '11px',
                                                        background: 'rgba(239,68,68,0.1)',
                                                        color: 'var(--danger)'
                                                    }}>
                                                        {s.attendancePercent?.toFixed(0)}%
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ padding: '12px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                            <FiCheckCircle style={{ marginRight: '4px' }} /> No at-risk students
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Quick Actions & Alerts */}
            <div className="dashboard-grid">
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Quick Actions</h2>
                    </div>
                    <div className="quick-actions">
                        <a href="/hod/students" className="action-btn">
                            <span className="action-icon"><FiUsers size={18} /></span>
                            <span>Manage Students</span>
                        </a>
                        <a href="/hod/timetable" className="action-btn">
                            <span className="action-icon"><FiCalendar size={18} /></span>
                            <span>View Timetable</span>
                        </a>
                        <a href="/hod/leave-requests" className="action-btn">
                            <span className="action-icon"><FiFileText size={18} /></span>
                            <span>Review Leaves</span>
                        </a>
                        <a href="/hod/complaints" className="action-btn">
                            <span className="action-icon"><FiMessageSquare size={18} /></span>
                            <span>View Complaints</span>
                        </a>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Pending Items</h2>
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

export default HodDashboard;


