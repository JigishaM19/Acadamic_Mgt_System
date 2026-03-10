import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiCalendar, FiClock, FiMapPin, FiBook, FiCoffee } from 'react-icons/fi';

const CCTimetable = () => {
    const [timetable, setTimetable] = useState([]);
    const [timeSlots, setTimeSlots] = useState([]);
    const [loading, setLoading] = useState(true);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    useEffect(() => {
        fetchTimetable();
    }, []);

    const fetchTimetable = async () => {
        try {
            const [timetableResponse, timeSlotsResponse] = await Promise.all([
                api.get('/cc/timetable'),
                api.get('/timeslots')
            ]);
            setTimetable(timetableResponse.data.timetable || []);
            setTimeSlots(timeSlotsResponse.data || []);
        } catch (error) {
            console.error('Failed to fetch timetable:', error);
        } finally {
            setLoading(false);
        }
    };

    const getEntriesForSlot = (day, slotId) => {
        return timetable.filter(t => t.day === day && (t.timeSlotId?._id === slotId || t.timeSlotId === slotId));
    };

    // Resolve batch name from the timetable entry's classId.batches subdocument
    const getBatchName = (entry) => {
        if (!entry.batchId) return null;
        // classId is populated and contains batches array
        if (entry.classId?.batches) {
            const batch = entry.classId.batches.find(b =>
                b._id === entry.batchId || b._id?.toString() === entry.batchId?.toString()
            );
            return batch ? batch.name : null;
        }
        return null;
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
                    <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FiCalendar size={20} /> Class Timetable</h2>
                    <p style={{ margin: 0, color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                        Weekly class schedule with all lectures and practicals
                    </p>
                </div>
            </div>

            <div className="card" style={{ marginTop: '24px', overflow: 'hidden' }}>
                {timeSlots.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--gray-500)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}><FiClock size={48} /></div>
                        <h3>No Time Slots Configured</h3>
                        <p>Time slots need to be configured by admin first.</p>
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
                                {timeSlots.map((slot) => {
                                    // Check if this is a break slot
                                    if (slot.type === 'break') {
                                        return (
                                            <tr key={slot._id} style={{
                                                background: 'var(--gray-100)',
                                                borderTop: '2px solid var(--gray-300)',
                                                borderBottom: '2px solid var(--gray-300)'
                                            }}>
                                                <td style={{
                                                    fontWeight: '500',
                                                    fontSize: '13px',
                                                    background: 'var(--gray-200)'
                                                }}>
                                                    {slot.startTime}<br />
                                                    <span style={{ color: 'var(--gray-500)' }}>{slot.endTime}</span>
                                                </td>
                                                <td colSpan={6} style={{
                                                    textAlign: 'center',
                                                    padding: '12px',
                                                    color: 'var(--gray-600)',
                                                    fontWeight: '500',
                                                    fontStyle: 'italic',
                                                    background: 'var(--gray-100)'
                                                }}>
                                                    <FiCoffee size={14} style={{ marginRight: '4px' }} /> {slot.label || 'Break'}
                                                </td>
                                            </tr>
                                        );
                                    }

                                    // Regular lecture/practical slot
                                    return (
                                        <tr key={slot._id}>
                                            <td style={{ fontWeight: '500', fontSize: '13px' }}>
                                                {slot.startTime}<br />
                                                <span style={{ color: 'var(--gray-500)' }}>{slot.endTime}</span>
                                            </td>
                                            {days.map(day => {
                                                const entries = getEntriesForSlot(day, slot._id);
                                                return (
                                                    <td key={day} style={{ padding: '8px', verticalAlign: 'top' }}>
                                                        {entries.length > 0 ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                {entries.map(entry => {
                                                                    const batchName = getBatchName(entry);
                                                                    return (
                                                                        <div
                                                                            key={entry._id}
                                                                            style={{
                                                                                background: entry.type === 'practical'
                                                                                    ? 'rgba(14, 165, 233, 0.1)'
                                                                                    : 'rgba(99, 102, 241, 0.1)',
                                                                                padding: '8px',
                                                                                borderRadius: '8px',
                                                                                fontSize: '12px',
                                                                                borderLeft: entry.type === 'practical'
                                                                                    ? '3px solid #0ea5e9'
                                                                                    : '3px solid #6366f1'
                                                                            }}
                                                                        >
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                                                                <strong>{entry.subject}</strong>
                                                                                {batchName && (
                                                                                    <span style={{
                                                                                        fontSize: '10px',
                                                                                        background: 'var(--warning, #f59e0b)',
                                                                                        color: '#fff',
                                                                                        padding: '1px 5px',
                                                                                        borderRadius: '4px',
                                                                                        fontWeight: '600'
                                                                                    }}>
                                                                                        {batchName}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <span style={{ color: 'var(--gray-600)' }}>
                                                                                {entry.teacherId?.fullName || entry.teacherId?.firstName || 'TBA'}
                                                                            </span><br />
                                                                            <span style={{ color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                <FiMapPin size={12} /> {entry.roomId?.roomNumber || 'Room'}
                                                                            </span>
                                                                            <span style={{
                                                                                display: 'inline-block',
                                                                                marginTop: '4px',
                                                                                padding: '2px 6px',
                                                                                background: entry.type === 'practical'
                                                                                    ? 'rgba(14, 165, 233, 0.2)'
                                                                                    : 'rgba(99, 102, 241, 0.2)',
                                                                                borderRadius: '4px',
                                                                                fontSize: '10px',
                                                                                textTransform: 'capitalize'
                                                                            }}>
                                                                                {entry.type}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div style={{
                                                                textAlign: 'center',
                                                                color: 'var(--gray-400)',
                                                                padding: '16px 0',
                                                                fontSize: '0.9rem'
                                                            }}>
                                                                —
                                                            </div>
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
            </div>

            {/* Legend */}
            <div className="card" style={{ marginTop: '24px' }}>
                <div style={{ padding: '16px 24px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            background: 'rgba(99, 102, 241, 0.2)',
                            borderLeft: '3px solid #6366f1'
                        }}></div>
                        <span style={{ fontSize: '0.9rem', color: 'var(--gray-600)' }}>Lecture</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            background: 'rgba(14, 165, 233, 0.2)',
                            borderLeft: '3px solid #0ea5e9'
                        }}></div>
                        <span style={{ fontSize: '0.9rem', color: 'var(--gray-600)' }}>Practical</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            background: 'var(--gray-200)'
                        }}></div>
                        <span style={{ fontSize: '0.9rem', color: 'var(--gray-600)' }}>Break</span>
                    </div>
                </div>
            </div>

            {/* Stats */}
            {timetable.length > 0 && (
                <div className="stats-grid" style={{ marginTop: '24px' }}>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}><FiBook size={24} /></div>
                        <div className="stat-info">
                            <h3>{timetable.filter(t => t.type === 'lecture').length}</h3>
                            <p>Lectures/Week</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' }}><FiBook size={24} /></div>
                        <div className="stat-info">
                            <h3>{timetable.filter(t => t.type === 'practical').length}</h3>
                            <p>Practicals/Week</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon classes"><FiCalendar size={24} /></div>
                        <div className="stat-info">
                            <h3>{timetable.length}</h3>
                            <p>Total Sessions</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CCTimetable;
