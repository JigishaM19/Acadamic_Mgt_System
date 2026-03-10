import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { FiClipboard } from 'react-icons/fi';

const CCAttendance = () => {
    const [attendanceData, setAttendanceData] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchAttendance();
    }, []);

    const fetchAttendance = async () => {
        try {
            const response = await api.get('/cc/attendance');
            setAttendanceData(response.data);
        } catch (error) {
            console.error('Failed to fetch attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => {
        if (!date) return 'Never';
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getStatusColor = (status) => {
        if (status === 'good') return 'var(--success)';
        if (status === 'warning') return 'var(--warning)';
        return 'var(--danger)';
    };

    const getStatusClass = (status) => {
        if (status === 'good') return 'good';
        if (status === 'warning') return 'warning';
        return 'critical';
    };

    const handleCardClick = (subject, batchId) => {
        const batchParam = batchId ? `?batchId=${batchId}` : '';
        navigate(`/cc/attendance/${encodeURIComponent(subject)}${batchParam}`);
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
                    <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FiClipboard size={20} /> Attendance Overview</h2>
                    <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                        Click on a subject to view or edit attendance
                    </p>
                </div>
            </div>

            <div className="year-cards-grid" style={{ marginTop: '24px' }}>
                {attendanceData.length > 0 ? (
                    attendanceData.map((item, index) => (
                        <div
                            key={index}
                            className="year-card attendance-card"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleCardClick(item.subject, item.batchId)}
                        >
                            <div className="year-header">
                                <span className="year-number">{item.subject}</span>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    {item.batchName && (
                                        <span className="badge" style={{
                                            background: 'rgba(245, 158, 11, 0.15)',
                                            color: '#f59e0b',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600'
                                        }}>
                                            {item.batchName}
                                        </span>
                                    )}
                                    <span className={`attendance-badge ${getStatusClass(item.status)}`}>
                                        {item.avgAttendance}%
                                    </span>
                                </div>
                            </div>

                            <div className="year-stats">
                                <div className="year-stat">
                                    <span className="stat-value">{item.totalLectures}</span>
                                    <span className="stat-label">Total Lectures</span>
                                </div>
                                <div className="year-stat">
                                    <span className="stat-value">{item.totalStudents}</span>
                                    <span className="stat-label">Students</span>
                                </div>
                                <div className="year-stat">
                                    <span className="stat-value" style={{ color: getStatusColor(item.status) }}>
                                        {item.avgAttendance}%
                                    </span>
                                    <span className="stat-label">Avg Attendance</span>
                                </div>
                            </div>
                            <div className="attendance-bar">
                                <div
                                    className="attendance-fill"
                                    style={{
                                        width: `${item.avgAttendance}%`,
                                        background: getStatusColor(item.status)
                                    }}
                                ></div>
                            </div>

                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: '12px'
                            }}>
                                <div style={{ textAlign: 'left' }}>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                                        Last Attendance
                                    </p>
                                    <p style={{
                                        margin: '2px 0 0',
                                        fontSize: '0.85rem',
                                        color: item.lastAttendanceDate ? 'var(--gray-700)' : 'var(--gray-400)',
                                        fontWeight: item.lastAttendanceDate ? '500' : 'normal'
                                    }}>
                                        {formatDate(item.lastAttendanceDate)}
                                    </p>
                                </div>
                                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}>
                                    View Details →
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--gray-500)' }}>
                        <h3>No Attendance Data</h3>
                        <p>No attendance records found for this class</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CCAttendance;
