import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { FiAward, FiCheckCircle, FiAlertTriangle, FiClock, FiChevronDown, FiChevronUp } from 'react-icons/fi';

const StudentTestScores = () => {
    const { user } = useAuth();
    const [marksSummary, setMarksSummary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedSubject, setExpandedSubject] = useState(null);

    const isParent = user?.role === 'parent';
    const basePath = isParent ? '/parent' : '/student';

    useEffect(() => {
        const fetchMarks = async () => {
            try {
                const endpoint = isParent ? '/student/marks-summary' : '/student/marks-summary';
                const res = await api.get(endpoint);
                setMarksSummary(res.data.marksSummary || []);
            } catch (err) {
                console.error('Failed to fetch marks:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchMarks();
    }, []);

    const getStatusConfig = (status) => ({
        PASS: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', icon: <FiCheckCircle />, label: 'PASS' },
        FAIL: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', icon: <FiAlertTriangle />, label: 'FAIL' },
        DETAINED: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', icon: <FiAlertTriangle />, label: 'DETAINED' },
        INCOMPLETE: { bg: 'rgba(107,114,128,0.1)', color: '#6b7280', icon: <FiClock />, label: 'INCOMPLETE' }
    }[status] || { bg: 'rgba(107,114,128,0.1)', color: '#6b7280', icon: <FiClock />, label: status });

    const getGradeColor = (grade) => ({
        'O': '#10b981', 'A': '#3b82f6', 'B': '#6366f1', 'C': '#8b5cf6',
        'D': '#f59e0b', 'E': '#f97316', 'F': '#ef4444'
    }[grade] || '#6b7280');

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h2 style={{ margin: 0 }}>
                        <FiAward style={{ marginRight: '8px', verticalAlign: 'middle', color: 'var(--primary)' }} />
                        Marks & Results
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Subject-wise marks breakdown with grades
                    </p>
                </div>
            </div>

            {marksSummary.length === 0 ? (
                <div className="empty-state">No marks data available yet.</div>
            ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                    {marksSummary.map((ms) => {
                        const statusCfg = getStatusConfig(ms.status);
                        const isExpanded = expandedSubject === ms.subject;
                        return (
                            <div key={ms.subject} className="card" style={{ overflow: 'hidden' }}>
                                {/* Card Header */}
                                <div
                                    style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '16px 20px', cursor: 'pointer', flexWrap: 'wrap', gap: '12px'
                                    }}
                                    onClick={() => setExpandedSubject(isExpanded ? null : ms.subject)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{
                                            width: '48px', height: '48px', borderRadius: '12px',
                                            background: `linear-gradient(135deg, ${getGradeColor(ms.grade)}, ${getGradeColor(ms.grade)}88)`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#fff', fontSize: '16px', fontWeight: 800
                                        }}>
                                            {ms.grade || '?'}
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '15px' }}>{ms.subject}</h4>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                Total: <strong style={{ color: 'var(--primary)' }}>{ms.total ?? '—'}/150</strong>
                                                &nbsp;&nbsp;•&nbsp;&nbsp;
                                                {ms.percentage !== null ? `${ms.percentage}%` : '—'}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{
                                            padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600,
                                            background: statusCfg.bg, color: statusCfg.color,
                                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                                        }}>
                                            {statusCfg.icon} {statusCfg.label}
                                        </span>
                                        {isExpanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div style={{
                                        padding: '0 20px 20px',
                                        borderTop: '1px solid var(--border)'
                                    }}>
                                        {/* 5 Test Type Marks */}
                                        <div style={{
                                            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                                            gap: '10px', marginTop: '16px'
                                        }}>
                                            {[
                                                { label: 'IA1', value: ms.ia1, max: 20 },
                                                { label: 'IA2', value: ms.ia2, max: 20 },
                                                { label: 'Final IA', value: ms.finalIA, max: 20, highlight: true },
                                                { label: 'Term Work', value: ms.tw, max: 25 },
                                                { label: 'Oral Exam', value: ms.oralExam, max: 25 },
                                                { label: 'ESE', value: ms.ese, max: 80 }
                                            ].map((item) => (
                                                <div key={item.label} style={{
                                                    padding: '12px', borderRadius: '10px', textAlign: 'center',
                                                    background: item.highlight ? 'rgba(99,102,241,0.08)' : 'var(--bg-secondary)',
                                                    border: item.highlight ? '1px solid rgba(99,102,241,0.15)' : '1px solid var(--border)'
                                                }}>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                        {item.label}
                                                    </div>
                                                    <div style={{ fontSize: '18px', fontWeight: 700, color: item.highlight ? 'var(--primary)' : 'var(--text-primary)' }}>
                                                        {item.value !== null && item.value !== undefined ? item.value : '—'}
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>/{item.max}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* TW Breakdown */}
                                        {ms.twBreakdown && (
                                            <div style={{ marginTop: '14px' }}>
                                                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                                    Term Work Breakdown
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                                                    {[
                                                        { label: 'Journal/Experiments', value: ms.twBreakdown.journal, max: 10 },
                                                        { label: 'Assignments', value: ms.twBreakdown.assignments, max: 5 },
                                                        { label: 'Lab Attendance', value: ms.twBreakdown.labAttendance, max: 5 },
                                                        { label: 'Internal Viva', value: ms.twBreakdown.internalViva, max: 5 }
                                                    ].map((c) => (
                                                        <div key={c.label} style={{
                                                            padding: '8px 10px', borderRadius: '8px',
                                                            background: 'var(--bg-secondary)', fontSize: '12px',
                                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                                        }}>
                                                            <span style={{ color: 'var(--text-secondary)' }}>{c.label}</span>
                                                            <span style={{ fontWeight: 600 }}>
                                                                {c.value !== null && c.value !== undefined ? c.value : '—'}/{c.max}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Grade + Passing Info */}
                                        <div style={{
                                            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                            gap: '10px', marginTop: '14px'
                                        }}>
                                            <div style={{
                                                padding: '12px', borderRadius: '10px', textAlign: 'center',
                                                background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)'
                                            }}>
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Grade</div>
                                                <div style={{ fontSize: '22px', fontWeight: 800, color: getGradeColor(ms.grade) }}>
                                                    {ms.grade || '—'}
                                                </div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{ms.gradeLabel || ''}</div>
                                            </div>
                                            <div style={{
                                                padding: '12px', borderRadius: '10px', textAlign: 'center',
                                                background: 'var(--bg-secondary)', border: '1px solid var(--border)'
                                            }}>
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Grade Point</div>
                                                <div style={{ fontSize: '22px', fontWeight: 800 }}>{ms.gradePoint ?? '—'}</div>
                                            </div>
                                            <div style={{
                                                padding: '12px', borderRadius: '10px', textAlign: 'center',
                                                background: 'var(--bg-secondary)', border: '1px solid var(--border)'
                                            }}>
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Attendance</div>
                                                <div style={{
                                                    fontSize: '18px', fontWeight: 700,
                                                    color: ms.attendancePercent >= 75 ? '#10b981' : '#ef4444'
                                                }}>
                                                    {ms.attendancePercent !== null ? `${ms.attendancePercent}%` : '—'}
                                                </div>
                                            </div>
                                            <div style={{
                                                padding: '12px', borderRadius: '10px', textAlign: 'center',
                                                background: 'var(--bg-secondary)', border: '1px solid var(--border)'
                                            }}>
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Att. Marks</div>
                                                <div style={{ fontSize: '18px', fontWeight: 700 }}>
                                                    {ms.attendanceMarks ?? '—'}/5
                                                </div>
                                            </div>
                                        </div>

                                        {/* Passing Conditions */}
                                        {ms.passing && (
                                            <div style={{
                                                marginTop: '14px', padding: '12px 14px',
                                                borderRadius: '10px', background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border)', fontSize: '12px'
                                            }}>
                                                <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>Passing Conditions</div>
                                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                                    {[
                                                        { label: 'ESE ≥ 32', passed: ms.passing.esePassed },
                                                        { label: 'TW ≥ 10', passed: ms.passing.twPassed },
                                                        { label: 'Total ≥ 60', passed: ms.passing.totalPassed }
                                                    ].map((c) => (
                                                        <span key={c.label} style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                            color: c.passed ? '#10b981' : '#ef4444', fontWeight: 500
                                                        }}>
                                                            {c.passed ? <FiCheckCircle size={13} /> : <FiAlertTriangle size={13} />}
                                                            {c.label}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default StudentTestScores;
