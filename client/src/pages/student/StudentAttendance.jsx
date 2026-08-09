import { useState, useEffect } from 'react';
import { FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { FaExclamationTriangle } from 'react-icons/fa';

const StudentAttendance = () => {
    const [attendanceSummary, setAttendanceSummary] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAttendanceSummary();
    }, []);

    const fetchAttendanceSummary = async () => {
        try {
            const token = localStorage.getItem('token');
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const response = await fetch(`${API_BASE}/student/attendance`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setAttendanceSummary(data.attendanceSummary || []);
            } else {
                setError(data.message || 'Failed to fetch attendance');
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendanceHistory = async (subject) => {
        setHistoryLoading(true);
        try {
            const token = localStorage.getItem('token');
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const response = await fetch(`${API_BASE}/student/attendance/${encodeURIComponent(subject)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setAttendanceHistory(data.history || []);
                setSelectedSubject(subject);
            } else {
                setError(data.message || 'Failed to fetch attendance history');
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setHistoryLoading(false);
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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
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

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>Attendance</h2>
                {selectedSubject && (
                    <button
                        className="btn btn-secondary"
                        onClick={() => setSelectedSubject(null)}
                    >
                        ← Back to Summary
                    </button>
                )}
            </div>

            {!selectedSubject ? (
                /* Attendance Summary View */
                <div className="stats-grid">
                    {attendanceSummary.length > 0 ? (
                        attendanceSummary.map((subject, index) => (
                            <div
                                key={index}
                                className="stat-card clickable"
                                onClick={() => fetchAttendanceHistory(subject.subject)}
                            >
                                <div className="stat-card-header">
                                    <h4>{subject.subject}</h4>
                                    <span className={`status-badge ${getStatusClass(subject.status)}`}>
                                        {getStatusLabel(subject.status)}
                                    </span>
                                </div>
                                <div className="stat-card-body">
                                    <div className="progress-container">
                                        <div className="progress-bar">
                                            <div
                                                className={`progress-fill ${getStatusClass(subject.status)}`}
                                                style={{ width: `${subject.percentage}%` }}
                                            ></div>
                                        </div>
                                        <span className="progress-text">{subject.percentage}%</span>
                                    </div>
                                    <div className="stat-details">
                                        <span className="detail-item">
                                            <span className="detail-label">Present:</span> {subject.attended}
                                        </span>
                                        <span className="detail-item">
                                            <span className="detail-label">Absent:</span> {subject.absent}
                                        </span>
                                        <span className="detail-item">
                                            <span className="detail-label">Total:</span> {subject.totalLectures}
                                        </span>
                                    </div>
                                </div>
                                {subject.eligible === false && (
                                    <div style={{
                                        padding: '6px 10px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        background: 'rgba(239,68,68,0.1)',
                                        color: 'var(--danger)',
                                        margin: '8px 0 0'
                                    }}>
                                        <FaExclamationTriangle style={{ marginRight: '4px' }} /> Ineligible — Need {subject.classesNeeded || '?'} more classes
                                    </div>
                                )}
                                <div className="stat-card-footer">
                                    <span className="view-details">Click to view details →</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">No attendance records yet</div>
                    )}
                </div>
            ) : (
                /* Detailed Attendance View */
                <div className="detail-view">
                    <h3>{selectedSubject} - Attendance History</h3>

                    {historyLoading ? (
                        <div className="loading"><div className="spinner"></div></div>
                    ) : attendanceHistory.length > 0 ? (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Date</th>
                                        <th>Time</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendanceHistory.map((record, index) => (
                                        <tr key={index}>
                                            <td>{index + 1}</td>
                                            <td>{formatDate(record.date)}</td>
                                            <td>{record.timeSlot}</td>
                                            <td>
                                                <span className={`attendance-status ${record.status}`}>
                                                    {record.status === 'present' ? <><FiCheckCircle style={{ marginRight: '2px' }} /> Present</> : <><FiXCircle style={{ marginRight: '2px' }} /> Absent</>}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state">No attendance records found for this subject</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StudentAttendance;
