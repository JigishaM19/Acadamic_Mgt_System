import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiCheckCircle, FiEdit3, FiAward } from 'react-icons/fi';

const TestTypes = () => {
    const [testTypes, setTestTypes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTestTypes = async () => {
            try {
                const res = await api.get('/test-types');
                setTestTypes(res.data);
            } catch (err) {
                console.error('Failed to fetch test types:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTestTypes();
    }, []);

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    const statusColors = {
        true: { bg: 'rgba(16,185,129,0.1)', color: 'var(--success)', label: 'Editable' },
        false: { bg: 'rgba(99,102,241,0.1)', color: 'var(--primary)', label: 'Auto-Calculated' }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h2 style={{ margin: 0 }}>Test Types</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Fixed test structure — Mumbai University CBSGS
                    </p>
                </div>
            </div>

            <div style={{
                padding: '16px 20px',
                background: 'rgba(99,102,241,0.05)',
                border: '1px solid rgba(99,102,241,0.15)',
                borderRadius: '12px',
                marginBottom: '20px',
                fontSize: '13px',
                color: 'var(--text-secondary)'
            }}>
                <FiCheckCircle style={{ marginRight: '8px', color: 'var(--primary)', verticalAlign: 'middle' }} />
                These test types are fixed per Mumbai University rules and cannot be modified.
                Term Work is auto-calculated from assignments, experiments, lab attendance, and internal viva.
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
                {testTypes.map((tt) => {
                    const status = statusColors[tt.editable];
                    return (
                        <div key={tt.key} className="card" style={{
                            padding: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{
                                    width: '44px', height: '44px', borderRadius: '12px',
                                    background: 'var(--primary)', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', color: '#fff', fontSize: '16px', fontWeight: 700
                                }}>
                                    {tt.key}
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '15px' }}>{tt.name}</h4>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        {tt.label}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>
                                        {tt.maxScore}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Max Score</div>
                                </div>

                                <span style={{
                                    padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                                    background: status.bg, color: status.color,
                                    display: 'flex', alignItems: 'center', gap: '4px'
                                }}>
                                    {tt.editable ? <FiEdit3 size={12} /> : <FiAward size={12} />}
                                    {status.label}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="card" style={{ marginTop: '24px', padding: '20px' }}>
                <h4 style={{ margin: '0 0 12px' }}>Marks Distribution</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Final IA (Avg of IA1 + IA2)</div>
                        <div style={{ fontSize: '18px', fontWeight: 700 }}>20</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Term Work</div>
                        <div style={{ fontSize: '18px', fontWeight: 700 }}>25</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Oral / Practical Exam</div>
                        <div style={{ fontSize: '18px', fontWeight: 700 }}>25</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>End Semester Exam</div>
                        <div style={{ fontSize: '18px', fontWeight: 700 }}>80</div>
                    </div>
                    <div style={{ padding: '12px', background: 'rgba(99,102,241,0.08)', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.15)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--primary)' }}>Total Maximum</div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)' }}>150</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestTypes;
