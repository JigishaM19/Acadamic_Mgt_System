import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiEdit2, FiTrash2, FiPlus, FiRefreshCw, FiClock } from 'react-icons/fi';
import { FaBook, FaFlask, FaCoffee } from 'react-icons/fa';
import Modal from '../components/Modal';

const TimeSlots = () => {
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSlot, setEditingSlot] = useState(null);
    const [formData, setFormData] = useState({
        label: '',
        startTime: '',
        endTime: '',
        type: 'lecture',
        order: 0
    });

    useEffect(() => {
        fetchSlots();
    }, []);

    const fetchSlots = async () => {
        try {
            const response = await api.get('/timeslots');
            setSlots(response.data);
        } catch (error) {
            console.error('Failed to fetch time slots:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingSlot) {
                await api.put(`/timeslots/${editingSlot._id}`, formData);
            } else {
                await api.post('/timeslots', { ...formData, order: slots.length + 1 });
            }
            fetchSlots();
            closeModal();
        } catch (error) {
            alert(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleEdit = (slot) => {
        setEditingSlot(slot);
        setFormData({
            label: slot.label,
            startTime: slot.startTime,
            endTime: slot.endTime,
            type: slot.type,
            order: slot.order
        });
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this time slot?')) return;
        try {
            await api.delete(`/timeslots/${id}`);
            fetchSlots();
        } catch (error) {
            alert(error.response?.data?.message || 'Delete failed');
        }
    };

    const handleCreateDefaults = async () => {
        if (!confirm('This will replace all existing time slots with defaults. Continue?')) return;
        try {
            await api.post('/timeslots/bulk');
            fetchSlots();
        } catch (error) {
            alert('Failed to create default slots');
        }
    };

    const openAddModal = () => {
        setEditingSlot(null);
        setFormData({ label: '', startTime: '', endTime: '', type: 'lecture', order: 0 });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingSlot(null);
    };

    const getTypeBadge = (type) => {
        switch (type) {
            case 'lecture': return 'badge-primary';
            case 'practical': return 'badge-success';
            case 'break': return 'badge-warning';
            default: return 'badge-primary';
        }
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Time Slots</h2>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn btn-secondary" onClick={handleCreateDefaults}>
                            <FiRefreshCw style={{ marginRight: '4px' }} /> Load Defaults
                        </button>
                        <button className="btn btn-primary" onClick={openAddModal}>
                            <FiPlus style={{ marginRight: '4px' }} /> Add Slot
                        </button>
                    </div>
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Label</th>
                                <th>Start Time</th>
                                <th>End Time</th>
                                <th>Type</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {slots.map((slot, index) => (
                                <tr key={slot._id} style={slot.type === 'break' ? { background: 'var(--gray-50)' } : {}}>
                                    <td>{index + 1}</td>
                                    <td><strong>{slot.label}</strong></td>
                                    <td>{slot.startTime}</td>
                                    <td>{slot.endTime}</td>
                                    <td>
                                        <span className={`badge ${getTypeBadge(slot.type)}`}>
                                            {slot.type === 'lecture' ? <><FaBook style={{ marginRight: '4px' }} /> Lecture</> : slot.type === 'practical' ? <><FaFlask style={{ marginRight: '4px' }} /> Practical</> : <><FaCoffee style={{ marginRight: '4px' }} /> Break</>}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="btn-icon" onClick={() => handleEdit(slot)} title="Edit"><FiEdit2 /></button>
                                            <button className="btn-icon" onClick={() => handleDelete(slot._id)} title="Delete"><FiTrash2 /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {slots.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-icon"><FiClock size={48} /></div>
                            <h3>No time slots configured</h3>
                            <p>Click "Load Defaults" to add standard time slots or add custom ones</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={modalOpen}
                onClose={closeModal}
                title={editingSlot ? 'Edit Time Slot' : 'Add Time Slot'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            {editingSlot ? 'Update' : 'Create'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Label *</label>
                        <input
                            type="text"
                            value={formData.label}
                            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                            placeholder="e.g., Lecture 1, Lunch Break"
                            required
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Start Time *</label>
                            <input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">End Time *</label>
                            <input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Type *</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        >
                            <option value="lecture">Lecture</option>
                            <option value="practical">Practical</option>
                            <option value="break">Break</option>
                        </select>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default TimeSlots;
