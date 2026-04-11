import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { FiClipboard, FiEdit3 } from 'react-icons/fi';

const TeacherAssignments = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const res = await api.get('/teacher/assignment-config');
            setData(res.data);
        } catch (err) {
            console.error('Failed to fetch assignment config:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <h2><FiClipboard style={{ marginRight: '8px' }} />Assignments & Experiments</h2>
            </div>

            <div className="year-cards-grid">
                {data.map((item, idx) => (
                    <div
                        key={idx}
                        className="year-card"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/teacher/assignments/${item.classId}/${encodeURIComponent(item.subject)}`)}
                    >
                        <div className="year-header">
                            <span className="year-number">{item.subject}</span>
                            <span className="attendance-badge good" style={{ fontSize: '11px' }}>
                                {item.className}
                            </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                            Year {item.year} • {item.department}
                        </div>
                        <div className="year-stats">
                            <div className="year-stat">
                                <span className="stat-value">{item.assignmentsEntered}/{item.totalAssignments}</span>
                                <span className="stat-label">Assignments</span>
                            </div>
                            <div className="year-stat">
                                <span className="stat-value">{item.experimentsEntered}/{item.totalExperiments}</span>
                                <span className="stat-label">Experiments</span>
                            </div>
                        </div>
                        <div style={{ marginTop: '12px', textAlign: 'center' }}>
                            <button className="btn btn-outline" style={{ padding: '6px 16px', fontSize: '12px' }}>
                                <FiEdit3 style={{ marginRight: '4px' }} /> Manage Marks
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {data.length === 0 && (
                <div className="empty-state">
                    No class-subject assignments found. You need to have timetable entries first.
                </div>
            )}
        </div>
    );
};

export default TeacherAssignments;
