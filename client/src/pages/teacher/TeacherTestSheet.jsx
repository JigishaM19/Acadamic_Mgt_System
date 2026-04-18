import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { FiArrowLeft, FiSave, FiEye, FiX, FiAward, FiAlertTriangle, FiCheckCircle, FiClock, FiDownload, FiUpload, FiFile } from 'react-icons/fi';

const TeacherTestSheet = () => {
    const { classId, subject } = useParams();
    const decodedSubject = decodeURIComponent(subject);
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [classInfo, setClassInfo] = useState(null);
    const [students, setStudents] = useState([]);
    const [tests, setTests] = useState([]);
    const [testTypes, setTestTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [showSummary, setShowSummary] = useState(false);
    const [marksSummary, setMarksSummary] = useState([]);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => { fetchData(); }, [classId, subject]);

    const fetchData = async () => {
        try {
            const [testsRes, typesRes] = await Promise.all([
                api.get(`/teacher/tests/${classId}/${encodeURIComponent(decodedSubject)}`),
                api.get('/teacher/test-types')
            ]);
            setClassInfo(testsRes.data.classInfo);
            setStudents(testsRes.data.students);
            setTests(testsRes.data.tests);
            setTestTypes(typesRes.data);
        } catch (err) {
            console.error('Failed to fetch test data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Get score for a student from a specific test type
    const getScore = (testType, studentId) => {
        const test = tests.find(t => t.testType === testType);
        if (!test) return '';
        const mark = test.marks?.find(m => m.studentId === studentId || m.studentId?.toString() === studentId);
        return mark?.score ?? '';
    };

    // Save marks for a single test type
    const saveTestType = async (testType) => {
        const typeInfo = testTypes.find(t => t.name === testType);
        if (!typeInfo) return;

        const marks = students.map(s => {
            const inputEl = document.getElementById(`test-${testType}-${s._id}`);
            const val = inputEl?.value;
            return {
                studentId: s._id,
                score: (val === '' || val === undefined) ? null : parseFloat(val)
            };
        });

        // Validate
        for (const m of marks) {
            if (m.score !== null && (m.score < 0 || m.score > typeInfo.maxScore)) {
                setMessage(`Score must be between 0 and ${typeInfo.maxScore} for ${testType}`);
                setTimeout(() => setMessage(''), 3000);
                return;
            }
        }

        try {
            setSaving(true);
            await api.post('/teacher/tests', {
                classId,
                subject: decodedSubject,
                testType,
                marks
            });
            setMessage(`${testType} marks saved!`);
            fetchData();
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    // Load marks summary (View Final Score)
    const loadSummary = async () => {
        try {
            setSummaryLoading(true);
            setShowSummary(true);
            const res = await api.get(`/teacher/tests/${classId}/${encodeURIComponent(decodedSubject)}/marks-summary`);
            setMarksSummary(res.data.marksSummary);
        } catch (err) {
            console.error('Failed to load marks summary:', err);
            setMessage('Failed to load summary');
        } finally {
            setSummaryLoading(false);
        }
    };

    // Export test marks
    const handleExport = async () => {
        try {
            const res = await api.get(
                `/teacher/tests/${classId}/${encodeURIComponent(decodedSubject)}/export`,
                { responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${decodedSubject}_Test_Marks.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setMessage('Export failed');
            setTimeout(() => setMessage(''), 3000);
        }
    };

    // Download template
    const handleDownloadTemplate = async () => {
        try {
            const res = await api.get(
                `/teacher/tests/${classId}/${encodeURIComponent(decodedSubject)}/template`,
                { responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${decodedSubject}_Test_Marks_Template.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setMessage('Template download failed');
            setTimeout(() => setMessage(''), 3000);
        }
    };

    // Upload test marks
    const handleUpload = async () => {
        if (!selectedFile) return;
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('classId', classId);
        formData.append('subject', decodedSubject);
        try {
            setSaving(true);
            const res = await api.post('/teacher/tests/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.errors?.length > 0) {
                console.warn('Upload errors:', res.data.errors);
            }
            // Reload page to refresh uncontrolled inputs
            window.location.reload();
        } catch (err) {
            setMessage('Upload failed');
            setSaving(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setTimeout(() => setMessage(''), 4000);
        }
    };

    const getStatusBadge = (status) => {
        const config = {
            PASS: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', icon: <FiCheckCircle size={12} /> },
            FAIL: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', icon: <FiAlertTriangle size={12} /> },
            DETAINED: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', icon: <FiAlertTriangle size={12} /> },
            INCOMPLETE: { bg: 'rgba(107,114,128,0.1)', color: '#6b7280', icon: <FiClock size={12} /> }
        };
        const s = config[status] || config.INCOMPLETE;
        return (
            <span style={{
                padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                background: s.bg, color: s.color, display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}>
                {s.icon} {status}
            </span>
        );
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    // Only show editable test types in the table
    const editableTypes = testTypes.filter(t => t.editable);

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/teacher/tests')}>
                        <FiArrowLeft />
                    </button>
                    <div>
                        <h2 style={{ margin: 0 }}>{decodedSubject}</h2>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {classInfo?.className} • Year {classInfo?.year} • {classInfo?.department}
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className="btn btn-outline btn-sm" onClick={handleExport}>
                        <FiDownload style={{ marginRight: '4px' }} /> Export
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => { setSelectedFile(null); setShowUploadModal(true); }}>
                        <FiUpload style={{ marginRight: '4px' }} /> Upload
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={loadSummary}>
                        <FiEye style={{ marginRight: '4px' }} /> View Final Score
                    </button>
                </div>
            </div>

            {message && (
                <div className={`alert ${message.includes('Failed') || message.includes('must') || message.includes('cannot') || message.includes('failed') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '16px' }}>
                    {message}
                </div>
            )}

            {/* Info Banner */}
            <div style={{
                padding: '12px 16px', marginBottom: '16px',
                background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.12)',
                borderRadius: '10px', fontSize: '12px', color: 'var(--text-secondary)'
            }}>
                <strong>Test Types:</strong> IA1 (/20) • IA2 (/20) — 
                Assignments & Experiments are managed separately in the Assignments section.
            </div>

            {/* Marks Entry Table */}
            <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 2, minWidth: '40px' }}>#</th>
                            <th style={{ position: 'sticky', left: '40px', background: 'var(--bg-secondary)', zIndex: 2, minWidth: '180px' }}>Student</th>
                            {editableTypes.map(tt => (
                                <th key={tt.key} style={{ textAlign: 'center', minWidth: '100px' }}>
                                    {tt.name}
                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 400 }}>/{tt.maxScore}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student, idx) => (
                            <tr key={student._id}>
                                <td style={{ position: 'sticky', left: 0, background: 'var(--bg-primary)', zIndex: 1 }}>{idx + 1}</td>
                                <td style={{ position: 'sticky', left: '40px', background: 'var(--bg-primary)', zIndex: 1, fontWeight: 500 }}>
                                    {student.fullName}
                                </td>
                                {editableTypes.map(tt => (
                                    <td key={tt.key} style={{ textAlign: 'center', padding: '4px' }}>
                                        <input
                                            id={`test-${tt.name}-${student._id}`}
                                            type="number"
                                            min="0"
                                            max={tt.maxScore}
                                            step="0.5"
                                            defaultValue={getScore(tt.name, student._id)}
                                            style={{
                                                width: '70px', textAlign: 'center', padding: '6px',
                                                border: '1px solid var(--border)', borderRadius: '6px',
                                                background: 'var(--bg-primary)', color: 'var(--text-primary)',
                                                fontSize: '13px'
                                            }}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Save Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                {editableTypes.map(tt => (
                    <button
                        key={tt.key}
                        className="btn btn-primary btn-sm"
                        onClick={() => saveTestType(tt.name)}
                        disabled={saving}
                    >
                        <FiSave style={{ marginRight: '4px' }} /> Save {tt.name}
                    </button>
                ))}
            </div>

            {/* Upload Modal */}
            {showUploadModal && createPortal(
                <>
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', zIndex: 9998
                    }} onClick={() => setShowUploadModal(false)} />
                    <div style={{
                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        background: 'var(--white, #ffffff)', borderRadius: '16px', padding: '28px',
                        width: '90%', maxWidth: '480px', zIndex: 9999,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', color: 'var(--gray-800)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px' }}>
                                <FiUpload style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                Upload Test Marks
                            </h3>
                            <button onClick={() => setShowUploadModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
                                <FiX size={20} />
                            </button>
                        </div>

                        {/* Download Template */}
                        <div style={{
                            background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
                            borderRadius: '12px', padding: '16px', marginBottom: '20px'
                        }}>
                            <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--gray-500)' }}>
                                Download the template first, fill in scores (IA1, IA2), then upload.
                            </p>
                            <button className="btn btn-outline btn-sm" onClick={handleDownloadTemplate} style={{ width: '100%' }}>
                                <FiDownload style={{ marginRight: '6px' }} /> Download Test Marks Template
                            </button>
                        </div>

                        {/* File Upload Area */}
                        <div
                            style={{
                                border: `2px dashed ${selectedFile ? 'var(--success)' : 'var(--gray-300)'}`,
                                borderRadius: '12px', padding: '24px', textAlign: 'center',
                                cursor: 'pointer', marginBottom: '20px',
                                background: selectedFile ? 'rgba(16,185,129,0.05)' : 'transparent',
                                transition: 'all 0.2s ease'
                            }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {selectedFile ? (
                                <>
                                    <FiFile size={28} style={{ color: 'var(--success)', marginBottom: '8px' }} />
                                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>{selectedFile.name}</p>
                                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        {(selectedFile.size / 1024).toFixed(1)} KB • Click to change file
                                    </p>
                                </>
                            ) : (
                                <>
                                    <FiUpload size={28} style={{ color: 'var(--text-secondary)', marginBottom: '8px' }} />
                                    <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>Click to select Excel file</p>
                                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        Supports .xlsx and .xls files
                                    </p>
                                </>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".xlsx,.xls"
                                style={{ display: 'none' }}
                                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                            />
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleUpload} disabled={!selectedFile || saving}>
                                <FiUpload style={{ marginRight: '4px' }} /> {saving ? 'Uploading...' : 'Upload'}
                            </button>
                        </div>
                    </div>
                </>,
                document.body
            )}

            {/* View Final Score Modal */}
            {showSummary && createPortal(
                <>
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.6)', zIndex: 9998
                    }} onClick={() => setShowSummary(false)} />
                    <div style={{
                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        background: 'var(--white, #ffffff)', borderRadius: '16px', padding: '28px',
                        width: '95%', maxWidth: '750px', maxHeight: '85vh', overflowY: 'auto',
                        zIndex: 9999, boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FiAward style={{ color: 'var(--primary)' }} /> IA Summary — {decodedSubject}
                            </h3>
                            <button onClick={() => setShowSummary(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
                                <FiX size={20} />
                            </button>
                        </div>

                        {summaryLoading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <div className="spinner"></div>
                                <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>Calculating...</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ fontSize: '12px' }}>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Student</th>
                                            <th style={{ textAlign: 'center' }}>IA1<br/><small>/20</small></th>
                                            <th style={{ textAlign: 'center' }}>IA2<br/><small>/20</small></th>
                                            <th style={{ textAlign: 'center' }}>Final IA<br/><small>/20</small></th>
                                            <th style={{ textAlign: 'center' }}>%</th>
                                            <th style={{ textAlign: 'center' }}>Grade</th>
                                            <th style={{ textAlign: 'center' }}>Att%</th>
                                            <th style={{ textAlign: 'center' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {marksSummary.map((ms, idx) => (
                                            <tr key={ms.studentId}>
                                                <td>{idx + 1}</td>
                                                <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{ms.fullName}</td>
                                                <td style={{ textAlign: 'center' }}>{ms.ia1 ?? '—'}</td>
                                                <td style={{ textAlign: 'center' }}>{ms.ia2 ?? '—'}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{ms.finalIA ?? '—'}</td>
                                                <td style={{ textAlign: 'center' }}>{ms.percentage !== null ? `${ms.percentage}%` : '—'}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {ms.grade ? (
                                                        <span style={{
                                                            padding: '2px 8px', borderRadius: '8px', fontWeight: 700, fontSize: '12px',
                                                            background: ms.grade === 'F' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                            color: ms.grade === 'F' ? '#ef4444' : '#10b981'
                                                        }}>
                                                            {ms.grade}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {ms.attendancePercent !== null ? (
                                                        <span style={{
                                                            color: ms.attendancePercent >= 75 ? 'var(--success)' : 'var(--danger)',
                                                            fontWeight: 500
                                                        }}>
                                                            {ms.attendancePercent}%
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>{getStatusBadge(ms.status)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};

export default TeacherTestSheet;
