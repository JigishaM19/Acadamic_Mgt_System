import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FiCalendar, FiMapPin, FiClipboard, FiBarChart2, FiCheckCircle, FiXCircle, FiAlertTriangle } from 'react-icons/fi';
import { FaExclamationTriangle } from 'react-icons/fa';
import { BsEmojiSmile } from 'react-icons/bs';
import DashboardAnnouncementsBanner from '../../components/DashboardAnnouncementsBanner';

const StudentDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Get today's day name
    const getTodayName = () => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[new Date().getDay()];
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const response = await fetch(`${API_BASE}/student/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setStats(data);
            } else {
                setError(data.message || 'Failed to fetch stats');
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'good': return 'status-good';
            case 'warning': return 'status-warning';
            case 'low': return 'status-low';
            default: return '';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'good': return 'Good';
            case 'warning': return 'Warning';
            case 'low': return 'Low';
            default: return status;
        }
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    if (error) {
        return (
            <div className="page-container">
                <div className="alert alert-error">{error}</div>
            </div>
        );
    }

    const todayName = getTodayName();

    // Compute defaulter subjects (ineligible due to low attendance)
    const defaulterSubjects = stats?.attendanceStats?.filter(s => s.eligible === false && s.totalLectures > 0) || [];
    const isParent = user?.role === 'parent' || user?.activeRole === 'parent';

    return (
        <div className="page-container">
            {/* Announcements Banner */}
            <DashboardAnnouncementsBanner />

            {/* Defaulter Alert Banner */}
            {defaulterSubjects.length > 0 && (
                <div style={{
                    background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)',
                    border: '1.5px solid #fca5a5',
                    borderRadius: '14px',
                    padding: '20px 24px',
                    marginBottom: '24px',
                    boxShadow: '0 4px 16px rgba(239, 68, 68, 0.1)',
                    animation: 'fadeInSlide 0.4s ease-out'
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '14px'
                    }}>
                        <div style={{
                            width: '42px', height: '42px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                        }}>
                            <FiAlertTriangle size={22} color="#fff" />
                        </div>
                        <div>
                            <h3 style={{
                                margin: 0, fontSize: '1.05rem', fontWeight: 700,
                                color: '#991b1b'
                            }}>
                                {isParent ? 'Your Ward is a Defaulter' : 'Attendance Defaulter Alert'}
                            </h3>
                            <p style={{
                                margin: '2px 0 0 0', fontSize: '0.82rem',
                                color: '#b91c1c', fontWeight: 500
                            }}>
                                {isParent
                                    ? `Your ward's attendance is below the minimum requirement in ${defaulterSubjects.length} subject${defaulterSubjects.length > 1 ? 's' : ''}. Immediate action is needed.`
                                    : `Your attendance is below the minimum requirement in ${defaulterSubjects.length} subject${defaulterSubjects.length > 1 ? 's' : ''}. You may be detained from exams.`
                                }
                            </p>
                        </div>
                    </div>

                    {/* Subject-wise details */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gap: '10px'
                    }}>
                        {defaulterSubjects.map((subj, idx) => (
                            <div key={idx} style={{
                                background: 'rgba(255,255,255,0.85)',
                                border: '1px solid #fecaca',
                                borderRadius: '10px',
                                padding: '12px 16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1f2937' }}>
                                        {subj.subject}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '2px' }}>
                                        {subj.attended}/{subj.totalLectures} lectures attended
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{
                                        fontSize: '1.1rem', fontWeight: 700,
                                        color: subj.percentage < 60 ? '#dc2626' : '#f59e0b'
                                    }}>
                                        {subj.percentage}%
                                    </div>
                                    {subj.classesNeeded > 0 && (
                                        <div style={{
                                            fontSize: '0.72rem', fontWeight: 600,
                                            color: '#dc2626',
                                            background: 'rgba(239,68,68,0.08)',
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            marginTop: '2px'
                                        }}>
                                            Need {subj.classesNeeded} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Student Info Header */}
            <div className="info-header">
                <h2>Welcome, {user?.fullName || user?.firstName || 'Student'}</h2>
                <p className="subtitle">
                    {stats?.className || 'N/A'} • Year {stats?.year || 'N/A'} • {stats?.department || 'N/A'}
                </p>
            </div>

            {/* Today's Schedule - All lectures for today */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h2 className="card-title"><FiCalendar style={{ marginRight: '6px' }} /> Today's Schedule ({todayName})</h2>
                    <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                        All classes scheduled for today
                    </p>
                </div>

                {stats?.todaysTimetable && stats.todaysTimetable.length > 0 ? (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Subject</th>
                                    <th>Teacher</th>
                                    <th>Room</th>
                                    <th>Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.todaysTimetable.map((lecture, index) => (
                                    <tr key={index}>
                                        <td style={{ fontWeight: '600', color: 'var(--primary)' }}>
                                            {lecture.time}
                                        </td>
                                        <td style={{ fontWeight: '500' }}>{lecture.subject}</td>
                                        <td>{lecture.teacher}</td>
                                        <td>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                <FiMapPin style={{ marginRight: '4px' }} /> {lecture.room}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                background: lecture.type === 'practical'
                                                    ? 'rgba(14, 165, 233, 0.1)'
                                                    : 'rgba(99, 102, 241, 0.1)',
                                                color: lecture.type === 'practical'
                                                    ? '#0ea5e9'
                                                    : '#6366f1',
                                                textTransform: 'capitalize'
                                            }}>
                                                {lecture.type}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '12px' }}><BsEmojiSmile size={32} /></div>
                        <p>No classes scheduled for today!</p>
                    </div>
                )}
            </div>

            {/* Attendance Overview */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h2 className="card-title"><FiClipboard style={{ marginRight: '6px' }} /> Attendance Overview</h2>
                </div>
                <div className="year-cards-grid">
                    {stats?.attendanceStats && stats.attendanceStats.length > 0 ? (
                        stats.attendanceStats.map((subject, index) => {
                            const getStatusColor = (status) => {
                                if (status === 'good') return 'var(--success)';
                                if (status === 'warning') return 'var(--warning)';
                                return 'var(--danger)';
                            };
                            const getStatusClassLocal = (status) => {
                                if (status === 'good') return 'good';
                                if (status === 'warning') return 'warning';
                                return 'critical';
                            };
                            return (
                                <div key={index} className="year-card">
                                    <div className="year-header">
                                        <span className="year-number">{subject.subject}</span>
                                        <span className={`attendance-badge ${getStatusClassLocal(subject.status)}`}>
                                            {subject.percentage}%
                                        </span>
                                    </div>
                                    {subject.eligible === false && (
                                        <div style={{
                                            padding: '6px 10px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            background: 'rgba(239,68,68,0.1)',
                                            color: 'var(--danger)',
                                            marginBottom: '8px'
                                        }}>
                                            <FaExclamationTriangle style={{ marginRight: '4px' }} /> Ineligible — Need {subject.classesNeeded || '?'} more classes
                                        </div>
                                    )}
                                    <div className="year-stats">
                                        <div className="year-stat">
                                            <span className="stat-value">{subject.attended}</span>
                                            <span className="stat-label">Attended</span>
                                        </div>
                                        <div className="year-stat">
                                            <span className="stat-value">{subject.totalLectures}</span>
                                            <span className="stat-label">Total Lectures</span>
                                        </div>
                                    </div>
                                    <div className="attendance-bar">
                                        <div
                                            className="attendance-fill"
                                            style={{
                                                width: `${subject.percentage}%`,
                                                background: getStatusColor(subject.status)
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
                            No attendance records yet
                        </div>
                    )}
                </div>
            </div>

            {/* Test Performance Overview */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h2 className="card-title"><FiBarChart2 style={{ marginRight: '6px' }} /> Performance Overview</h2>
                </div>
                <div className="year-cards-grid">
                    {stats?.testStats && stats.testStats.length > 0 ? (
                        stats.testStats.map((test, index) => {
                            const getStatusColor = (percentage) => {
                                if (percentage >= 75) return 'var(--success)';
                                if (percentage >= 60) return 'var(--warning)';
                                return 'var(--danger)';
                            };
                            const getStatusClassLocal = (percentage) => {
                                if (percentage >= 75) return 'good';
                                if (percentage >= 60) return 'warning';
                                return 'critical';
                            };
                            return (
                                <div key={index} className="year-card">
                                    <div className="year-header">
                                        <span className="year-number">{test.subject}</span>
                                        <span className={`attendance-badge ${getStatusClassLocal(test.percentage)}`}>
                                            {test.percentage}%
                                        </span>
                                    </div>
                                    <div style={{ padding: '8px 0', color: 'var(--gray-600)', fontSize: '0.85rem' }}>
                                        {test.testType}
                                    </div>
                                    <div className="year-stats">
                                        <div className="year-stat">
                                            <span className="stat-value">{test.score}</span>
                                            <span className="stat-label">Score</span>
                                        </div>
                                        <div className="year-stat">
                                            <span className="stat-value">{test.maxScore}</span>
                                            <span className="stat-label">Max Score</span>
                                        </div>
                                    </div>
                                    <div className="attendance-bar">
                                        <div
                                            className="attendance-fill"
                                            style={{
                                                width: `${test.percentage}%`,
                                                background: getStatusColor(test.percentage)
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--gray-500)' }}>
                            No test records yet
                        </div>
                    )}
                </div>
            </div>

            {/* Marks Overview */}
            {stats?.marksStats && stats.marksStats.length > 0 && (
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <h2 className="card-title"><FiBarChart2 style={{ marginRight: '6px' }} /> Marks Overview</h2>
                        <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                            Overall Attendance: {stats?.overallAttendance?.toFixed(0) || 0}%
                        </p>
                    </div>
                    <div className="table-container" style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ fontSize: '13px' }}>
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th style={{ textAlign: 'center' }}>IA1<br/><small>/20</small></th>
                                    <th style={{ textAlign: 'center' }}>IA2<br/><small>/20</small></th>
                                    <th style={{ textAlign: 'center' }}>Final IA<br/><small>/20</small></th>
                                    <th style={{ textAlign: 'center' }}>%</th>
                                    <th style={{ textAlign: 'center' }}>Grade</th>
                                    <th style={{ textAlign: 'center' }}>Att. Marks</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.marksStats.map((ms, index) => (
                                    <tr key={index}>
                                        <td style={{ fontWeight: '500' }}>{ms.subject}</td>
                                        <td style={{ textAlign: 'center' }}>{ms.ia1 ?? '—'}</td>
                                        <td style={{ textAlign: 'center' }}>{ms.ia2 ?? '—'}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>
                                            {ms.finalIA ?? '—'}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {ms.percentage !== null ? `${ms.percentage}%` : '—'}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {ms.grade ? (
                                                <span style={{
                                                    padding: '3px 10px', borderRadius: '10px',
                                                    fontWeight: 700, fontSize: '12px',
                                                    background: ms.grade === 'F' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                    color: ms.grade === 'F' ? 'var(--danger)' : 'var(--success)'
                                                }}>{ms.grade}</span>
                                            ) : '—'}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>{ms.attendanceMarks ?? '—'}/5</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: '10px',
                                                fontSize: '11px', fontWeight: 600,
                                                background: ms.status === 'PASS' ? 'rgba(16,185,129,0.1)' :
                                                    ms.status === 'FAIL' ? 'rgba(239,68,68,0.1)' :
                                                    ms.status === 'DETAINED' ? 'rgba(245,158,11,0.1)' : 'rgba(107,114,128,0.1)',
                                                color: ms.status === 'PASS' ? '#10b981' :
                                                    ms.status === 'FAIL' ? '#ef4444' :
                                                    ms.status === 'DETAINED' ? '#f59e0b' : '#6b7280'
                                            }}>
                                                {ms.status || 'INCOMPLETE'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;
