import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { FiEdit2, FiFileText } from 'react-icons/fi';

const CCTestSheet = () => {
    const { subject } = useParams();
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [tests, setTests] = useState([]);
    const [testTypes, setTestTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingTest, setEditingTest] = useState(null);
    const [editedMarks, setEditedMarks] = useState([]);

    useEffect(() => {
        fetchData();
    }, [subject]);

    const fetchData = async () => {
        try {
            const response = await api.get(`/cc/tests/${encodeURIComponent(subject)}`);
            setStudents(response.data.students || []);
            setTests(response.data.tests || []);
            setTestTypes(response.data.testTypes || []);
        } catch (error) {
            console.error('Failed to fetch test data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStudentScore = (test, studentId) => {
        const mark = test.marks?.find(m => m.studentId === studentId || m.studentId?._id === studentId);
        return mark?.score;
    };

    const handleEditClick = (test) => {
        setEditingTest(test);
        setEditedMarks(students.map(student => {
            const existingMark = test.marks?.find(m => m.studentId === student._id || m.studentId?._id === student._id);
            return {
                studentId: student._id,
                score: existingMark?.score ?? ''
            };
        }));
    };

    const handleScoreChange = (studentId, value) => {
        const numValue = value === '' ? '' : parseFloat(value);
        setEditedMarks(prev => prev.map(m => {
            if (m.studentId === studentId) {
                return { ...m, score: numValue };
            }
            return m;
        }));
    };

    const handleSaveEdit = async () => {
        if (!editingTest) return;

        // Validate scores
        for (const mark of editedMarks) {
            if (mark.score !== '' && mark.score !== null) {
                if (mark.score < 0 || mark.score > editingTest.maxScore) {
                    alert(`Score must be between 0 and ${editingTest.maxScore}`);
                    return;
                }
            }
        }

        setSaving(true);

        try {
            await api.put(`/cc/tests/${editingTest._id}`, {
                marks: editedMarks.map(m => ({
                    studentId: m.studentId,
                    score: m.score === '' ? null : m.score
                }))
            });
            await fetchData();
            setEditingTest(null);
            setEditedMarks([]);
        } catch (error) {
            console.error('Failed to save test scores:', error);
            alert('Failed to save test scores');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingTest(null);
        setEditedMarks([]);
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button className="btn btn-outline" onClick={() => navigate('/cc/tests')}>
                            ← Back
                        </button>
                        <h2 className="card-title"><FiFileText style={{ marginRight: '6px' }} /> {decodeURIComponent(subject)} - Test Scores</h2>
                    </div>
                </div>

                {editingTest && (
                    <div className="form-section" style={{ marginBottom: '20px', padding: '16px', background: 'var(--primary-light)', borderRadius: '8px' }}>
                        <h3 style={{ marginBottom: '12px' }}>
                            Editing: {editingTest.testType} • {formatDate(editingTest.date)} (Max: {editingTest.maxScore})
                        </h3>
                        <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Roll No</th>
                                        <th>Student Name</th>
                                        <th>Score (out of {editingTest.maxScore})</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map(student => {
                                        const mark = editedMarks.find(m => m.studentId === student._id);
                                        return (
                                            <tr key={student._id}>
                                                <td>{student.username}</td>
                                                <td>{student.fullName || `${student.firstName} ${student.lastName}`}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={editingTest.maxScore}
                                                        value={mark?.score ?? ''}
                                                        onChange={(e) => handleScoreChange(student._id, e.target.value)}
                                                        style={{ width: '80px', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}
                                                        placeholder="—"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                            <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button className="btn btn-outline" onClick={handleCancelEdit}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ position: 'sticky', left: 0, background: 'var(--bg)', zIndex: 2, minWidth: '80px' }}>Roll No</th>
                                <th style={{ position: 'sticky', left: '80px', background: 'var(--bg)', zIndex: 2, minWidth: '150px' }}>Name</th>
                                {tests.map(test => (
                                    <th key={test._id} style={{ minWidth: '120px', textAlign: 'center' }}>
                                        <div>{test.testType}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            {formatDate(test.date)}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                            Max: {test.maxScore}
                                        </div>
                                        <button
                                            className="btn-icon"
                                            onClick={() => handleEditClick(test)}
                                            title="Edit"
                                            style={{ marginTop: '4px' }}
                                        >
                                            <FiEdit2 />
                                        </button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(student => (
                                <tr key={student._id}>
                                    <td style={{ position: 'sticky', left: 0, background: 'var(--bg)', zIndex: 1 }}>
                                        {student.username}
                                    </td>
                                    <td style={{ position: 'sticky', left: '80px', background: 'var(--bg)', zIndex: 1 }}>
                                        {student.fullName || `${student.firstName} ${student.lastName}`}
                                    </td>
                                    {tests.map(test => {
                                        const score = getStudentScore(test, student._id);
                                        const percentage = score !== undefined && score !== null
                                            ? Math.round((score / test.maxScore) * 100)
                                            : null;

                                        return (
                                            <td key={test._id} style={{ textAlign: 'center' }}>
                                                {score !== undefined && score !== null ? (
                                                    <span style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '12px',
                                                        fontSize: '12px',
                                                        fontWeight: '500',
                                                        background: percentage >= 70 ? 'rgba(16, 185, 129, 0.1)' :
                                                            percentage >= 50 ? 'rgba(245, 158, 11, 0.1)' :
                                                                'rgba(239, 68, 68, 0.1)',
                                                        color: percentage >= 70 ? 'var(--success)' :
                                                            percentage >= 50 ? 'var(--warning)' :
                                                                'var(--danger)'
                                                    }}>
                                                        {score}/{test.maxScore}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {tests.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No test records found for {decodeURIComponent(subject)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CCTestSheet;
