import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { FiFileText } from 'react-icons/fi';

const CCTests = () => {
    const [testData, setTestData] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchTests();
    }, []);

    const fetchTests = async () => {
        try {
            const response = await api.get('/cc/tests');
            setTestData(response.data);
        } catch (error) {
            console.error('Failed to fetch tests:', error);
        } finally {
            setLoading(false);
        }
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
                    <h2 className="card-title"><FiFileText style={{ marginRight: '6px' }} /> Test Scores Overview</h2>
                </div>

                <div className="year-cards-grid">
                    {testData.map((subject, index) => (
                        <div
                            key={index}
                            className="year-card"
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/cc/tests/${encodeURIComponent(subject.subject)}`)}
                        >
                            <div className="year-header">
                                <span className="year-number">{subject.subject}</span>
                                <span className={`attendance-badge ${getStatusClass(subject.status)}`}>
                                    {subject.avgScore}%
                                </span>
                            </div>
                            <div className="year-stats">
                                <div className="year-stat">
                                    <span className="stat-value">{subject.totalTests}</span>
                                    <span className="stat-label">Total Tests</span>
                                </div>
                                <div className="year-stat">
                                    <span className="stat-value" style={{ color: getStatusColor(subject.status) }}>
                                        {subject.avgScore}%
                                    </span>
                                    <span className="stat-label">Avg Score</span>
                                </div>
                            </div>
                            <div className="attendance-bar">
                                <div
                                    className="attendance-fill"
                                    style={{
                                        width: `${subject.avgScore}%`,
                                        background: getStatusColor(subject.status)
                                    }}
                                ></div>
                            </div>
                            <div style={{ marginTop: '12px', textAlign: 'center' }}>
                                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}>
                                    View Details →
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {testData.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No test records found for this class
                    </div>
                )}
            </div>
        </div>
    );
};

export default CCTests;
