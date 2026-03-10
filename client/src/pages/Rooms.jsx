import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import { FaFlask, FaSchool, FaDoorOpen } from 'react-icons/fa';
import Modal from '../components/Modal';

const Rooms = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [filter, setFilter] = useState('');
    const [formData, setFormData] = useState({
        roomNumber: '',
        roomType: 'classroom',
        capacity: ''
    });

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            const response = await api.get('/rooms');
            setRooms(response.data);
        } catch (error) {
            console.error('Failed to fetch rooms:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredRooms = rooms.filter(room =>
        !filter || room.roomType === filter
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = {
                ...formData,
                capacity: formData.capacity ? parseInt(formData.capacity) : 0
            };
            if (editingRoom) {
                await api.put(`/rooms/${editingRoom._id}`, data);
            } else {
                await api.post('/rooms', data);
            }
            fetchRooms();
            closeModal();
        } catch (error) {
            alert(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleEdit = (room) => {
        setEditingRoom(room);
        setFormData({
            roomNumber: room.roomNumber,
            roomType: room.roomType,
            capacity: room.capacity?.toString() || ''
        });
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this room?')) return;
        try {
            await api.delete(`/rooms/${id}`);
            fetchRooms();
        } catch (error) {
            alert(error.response?.data?.message || 'Delete failed');
        }
    };

    const openAddModal = () => {
        setEditingRoom(null);
        setFormData({ roomNumber: '', roomType: 'classroom', capacity: '' });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingRoom(null);
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="card">
                <div className="toolbar">
                    <div className="filter-group">
                        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                            <option value="">All Rooms</option>
                            <option value="classroom">Classrooms</option>
                            <option value="lab">Labs</option>
                        </select>
                    </div>
                    <button className="btn btn-primary" onClick={openAddModal}>
                        <FiPlus style={{ marginRight: '4px' }} /> Add Room
                    </button>
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Room Number</th>
                                <th>Type</th>
                                <th>Capacity</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRooms.map((room) => (
                                <tr key={room._id}>
                                    <td><strong>{room.roomNumber}</strong></td>
                                    <td>
                                        <span className={`badge ${room.roomType === 'lab' ? 'badge-warning' : 'badge-primary'}`}>
                                            {room.roomType === 'lab' ? <><FaFlask style={{ marginRight: '4px' }} /> Lab</> : <><FaSchool style={{ marginRight: '4px' }} /> Classroom</>}
                                        </span>
                                    </td>
                                    <td>{room.capacity || '-'}</td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="btn-icon" onClick={() => handleEdit(room)} title="Edit"><FiEdit2 /></button>
                                            <button className="btn-icon" onClick={() => handleDelete(room._id)} title="Delete"><FiTrash2 /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredRooms.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-icon"><FaDoorOpen size={48} /></div>
                            <h3>No rooms yet</h3>
                            <p>Add classrooms and labs to get started</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={modalOpen}
                onClose={closeModal}
                title={editingRoom ? 'Edit Room' : 'Add Room'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            {editingRoom ? 'Update' : 'Create'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Room Number *</label>
                        <input
                            type="text"
                            value={formData.roomNumber}
                            onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                            placeholder="e.g., 101, Lab-A"
                            required
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Room Type *</label>
                            <select
                                value={formData.roomType}
                                onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                            >
                                <option value="classroom">Classroom</option>
                                <option value="lab">Lab</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Capacity</label>
                            <input
                                type="number"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                placeholder="e.g., 60"
                            />
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Rooms;
