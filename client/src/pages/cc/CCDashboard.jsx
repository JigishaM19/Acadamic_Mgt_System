import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { FiUsers, FiClipboard, FiFileText, FiCalendar, FiClock, FiAlertCircle, FiAlertTriangle } from 'react-icons/fi';
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

    const getStatusClass = (status) => {
        if (status === 'good') return 'good';
        if (status === 'warning') return 'warning';
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

            {/* Class Info Header */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h2 className="card-title">{stats?.className || 'My Class'}</h2>
                    <span className="badge" style={{ background: 'var(--primary)', color: 'white' }}>
                        Year {stats?.year} - {stats?.department}
                    </span>
                </div>
            </div>

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
                    <div className="stat-icon" style={{ background: getStatusColor(stats?.overallAttendance || 0) }}><FiClipboard size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats?.overallAttendance || 0}%</h3>
                        <p>Class Attendance</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: getStatusColor(stats?.overallIAPerformance || 0) }}><FiFileText size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats?.overallIAPerformance || 0}%</h3>
                        <p>IA Performance</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}><FiClock size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats?.pendingLeaves || 0}</h3>
                        <p>Pending Leaves</p>
                    </div>
                </div>
            </div>

            {/* Subject-wise Overview */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h2 className="card-title">Subject-wise Overview</h2>
                </div>
                <div className="year-cards-grid">
                    {stats?.subjectStats?.map((subject, index) => (
                        <div key={index} className="year-card">
                            <div className="year-header">
                                <span className="year-number">{subject.subject}</span>
                                <span className={`attendance-badge ${getStatusClass(subject.status)}`}>
                                    {subject.status.toUpperCase()}
                                </span>
                            </div>
                            <div className="year-stats">
                                <div className="year-stat">
                                    <span className="stat-value">{subject.avgAttendance}%</span>
                                    <span className="stat-label">Attendance</span>
                                </div>
                                <div className="year-stat">
                                    <span className="stat-value">{subject.avgIAScore}%</span>
                                    <span className="stat-label">IA Avg</span>
                                </div>
                            </div>
                            <div className="year-stats" style={{ marginTop: '8px' }}>
                                <div className="year-stat">
                                    <span className="stat-value">{subject.totalLectures}</span>
                                    <span className="stat-label">Lectures</span>
                                </div>
                                <div className="year-stat">
                                    <span className="stat-value">{subject.totalTests}</span>
                                    <span className="stat-label">Tests</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {(!stats?.subjectStats || stats.subjectStats.length === 0) && (
                        <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>
                            No subjects found for this class
                        </div>
                    )}
                </div>
            </div>

            {/* At-Risk Students */}
            {stats?.atRiskStudents && stats.atRiskStudents.length > 0 && (
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <h2 className="card-title"><FiAlertTriangle style={{ marginRight: '6px' }} /> At-Risk Students</h2>
                        <span className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>
                            {stats.atRiskStudents.length} student{stats.atRiskStudents.length !== 1 ? 's' : ''}
                        </span>
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
                                        <td>{s.fullName}</td>
                                        <td>{s.subject}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{
                                                padding: '3px 10px',
                                                borderRadius: '10px',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                background: 'rgba(239,68,68,0.1)',
                                                color: 'var(--danger)'
                                            }}>
                                                {s.attendancePercent?.toFixed(0)}%
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: '500' }}>
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
            <div className="dashboard-grid">
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Quick Actions</h2>
                    </div>
                    <div className="quick-actions">
                        <a href="/cc/attendance" className="action-btn">
                            <span className="action-icon"><FiClipboard size={18} /></span>
                            <span>View Attendance</span>
                        </a>
                        <a href="/cc/tests" className="action-btn">
                            <span className="action-icon"><FiFileText size={18} /></span>
                            <span>View Test Scores</span>
                        </a>
                        <a href="/cc/students" className="action-btn">
                            <span className="action-icon"><FiUsers size={18} /></span>
                            <span>View Students</span>
                        </a>
                        <a href="/cc/timetable" className="action-btn">
                            <span className="action-icon"><FiCalendar size={18} /></span>
                            <span>View Timetable</span>
                        </a>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Pending Items</h2>
                    </div>
                    <div className="pending-list">
                        <div className="pending-item" onClick={() => navigate('/cc/leave-requests')} style={{ cursor: 'pointer' }}>
                            <div className="pending-icon warning"><FiClock size={18} /></div>
                            <div className="pending-info">
                                <span className="pending-count">{stats?.pendingLeaves || 0}</span>
                                <span className="pending-label">Leave Requests Pending</span>
                            </div>
                        </div>
                        <div className="pending-item" onClick={() => navigate('/cc/complaints')} style={{ cursor: 'pointer' }}>
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

export default CCDashboard;


