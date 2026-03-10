import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { FiEdit2, FiTrash2, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { FaChartBar } from 'react-icons/fa';

const TeacherTestSheet = () => {
    const { classId, subject } = useParams();
    const navigate = useNavigate();
    const decodedSubject = decodeURIComponent(subject);

    const [classInfo, setClassInfo] = useState(null);
    const [students, setStudents] = useState([]);
    const [tests, setTests] = useState([]);
    const [testTypes, setTestTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // New test form state
    const [showNewForm, setShowNewForm] = useState(false);
    const [newTest, setNewTest] = useState({
        testType: '',
        date: new Date().toISOString().split('T')[0],
        maxScore: 20,
        marks: []
    });

    // Edit mode state
    const [editingTest, setEditingTest] = useState(null);
    const [editedMarks, setEditedMarks] = useState([]);

    // IA Preview state
    const [iaPreview, setIaPreview] = useState(null);
    const [iaLoading, setIaLoading] = useState(false);
    const [showIaPreview, setShowIaPreview] = useState(false);

    useEffect(() => {
        fetchData();
    }, [classId, subject]);

    const fetchData = async () => {
        try {
            const [sheetResponse, testTypesResponse] = await Promise.all([
                api.get(`/teacher/tests/${classId}/${encodeURIComponent(decodedSubject)}`),
                api.get('/teacher/test-types')
            ]);

            setClassInfo(sheetResponse.data.classInfo);
            setStudents(sheetResponse.data.students);
            setTests(sheetResponse.data.tests || []);
            setTestTypes(testTypesResponse.data);

            // Initialize new test marks with null scores
            const initialMarks = sheetResponse.data.students.map(s => ({
                studentId: s._id,
                score: null
            }));
            setNewTest(prev => ({ ...prev, marks: initialMarks }));

            // Set default test type
            if (testTypesResponse.data.length > 0) {
                setNewTest(prev => ({ ...prev, testType: testTypesResponse.data[0].name }));
            }
        } catch (error) {
            console.error('Failed to fetch test sheet:', error);
            setMessage({ type: 'error', text: 'Failed to load test data' });
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

    // New Test Form Handlers
    const handleNewMarkChange = (studentId, value) => {
        const numValue = value === '' ? null : parseFloat(value);
        setNewTest(prev => ({
            ...prev,
            marks: prev.marks.map(m =>
                m.studentId === studentId ? { ...m, score: numValue } : m
            )
        }));
    };

    const handleSaveNew = async () => {
        if (!newTest.testType) {
            setMessage({ type: 'error', text: 'Please select a test type' });
            return;
        }

        if (!newTest.maxScore || newTest.maxScore <= 0) {
            setMessage({ type: 'error', text: 'Please enter a valid max score' });
            return;
        }

        // Validate marks
        for (const mark of newTest.marks) {
            if (mark.score !== null && (mark.score < 0 || mark.score > newTest.maxScore)) {
                setMessage({ type: 'error', text: `Score must be between 0 and ${newTest.maxScore}` });
                return;
            }
        }

        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            await api.post('/teacher/tests', {
                classId,
                subject: decodedSubject,
                testType: newTest.testType,
                date: newTest.date,
                maxScore: newTest.maxScore,
                marks: newTest.marks
            });

            setMessage({ type: 'success', text: 'Test saved successfully!' });
            setShowNewForm(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save test:', error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save test' });
        } finally {
            setSaving(false);
        }
    };

    // Edit Handlers
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
                    setMessage({ type: 'error', text: `Score must be between 0 and ${editingTest.maxScore}` });
                    return;
                }
            }
        }

        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            await api.put(`/teacher/tests/${editingTest._id}`, {
                marks: editedMarks.map(m => ({
                    studentId: m.studentId,
                    score: m.score === '' ? null : m.score
                }))
            });
            setMessage({ type: 'success', text: 'Test scores updated successfully!' });
            await fetchData();
            setEditingTest(null);
            setEditedMarks([]);
        } catch (error) {
            console.error('Failed to save test scores:', error);
            setMessage({ type: 'error', text: 'Failed to save test scores' });
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingTest(null);
        setEditedMarks([]);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this test record?')) return;

        try {
            await api.delete(`/teacher/tests/${id}`);
            setMessage({ type: 'success', text: 'Test deleted successfully!' });
            fetchData();
        } catch (error) {
            console.error('Failed to delete test:', error);
            setMessage({ type: 'error', text: 'Failed to delete test' });
        }
    };

    const fetchIaPreview = async () => {
        if (iaPreview) {
            setShowIaPreview(!showIaPreview);
            return;
        }
        setIaLoading(true);
        try {
            const response = await api.get(`/teacher/tests/${classId}/${encodeURIComponent(decodedSubject)}/ia-preview`);
            setIaPreview(response.data);
            setShowIaPreview(true);
        } catch (error) {
            console.error('Failed to fetch IA preview:', error);
            setMessage({ type: 'error', text: 'Failed to load IA preview' });
        } finally {
            setIaLoading(false);
        }
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
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            gap: '12px',
                        }}
                    >
                        {/* LEFT SIDE */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button
                                className="btn btn-outline"
                                onClick={() => navigate('/teacher/tests')}
                            >
                                ← Back
                            </button>

                            <div>
                                <h2 className="card-title" style={{ margin: 0 }}>
                                    {classInfo?.className} - {decodedSubject} - Test Scores
                                </h2>
                                <p
                                    style={{
                                        margin: '4px 0 0',
                                        color: 'var(--text-secondary)',
                                        fontSize: '14px',
                                    }}
                                >
                                    {classInfo?.department} • Year {classInfo?.year}
                                </p>
                            </div>
                        </div>

                        {/* RIGHT SIDE */}
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowNewForm(true)}
                            disabled={showNewForm}
                        >
                            Create New Test
                        </button>
                    </div>
                </div>


                {/* Messages */}
                {message.text && (
                    <div className={`alert alert-${message.type}`} style={{ margin: '0 16px 16px' }}>
                        {message.text}
                    </div>
                )}

                {/* New Test Form */}
                {showNewForm && (
                    <div className="form-section" style={{ margin: '0 16px 20px', padding: '16px', background: 'var(--success-light)', borderRadius: '8px' }}>
                        <h3 style={{ marginBottom: '12px' }}>Create New Test</h3>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                            <div className="form-group" style={{ minWidth: '150px' }}>
                                <label className="form-label">Test Type</label>
                                <select
                                    className="form-input"
                                    value={newTest.testType}
                                    onChange={(e) => setNewTest(prev => ({ ...prev, testType: e.target.value }))}
                                >
                                    <option value="">Select Test Type</option>
                                    {testTypes.map(type => (
                                        <option key={type._id} value={type.name}>
                                            {type.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ minWidth: '150px' }}>
                                <label className="form-label">Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={newTest.date}
                                    onChange={(e) => setNewTest(prev => ({ ...prev, date: e.target.value }))}
                                />
                            </div>
                            <div className="form-group" style={{ minWidth: '100px' }}>
                                <label className="form-label">Max Score</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={newTest.maxScore}
                                    onChange={(e) => setNewTest(prev => ({ ...prev, maxScore: parseInt(e.target.value) || 0 }))}
                                    min="1"
                                />
                            </div>
                        </div>
                        <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Roll No</th>
                                        <th>Student Name</th>
                                        <th>Score (out of {newTest.maxScore})</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map(student => {
                                        const mark = newTest.marks.find(m => m.studentId === student._id);
                                        return (
                                            <tr key={student._id}>
                                                <td>{student.username}</td>
                                                <td>{student.fullName || `${student.firstName} ${student.lastName}`}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={newTest.maxScore}
                                                        value={mark?.score ?? ''}
                                                        onChange={(e) => handleNewMarkChange(student._id, e.target.value)}
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
                            <button className="btn btn-primary" onClick={handleSaveNew} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Test'}
                            </button>
                            <button className="btn btn-outline" onClick={() => setShowNewForm(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Edit Test Form */}
                {editingTest && (
                    <div className="form-section" style={{ margin: '0 16px 20px', padding: '16px', background: 'var(--primary-light)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 style={{ margin: 0 }}>
                                <FiEdit2 style={{ marginRight: '4px' }} /> Editing: {editingTest.testType} • {formatDate(editingTest.date)} (Max: {editingTest.maxScore})
                            </h3>
                            <button
                                className="btn btn-danger"
                                onClick={() => {
                                    handleDelete(editingTest._id);
                                    handleCancelEdit();
                                }}
                                style={{ fontSize: '12px', padding: '6px 12px' }}
                            >
                                <FiTrash2 style={{ marginRight: '4px' }} /> Delete Test
                            </button>
                        </div>
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

                {/* Spreadsheet-style Test Scores Table */}
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
                        No test records found for {decodedSubject}. Click "+ Create New Test" to get started.
                    </div>
                )}
            </div>

            {/* IA Preview Section */}
            <div className="card" style={{ marginTop: '20px' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="card-title" style={{ margin: 0 }}><FaChartBar style={{ marginRight: '6px' }} /> IA Score Preview</h3>
                    <button
                        className={`btn ${showIaPreview ? 'btn-outline' : 'btn-primary'}`}
                        onClick={fetchIaPreview}
                        disabled={iaLoading}
                    >
                        {iaLoading ? 'Loading...' : showIaPreview ? 'Hide Preview' : 'View IA Preview'}
                    </button>
                </div>

                {showIaPreview && iaPreview && (
                    <div className="table-container" style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Roll No</th>
                                    <th>Name</th>
                                    <th style={{ textAlign: 'center' }}>UT IA</th>
                                    <th style={{ textAlign: 'center' }}>Assignment IA</th>
                                    <th style={{ textAlign: 'center' }}>Attendance IA</th>
                                    <th style={{ textAlign: 'center' }}>Total IA / {iaPreview.settings?.iaTotal || 20}</th>
                                    <th style={{ textAlign: 'center' }}>Attendance %</th>
                                    <th style={{ textAlign: 'center' }}>Eligible</th>
                                </tr>
                            </thead>
                            <tbody>
                                {iaPreview.iaPreview?.map(row => (
                                    <tr key={row.studentId}>
                                        <td>{row.username || '—'}</td>
                                        <td>{row.fullName}</td>
                                        <td style={{ textAlign: 'center' }}>{row.utIA?.toFixed(1) ?? '—'}</td>
                                        <td style={{ textAlign: 'center' }}>{row.assignmentIA?.toFixed(1) ?? '—'}</td>
                                        <td style={{ textAlign: 'center' }}>{row.attendanceIA?.toFixed(1) ?? '—'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                fontWeight: '600',
                                                fontSize: '13px',
                                                background: (row.totalIA / (iaPreview.settings?.iaTotal || 20)) >= 0.6
                                                    ? 'rgba(16,185,129,0.1)'
                                                    : (row.totalIA / (iaPreview.settings?.iaTotal || 20)) >= 0.4
                                                        ? 'rgba(245,158,11,0.1)'
                                                        : 'rgba(239,68,68,0.1)',
                                                color: (row.totalIA / (iaPreview.settings?.iaTotal || 20)) >= 0.6
                                                    ? 'var(--success)'
                                                    : (row.totalIA / (iaPreview.settings?.iaTotal || 20)) >= 0.4
                                                        ? 'var(--warning)'
                                                        : 'var(--danger)'
                                            }}>
                                                {row.totalIA?.toFixed(1)}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>{row.attendancePercent?.toFixed(0)}%</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{
                                                padding: '3px 10px',
                                                borderRadius: '10px',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                background: row.eligible ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                color: row.eligible ? 'var(--success)' : 'var(--danger)'
                                            }}>
                                                {row.eligible ? <><FiCheckCircle style={{ marginRight: '2px' }} /> Yes</> : <><FiXCircle style={{ marginRight: '2px' }} /> No</>}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {showIaPreview && iaPreview && iaPreview.iaPreview?.length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No students found for IA preview.
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherTestSheet;
