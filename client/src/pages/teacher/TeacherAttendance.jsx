import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const TeacherAttendance = () => {
    const [attendanceData, setAttendanceData] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchAttendanceData();
    }, []);

    const fetchAttendanceData = async () => {
        try {
            const response = await api.get('/teacher/attendance');
            setAttendanceData(response.data);
        } catch (error) {
            console.error('Failed to fetch attendance data:', error);
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

    const handleCardClick = (classId, subject, batchId) => {
        const batchParam = batchId ? `?batchId=${batchId}` : '';
        navigate(`/teacher/attendance/${classId}/${encodeURIComponent(subject)}${batchParam}`);
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
                    <h2 className="card-title">Attendance Management</h2>
                    <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                        Click on a class to take or view attendance
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
                            onClick={() => handleCardClick(item.classId, item.subject, item.batchId)}
                        >
                            <div className="year-header">
                                <span className="year-number">{item.className}</span>
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
                                    <span className="badge" style={{
                                        background: 'var(--primary-light)',
                                        color: 'var(--primary)',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem'
                                    }}>
                                        Year {item.year}
                                    </span>
                                </div>
                            </div>

                            <div style={{ padding: '16px 0' }}>
                                <h4 style={{ margin: 0, color: 'var(--gray-800)', fontSize: '1.1rem' }}>
                                    {item.subject}
                                </h4>
                                <p style={{ margin: '4px 0 0', color: 'var(--gray-500)', fontSize: '0.85rem' }}>
                                    {item.department}
                                </p>
                            </div>

                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px 0',
                                borderTop: '1px solid var(--gray-200)'
                            }}>
                                <div>
                                    <span style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--gray-800)' }}>
                                        {item.totalStudents}
                                    </span>
                                    <span style={{ marginLeft: '4px', color: 'var(--gray-500)', fontSize: '0.85rem' }}>
                                        Students
                                    </span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
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
                            </div>

                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', marginTop: '8px' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCardClick(item.classId, item.subject, item.batchId);
                                }}
                            >
                                Manage Attendance
                            </button>
                        </div>
                    ))
                ) : (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--gray-500)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}></div>
                        <h3>No Classes Assigned</h3>
                        <p>You will see your assigned classes here once you're added to the timetable.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherAttendance;
