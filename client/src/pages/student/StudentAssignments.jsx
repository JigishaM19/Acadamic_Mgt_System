import { useState, useEffect } from 'react';
import { FiClipboard } from 'react-icons/fi';

const StudentAssignments = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const response = await fetch(`${API_BASE}/student/assignments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (response.ok) {
                setData(result);
            } else {
                setError(result.message || 'Failed to fetch');
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const getScoreClass = (pct) => {
        if (pct === null) return '';
        if (pct >= 60) return 'score-good';
        if (pct >= 40) return 'score-warning';
        return 'score-low';
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;
    if (error) return <div className="page-container"><div className="alert alert-error">{error}</div></div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <h2><FiClipboard style={{ marginRight: '8px' }} />Assignments & Experiments</h2>
            </div>

            {data.length === 0 ? (
                <div className="empty-state">No assignment or experiment marks recorded yet.</div>
            ) : (
                data.map((subject, sIdx) => (
                    <div key={sIdx} className="card" style={{ marginBottom: '20px' }}>
                        <div className="card-header">
                            <h3 className="card-title" style={{ margin: 0 }}>{subject.subject}</h3>
                        </div>

                        {/* Assignments */}
                        {subject.assignmentMarks.length > 0 && (
                            <div style={{ padding: '16px' }}>
                                <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    Assignments ({subject.assignmentMarks.length}/{subject.totalAssignments})
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                                    {subject.assignmentMarks.map((mark, idx) => (
                                        <div key={idx} style={{
                                            padding: '12px', borderRadius: '10px',
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-secondary)',
                                            textAlign: 'center'
                                        }}>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                                Assignment {mark.number}
                                            </div>
                                            <div style={{ fontSize: '20px', fontWeight: 700 }}>
                                                {mark.score !== null ? (
                                                    <span className={getScoreClass(mark.percentage)}>{mark.score}</span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-secondary)' }}>—</span>
                                                )}
                                                <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-secondary)' }}> / {mark.maxScore}</span>
                                            </div>
                                            {mark.percentage !== null && (
                                                <div style={{ marginTop: '6px' }}>
                                                    <div className="mini-progress" style={{ height: '4px', borderRadius: '2px', background: 'var(--border)' }}>
                                                        <div className={`mini-progress-fill ${getScoreClass(mark.percentage)}`}
                                                            style={{ width: `${mark.percentage}%`, height: '100%', borderRadius: '2px' }}></div>
                                                    </div>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{mark.percentage}%</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Experiments */}
                        {subject.experimentMarks.length > 0 && (
                            <div style={{ padding: '0 16px 16px' }}>
                                <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    Experiments ({subject.experimentMarks.length}/{subject.totalExperiments})
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                                    {subject.experimentMarks.map((mark, idx) => (
                                        <div key={idx} style={{
                                            padding: '12px', borderRadius: '10px',
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-secondary)',
                                            textAlign: 'center'
                                        }}>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                                Experiment {mark.number}
                                            </div>
                                            <div style={{ fontSize: '20px', fontWeight: 700 }}>
                                                {mark.score !== null ? (
                                                    <span className={getScoreClass(mark.percentage)}>{mark.score}</span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-secondary)' }}>—</span>
                                                )}
                                                <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-secondary)' }}> / {mark.maxScore}</span>
                                            </div>
                                            {mark.percentage !== null && (
                                                <div style={{ marginTop: '6px' }}>
                                                    <div className="mini-progress" style={{ height: '4px', borderRadius: '2px', background: 'var(--border)' }}>
                                                        <div className={`mini-progress-fill ${getScoreClass(mark.percentage)}`}
                                                            style={{ width: `${mark.percentage}%`, height: '100%', borderRadius: '2px' }}></div>
                                                    </div>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{mark.percentage}%</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {subject.assignmentMarks.length === 0 && subject.experimentMarks.length === 0 && (
                            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                No marks recorded yet for this subject.
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
};

export default StudentAssignments;
