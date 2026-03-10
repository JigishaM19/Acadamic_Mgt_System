import { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { FaBook, FaFlask } from 'react-icons/fa';

const HodLectures = () => {
    const [lectures, setLectures] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingLecture, setEditingLecture] = useState(null);
    const [formData, setFormData] = useState({
        subjectId: '',
        teacherId: '',
        classId: '',
        type: 'lecture',
        year: '',
        semester: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [lecturesRes, subjectsRes, teachersRes, classesRes] = await Promise.all([
                api.get('/hod/lectures'),
                api.get('/subjects'),
                api.get('/hod/teachers'),
                api.get('/hod/classes')
            ]);
            setLectures(lecturesRes.data);
            setSubjects(subjectsRes.data);
            setTeachers(teachersRes.data);
            setClasses(classesRes.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get semester options for a given year
    const getSemesterOptions = (year) => {
        const yr = parseInt(year) || 0;
        if (!yr) return [];
        const sem1 = (yr - 1) * 2 + 1;
        const sem2 = sem1 + 1;
        return [
            { value: sem1, label: `SEM-${sem1}` },
            { value: sem2, label: `SEM-${sem2}` }
        ];
    };

    // Filter subjects by year AND semester
    const filteredSubjects = subjects.filter(s => {
        if (formData.year && s.year !== parseInt(formData.year)) return false;
        if (formData.semester && s.semester !== parseInt(formData.semester)) return false;
        return true;
    });
    const filteredClasses = classes.filter(c => !formData.year || c.year === parseInt(formData.year));

    // When subject changes, auto-set the lecture type based on subject type
    const handleSubjectChange = (subjectId) => {
        const subject = filteredSubjects.find(s => s._id === subjectId);
        let newType = formData.type;
        if (subject) {
            if (subject.type === 'theory') {
                newType = 'lecture';
            } else if (subject.type === 'practical') {
                newType = 'practical';
            }
            // if 'both', keep user's current choice
        }
        setFormData({ ...formData, subjectId, type: newType });
    };

    // Get the selected subject to determine type constraints
    const selectedSubject = filteredSubjects.find(s => s._id === formData.subjectId);

    const openAddModal = () => {
        setEditingLecture(null);
        setFormData({
            subjectId: '',
            teacherId: '',
            classId: '',
            type: 'lecture',
            year: '',
            semester: ''
        });
        setShowModal(true);
    };

    const openEditModal = (lecture) => {
        setEditingLecture(lecture);
        setFormData({
            subjectId: lecture.subjectId?._id || '',
            teacherId: lecture.teacherId?._id || '',
            classId: lecture.classId?._id || '',
            type: lecture.type,
            year: lecture.classId?.year || '',
            semester: ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            delete payload.year; // Don't send year to backend
            delete payload.semester; // Don't send semester to backend
            if (editingLecture) {
                await api.put(`/hod/lectures/${editingLecture._id}`, payload);
            } else {
                await api.post('/hod/lectures', payload);
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this lecture?')) return;
        try {
            await api.delete(`/hod/lectures/${id}`);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Delete failed');
        }
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Lecture Management</h2>
                    <button className="btn btn-primary" onClick={openAddModal}>
                        <FiPlus style={{ marginRight: '4px' }} /> Add Lecture
                    </button>
                </div>

                {lectures.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon"><FaBook size={48} /></div>
                        <h3>No lectures created yet</h3>
                        <p>Create lecture assignments by selecting subject, teacher, class, and type</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Teacher</th>
                                    <th>Class</th>
                                    <th>Year</th>
                                    <th>Semester</th>
                                    <th>Type</th>
                                    <th>Department</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lectures.map((lecture) => (
                                    <tr key={lecture._id}>
                                        <td>
                                            <div>
                                                <strong>{lecture.subjectId?.name}</strong>
                                                <br />
                                                <small style={{ color: 'var(--gray-500)' }}>
                                                    {lecture.subjectId?.code}
                                                </small>
                                            </div>
                                        </td>
                                        <td>{lecture.teacherId?.fullName}</td>
                                        <td>{lecture.classId?.name || '-'}</td>
                                        <td><span className="badge badge-info">Year {lecture.classId?.year || '-'}</span></td>
                                        <td><span className="badge badge-secondary">SEM-{lecture.subjectId?.semester || '-'}</span></td>
                                        <td>
                                            <span className={`badge ${lecture.type === 'lecture' ? 'badge-primary' : 'badge-info'}`}>
                                                {lecture.type === 'lecture' ? <><FaBook style={{ marginRight: '2px' }} /> Lecture</> : <><FaFlask style={{ marginRight: '2px' }} /> Practical</>}
                                            </span>
                                        </td>
                                        <td>{lecture.departmentId?.name || '-'}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="btn-icon"
                                                    onClick={() => openEditModal(lecture)}
                                                    title="Edit"
                                                >
                                                    <FiEdit2 />
                                                </button>
                                                <button
                                                    className="btn-icon danger"
                                                    onClick={() => handleDelete(lecture._id)}
                                                    title="Delete"
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingLecture ? 'Edit Lecture' : 'Add Lecture'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            {editingLecture ? 'Update' : 'Create'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Year *</label>
                            <select
                                value={formData.year}
                                onChange={(e) => {
                                    const yr = e.target.value;
                                    const defaultSem = yr ? ((parseInt(yr) - 1) * 2 + 1).toString() : '';
                                    setFormData({ ...formData, year: yr, semester: defaultSem, subjectId: '', classId: '' });
                                }}
                                required
                            >
                                <option value="">Select Year</option>
                                <option value="1">1st Year</option>
                                <option value="2">2nd Year</option>
                                <option value="3">3rd Year</option>
                                <option value="4">4th Year</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Semester *</label>
                            <select
                                value={formData.semester}
                                onChange={(e) => setFormData({ ...formData, semester: e.target.value, subjectId: '' })}
                                required
                                disabled={!formData.year}
                            >
                                <option value="">Select Semester</option>
                                {getSemesterOptions(formData.year).map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Subject *</label>
                        <select
                            value={formData.subjectId}
                            onChange={(e) => handleSubjectChange(e.target.value)}
                            required
                            disabled={!formData.semester}
                        >
                            <option value="">Select Subject</option>
                            {filteredSubjects.map((subject) => (
                                <option key={subject._id} value={subject._id}>
                                    {subject.name} ({subject.code}) - {subject.type}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Teacher *</label>
                        <select
                            value={formData.teacherId}
                            onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                            required
                        >
                            <option value="">Select Teacher</option>
                            {teachers.map((teacher) => (
                                <option key={teacher._id} value={teacher._id}>
                                    {teacher.fullName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Class *</label>
                        <select
                            value={formData.classId}
                            onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                            required
                            disabled={!formData.year}
                        >
                            <option value="">Select Class</option>
                            {filteredClasses.map((cls) => (
                                <option key={cls._id} value={cls._id}>
                                    {cls.name} (Year {cls.year})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Type *</label>
                        {selectedSubject && selectedSubject.type !== 'both' ? (
                            <>
                                <select value={formData.type} disabled>
                                    <option value={selectedSubject.type === 'theory' ? 'lecture' : 'practical'}>
                                        {selectedSubject.type === 'theory' ? 'Lecture' : 'Practical'}
                                    </option>
                                </select>
                                <small style={{ color: 'var(--gray-500)', marginTop: '4px', display: 'block' }}>
                                    Auto-set based on subject type: {selectedSubject.type}
                                </small>
                            </>
                        ) : (
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                required
                            >
                                <option value="lecture">Lecture</option>
                                <option value="practical">Practical</option>
                            </select>
                        )}
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default HodLectures;
