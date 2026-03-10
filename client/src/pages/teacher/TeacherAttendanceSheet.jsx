import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { FiEdit2, FiCheckCircle, FiXCircle } from 'react-icons/fi';

const TeacherAttendanceSheet = () => {
    const { classId, subject } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const batchId = searchParams.get('batchId');
    const decodedSubject = decodeURIComponent(subject);

    const [classInfo, setClassInfo] = useState(null);
    const [batchInfo, setBatchInfo] = useState(null);
    const [batches, setBatches] = useState([]);
    const [students, setStudents] = useState([]);
    const [records, setRecords] = useState([]);
    const [timeSlots, setTimeSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // New attendance form state
    const [showNewForm, setShowNewForm] = useState(false);
    const [newAttendance, setNewAttendance] = useState({
        date: new Date().toISOString().split('T')[0],
        timeSlotId: '',
        records: []
    });

    // Edit mode state
    const [editingRecord, setEditingRecord] = useState(null);
    const [editedRecords, setEditedRecords] = useState([]);

    useEffect(() => {
        fetchData();
    }, [classId, subject, batchId]);

    const fetchData = async () => {
        try {
            const batchParam = batchId ? `?batchId=${batchId}` : '';
            const [sheetResponse, timeSlotsResponse] = await Promise.all([
                api.get(`/teacher/attendance/${classId}/${encodeURIComponent(decodedSubject)}${batchParam}`),
                api.get('/teacher/timeslots')
            ]);

            setClassInfo(sheetResponse.data.classInfo);
            setBatchInfo(sheetResponse.data.batchInfo || null);
            setBatches(sheetResponse.data.batches || []);
            // Sort students by last name ascending
            const sortedStudents = (sheetResponse.data.students || []).slice().sort((a, b) => {
                const lastA = (a.lastName || '').toLowerCase();
                const lastB = (b.lastName || '').toLowerCase();
                return lastA.localeCompare(lastB);
            });
            setStudents(sortedStudents);
            setRecords(sheetResponse.data.attendanceRecords || []);
            setTimeSlots(timeSlotsResponse.data);

            // Initialize new attendance records with all students present
            const initialRecords = sheetResponse.data.students.map(s => ({
                studentId: s._id,
                status: 'present'
            }));
            setNewAttendance(prev => ({ ...prev, records: initialRecords }));

            // Set default time slot to first one
            if (timeSlotsResponse.data.length > 0) {
                setNewAttendance(prev => ({ ...prev, timeSlotId: timeSlotsResponse.data[0]._id }));
            }
        } catch (error) {
            console.error('Failed to fetch attendance sheet:', error);
            setMessage({ type: 'error', text: 'Failed to load attendance data' });
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

    // New Attendance Form Handlers
    const handleNewStatusToggle = (studentId) => {
        setNewAttendance(prev => ({
            ...prev,
            records: prev.records.map(r =>
                r.studentId === studentId
                    ? { ...r, status: r.status === 'present' ? 'absent' : 'present' }
                    : r
            )
        }));
    };

    const handleSaveNew = async () => {
        if (!newAttendance.timeSlotId) {
            setMessage({ type: 'error', text: 'Please select a time slot' });
            return;
        }

        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            await api.post('/teacher/attendance', {
                classId,
                subject: decodedSubject,
                date: newAttendance.date,
                timeSlotId: newAttendance.timeSlotId,
                records: newAttendance.records,
                batchId: batchId || null
            });

            setMessage({ type: 'success', text: 'Attendance saved successfully!' });
            setShowNewForm(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save attendance:', error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save attendance' });
        } finally {
            setSaving(false);
        }
    };

    // Edit Handlers
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
                return { ...r, status: r.status === 'present' ? 'absent' : 'present' };
            }
            return r;
        }));
    };

    const handleSaveEdit = async () => {
        if (!editingRecord) return;
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            await api.put(`/teacher/attendance/${editingRecord._id}`, {
                records: editedRecords
            });
            setMessage({ type: 'success', text: 'Attendance updated successfully!' });
            await fetchData();
            setEditingRecord(null);
            setEditedRecords([]);
        } catch (error) {
            console.error('Failed to save attendance:', error);
            setMessage({ type: 'error', text: 'Failed to save attendance' });
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingRecord(null);
        setEditedRecords([]);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this attendance record?')) return;

        try {
            await api.delete(`/teacher/attendance/${id}`);
            setMessage({ type: 'success', text: 'Attendance deleted successfully!' });
            fetchData();
        } catch (error) {
            console.error('Failed to delete attendance:', error);
            setMessage({ type: 'error', text: 'Failed to delete attendance' });
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
                                onClick={() => navigate('/teacher/attendance')}
                            >
                                ← Back
                            </button>

                            <div>
                                <h2 className="card-title" style={{ margin: 0 }}>
                                    {classInfo?.className} - {decodedSubject} - Attendance
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
                            Take New Attendance
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
                                navigate(`/teacher/attendance/${classId}/${encodeURIComponent(decodedSubject)}`);
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
                                    navigate(`/teacher/attendance/${classId}/${encodeURIComponent(decodedSubject)}?batchId=${batch._id}`);
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

                {/* Messages */}
                {message.text && (
                    <div className={`alert alert-${message.type}`} style={{ margin: '0 16px 16px' }}>
                        {message.text}
                    </div>
                )}

                {/* New Attendance Form */}
                {showNewForm && (
                    <div className="form-section" style={{ margin: '0 16px 20px', padding: '16px', background: 'var(--success-light)', borderRadius: '8px' }}>
                        <h3 style={{ marginBottom: '12px' }}>Take New Attendance</h3>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                            <div className="form-group" style={{ minWidth: '180px' }}>
                                <label className="form-label">Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={newAttendance.date}
                                    onChange={(e) => setNewAttendance(prev => ({ ...prev, date: e.target.value }))}
                                />
                            </div>
                            <div className="form-group" style={{ minWidth: '200px' }}>
                                <label className="form-label">Time Slot</label>
                                <select
                                    className="form-input"
                                    value={newAttendance.timeSlotId}
                                    onChange={(e) => setNewAttendance(prev => ({ ...prev, timeSlotId: e.target.value }))}
                                >
                                    <option value="">Select Time Slot</option>
                                    {timeSlots.map(slot => (
                                        <option key={slot._id} value={slot._id}>
                                            {slot.label || `${slot.startTime} - ${slot.endTime}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
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
                                        const record = newAttendance.records.find(r => r.studentId === student._id);
                                        const status = record?.status || 'present';
                                        return (
                                            <tr key={student._id}>
                                                <td>{idx + 1}</td>
                                                <td>{student.fullName || `${student.firstName} ${student.lastName}`}</td>
                                                <td>
                                                    <button
                                                        className={`attendance-toggle ${status}`}
                                                        onClick={() => handleNewStatusToggle(student._id)}
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
                            <button className="btn btn-primary" onClick={handleSaveNew} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Attendance'}
                            </button>
                            <button className="btn btn-outline" onClick={() => setShowNewForm(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Edit Attendance Form */}
                {editingRecord && (
                    <div className="form-section" style={{ margin: '0 16px 20px', padding: '16px', background: 'var(--primary-light)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 style={{ margin: 0 }}>
                                <FiEdit2 style={{ marginRight: '4px' }} /> Editing: {formatDate(editingRecord.date)} • {getTimeSlotLabel(editingRecord.timeSlotId)}
                            </h3>
                            <button
                                className="btn btn-danger"
                                onClick={() => {
                                    handleDelete(editingRecord._id);
                                    handleCancelEdit();
                                }}
                                style={{ fontSize: '12px', padding: '6px 12px' }}
                            >
                                Delete Record
                            </button>
                        </div>
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

                {/* Spreadsheet-style Attendance Table */}
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
                                            {getTimeSlotLabel(record.timeSlotId)}
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
                        No attendance records found for {decodedSubject}. Click "+ Take New Attendance" to get started.
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherAttendanceSheet;
