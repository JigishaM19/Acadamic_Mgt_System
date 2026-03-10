import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { FiEdit2, FiCheckCircle, FiXCircle } from 'react-icons/fi';

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
        <div>
            <div className="card">
                <div className="card-header">
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

                {editingRecord && (
                    <div className="form-section" style={{ margin: '0 16px 20px', padding: '16px', background: 'var(--primary-light)', borderRadius: '8px' }}>
                        <h3 style={{ marginBottom: '12px' }}>
                            Editing: {formatDate(editingRecord.date)} • {getTimeSlotLabel(editingRecord.timeSlotId?._id || editingRecord.timeSlotId)}
                        </h3>
                        <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Roll No</th>
                                        <th>Student Name</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((student, idx) => {
                                        const record = editedRecords.find(r => r.studentId === student._id);
                                        const status = record?.status || 'absent';
                                        return (
                                            <tr key={student._id}>
                                                <td>{idx + 1}</td>
                                                <td>{student.fullName || `${student.firstName} ${student.lastName}`}</td>
                                                <td>
                                                    <button
                                                        className={`attendance-toggle ${status}`}
                                                        onClick={() => handleStatusToggle(student._id)}
                                                        style={{
                                                            padding: '6px 16px',
                                                            borderRadius: '20px',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            fontWeight: '500',
                                                            background: status === 'present' ? 'var(--success)' : 'var(--danger)',
                                                            color: 'white'
                                                        }}
                                                    >
                                                        {status === 'present' ? <><FiCheckCircle style={{ marginRight: '2px' }} /> Present</> : <><FiXCircle style={{ marginRight: '2px' }} /> Absent</>}
                                                    </button>
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
                                            <td key={record._id} style={{ textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '12px',
                                                    fontWeight: '500',
                                                    background: status === 'present' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                    color: status === 'present' ? 'var(--success)' : 'var(--danger)'
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
        </div>
    );
};

export default CCAttendanceSheet;
