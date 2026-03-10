import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { FiTrash2, FiEye, FiEyeOff, FiUpload, FiPlus, FiCalendar, FiClock, FiDownload, FiAlertTriangle } from 'react-icons/fi';
import { FaFlask, FaBook, FaCoffee } from 'react-icons/fa';

const HodTimetable = () => {
    const [timetables, setTimetables] = useState([]);
    const [otherTimetables, setOtherTimetables] = useState([]);
    const [classes, setClasses] = useState([]);
    const [lectures, setLectures] = useState([]);
    const [timeSlots, setTimeSlots] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState(() => {
        return localStorage.getItem('hod_timetable_selectedClass') || '';
    });
    const [selectedSemester, setSelectedSemester] = useState(() => {
        return localStorage.getItem('hod_timetable_selectedSemester') || '';
    });
    const [lockedSlot, setLockedSlot] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [showOtherDepts, setShowOtherDepts] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        lectureId: '',
        classId: '',
        subject: '',
        teacherId: '',
        day: 'Monday',
        timeSlotId: '',
        timeSlotIds: [],
        roomId: '',
        type: 'lecture',
        batchId: ''
    });

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedClass) {
            fetchBatches();
            // Auto-select first semester for the class, unless restored from localStorage
            const cls = classes.find(c => c._id === selectedClass);
            if (cls) {
                const savedSem = localStorage.getItem('hod_timetable_selectedSemester');
                const yr = cls.year || 1;
                const sem1 = (yr - 1) * 2 + 1;
                const sem2 = sem1 + 1;
                // Use saved semester if it's valid for this class
                if (savedSem && (parseInt(savedSem) === sem1 || parseInt(savedSem) === sem2)) {
                    setSelectedSemester(savedSem);
                } else {
                    setSelectedSemester(String(sem1));
                }
            }
        }
    }, [selectedClass, classes]);

    const fetchData = async () => {
        try {
            const [classesRes, lecturesRes, slotsRes, roomsRes] = await Promise.all([
                api.get('/hod/classes'),
                api.get('/hod/lectures'),
                api.get('/timeslots'),
                api.get('/rooms')
            ]);
            setClasses(classesRes.data);
            setLectures(lecturesRes.data);
            setTimeSlots(slotsRes.data);
            setRooms(roomsRes.data);

            // Restore from localStorage or default to first class
            const savedClass = localStorage.getItem('hod_timetable_selectedClass');
            if (savedClass && classesRes.data.some(c => c._id === savedClass)) {
                setSelectedClass(savedClass);
            } else if (classesRes.data.length > 0) {
                setSelectedClass(classesRes.data[0]._id);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedClass && selectedSemester) {
            fetchTimetables();
        }
    }, [selectedClass, selectedSemester]);

    const fetchTimetables = async () => {
        try {
            let url = `/hod/timetables?classId=${selectedClass}`;
            if (selectedSemester) url += `&semester=${selectedSemester}`;
            const response = await api.get(url);
            setTimetables(response.data);
        } catch (error) {
            console.error('Failed to fetch timetables:', error);
        }
    };

    const fetchBatches = async () => {
        try {
            const response = await api.get(`/hod/timetables/class-batches/${selectedClass}`);
            setBatches(response.data.batches || []);
        } catch (error) {
            console.error('Failed to fetch batches:', error);
            setBatches([]);
        }
    };

    const fetchOtherDeptTimetables = async () => {
        try {
            const response = await api.get('/hod/timetables/other-departments');
            setOtherTimetables(response.data);
        } catch (error) {
            console.error('Failed to fetch other timetables:', error);
        }
    };

    // Filter lectures for the currently selected class
    const getClassLectures = () => {
        return lectures.filter(l => l.classId?._id === selectedClass);
    };

    const handleLectureChange = (lectureId) => {
        if (lectureId === '__blank__') {
            setFormData({
                ...formData,
                lectureId: '__blank__',
                classId: selectedClass,
                subject: 'No Lecture',
                teacherId: '',
                type: 'blank',
                timeSlotIds: [],
                timeSlotId: formData.timeSlotId
            });
            return;
        }
        if (lectureId) {
            const lecture = lectures.find(l => l._id === lectureId);
            if (lecture) {
                setFormData({
                    ...formData,
                    lectureId: lectureId,
                    classId: lecture.classId?._id || selectedClass,
                    subject: lecture.subjectId?.name || '',
                    teacherId: lecture.teacherId?._id || '',
                    type: lecture.type || 'lecture',
                    timeSlotIds: [],
                    timeSlotId: formData.timeSlotId
                });
                return;
            }
        }
        // Reset if no lecture selected
        setFormData({
            ...formData,
            lectureId: '',
            subject: '',
            teacherId: '',
            type: 'lecture',
            timeSlotIds: [],
            timeSlotId: formData.timeSlotId
        });
    };

    const handleTimeSlotSelection = (slotId) => {
        const slot = timeSlots.find(s => s._id === slotId);
        const slotType = slot?.type || 'lecture';
        // If slot type changed, reset lecture selection
        const typeChanged = slotType !== formData.type;
        setFormData({
            ...formData,
            timeSlotId: slotId,
            timeSlotIds: [],
            type: slotType,
            ...(typeChanged ? { lectureId: '', subject: '', teacherId: '' } : {})
        });
    };

    const handleSemesterChange = (sem) => {
        setSelectedSemester(sem);
        localStorage.setItem('hod_timetable_selectedSemester', sem);
    };

    // Filter lectures based on selected time slot type AND semester
    const getFilteredClassLectures = () => {
        let classLectures = lectures.filter(l => l.classId?._id === selectedClass);
        // Filter by semester
        if (selectedSemester) {
            classLectures = classLectures.filter(l => {
                const lecSem = l.subjectId?.semester;
                return lecSem !== undefined && lecSem === parseInt(selectedSemester);
            });
        }
        // Filter by time slot type
        if (formData.timeSlotId) {
            const slot = timeSlots.find(s => s._id === formData.timeSlotId);
            if (slot && slot.type !== 'break') {
                classLectures = classLectures.filter(l => l.type === slot.type);
            }
        }
        return classLectures;
    };

    // Compute semester options based on selected class year
    const getSemesterOptionsForClass = () => {
        const cls = classes.find(c => c._id === selectedClass);
        if (!cls) return [];
        const yr = cls.year || 1;
        const sem1 = (yr - 1) * 2 + 1;
        const sem2 = sem1 + 1;
        return [
            { value: sem1, label: `SEM-${sem1}` },
            { value: sem2, label: `SEM-${sem2}` }
        ];
    };

    const handleClassChange = (classId) => {
        setSelectedClass(classId);
        localStorage.setItem('hod_timetable_selectedClass', classId);
        // semester will be auto-set by the useEffect watching selectedClass
    };

    const openAddModal = (day = 'Monday', slotId = '', fromCell = false) => {
        setEditingEntry(null);
        // Determine type from the clicked slot
        let slotType = 'lecture';
        if (slotId) {
            const slot = timeSlots.find(s => s._id === slotId);
            if (slot) slotType = slot.type;
        }
        setLockedSlot(fromCell);
        setFormData({
            lectureId: '',
            classId: selectedClass,
            subject: '',
            teacherId: '',
            day: day,
            timeSlotId: slotId,
            timeSlotIds: [],
            roomId: '',
            type: slotType,
            batchId: ''
        });
        setShowModal(true);
    };

    const handleEdit = (entry) => {
        setEditingEntry(entry);
        setFormData({
            lectureId: entry.lectureId?._id || '',
            classId: entry.classId?._id || selectedClass,
            subject: entry.subject,
            teacherId: entry.teacherId?._id || '',
            day: entry.day,
            timeSlotId: entry.timeSlotId?._id || '',
            timeSlotIds: entry.timeSlotIds?.map(s => s._id) || [],
            roomId: entry.roomId?._id || '',
            type: entry.type,
            batchId: entry.batchId || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this timetable entry?')) return;
        try {
            await api.delete(`/hod/timetables/${id}`);
            fetchTimetables();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to delete');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Validate slot type matches lecture type
            if (formData.timeSlotId && formData.type !== 'blank') {
                const selectedSlot = timeSlots.find(s => s._id === formData.timeSlotId);
                if (selectedSlot) {
                    if (formData.type === 'lecture' && selectedSlot.type !== 'lecture') {
                        alert('Lecture type entries can only be scheduled in lecture time slots.');
                        return;
                    }
                    if (formData.type === 'practical' && selectedSlot.type !== 'practical') {
                        alert('Practical type entries can only be scheduled in practical time slots.');
                        return;
                    }
                }
            }

            const submitData = {
                classId: formData.classId,
                subject: formData.subject,
                teacherId: formData.teacherId || undefined,
                day: formData.day,
                timeSlotId: formData.timeSlotId,
                timeSlotIds: [],
                roomId: formData.roomId || undefined,
                type: formData.type,
                batchId: formData.batchId || null,
                lectureId: formData.lectureId === '__blank__' ? undefined : (formData.lectureId || undefined),
                semester: selectedSemester ? parseInt(selectedSemester) : null
            };

            if (editingEntry) {
                await api.put(`/hod/timetables/${editingEntry._id}`, submitData);
            } else {
                await api.post('/hod/timetables', submitData);
            }
            setShowModal(false);
            fetchTimetables();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to save');
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setUploadResult(null);

        const uploadFormData = new FormData();
        uploadFormData.append('file', file);

        try {
            const response = await api.post('/hod/timetables/bulk-upload', uploadFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadResult(response.data);
            fetchTimetables();
        } catch (error) {
            setUploadResult({ error: error.response?.data?.message || 'Upload failed' });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const downloadTemplate = () => {
        const template = 'className,subject,teacherUsername,day,timeSlotName,roomName,type\nCS-A,Mathematics,prof.smith,Monday,9:00-10:00,Room 101,lecture\n';
        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'timetable_upload_template.csv';
        a.click();
    };

    const toggleOtherDepts = () => {
        if (!showOtherDepts) {
            fetchOtherDeptTimetables();
        }
        setShowOtherDepts(!showOtherDepts);
    };

    // Get all entries for a specific day and slot (including batch entries)
    const getEntriesForSlot = (day, slotId) => {
        return timetables.filter(t => {
            const matchesDay = t.day === day;
            const matchesSlot = t.timeSlotId?._id === slotId ||
                t.timeSlotIds?.some(s => s._id === slotId);
            return matchesDay && matchesSlot;
        });
    };

    // Check if a slot is part of a merged practical
    const isSlotMerged = (day, slotId, slotIndex) => {
        const entries = timetables.filter(t => {
            if (t.day !== day || t.type !== 'practical') return false;
            if (!t.timeSlotIds || t.timeSlotIds.length <= 1) return false;
            return t.timeSlotIds.some(s => s._id === slotId);
        });

        if (entries.length === 0) return { merged: false };

        const entry = entries[0];
        const slotIds = entry.timeSlotIds.map(s => s._id);

        return {
            merged: true,
            isFirst: slotIds[0] === slotId,
            rowSpan: slotIds.length,
            entry
        };
    };

    // Get the batch name
    const getBatchName = (batchId) => {
        const batch = batches.find(b => b._id === batchId);
        return batch ? batch.name : 'Entire Class';
    };

    // Check if more batches can be added to a slot
    const canAddMoreBatches = (entries) => {
        if (entries.length === 0) return false;
        // If any entry is for the entire class (no batchId), no more can be added
        if (entries.some(e => !e.batchId)) return false;
        // Check if there are batches not yet assigned in this slot
        const assignedBatchIds = entries.map(e => e.batchId?.toString?.() || e.batchId);
        const availableBatches = batches.filter(b => !assignedBatchIds.includes(b._id?.toString?.() || b._id));
        return availableBatches.length > 0;
    };

    // All slots sorted by order (including breaks)
    const allSlots = [...timeSlots].sort((a, b) => a.order - b.order);

    // Filter non-break time slots for dropdown
    const lectureSlots = timeSlots.filter(s => s.type !== 'break').sort((a, b) => a.order - b.order);

    // Show all non-break time slots in the dropdown (no type filtering)
    const getAvailableTimeSlotsForModal = () => {
        return lectureSlots;
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="card">
                <div className="toolbar">
                    <div className="filter-group">
                        <label style={{ fontWeight: '500', marginRight: '8px' }}>Select Class:</label>
                        <select
                            value={selectedClass}
                            onChange={(e) => handleClassChange(e.target.value)}
                            style={{ minWidth: '200px' }}
                        >
                            {classes.map((cls) => (
                                <option key={cls._id} value={cls._id}>
                                    {cls.name} (Year {cls.year})
                                </option>
                            ))}
                        </select>
                        <label style={{ fontWeight: '500', marginLeft: '16px', marginRight: '8px' }}>Semester:</label>
                        <select
                            value={selectedSemester}
                            onChange={(e) => handleSemesterChange(e.target.value)}
                            style={{ minWidth: '120px' }}
                        >
                            {/* <option value="">All Semesters</option> */}
                            {getSemesterOptionsForClass().map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="header-actions">
                        <button className="btn btn-secondary" onClick={toggleOtherDepts}>
                            {showOtherDepts ? <><FiEyeOff style={{ marginRight: '4px' }} /> Hide Other Depts</> : <><FiEye style={{ marginRight: '4px' }} /> View Other Depts</>}
                        </button>
                        <button className="btn btn-secondary" onClick={() => setShowUploadModal(true)}>
                            <FiUpload style={{ marginRight: '4px' }} /> Bulk Upload
                        </button>
                        <button className="btn btn-primary" onClick={() => openAddModal('Monday', '', false)}>
                            <FiPlus style={{ marginRight: '4px' }} /> Add Entry
                        </button>
                    </div>
                </div>

                {classes.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon"><FiCalendar size={48} /></div>
                        <h3>No classes available</h3>
                        <p>Create classes first to manage timetables</p>
                    </div>
                ) : timeSlots.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon"><FiClock size={48} /></div>
                        <h3>No time slots configured</h3>
                        <p>Configure time slots first to create timetables</p>
                    </div>
                ) : (
                    <div className="table-container" style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ minWidth: '900px' }}>
                            <thead>
                                <tr>
                                    <th style={{ minWidth: '100px' }}>Time</th>
                                    {days.map(day => (
                                        <th key={day} style={{ minWidth: '120px' }}>{day}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {allSlots.map((slot, slotIndex) => {
                                    // Break row
                                    if (slot.type === 'break') {
                                        return (
                                            <tr key={slot._id} style={{
                                                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.03))',
                                                height: '32px'
                                            }}>
                                                <td style={{
                                                    fontWeight: '600',
                                                    fontSize: '12px',
                                                    color: '#b45309',
                                                    textAlign: 'center',
                                                    padding: '4px 8px',
                                                    borderRight: '2px solid rgba(245, 158, 11, 0.2)'
                                                }}>
                                                    {slot.startTime} - {slot.endTime}
                                                </td>
                                                <td colSpan={days.length} style={{
                                                    textAlign: 'center',
                                                    fontWeight: '600',
                                                    fontSize: '12px',
                                                    color: '#b45309',
                                                    letterSpacing: '2px',
                                                    textTransform: 'uppercase',
                                                    padding: '4px'
                                                }}>
                                                    <FaCoffee style={{ marginRight: '4px' }} /> Break
                                                </td>
                                            </tr>
                                        );
                                    }

                                    // Normal lecture/practical row
                                    return (
                                        <tr key={slot._id}>
                                            <td style={{ fontWeight: '500', fontSize: '13px', textAlign: 'center' }}>
                                                {slot.startTime}<br />
                                                <span style={{ color: 'var(--gray-500)' }}>{slot.endTime}</span>
                                                <div style={{
                                                    marginTop: '4px',
                                                    fontSize: '10px',
                                                    fontWeight: '600',
                                                    color: slot.type === 'practical' ? 'var(--info)' : 'var(--primary)',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}>
                                                    {slot.type === 'practical' ? <><FaFlask style={{ marginRight: '3px' }} /> Practical</> : <><FaBook style={{ marginRight: '3px' }} /> Lecture</>}
                                                </div>
                                            </td>
                                            {days.map(day => {
                                                const entries = getEntriesForSlot(day, slot._id);
                                                const mergeInfo = isSlotMerged(day, slot._id, slotIndex);

                                                // Skip cells that are part of a merged practical (not the first)
                                                if (mergeInfo.merged && !mergeInfo.isFirst) {
                                                    return null;
                                                }

                                                return (
                                                    <td
                                                        key={day}
                                                        style={{ padding: '8px', verticalAlign: 'top' }}
                                                        rowSpan={mergeInfo.merged ? mergeInfo.rowSpan : 1}
                                                    >
                                                        {entries.length > 0 ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                {entries.map(entry => (
                                                                    <div
                                                                        key={entry._id}
                                                                        style={{
                                                                            background: entry.type === 'practical'
                                                                                ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(14, 165, 233, 0.05))'
                                                                                : 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05))',
                                                                            padding: '8px',
                                                                            borderRadius: '8px',
                                                                            fontSize: '12px',
                                                                            cursor: 'pointer',
                                                                            border: entry.type === 'practical'
                                                                                ? '1px solid rgba(14, 165, 233, 0.3)'
                                                                                : '1px solid rgba(99, 102, 241, 0.3)',
                                                                            minHeight: mergeInfo.merged ? `${mergeInfo.rowSpan * 60}px` : 'auto'
                                                                        }}
                                                                        onClick={() => handleEdit(entry)}
                                                                    >
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                            <div>
                                                                                <strong>{entry.subject}</strong>
                                                                                {entry.batchId && (
                                                                                    <span style={{
                                                                                        fontSize: '10px',
                                                                                        background: 'var(--warning)',
                                                                                        color: '#fff',
                                                                                        padding: '1px 4px',
                                                                                        borderRadius: '4px',
                                                                                        marginLeft: '4px'
                                                                                    }}>
                                                                                        {getBatchName(entry.batchId)}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <button
                                                                                className="btn-icon"
                                                                                style={{ padding: '2px' }}
                                                                                onClick={(e) => { e.stopPropagation(); handleDelete(entry._id); }}
                                                                            ><FiTrash2 /></button>
                                                                        </div>
                                                                        <span style={{ color: 'var(--gray-600)' }}>{entry.teacherId?.fullName}</span><br />
                                                                        <span style={{ color: 'var(--gray-500)' }}>{entry.roomId?.roomNumber || entry.roomId?.name}</span>
                                                                        {entry.type === 'practical' && (
                                                                            <div style={{
                                                                                marginTop: '4px',
                                                                                fontSize: '10px',
                                                                                color: 'var(--info)',
                                                                                fontWeight: '500'
                                                                            }}>
                                                                                <FaFlask style={{ marginRight: '2px' }} /> Practical
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                                {canAddMoreBatches(entries) && (
                                                                    <button
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '6px',
                                                                            background: 'rgba(34, 197, 94, 0.1)',
                                                                            border: '1px dashed rgba(34, 197, 94, 0.5)',
                                                                            borderRadius: '6px',
                                                                            cursor: 'pointer',
                                                                            color: 'var(--success, #22c55e)',
                                                                            fontSize: '11px',
                                                                            fontWeight: '500',
                                                                            marginTop: '2px'
                                                                        }}
                                                                        onClick={() => openAddModal(day, slot._id, true)}
                                                                    >
                                                                        + Add Batch
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <button
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '12px',
                                                                    background: 'var(--gray-50)',
                                                                    border: '2px dashed var(--gray-300)',
                                                                    borderRadius: '8px',
                                                                    cursor: 'pointer',
                                                                    color: 'var(--gray-400)'
                                                                }}
                                                                onClick={() => openAddModal(day, slot._id, true)}
                                                            >
                                                                + Add
                                                            </button>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Other Departments Section */}
                {showOtherDepts && (
                    <div style={{ marginTop: '24px' }}>
                        <h3 style={{ marginBottom: '16px', color: 'var(--gray-700)' }}>Other Departments (Read-Only)</h3>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Department</th>
                                        <th>Class</th>
                                        <th>Day</th>
                                        <th>Time</th>
                                        <th>Subject</th>
                                        <th>Teacher</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {otherTimetables.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', color: 'var(--gray-500)' }}>
                                                No data from other departments
                                            </td>
                                        </tr>
                                    ) : (
                                        otherTimetables.map(entry => (
                                            <tr key={entry._id}>
                                                <td>{entry.classId?.departmentId?.name || '-'}</td>
                                                <td>{entry.classId?.name}</td>
                                                <td>{entry.day}</td>
                                                <td>{entry.timeSlotId?.name}</td>
                                                <td>{entry.subject}</td>
                                                <td>{entry.teacherId?.fullName}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingEntry ? 'Edit Timetable Entry' : 'Add Timetable Entry'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            {editingEntry ? 'Update' : 'Create'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    {/* Day & Time Slot — select first to filter lectures */}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Day *</label>
                            <select
                                value={formData.day}
                                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                                disabled={lockedSlot}
                            >
                                {days.map(day => (
                                    <option key={day} value={day}>{day}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Time Slot *</label>
                            <select
                                value={formData.timeSlotId}
                                onChange={(e) => handleTimeSlotSelection(e.target.value)}
                                required
                                disabled={lockedSlot}
                            >
                                <option value="">Select Slot</option>
                                {getAvailableTimeSlotsForModal().map(slot => (
                                    <option key={slot._id} value={slot._id}>
                                        {slot.label || slot.name} ({slot.startTime} - {slot.endTime}) [{slot.type}]
                                    </option>
                                ))}
                            </select>
                            {formData.timeSlotId && (
                                <small style={{ color: 'var(--gray-500)', marginTop: '4px', display: 'block' }}>
                                    Showing only <strong>{formData.type}</strong> type lectures below.
                                </small>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Select Lecture *</label>
                        <select
                            value={formData.lectureId}
                            onChange={(e) => handleLectureChange(e.target.value)}
                        >
                            <option value="">Select a Lecture</option>
                            <option value="__blank__">— No Lecture (Blank Slot) —</option>
                            {getFilteredClassLectures().map(lecture => (
                                <option key={lecture._id} value={lecture._id}>
                                    {lecture.subjectId?.name} - {lecture.teacherId?.fullName} ({lecture.type})
                                </option>
                            ))}
                        </select>
                        <small style={{ color: 'var(--gray-500)', marginTop: '4px', display: 'block' }}>
                            {formData.timeSlotId
                                ? `Only ${formData.type} lectures are shown based on the selected time slot.`
                                : 'Select a time slot first to filter lectures by type.'}
                        </small>
                    </div>

                    {formData.lectureId && formData.lectureId !== '__blank__' && (
                        <div style={{
                            background: 'var(--gray-50)',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            fontSize: '14px'
                        }}>
                            <strong>Selected Lecture Details:</strong><br />
                            <span>Subject: {formData.subject}</span><br />
                            <span>Type: {formData.type === 'lecture' ? <><FaBook style={{ marginRight: '2px' }} /> Lecture</> : <><FaFlask style={{ marginRight: '2px' }} /> Practical</>}</span>
                        </div>
                    )}

                    {formData.lectureId === '__blank__' && (
                        <div style={{
                            background: 'rgba(245, 158, 11, 0.1)',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            fontSize: '14px',
                            color: '#b45309'
                        }}>
                            <FiAlertTriangle style={{ marginRight: '4px' }} /> This will create a blank slot — no lecture, no teacher assigned.
                        </div>
                    )}

                    {/* Batch Selection */}
                    {batches.length > 0 && formData.lectureId && formData.lectureId !== '__blank__' && (
                        <div className="form-group">
                            <label className="form-label">Assign To</label>
                            <select
                                value={formData.batchId}
                                onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                            >
                                <option value="">Entire Class</option>
                                {batches.map(batch => (
                                    <option key={batch._id} value={batch._id}>
                                        {batch.name} ({batch.studentIds?.length || 0} students)
                                    </option>
                                ))}
                            </select>
                            <small style={{ color: 'var(--gray-500)', marginTop: '4px', display: 'block' }}>
                                {formData.batchId
                                    ? 'You can schedule different subjects for other batches at the same time.'
                                    : 'This lecture will be for the entire class.'}
                            </small>
                        </div>
                    )}
                    <div className="form-group">
                        <label className="form-label">Room *</label>
                        <select
                            value={formData.roomId}
                            onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                            required
                        >
                            <option value="">Select Room</option>
                            {rooms.map(r => (
                                <option key={r._id} value={r._id}>
                                    {r.roomNumber || r.name} ({r.roomType || r.type})
                                </option>
                            ))}
                        </select>
                    </div>
                </form>
            </Modal>

            {/* Bulk Upload Modal */}
            <Modal
                isOpen={showUploadModal}
                onClose={() => { setShowUploadModal(false); setUploadResult(null); }}
                title="Bulk Timetable Upload"
            >
                <div className="upload-section">
                    <p style={{ marginBottom: '16px', color: 'var(--gray-600)' }}>
                        Upload CSV with columns: className, subject, teacherUsername, day, timeSlotName, roomName, type
                    </p>
                    <button className="btn btn-secondary" onClick={downloadTemplate} style={{ marginBottom: '16px' }}>
                        <FiDownload style={{ marginRight: '4px' }} /> Download Template
                    </button>
                    <div className="file-upload-area">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            {uploading ? 'Uploading...' : <><FiUpload style={{ marginRight: '4px' }} /> Select File & Upload</>}
                        </button>
                    </div>
                    {uploadResult && (
                        <div className="upload-result" style={{ marginTop: '20px' }}>
                            {uploadResult.error ? (
                                <div className="error-message">{uploadResult.error}</div>
                            ) : (
                                <div className="result-summary">
                                    <div className="result-item success">
                                        <span className="result-count">{uploadResult.successCount}</span>
                                        <span>Success</span>
                                    </div>
                                    <div className="result-item danger">
                                        <span className="result-count">{uploadResult.failedCount}</span>
                                        <span>Failed</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Modal>
        </div >
    );
};

export default HodTimetable;
