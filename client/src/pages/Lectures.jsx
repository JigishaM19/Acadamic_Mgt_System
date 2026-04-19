import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiEdit2, FiTrash2, FiPlus, FiBookOpen } from 'react-icons/fi';
import Modal from '../components/Modal';

const Lectures = () => {
    const [lectures, setLectures] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deptFilter, setDeptFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const [semFilter, setSemFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingLecture, setEditingLecture] = useState(null);

    const [formData, setFormData] = useState({
        subjectId: '', teacherId: '', classId: '', type: 'lecture', departmentId: '', year: '', semester: ''
    });

    useEffect(() => { fetchData(); }, []);
    useEffect(() => { if (formData.departmentId) fetchDeptData(formData.departmentId); }, [formData.departmentId]);

    const fetchData = async () => {
        try {
            const [lecturesRes, deptsRes] = await Promise.all([
                api.get('/lectures'),
                api.get('/departments')
            ]);
            setLectures(lecturesRes.data);
            setDepartments(deptsRes.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDeptData = async (deptId) => {
        try {
            const [subjectsRes, teachersRes, classesRes] = await Promise.all([
                api.get(`/subjects?departmentId=${deptId}`),
                api.get('/teachers'),
                api.get(`/classes?departmentId=${deptId}`)
            ]);
            setSubjects(subjectsRes.data);
            setTeachers(teachersRes.data.filter(t => t.departmentId?._id === deptId));
            setClasses(classesRes.data);
        } catch (error) {
            console.error('Failed to fetch department data:', error);
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

    const filteredLectures = lectures.filter((l) => {
        if (deptFilter && l.departmentId?._id !== deptFilter) return false;
        if (yearFilter && l.classId?.year !== parseInt(yearFilter)) return false;
        if (semFilter && l.subjectId?.semester !== parseInt(semFilter)) return false;
        if (typeFilter && l.type !== typeFilter) return false;
        return true;
    });

    // Get semester options for filter year
    const getFilterSemesterOptions = (year) => {
        if (!year) return [];
        const yr = parseInt(year);
        const sem1 = (yr - 1) * 2 + 1;
        const sem2 = sem1 + 1;
        return [
            { value: sem1, label: `SEM-${sem1}` },
            { value: sem2, label: `SEM-${sem2}` }
        ];
    };

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            delete payload.year; // Don't send year to backend, it's just for filtering
            delete payload.semester; // Don't send semester to backend
            if (editingLecture) {
                await api.put(`/lectures/${editingLecture._id}`, payload);
            } else {
                await api.post('/lectures', payload);
            }
            fetchData();
            closeModal();
        } catch (error) {
            alert(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleEdit = (lecture) => {
        setEditingLecture(lecture);
        setFormData({
            subjectId: lecture.subjectId?._id || '',
            teacherId: lecture.teacherId?._id || '',
            classId: lecture.classId?._id || '',
            type: lecture.type || 'lecture',
            departmentId: lecture.departmentId?._id || '',
            year: lecture.classId?.year || '',
            semester: ''
        });
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this lecture assignment?')) return;
        try {
            await api.delete(`/lectures/${id}`);
            fetchData();
        } catch (error) {
            alert('Delete failed');
        }
    };

    const openAddModal = () => {
        setEditingLecture(null);
        setFormData({ subjectId: '', teacherId: '', classId: '', type: 'lecture', departmentId: '', year: '', semester: '' });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingLecture(null);
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="card">
                <div className="toolbar">
                    <h3><FiBookOpen style={{ marginRight: '6px' }} /> Lecture Assignments</h3>
                    <button className="btn btn-primary" onClick={openAddModal}><FiPlus style={{ marginRight: '4px' }} /> Add Lecture</button>
                </div>
                <div className="filter-group filter-group--compact" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '8px', display: 'flex', alignItems: 'center' }}>
                    <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                        <option value="">All Depts</option>
                        {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                    <select value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setSemFilter(''); }}>
                        <option value="">All Years</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                    </select>
                    <select value={semFilter} onChange={(e) => setSemFilter(e.target.value)} disabled={!yearFilter}>
                        <option value="">All Semesters</option>
                        {getFilterSemesterOptions(yearFilter).map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option value="">All Types</option>
                        <option value="lecture">Lecture</option>
                        <option value="practical">Practical</option>
                    </select>
                </div>

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
                            {filteredLectures.map((lecture) => (
                                <tr key={lecture._id}>
                                    <td><strong>{lecture.subjectId?.name}</strong> <span style={{ color: 'var(--gray-500)', fontSize: '12px' }}>({lecture.subjectId?.code})</span></td>
                                    <td>{lecture.teacherId?.fullName || '-'}</td>
                                    <td>{lecture.classId?.name || '-'}</td>
                                    <td><span className="badge badge-info">Year {lecture.classId?.year || '-'}</span></td>
                                    <td><span className="badge badge-secondary">SEM-{lecture.subjectId?.semester || '-'}</span></td>
                                    <td><span className={`badge ${lecture.type === 'practical' ? 'badge-warning' : 'badge-primary'}`}>{lecture.type}</span></td>
                                    <td>{lecture.departmentId?.name || '-'}</td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="btn-icon" onClick={() => handleEdit(lecture)} title="Edit"><FiEdit2 /></button>
                                            <button className="btn-icon" onClick={() => handleDelete(lecture._id)} title="Delete"><FiTrash2 /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredLectures.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-icon"><FiBookOpen size={48} /></div>
                            <h3>No lectures found</h3>
                            <p>Create lecture assignments to link subjects, teachers, and classes</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={modalOpen} onClose={closeModal} title={editingLecture ? 'Edit Lecture' : 'Add New Lecture'}
                footer={<><button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit}>{editingLecture ? 'Update' : 'Create'}</button></>}>
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Department *</label>
                            <select value={formData.departmentId} onChange={(e) => setFormData({ ...formData, departmentId: e.target.value, year: '', semester: '', subjectId: '', classId: '' })} required>
                                <option value="">Select Department</option>
                                {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Year *</label>
                            <select value={formData.year} onChange={(e) => {
                                const yr = e.target.value;
                                const defaultSem = yr ? ((parseInt(yr) - 1) * 2 + 1).toString() : '';
                                setFormData({ ...formData, year: yr, semester: defaultSem, subjectId: '', classId: '' });
                            }} required disabled={!formData.departmentId}>
                                <option value="">Select Year</option>
                                <option value="1">1st Year</option>
                                <option value="2">2nd Year</option>
                                <option value="3">3rd Year</option>
                                <option value="4">4th Year</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Semester *</label>
                            <select value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value, subjectId: '' })} required disabled={!formData.year}>
                                <option value="">Select Semester</option>
                                {getSemesterOptions(formData.year).map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Subject *</label>
                            <select value={formData.subjectId} onChange={(e) => handleSubjectChange(e.target.value)} required disabled={!formData.semester}>
                                <option value="">Select Subject</option>
                                {filteredSubjects.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.code}) - {s.type}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Class *</label>
                            <select value={formData.classId} onChange={(e) => setFormData({ ...formData, classId: e.target.value })} required disabled={!formData.year}>
                                <option value="">Select Class</option>
                                {filteredClasses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Teacher *</label>
                            <select value={formData.teacherId} onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })} required disabled={!formData.departmentId}>
                                <option value="">Select Teacher</option>
                                {teachers.map((t) => <option key={t._id} value={t._id}>{t.fullName}</option>)}
                            </select>
                        </div>
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
                            <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} required>
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

export default Lectures;
