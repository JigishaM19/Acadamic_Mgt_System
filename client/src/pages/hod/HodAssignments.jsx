import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiClipboard, FiEye } from 'react-icons/fi';

const HodAssignments = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState('');
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailTab, setDetailTab] = useState('assignment');

    useEffect(() => { fetchData(); }, [selectedYear]);

    const fetchData = async () => {
        try {
            let url = '/hod/assignments';
            if (selectedYear) url += `?year=${selectedYear}`;
            const res = await api.get(url);
            setData(res.data);
        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            setLoading(false);
        }
    };

    const viewDetail = async (classId, subject) => {
        try {
            setDetailLoading(true);
            const res = await api.get(`/hod/assignments/${classId}/${encodeURIComponent(subject)}`);
            setDetail(res.data);
            setDetailTab('assignment');
        } catch (err) {
            console.error('Failed to fetch detail:', err);
        } finally {
            setDetailLoading(false);
        }
    };

    const getScore = (records, number, studentId) => {
        const record = records.find(r => r.number === number);
        if (!record) return null;
        const mark = record.marks?.find(m => m.studentId === studentId || m.studentId?.toString() === studentId);
        return mark?.score ?? null;
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2><FiClipboard style={{ marginRight: '8px' }} />Assignments & Experiments</h2>
                <div className="filter-group">
                    <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                        <option value="">All Years</option>
                        <option value="1">Year 1</option>
                        <option value="2">Year 2</option>
                        <option value="3">Year 3</option>
                        <option value="4">Year 4</option>
                    </select>
                </div>
            </div>

            {data.length === 0 ? (
                <div className="empty-state">No assignment/experiment data found.</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Class</th>
                                <th>Year</th>
                                <th>Subject</th>
                                <th style={{ textAlign: 'center' }}>Assignments</th>
                                <th style={{ textAlign: 'center' }}>Experiments</th>
                                <th style={{ textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, idx) => (
                                <tr key={idx}>
                                    <td style={{ fontWeight: 500 }}>{item.className}</td>
                                    <td>{item.year}</td>
                                    <td>{item.subject}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className="badge">{item.assignmentsEntered}/{item.totalAssignments}</span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className="badge">{item.experimentsEntered}/{item.totalExperiments}</span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button className="btn btn-outline btn-sm" onClick={() => viewDetail(item.classId, item.subject)}>
                                            <FiEye style={{ marginRight: '4px' }} /> View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Detail Modal/Expanded View */}
            {detail && (
                <div className="card" style={{ marginTop: '24px' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="card-title" style={{ margin: 0 }}>
                            {detail.classInfo.className} — {detail.classInfo.subject}
                        </h3>
                        <button className="btn btn-secondary btn-sm" onClick={() => setDetail(null)}>Close</button>
                    </div>

                    {detailLoading ? (
                        <div className="loading"><div className="spinner"></div></div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', gap: '4px', padding: '16px 16px 0' }}>
                                <button className={`btn btn-sm ${detailTab === 'assignment' ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setDetailTab('assignment')}>
                                    Assignments ({detail.config.totalAssignments})
                                </button>
                                <button className={`btn btn-sm ${detailTab === 'experiment' ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setDetailTab('experiment')}>
                                    Experiments ({detail.config.totalExperiments})
                                </button>
                            </div>

                            {(() => {
                                const records = detailTab === 'assignment' ? detail.assignments : detail.experiments;
                                const totalCount = detailTab === 'assignment' ? detail.config.totalAssignments : detail.config.totalExperiments;
                                const maxScore = detailTab === 'assignment' ? detail.config.assignmentMaxScore : detail.config.experimentMaxScore;
                                const label = detailTab === 'assignment' ? 'A' : 'E';

                                if (totalCount === 0 || records.length === 0) {
                                    return <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>No data available</div>;
                                }

                                return (
                                    <div className="table-container" style={{ overflowX: 'auto' }}>
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Student</th>
                                                    {Array.from({ length: totalCount }, (_, i) => (
                                                        <th key={i} style={{ textAlign: 'center' }}>{label}{i + 1}<br /><small>/{maxScore}</small></th>
                                                    ))}
                                                    <th style={{ textAlign: 'center' }}>Avg</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detail.students.map((student, idx) => {
                                                    let total = 0, count = 0;
                                                    return (
                                                        <tr key={student._id}>
                                                            <td>{idx + 1}</td>
                                                            <td style={{ fontWeight: 500 }}>{student.fullName}</td>
                                                            {Array.from({ length: totalCount }, (_, i) => {
                                                                const score = getScore(records, i + 1, student._id);
                                                                if (score !== null) { total += score; count++; }
                                                                return (
                                                                    <td key={i} style={{ textAlign: 'center' }}>
                                                                        {score !== null ? score : <span style={{ color: 'var(--text-secondary)' }}>—</span>}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td style={{ textAlign: 'center', fontWeight: 600 }}>
                                                                {count > 0 ? (total / count).toFixed(1) : '—'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })()}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default HodAssignments;
