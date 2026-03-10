import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiClipboard, FiPhone, FiMail } from 'react-icons/fi';
import { FaUserGraduate } from 'react-icons/fa';
import Pagination, { usePagination } from '../../components/Pagination';

const CCStudents = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { currentPage, pageSize, handlePageChange, handlePageSizeChange, resetPage, paginateData } = usePagination(30);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const response = await api.get('/cc/students');
            setStudents(response.data);
        } catch (error) {
            console.error('Failed to fetch students:', error);
        } finally {
            setLoading(false);
        }
    };

    // Sort by surname (last word of fullName)
    const sortedStudents = [...students].sort((a, b) => {
        const nameA = a.fullName || `${a.firstName} ${a.lastName}`;
        const nameB = b.fullName || `${b.firstName} ${b.lastName}`;
        const partsA = nameA.trim().split(/\s+/);
        const partsB = nameB.trim().split(/\s+/);
        const surnameA = partsA[partsA.length - 1] || '';
        const surnameB = partsB[partsB.length - 1] || '';
        return surnameA.localeCompare(surnameB);
    });

    const filteredStudents = sortedStudents.filter(student =>
        student.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const paginatedStudents = paginateData(filteredStudents);

    // Reset page when search changes
    useEffect(() => { resetPage(); }, [searchTerm]);

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
                    <h2 className="card-title"><FaUserGraduate style={{ marginRight: '6px' }} /> Class Students</h2>
                    <div className="header-actions">
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', width: '200px' }}
                        />
                    </div>
                </div>

                <div className="info-bar" style={{ padding: '12px 16px', background: 'var(--primary-light)', borderRadius: '8px', marginBottom: '16px' }}>
                    <span><FiClipboard style={{ marginRight: '4px' }} /> Total Students: <strong>{students.length}</strong></span>
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalItems={filteredStudents.length}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                >
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Roll No</th>
                                    <th>Name</th>
                                    <th>Department</th>
                                    <th>Class</th>
                                    <th>Contact</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedStudents.map((student, index) => (
                                    <tr key={student._id}>
                                        <td>
                                            <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>
                                                {(currentPage - 1) * pageSize + index + 1}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '500' }}>
                                                {student.fullName || `${student.firstName} ${student.lastName}`}
                                            </div>
                                        </td>
                                        <td>{student.departmentId?.name || 'N/A'}</td>
                                        <td>
                                            <span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                                                {student.classId?.name || 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '13px' }}>
                                                {student.phone && <div><FiPhone style={{ marginRight: '4px' }} /> {student.phone}</div>}
                                                {student.email && <div><FiMail style={{ marginRight: '4px' }} /> {student.email}</div>}
                                                {!student.phone && !student.email && <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredStudents.length === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            {searchTerm ? 'No students found matching your search' : 'No students in this class'}
                        </div>
                    )}
                </Pagination>
            </div>
        </div>
    );
};

export default CCStudents;
