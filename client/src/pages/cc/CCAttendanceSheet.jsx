import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { FiEdit2, FiCheckCircle, FiXCircle, FiDownload } from 'react-icons/fi';

const CCAttendanceSheet = () => {
    const { subject } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const batchId = searchParams.get('batchId');
    const decodedSubject = decodeURIComponent(subject);

    const [students, setStudents] = useState([]);
    const [records, setRecords] = useState([]);
    const [timeSlots, setTimeSlots] = useState([]);
    const [batches, setBatches] = useState([]);
    const [batchInfo, setBatchInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [editedRecords, setEditedRecords] = useState([]);

    useEffect(() => {
        fetchData();
    }, [subject, batchId]);

    const fetchData = async () => {
        try {
            const batchParam = batchId ? `?batchId=${batchId}` : '';
            const response = await api.get(`/cc/attendance/${encodeURIComponent(decodedSubject)}${batchParam}`);
            // Sort students by last name ascending
            const sortedStudents = (response.data.students || []).slice().sort((a, b) => {
                const lastA = (a.lastName || '').toLowerCase();
                const lastB = (b.lastName || '').toLowerCase();
                return lastA.localeCompare(lastB);
            });
            setStudents(sortedStudents);
            setRecords(response.data.records || []);
            setTimeSlots(response.data.timeSlots || []);
            setBatches(response.data.batches || []);
            setBatchInfo(response.data.batchInfo || null);
        } catch (error) {
            console.error('Failed to fetch attendance data:', error);
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

    const getTimeSlotLabel = (timeSlotId) => {
        const slotId = timeSlotId?._id || timeSlotId;
        const slot = timeSlots.find(s => s._id === slotId);
        if (!slot) return '';
        return `${slot.startTime} - ${slot.endTime}`;
    };

    const getStudentStatus = (record, studentId) => {
        const studentRecord = record.records?.find(r => r.studentId === studentId || r.studentId?._id === studentId);
        return studentRecord?.status || 'absent';
    };

    // Export attendance handler
    const handleExportAttendance = async () => {
        setExporting(true);
        try {
            const batchParam = batchId ? `&batchId=${batchId}` : '';
            const response = await api.get(
                `/cc/attendance/${encodeURIComponent(decodedSubject)}/export?format=xlsx${batchParam}`,
                { responseType: 'blob' }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const batchSuffix = batchInfo ? `_${batchInfo.name}` : batchId ? '_Batch' : '';
            link.setAttribute('download', `${decodedSubject}${batchSuffix}_Attendance.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export attendance:', error);
            alert('Failed to export attendance');
        } finally {
            setExporting(false);
        }
    };

    const handleEditClick = (record) => {
        setEditingRecord(record);
        setEditedRecords(students.map(student => {
            const existingRecord = record.records?.find(r =>
                r.studentId === student._id || r.studentId?._id === student._id
            );
            return {
                studentId: student._id,
                status: existingRecord?.status || 'absent'
            };
        }));
    };

    const handleStatusToggle = (studentId) => {
        setEditedRecords(prev => prev.map(r => {
            if (r.studentId === studentId) {
                const newStatus = r.status === 'present' ? 'absent' : 'present';
                return { ...r, status: newStatus };
            }
            return r;
        }));
    };

    const handleSaveEdit = async () => {
        if (!editingRecord) return;
        setSaving(true);

        try {
            await api.put(`/cc/attendance/${editingRecord._id}`, {
                records: editedRecords
            });
            await fetchData();
            setEditingRecord(null);
            setEditedRecords([]);
        } catch (error) {
            console.error('Failed to save attendance:', error);
            alert('Failed to save attendance');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingRecord(null);
        setEditedRecords([]);
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div style={{ overflow: 'hidden', maxWidth: '100%' }}>
            <div className="card" style={{ overflow: 'hidden' }}>
                <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button className="btn btn-outline" onClick={() => navigate('/cc/attendance')}>
                                ← Back
                            </button>
                            <div>
                                <h2 className="card-title" style={{ margin: 0 }}>
                                    {decodedSubject} - Attendance
                                </h2>
                                {batchInfo && (
                                    <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                        Batch: {batchInfo.name}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            className="btn btn-secondary"
                            onClick={handleExportAttendance}
                            disabled={exporting || records.length === 0}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <FiDownload size={16} />
                            {exporting ? 'Exporting...' : 'Export Attendance'}
                        </button>
                    </div>
                </div>

                {/* Batch Navbar */}
                {batches.length > 0 && (
                    <div style={{
                        display: 'flex',
                        gap: '0',
                        padding: '0 16px',
                        borderBottom: '2px solid var(--gray-200)',
                        marginBottom: '8px',
                        overflowX: 'auto'
                    }}>
                        <button
                            onClick={() => {
                                navigate(`/cc/attendance/${encodeURIComponent(decodedSubject)}`);
                            }}
                            style={{
                                padding: '10px 20px',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: !batchId ? '600' : '400',
                                color: !batchId ? 'var(--primary)' : 'var(--gray-500)',
                                borderBottom: !batchId ? '2px solid var(--primary)' : '2px solid transparent',
                                marginBottom: '-2px',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            All Students
                        </button>
                        {batches.map(batch => (
                            <button
                                key={batch._id}
                                onClick={() => {
                                    navigate(`/cc/attendance/${encodeURIComponent(decodedSubject)}?batchId=${batch._id}`);
                                }}
                                style={{
                                    padding: '10px 20px',
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: batchId === batch._id.toString() ? '600' : '400',
                                    color: batchId === batch._id.toString() ? 'var(--primary)' : 'var(--gray-500)',
                                    borderBottom: batchId === batch._id.toString() ? '2px solid var(--primary)' : '2px solid transparent',
                                    marginBottom: '-2px',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {batch.name}
                            </button>
                        ))}
                    </div>
                )}

                <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ position: 'sticky', left: 0, background: 'var(--bg)', zIndex: 2, minWidth: '80px' }}>Roll No</th>
                                <th style={{ position: 'sticky', left: '80px', background: 'var(--bg)', zIndex: 2, minWidth: '150px' }}>Name</th>
                                {records.map(record => (
                                    <th key={record._id} style={{ minWidth: '120px', textAlign: 'center' }}>
                                        <div>{formatDate(record.date)}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            {getTimeSlotLabel(record.timeSlotId?._id || record.timeSlotId)}
                                        </div>
                                        <button
                                            className="btn-icon"
                                            onClick={() => handleEditClick(record)}
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
                            {students.map((student, idx) => (
                                <tr key={student._id}>
                                    <td style={{ position: 'sticky', left: 0, background: 'var(--bg)', zIndex: 1 }}>
                                        {idx + 1}
                                    </td>
                                    <td style={{ position: 'sticky', left: '80px', background: 'var(--bg)', zIndex: 1 }}>
                                        {student.fullName || `${student.firstName} ${student.lastName}`}
                                    </td>
                                    {records.map(record => {
                                        const status = getStudentStatus(record, student._id);
                                        return (
                                            <td key={record._id} style={{
                                                textAlign: 'center',
                                                background: status === 'present'
                                                    ? 'rgba(16, 185, 129, 0.15)'
                                                    : 'rgba(239, 68, 68, 0.15)'
                                            }}>
                                                <span style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    background: status === 'present' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                    color: status === 'present' ? '#059669' : '#dc2626'
                                                }}>
                                                    {status === 'present' ? 'P' : 'A'}
                                                </span>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {records.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No attendance records found for {decodedSubject}{batchInfo ? ` (${batchInfo.name})` : ''}
                    </div>
                )}
            </div>

            {/* ===== EDIT ATTENDANCE MODAL ===== */}
            {editingRecord && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '24px'
                }} onClick={handleCancelEdit}>
                    <div style={{
                        background: 'var(--bg, #fff)', borderRadius: '16px',
                        width: '100%', maxWidth: '750px',
                        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                        animation: 'fadeIn 0.2s ease'
                    }} onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '20px 24px', borderBottom: '1px solid var(--gray-200)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <FiEdit2 size={18} /> Edit Attendance
                                </h2>
                                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    {formatDate(editingRecord.date)} • {getTimeSlotLabel(editingRecord.timeSlotId?._id || editingRecord.timeSlotId)}
                                </p>
                            </div>
                            <button onClick={handleCancelEdit} style={{
                                background: 'none', border: 'none', fontSize: '24px',
                                cursor: 'pointer', color: 'var(--gray-500)', padding: '4px 8px',
                                borderRadius: '8px', lineHeight: 1
                            }}>✕</button>
                        </div>

                        {/* Modal Body - Student List */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
                            <table className="data-table" style={{ margin: 0 }}>
                                <thead>
                                    <tr>
                                        <th style={{ position: 'sticky', top: 0, background: 'var(--bg, #fff)', zIndex: 1, padding: '12px 16px' }}>Roll No</th>
                                        <th style={{ position: 'sticky', top: 0, background: 'var(--bg, #fff)', zIndex: 1, padding: '12px 16px' }}>Student Name</th>
                                        <th style={{ position: 'sticky', top: 0, background: 'var(--bg, #fff)', zIndex: 1, padding: '12px 16px', textAlign: 'center' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((student, idx) => {
                                        const record = editedRecords.find(r => r.studentId === student._id);
                                        const status = record?.status || 'absent';
                                        return (
                                            <tr key={student._id} style={{
                                                background: status === 'present' ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)'
                                            }}>
                                                <td style={{ padding: '10px 16px', fontWeight: '500' }}>{idx + 1}</td>
                                                <td style={{ padding: '10px 16px' }}>{student.fullName || `${student.firstName} ${student.lastName}`}</td>
                                                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => handleStatusToggle(student._id)}
                                                        style={{
                                                            padding: '8px 20px',
                                                            borderRadius: '20px',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            fontWeight: '600',
                                                            fontSize: '13px',
                                                            background: status === 'present' ? 'var(--success)' : 'var(--danger)',
                                                            color: 'white',
                                                            minWidth: '110px',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '4px',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                    >
                                                        {status === 'present' ? <><FiCheckCircle size={14} /> Present</> : <><FiXCircle size={14} /> Absent</>}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '16px 24px', borderTop: '1px solid var(--gray-200)',
                            display: 'flex', gap: '12px', justifyContent: 'flex-end',
                            background: 'var(--bg, #fff)', borderRadius: '0 0 16px 16px'
                        }}>
                            <button className="btn btn-outline" onClick={handleCancelEdit}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CCAttendanceSheet;
