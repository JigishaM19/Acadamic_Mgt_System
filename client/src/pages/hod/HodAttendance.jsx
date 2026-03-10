import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FaChartBar } from 'react-icons/fa';

const HodAttendance = () => {
    const [attendance, setAttendance] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ year: '', classId: '' });

    useEffect(() => {
        fetchClasses();
        fetchAttendance();
    }, []);

    useEffect(() => {
        fetchAttendance();
    }, [filters]);

    const fetchClasses = async () => {
        try {
            const response = await api.get('/hod/classes');
            setClasses(response.data);
        } catch (error) {
            console.error('Failed to fetch classes:', error);
        }
    };

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.year) params.append('year', filters.year);
            if (filters.classId) params.append('classId', filters.classId);

            const response = await api.get(`/hod/attendance?${params}`);
            setAttendance(response.data);
        } catch (error) {
            console.error('Failed to fetch attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            good: 'badge-success',
            warning: 'badge-warning',
            critical: 'badge-danger'
        };
        return (
            <span className={`badge ${styles[status] || 'badge-primary'}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <div>
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Attendance Overview</h2>
                </div>

                {/* Filters */}
                <div className="toolbar">
                    <div className="filter-group">
                        <select
                            value={filters.year}
                            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                        >
                            <option value="">All Years</option>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                        </select>
                        <select
                            value={filters.classId}
                            onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
                        >
                            <option value="">All Classes</option>
                            {classes
                                .filter(c => !filters.year || c.year === parseInt(filters.year))
                                .map(cls => (
                                    <option key={cls._id} value={cls._id}>{cls.name}</option>
                                ))
                            }
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="loading"><div className="spinner"></div></div>
                ) : (
                    <>
                        {/* Attendance Summary Bar Chart */}
                        <div className="attendance-chart" style={{ marginBottom: '24px' }}>
                            <div className="chart-bars">
                                {attendance.map(item => (
                                    <div key={item.classId} className="chart-bar-container">
                                        <div className="chart-bar-wrapper">
                                            <div
                                                className="chart-bar"
                                                style={{
                                                    height: `${item.avgAttendance}%`,
                                                    background: item.status === 'good'
                                                        ? 'var(--success)'
                                                        : item.status === 'warning'
                                                            ? 'var(--warning)'
                                                            : 'var(--danger)'
                                                }}
                                            >
                                                <span className="chart-value">{item.avgAttendance}%</span>
                                            </div>
                                        </div>
                                        <span className="chart-label">{item.className}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Attendance Table */}
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Class Name</th>
                                        <th>Year</th>
                                        <th>Total Students</th>
                                        <th>Avg. Attendance</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendance.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="empty-state">
                                                <div className="empty-icon"><FaChartBar size={48} /></div>
                                                <h3>No attendance data available</h3>
                                            </td>
                                        </tr>
                                    ) : (
                                        attendance.map(item => (
                                            <tr key={item.classId}>
                                                <td><strong>{item.className}</strong></td>
                                                <td>{item.year}{item.year === 1 ? 'st' : item.year === 2 ? 'nd' : item.year === 3 ? 'rd' : 'th'} Year</td>
                                                <td>{item.totalStudents}</td>
                                                <td>
                                                    <div className="progress-inline">
                                                        <div className="progress-bar-mini">
                                                            <div
                                                                className="progress-fill"
                                                                style={{
                                                                    width: `${item.avgAttendance}%`,
                                                                    background: item.status === 'good'
                                                                        ? 'var(--success)'
                                                                        : item.status === 'warning'
                                                                            ? 'var(--warning)'
                                                                            : 'var(--danger)'
                                                                }}
                                                            ></div>
                                                        </div>
                                                        <span>{item.avgAttendance}%</span>
                                                    </div>
                                                </td>
                                                <td>{getStatusBadge(item.status)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default HodAttendance;
