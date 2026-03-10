import { useState, useEffect } from 'react';
import { FiBarChart2, FiCheckCircle, FiXCircle } from 'react-icons/fi';

const StudentTestScores = () => {
    const [testScores, setTestScores] = useState([]);
    const [filters, setFilters] = useState({ subjects: [], testTypes: [] });
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedTestType, setSelectedTestType] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [iaSummary, setIaSummary] = useState(null);
    const [iaLoading, setIaLoading] = useState(false);
    const [showIa, setShowIa] = useState(false);

    useEffect(() => {
        fetchTestScores();
    }, [selectedSubject, selectedTestType]);

    const fetchTestScores = async () => {
        try {
            const token = localStorage.getItem('token');
            let url = 'http://localhost:5000/api/student/tests';
            const params = new URLSearchParams();
            if (selectedSubject) params.append('subject', selectedSubject);
            if (selectedTestType) params.append('testType', selectedTestType);
            if (params.toString()) url += `?${params.toString()}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setTestScores(data.testScores || []);
                if (data.filters) {
                    setFilters(data.filters);
                }
            } else {
                setError(data.message || 'Failed to fetch test scores');
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const fetchIaSummary = async () => {
        if (iaSummary) {
            setShowIa(!showIa);
            return;
        }
        setIaLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/student/ia-summary', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setIaSummary(data);
                setShowIa(true);
            }
        } catch (err) {
            console.error('Failed to fetch IA summary:', err);
        } finally {
            setIaLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getScoreClass = (percentage) => {
        if (percentage === null) return '';
        if (percentage >= 60) return 'score-good';
        if (percentage >= 40) return 'score-warning';
        return 'score-low';
    };

    const clearFilters = () => {
        setSelectedSubject('');
        setSelectedTestType('');
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
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Test Scores</h2>
                <button
                    className={`btn ${showIa ? 'btn-outline' : 'btn-primary'}`}
                    onClick={fetchIaSummary}
                    disabled={iaLoading}
                    style={{ fontSize: '14px' }}
                >
                    {iaLoading ? 'Loading...' : showIa ? 'Hide IA Summary' : <><FiBarChart2 style={{ marginRight: '4px' }} /> View IA Summary</>}
                </button>
            </div>

            {/* IA Summary Section */}
            {showIa && iaSummary && (
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <h3 className="card-title" style={{ margin: 0 }}><FiBarChart2 style={{ marginRight: '6px' }} /> Internal Assessment Breakdown</h3>
                    </div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th style={{ textAlign: 'center' }}>UT IA</th>
                                    <th style={{ textAlign: 'center' }}>Assignment IA</th>
                                    <th style={{ textAlign: 'center' }}>Attendance IA</th>
                                    <th style={{ textAlign: 'center' }}>Total IA</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {iaSummary.subjects?.map((ia, index) => {
                                    const iaTotal = iaSummary.settings?.iaTotal || 20;
                                    const pct = (ia.totalIA / iaTotal) * 100;
                                    return (
                                        <tr key={index}>
                                            <td style={{ fontWeight: '500' }}>{ia.subject}</td>
                                            <td style={{ textAlign: 'center' }}>{ia.utIA?.toFixed(1) ?? '—'}</td>
                                            <td style={{ textAlign: 'center' }}>{ia.assignmentIA?.toFixed(1) ?? '—'}</td>
                                            <td style={{ textAlign: 'center' }}>{ia.attendanceIA?.toFixed(1) ?? '—'}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontWeight: '600',
                                                    fontSize: '13px',
                                                    background: pct >= 60
                                                        ? 'rgba(16,185,129,0.1)'
                                                        : pct >= 40
                                                            ? 'rgba(245,158,11,0.1)'
                                                            : 'rgba(239,68,68,0.1)',
                                                    color: pct >= 60
                                                        ? 'var(--success)'
                                                        : pct >= 40
                                                            ? 'var(--warning)'
                                                            : 'var(--danger)'
                                                }}>
                                                    {ia.totalIA?.toFixed(1)} / {iaTotal}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '3px 10px',
                                                    borderRadius: '10px',
                                                    fontSize: '12px',
                                                    fontWeight: '500',
                                                    background: ia.eligible !== false ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                    color: ia.eligible !== false ? 'var(--success)' : 'var(--danger)'
                                                }}>
                                                    {ia.eligible !== false ? <><FiCheckCircle style={{ marginRight: '2px' }} /> Eligible</> : <><FiXCircle style={{ marginRight: '2px' }} /> Ineligible</>}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="filters-bar">
                <div className="filter-group">
                    <label>Subject</label>
                    <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                    >
                        <option value="">All Subjects</option>
                        {filters.subjects.map((subject, index) => (
                            <option key={index} value={subject}>{subject}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Test Type</label>
                    <select
                        value={selectedTestType}
                        onChange={(e) => setSelectedTestType(e.target.value)}
                    >
                        <option value="">All Types</option>
                        {filters.testTypes.map((type, index) => (
                            <option key={index} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
                {(selectedSubject || selectedTestType) && (
                    <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Test Scores Table */}
            {testScores.length > 0 ? (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Subject</th>
                                <th>Test Type</th>
                                <th>Date</th>
                                <th>Score</th>
                                <th>Max Score</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
                            {testScores.map((test, index) => (
                                <tr key={test._id || index}>
                                    <td>{index + 1}</td>
                                    <td>{test.subject}</td>
                                    <td><span className="badge">{test.testType}</span></td>
                                    <td>{formatDate(test.date)}</td>
                                    <td>
                                        {test.score !== null ? (
                                            <span className={`score-value ${getScoreClass(test.percentage)}`}>
                                                {test.score}
                                            </span>
                                        ) : (
                                            <span className="no-score">-</span>
                                        )}
                                    </td>
                                    <td>{test.maxScore}</td>
                                    <td>
                                        {test.percentage !== null ? (
                                            <div className="percentage-cell">
                                                <div className="mini-progress">
                                                    <div
                                                        className={`mini-progress-fill ${getScoreClass(test.percentage)}`}
                                                        style={{ width: `${test.percentage}%` }}
                                                    ></div>
                                                </div>
                                                <span className={getScoreClass(test.percentage)}>{test.percentage}%</span>
                                            </div>
                                        ) : (
                                            <span className="no-score">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="empty-state">
                    {selectedSubject || selectedTestType
                        ? 'No test scores found for the selected filters'
                        : 'No test scores recorded yet'}
                </div>
            )}
        </div>
    );
};

export default StudentTestScores;

