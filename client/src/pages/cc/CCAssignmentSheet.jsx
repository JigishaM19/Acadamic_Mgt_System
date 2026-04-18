import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { FiArrowLeft, FiSave, FiSettings, FiUpload, FiDownload, FiX, FiFile } from 'react-icons/fi';

const CCAssignmentSheet = () => {
    const { subject } = useParams();
    const decodedSubject = decodeURIComponent(subject);
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [classInfo, setClassInfo] = useState(null);
    const [config, setConfig] = useState({ totalAssignments: 0, totalExperiments: 0, assignmentMaxScore: 10, experimentMaxScore: 10 });
    const [students, setStudents] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [experiments, setExperiments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [activeTab, setActiveTab] = useState('assignment');
    const [configForm, setConfigForm] = useState({ totalAssignments: 0, totalExperiments: 0, assignmentMaxScore: 10, experimentMaxScore: 10 });
    const [message, setMessage] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadType, setUploadType] = useState('assignment');
    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => { fetchData(); }, [subject]);

    const fetchData = async () => {
        try {
            const res = await api.get(`/cc/assignments/${encodeURIComponent(decodedSubject)}`);
            setClassInfo(res.data.classInfo);
            setConfig(res.data.config);
            setConfigForm({
                totalAssignments: res.data.config.totalAssignments || 0,
                totalExperiments: res.data.config.totalExperiments || 0,
                assignmentMaxScore: res.data.config.assignmentMaxScore || 10,
                experimentMaxScore: res.data.config.experimentMaxScore || 10
            });
            setStudents(res.data.students);
            setAssignments(res.data.assignments);
            setExperiments(res.data.experiments);
        } catch (err) {
            console.error('Failed to fetch:', err);
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async () => {
        try {
            setSaving(true);
            await api.post('/cc/assignment-config', { subject: decodedSubject, ...configForm });
            setConfig(configForm);
            setShowConfig(false);
            setMessage('Configuration saved!');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage('Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const getScore = (records, number, studentId) => {
        const record = records.find(r => r.number === number);
        if (!record) return '';
        const mark = record.marks?.find(m => m.studentId === studentId || m.studentId?.toString() === studentId);
        return mark?.score ?? '';
    };

    const saveMarks = async (type, number) => {
        const maxScore = type === 'assignment' ? config.assignmentMaxScore : config.experimentMaxScore;
        const marks = students.map(s => {
            const inputEl = document.getElementById(`${type}-${number}-${s._id}`);
            const val = inputEl?.value;
            return { studentId: s._id, score: (val === '' || val === undefined) ? null : parseFloat(val) };
        });
        for (const m of marks) {
            if (m.score !== null && (m.score < 0 || m.score > maxScore)) {
                setMessage(`Score must be between 0 and ${maxScore}`);
                setTimeout(() => setMessage(''), 3000);
                return;
            }
        }
        try {
            setSaving(true);
            await api.post('/cc/assignments', { subject: decodedSubject, type, number, maxScore, marks });
            setMessage(`${type === 'assignment' ? 'Assignment' : 'Experiment'} ${number} saved!`);
            fetchData();
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleExport = async (type) => {
        try {
            const res = await api.get(`/cc/assignments/${encodeURIComponent(decodedSubject)}/export?type=${type}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${decodedSubject}_${type === 'assignment' ? 'Assignment' : 'Experiment'}_Marks.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setMessage('Export failed');
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const res = await api.get(
                `/cc/assignments/${encodeURIComponent(decodedSubject)}/template?type=${uploadType}`,
                { responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${decodedSubject}_${uploadType === 'assignment' ? 'Assignment' : 'Experiment'}_Template.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setMessage('Template download failed');
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('subject', decodedSubject);
        formData.append('type', uploadType);
        try {
            setSaving(true);
            const res = await api.post('/cc/assignments/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (res.data.errors?.length > 0) {
                console.warn('Upload errors:', res.data.errors);
            }
            // Reload page to refresh uncontrolled inputs with new data from DB
            window.location.reload();
        } catch (err) {
            setMessage('Upload failed');
            setSaving(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setTimeout(() => setMessage(''), 4000);
        }
    };

    const openUploadModal = (type) => {
        setUploadType(type);
        setSelectedFile(null);
        setShowUploadModal(true);
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    const activeRecords = activeTab === 'assignment' ? assignments : experiments;
    const totalCount = activeTab === 'assignment' ? config.totalAssignments : config.totalExperiments;
    const maxScore = activeTab === 'assignment' ? config.assignmentMaxScore : config.experimentMaxScore;
    const label = activeTab === 'assignment' ? 'Assignment' : 'Experiment';

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/cc/assignments')}>
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
                    <button className="btn btn-outline btn-sm" onClick={() => setShowConfig(!showConfig)}>
                        <FiSettings style={{ marginRight: '4px' }} /> Configure
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => handleExport(activeTab)}>
                        <FiDownload style={{ marginRight: '4px' }} /> Export
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => openUploadModal(activeTab)}>
                        <FiUpload style={{ marginRight: '4px' }} /> Upload
                    </button>
                </div>
            </div>

            {message && (
                <div className={`alert ${message.includes('Failed') || message.includes('must') || message.includes('failed') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '16px' }}>
                    {message}
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && createPortal(
                <>
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', zIndex: 9998
                    }} onClick={() => setShowUploadModal(false)}></div>
                    <div style={{
                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        background: 'var(--white, #ffffff)', borderRadius: '16px', padding: '28px',
                        width: '90%', maxWidth: '480px', zIndex: 9999,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', color: 'var(--gray-800)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px' }}>
                                <FiUpload style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                Upload {uploadType === 'assignment' ? 'Assignment' : 'Experiment'} Marks
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
                                Download the template first, fill in the scores, then upload the completed file.
                            </p>
                            <button className="btn btn-outline btn-sm" onClick={handleDownloadTemplate} style={{ width: '100%' }}>
                                <FiDownload style={{ marginRight: '6px' }} /> Download {uploadType === 'assignment' ? 'Assignment' : 'Experiment'} Template
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

            {showConfig && (
                <div className="card" style={{ marginBottom: '20px' }}>
                    <div className="card-header"><h3 className="card-title" style={{ margin: 0 }}>Subject Configuration</h3></div>
                    <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                        <div className="form-group">
                            <label>Total Assignments</label>
                            <input type="number" min="0" className="form-input" value={configForm.totalAssignments}
                                onChange={e => setConfigForm({ ...configForm, totalAssignments: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="form-group">
                            <label>Assignment Max Score</label>
                            <input type="number" min="1" className="form-input" value={configForm.assignmentMaxScore}
                                onChange={e => setConfigForm({ ...configForm, assignmentMaxScore: parseInt(e.target.value) || 10 })} />
                        </div>
                        <div className="form-group">
                            <label>Total Experiments</label>
                            <input type="number" min="0" className="form-input" value={configForm.totalExperiments}
                                onChange={e => setConfigForm({ ...configForm, totalExperiments: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="form-group">
                            <label>Experiment Max Score</label>
                            <input type="number" min="1" className="form-input" value={configForm.experimentMaxScore}
                                onChange={e => setConfigForm({ ...configForm, experimentMaxScore: parseInt(e.target.value) || 10 })} />
                        </div>
                    </div>
                    <div style={{ padding: '0 20px 20px', display: 'flex', gap: '8px' }}>
                        <button className="btn btn-primary btn-sm" onClick={saveConfig} disabled={saving}>
                            <FiSave style={{ marginRight: '4px' }} /> {saving ? 'Saving...' : 'Save Config'}
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowConfig(false)}>Cancel</button>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
                <button className={`btn ${activeTab === 'assignment' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('assignment')} style={{ borderRadius: '8px 8px 0 0' }}>
                    Assignments ({config.totalAssignments})
                </button>
                <button className={`btn ${activeTab === 'experiment' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('experiment')} style={{ borderRadius: '8px 8px 0 0' }}>
                    Experiments ({config.totalExperiments})
                </button>
            </div>

            {totalCount === 0 ? (
                <div className="empty-state">
                    No {label.toLowerCase()}s configured. Click <strong>Configure</strong> to set the total.
                </div>
            ) : (
                <div className="table-container" key={activeTab} style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 2, minWidth: '40px' }}>#</th>
                                <th style={{ position: 'sticky', left: '40px', background: 'var(--bg-secondary)', zIndex: 2, minWidth: '180px' }}>Student</th>
                                {Array.from({ length: totalCount }, (_, i) => (
                                    <th key={i} style={{ textAlign: 'center', minWidth: '90px' }}>
                                        {label} {i + 1}<div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>/{maxScore}</div>
                                    </th>
                                ))}
                                <th style={{ textAlign: 'center' }}>Avg</th>
                                <th style={{ textAlign: 'center' }}>%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((student, idx) => {
                                let totalScore = 0, count = 0;
                                return (
                                    <tr key={student._id}>
                                        <td style={{ position: 'sticky', left: 0, background: 'var(--bg-primary)', zIndex: 1 }}>{idx + 1}</td>
                                        <td style={{ position: 'sticky', left: '40px', background: 'var(--bg-primary)', zIndex: 1, fontWeight: 500 }}>{student.fullName}</td>
                                        {Array.from({ length: totalCount }, (_, i) => {
                                            const num = i + 1;
                                            const val = getScore(activeRecords, num, student._id);
                                            if (val !== '' && val !== null && val !== undefined) { totalScore += parseFloat(val); count++; }
                                            return (
                                                <td key={i} style={{ textAlign: 'center', padding: '4px' }}>
                                                    <input id={`${activeTab}-${num}-${student._id}`} type="number" min="0" max={maxScore} step="0.5" defaultValue={val}
                                                        style={{ width: '60px', textAlign: 'center', padding: '6px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px' }} />
                                                </td>
                                            );
                                        })}
                                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{count > 0 ? (totalScore / count).toFixed(1) : '—'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            {count > 0 ? (
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 500,
                                                    background: (totalScore / (count * maxScore)) * 100 >= 60 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                    color: (totalScore / (count * maxScore)) * 100 >= 60 ? 'var(--success)' : 'var(--danger)'
                                                }}>{((totalScore / (count * maxScore)) * 100).toFixed(0)}%</span>
                                            ) : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {totalCount > 0 && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                    {Array.from({ length: totalCount }, (_, i) => (
                        <button key={i} className="btn btn-primary btn-sm" onClick={() => saveMarks(activeTab, i + 1)} disabled={saving}>
                            <FiSave style={{ marginRight: '4px' }} /> Save {label} {i + 1}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CCAssignmentSheet;
