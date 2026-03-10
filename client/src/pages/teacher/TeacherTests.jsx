import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { FiFileText } from 'react-icons/fi';

const TeacherTests = () => {
    const [testsData, setTestsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchTestsData();
    }, []);

    const fetchTestsData = async () => {
        try {
            const response = await api.get('/teacher/tests');
            setTestsData(response.data);
        } catch (error) {
            console.error('Failed to fetch tests data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const handleCardClick = (classId, subject) => {
        navigate(`/teacher/tests/${classId}/${encodeURIComponent(subject)}`);
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
                    <h2 className="card-title">Test Management</h2>
                    <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                        Click on a class to manage tests and enter marks
                    </p>
                </div>
            </div>

            <div className="year-cards-grid" style={{ marginTop: '24px' }}>
                {testsData.length > 0 ? (
                    testsData.map((item, index) => (
                        <div
                            key={index}
                            className="year-card"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleCardClick(item.classId, item.subject)}
                        >
                            <div className="year-header">
                                <span className="year-number">{item.className}</span>
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

                            <div style={{ padding: '16px 0' }}>
                                <h4 style={{ margin: 0, color: 'var(--gray-800)', fontSize: '1.1rem' }}>
                                    {item.subject}
                                </h4>
                                <p style={{ margin: '4px 0 0', color: 'var(--gray-500)', fontSize: '0.85rem' }}>
                                    {item.department}
                                </p>
                            </div>

                            <div style={{
                                padding: '12px 0',
                                borderTop: '1px solid var(--gray-200)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ color: 'var(--gray-600)', fontSize: '0.9rem' }}>
                                        Tests Conducted
                                    </span>
                                    <span style={{
                                        fontSize: '1.25rem',
                                        fontWeight: '600',
                                        color: 'var(--primary)'
                                    }}>
                                        {item.testCount}
                                    </span>
                                </div>

                                {item.tests.length > 0 && (
                                    <div style={{
                                        background: 'var(--gray-50)',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        marginBottom: '12px'
                                    }}>
                                        <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase' }}>
                                            Recent Tests
                                        </p>
                                        {item.tests.slice(0, 3).map((test, i) => (
                                            <div key={test._id} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: '4px 0',
                                                borderBottom: i < Math.min(item.tests.length, 3) - 1 ? '1px solid var(--gray-200)' : 'none'
                                            }}>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--gray-700)' }}>
                                                    {test.testType}
                                                </span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                                                    {formatDate(test.date)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button
                                className="btn btn-primary"
                                style={{ width: '100%' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCardClick(item.classId, item.subject);
                                }}
                            >
                                <FiFileText style={{ marginRight: '4px' }} /> Manage Tests
                            </button>
                        </div>
                    ))
                ) : (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--gray-500)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}><FiFileText size={48} /></div>
                        <h3>No Classes Assigned</h3>
                        <p>You will see your assigned classes here once you're added to the timetable.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherTests;
