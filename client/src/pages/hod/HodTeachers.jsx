import { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiSearch } from 'react-icons/fi';
import { FaChalkboardTeacher } from 'react-icons/fa';
import Pagination, { usePagination } from '../../components/Pagination';

const HodTeachers = () => {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const { currentPage, pageSize, handlePageChange, handlePageSizeChange, resetPage, paginateData } = usePagination(30);

    useEffect(() => {
        fetchTeachers();
        resetPage();
    }, [search]);

    const fetchTeachers = async () => {
        try {
            setLoading(true);
            const params = search ? `?search=${search}` : '';
            const response = await api.get(`/hod/teachers${params}`);
            setTeachers(response.data);
        } catch (error) {
            console.error('Failed to fetch teachers:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Teachers</h2>
                </div>

                {/* Search */}
                <div className="toolbar">
                    <div className="search-box">
                        <span className="search-icon"><FiSearch /></span>
                        <input
                            type="text"
                            placeholder="Search teachers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="loading"><div className="spinner"></div></div>
                ) : (
                    <Pagination
                        currentPage={currentPage}
                        totalItems={teachers.length}
                        pageSize={pageSize}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                    >
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Teacher Name</th>
                                        <th>Username</th>
                                        <th>Role</th>
                                        <th>Assigned Classes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teachers.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="empty-state">
                                                <div className="empty-icon"><FaChalkboardTeacher size={48} /></div>
                                                <h3>No teachers found</h3>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginateData(teachers).map(teacher => (
                                            <tr key={teacher._id}>
                                                <td><strong>{teacher.fullName}</strong></td>
                                                <td>{teacher.username}</td>
                                                <td>
                                                    <span className={`badge ${teacher.role === 'classcoordinator' ? 'badge-success' : 'badge-primary'}`}>
                                                        {teacher.role === 'classcoordinator' ? 'Coordinator' : 'Teacher'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="class-tags">
                                                        {teacher.assignedClasses?.length > 0 ? (
                                                            teacher.assignedClasses.map(cls => (
                                                                <span key={cls._id} className="class-tag">
                                                                    {cls.name} (Y{cls.year})
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="no-data">No classes assigned</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Pagination>
                )}
            </div>
        </div >
    );
};

export default HodTeachers;
