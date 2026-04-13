import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FiUser, FiMail, FiPhone, FiBook, FiX, FiSearch, FiCalendar, FiMapPin, FiAward, FiChevronRight, FiChevronLeft, FiFilter, FiUsers } from 'react-icons/fi';
import { FaChalkboardTeacher } from 'react-icons/fa';

const TeacherContacts = () => {
    const { user } = useAuth();
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [teacherDetail, setTeacherDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // All college teachers state
    const [allTeachers, setAllTeachers] = useState([]);
    const [allTeachersLoading, setAllTeachersLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 0 });
    const [departments, setDepartments] = useState([]);
    const [allSearch, setAllSearch] = useState('');
    const [allSearchInput, setAllSearchInput] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [filterRole, setFilterRole] = useState('');

    useEffect(() => {
        fetchTeachers();
    }, []);

    const fetchAllTeachers = useCallback(async (page = 1) => {
        setAllTeachersLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({ page, limit: 12 });
            if (allSearch) params.append('search', allSearch);
            if (filterDept) params.append('department', filterDept);
            if (filterRole) params.append('role', filterRole);
            const response = await fetch(`http://localhost:5000/api/student/all-teachers?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setAllTeachers(data.teachers || []);
                setPagination(data.pagination || { page: 1, limit: 12, total: 0, totalPages: 0 });
                if (data.departments) setDepartments(data.departments);
            }
        } catch (err) {
            console.error('Failed to fetch all teachers', err);
        } finally {
            setAllTeachersLoading(false);
        }
    }, [allSearch, filterDept, filterRole]);

    useEffect(() => {
        fetchAllTeachers(1);
    }, [fetchAllTeachers]);

    // Debounced search for all teachers
    useEffect(() => {
        const timer = setTimeout(() => {
            setAllSearch(allSearchInput);
        }, 400);
        return () => clearTimeout(timer);
    }, [allSearchInput]);

    const handleAllTeacherClick = (teacher) => {
        // Build a minimal teacherDetail object from the list data (no schedule/subjects from class)
        setSelectedTeacher(teacher);
        setTeacherDetail({
            ...teacher,
            subjects: [],
            schedule: [],
            isClassCoordinator: false
        });
    };

    const fetchTeachers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/student/teacher-contacts', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setTeachers(data.teachers || []);
            } else {
                setError(data.message || 'Failed to fetch teachers');
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const fetchTeacherDetail = async (teacherId) => {
        setDetailLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/student/teacher-contacts/${teacherId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setTeacherDetail(data.teacher);
            } else {
                setTeacherDetail(null);
            }
        } catch (err) {
            setTeacherDetail(null);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleTeacherClick = (teacher) => {
        setSelectedTeacher(teacher);
        fetchTeacherDetail(teacher._id);
    };

    const closeModal = () => {
        setSelectedTeacher(null);
        setTeacherDetail(null);
    };

    const getRoleBadge = (roles, isClassCoordinator) => {
        const badges = [];
        if (isClassCoordinator) {
            badges.push({ label: 'Class Coordinator', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' });
        }
        if (roles?.includes('hod')) {
            badges.push({ label: 'HOD', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' });
        }
        if (roles?.includes('teacher')) {
            badges.push({ label: 'Teacher', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' });
        }
        if (badges.length === 0) {
            badges.push({ label: 'Faculty', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' });
        }
        return badges;
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w.charAt(0).toUpperCase()).slice(0, 2).join('');
    };

    const getAvatarColor = (name) => {
        const colors = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
            'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
            'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
        ];
        const index = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
        return colors[index];
    };

    const filteredTeachers = teachers.filter(t => {
        const q = searchQuery.toLowerCase();
        return (
            (t.fullName || '').toLowerCase().includes(q) ||
            (t.email || '').toLowerCase().includes(q) ||
            (t.subjects || []).some(s => s.toLowerCase().includes(q))
        );
    });

    const groupDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    if (error) {
        return (
            <div className="page-container">
                <div className="alert alert-error">{error}</div>
            </div>
        );
    }

    return (
        <div className="page-container">
            {/* Page Header */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <div>
                    <h2 style={{
                        margin: 0,
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: 'var(--gray-900)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <FaChalkboardTeacher style={{ color: 'var(--primary)' }} />
                        Teacher Contacts
                    </h2>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                        {teachers.length} teacher{teachers.length !== 1 ? 's' : ''} assigned to your class
                    </p>
                </div>

                {/* Search Bar */}
                <div style={{
                    position: 'relative',
                    minWidth: '250px',
                    maxWidth: '360px',
                    flex: '1'
                }}>
                    <FiSearch style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--gray-400)',
                        fontSize: '16px',
                        pointerEvents: 'none'
                    }} />
                    <input
                        type="text"
                        placeholder="Search by name, email, or subject..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 14px 10px 40px',
                            borderRadius: '12px',
                            border: '1.5px solid var(--gray-200)',
                            fontSize: '0.9rem',
                            background: 'var(--white)',
                            color: 'var(--gray-800)',
                            outline: 'none',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                            boxSizing: 'border-box'
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = 'var(--primary)';
                            e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)';
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = 'var(--gray-200)';
                            e.target.style.boxShadow = 'none';
                        }}
                    />
                </div>
            </div>

            {/* Teacher Cards Grid */}
            {filteredTeachers.length > 0 ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '18px'
                }}>
                    {filteredTeachers.map((teacher) => {
                        const badges = getRoleBadge(teacher.roles, teacher.isClassCoordinator);
                        return (
                            <div
                                key={teacher._id}
                                id={`teacher-card-${teacher._id}`}
                                onClick={() => handleTeacherClick(teacher)}
                                style={{
                                    background: 'var(--white)',
                                    borderRadius: '16px',
                                    border: '1.5px solid var(--gray-100)',
                                    padding: '22px',
                                    cursor: 'pointer',
                                    transition: 'all 0.25s ease',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-3px)';
                                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(99,102,241,0.12)';
                                    e.currentTarget.style.borderColor = 'var(--primary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                                    e.currentTarget.style.borderColor = 'var(--gray-100)';
                                }}
                            >
                                {/* CC ribbon */}
                                {teacher.isClassCoordinator && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        right: '-30px',
                                        background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                                        color: '#fff',
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        padding: '3px 36px',
                                        transform: 'rotate(45deg)',
                                        letterSpacing: '0.5px',
                                        boxShadow: '0 2px 8px rgba(139,92,246,0.3)'
                                    }}>
                                        CC
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                    {/* Avatar */}
                                    <div style={{
                                        width: '52px',
                                        height: '52px',
                                        borderRadius: '14px',
                                        background: getAvatarColor(teacher.fullName),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: '1.05rem',
                                        flexShrink: 0,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                                        letterSpacing: '0.5px'
                                    }}>
                                        {getInitials(teacher.fullName)}
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{
                                            margin: 0,
                                            fontSize: '1rem',
                                            fontWeight: 650,
                                            color: 'var(--gray-900)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {teacher.fullName}
                                        </h3>

                                        {/* Role badges */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                            {badges.map((badge, i) => (
                                                <span key={i} style={{
                                                    padding: '2px 10px',
                                                    borderRadius: '8px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 600,
                                                    background: badge.bg,
                                                    color: badge.color,
                                                    letterSpacing: '0.2px'
                                                }}>
                                                    {badge.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <FiChevronRight style={{
                                        color: 'var(--gray-300)',
                                        fontSize: '18px',
                                        flexShrink: 0,
                                        marginTop: '4px'
                                    }} />
                                </div>

                                {/* Contact + Subjects */}
                                <div style={{
                                    marginTop: '16px',
                                    paddingTop: '14px',
                                    borderTop: '1px solid var(--gray-100)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }}>
                                    {teacher.email && (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '0.82rem',
                                            color: 'var(--gray-600)'
                                        }}>
                                            <FiMail style={{ color: 'var(--primary)', fontSize: '14px', flexShrink: 0 }} />
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {teacher.email}
                                            </span>
                                        </div>
                                    )}
                                    {teacher.phone && (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '0.82rem',
                                            color: 'var(--gray-600)'
                                        }}>
                                            <FiPhone style={{ color: 'var(--success)', fontSize: '14px', flexShrink: 0 }} />
                                            <span>{teacher.phone}</span>
                                        </div>
                                    )}
                                    {teacher.subjects && teacher.subjects.length > 0 && (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '8px',
                                            fontSize: '0.82rem',
                                            color: 'var(--gray-600)'
                                        }}>
                                            <FiBook style={{ color: '#f59e0b', fontSize: '14px', flexShrink: 0, marginTop: '2px' }} />
                                            <span style={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical'
                                            }}>
                                                {teacher.subjects.join(', ')}
                                            </span>
                                        </div>
                                    )}
                                    {!teacher.email && !teacher.phone && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                                            No contact info available
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <FaChalkboardTeacher style={{ fontSize: '3rem', color: 'var(--gray-300)', marginBottom: '16px' }} />
                    <p style={{ color: 'var(--gray-500)', fontSize: '1rem' }}>
                        {searchQuery ? 'No teachers match your search' : 'No teachers assigned to your class yet'}
                    </p>
                </div>
            )}

            {/* ================= Teacher Detail Modal ================= */}
            {selectedTeacher && (
                <div
                    id="teacher-detail-modal"
                    onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px',
                        animation: 'fadeIn 0.2s ease'
                    }}
                >
                    <div style={{
                        background: 'var(--white)',
                        borderRadius: '20px',
                        width: '100%',
                        maxWidth: '560px',
                        maxHeight: '85vh',
                        overflowY: 'auto',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
                        animation: 'slideUp 0.3s ease'
                    }}>
                        {detailLoading ? (
                            <div style={{ padding: '60px', textAlign: 'center' }}>
                                <div className="spinner"></div>
                            </div>
                        ) : teacherDetail ? (
                            <>
                                {/* Modal Header with gradient */}
                                <div style={{
                                    background: getAvatarColor(teacherDetail.fullName),
                                    padding: '32px 28px 40px',
                                    borderRadius: '20px 20px 0 0',
                                    position: 'relative'
                                }}>
                                    {/* Close button */}
                                    <button
                                        onClick={closeModal}
                                        style={{
                                            position: 'absolute',
                                            top: '14px',
                                            right: '14px',
                                            background: 'rgba(255,255,255,0.2)',
                                            border: 'none',
                                            borderRadius: '10px',
                                            width: '36px',
                                            height: '36px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            color: '#fff',
                                            fontSize: '18px',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                                    >
                                        <FiX />
                                    </button>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                                        <div style={{
                                            width: '70px',
                                            height: '70px',
                                            borderRadius: '18px',
                                            background: 'rgba(255,255,255,0.25)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            fontWeight: 800,
                                            fontSize: '1.5rem',
                                            backdropFilter: 'blur(8px)',
                                            border: '2px solid rgba(255,255,255,0.3)'
                                        }}>
                                            {getInitials(teacherDetail.fullName)}
                                        </div>
                                        <div>
                                            <h2 style={{
                                                margin: 0,
                                                color: '#fff',
                                                fontSize: '1.35rem',
                                                fontWeight: 700,
                                                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                            }}>
                                                {teacherDetail.fullName}
                                            </h2>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                                {getRoleBadge(teacherDetail.roles, teacherDetail.isClassCoordinator).map((badge, i) => (
                                                    <span key={i} style={{
                                                        padding: '3px 12px',
                                                        borderRadius: '8px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 600,
                                                        background: 'rgba(255,255,255,0.22)',
                                                        color: '#fff',
                                                        backdropFilter: 'blur(4px)'
                                                    }}>
                                                        {badge.label}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Body */}
                                <div style={{ padding: '24px 28px 28px' }}>
                                    {/* About Section */}
                                    {teacherDetail.about && (
                                        <div style={{ marginBottom: '22px' }}>
                                            <h4 style={{
                                                margin: '0 0 8px 0',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                color: 'var(--gray-400)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.8px'
                                            }}>
                                                About
                                            </h4>
                                            <p style={{
                                                margin: 0,
                                                color: 'var(--gray-700)',
                                                fontSize: '0.92rem',
                                                lineHeight: '1.6',
                                                background: 'var(--gray-50)',
                                                padding: '14px 16px',
                                                borderRadius: '12px',
                                                borderLeft: '3px solid var(--primary)'
                                            }}>
                                                {teacherDetail.about}
                                            </p>
                                        </div>
                                    )}

                                    {/* Contact Info Grid */}
                                    <div style={{ marginBottom: '22px' }}>
                                        <h4 style={{
                                            margin: '0 0 10px 0',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            color: 'var(--gray-400)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.8px'
                                        }}>
                                            Contact Information
                                        </h4>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                            gap: '10px'
                                        }}>
                                            {teacherDetail.email && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '12px 14px',
                                                    background: 'var(--gray-50)',
                                                    borderRadius: '12px'
                                                }}>
                                                    <div style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '10px',
                                                        background: 'rgba(99,102,241,0.1)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}>
                                                        <FiMail style={{ color: 'var(--primary)', fontSize: '16px' }} />
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', fontWeight: 500 }}>Email</div>
                                                        <div style={{
                                                            fontSize: '0.85rem',
                                                            color: 'var(--gray-800)',
                                                            fontWeight: 500,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {teacherDetail.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {teacherDetail.phone && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '12px 14px',
                                                    background: 'var(--gray-50)',
                                                    borderRadius: '12px'
                                                }}>
                                                    <div style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '10px',
                                                        background: 'rgba(16,185,129,0.1)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}>
                                                        <FiPhone style={{ color: 'var(--success)', fontSize: '16px' }} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', fontWeight: 500 }}>Phone</div>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--gray-800)', fontWeight: 500 }}>
                                                            {teacherDetail.phone}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {teacherDetail.department && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '12px 14px',
                                                    background: 'var(--gray-50)',
                                                    borderRadius: '12px'
                                                }}>
                                                    <div style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '10px',
                                                        background: 'rgba(245,158,11,0.1)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}>
                                                        <FiAward style={{ color: '#f59e0b', fontSize: '16px' }} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', fontWeight: 500 }}>Department</div>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--gray-800)', fontWeight: 500 }}>
                                                            {teacherDetail.department}
                                                            {teacherDetail.departmentCode && (
                                                                <span style={{ color: 'var(--gray-400)', marginLeft: '4px', fontSize: '0.75rem' }}>
                                                                    ({teacherDetail.departmentCode})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {teacherDetail.gender && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '12px 14px',
                                                    background: 'var(--gray-50)',
                                                    borderRadius: '12px'
                                                }}>
                                                    <div style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '10px',
                                                        background: 'rgba(236,72,153,0.1)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}>
                                                        <FiUser style={{ color: '#ec4899', fontSize: '16px' }} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', fontWeight: 500 }}>Gender</div>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--gray-800)', fontWeight: 500, textTransform: 'capitalize' }}>
                                                            {teacherDetail.gender}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {!teacherDetail.email && !teacherDetail.phone && !teacherDetail.department && (
                                            <p style={{
                                                color: 'var(--gray-400)',
                                                fontSize: '0.85rem',
                                                fontStyle: 'italic',
                                                margin: '8px 0 0 0'
                                            }}>
                                                No contact information available
                                            </p>
                                        )}
                                    </div>

                                    {/* Subjects Taught */}
                                    {teacherDetail.subjects && teacherDetail.subjects.length > 0 && (
                                        <div style={{ marginBottom: '22px' }}>
                                            <h4 style={{
                                                margin: '0 0 10px 0',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                color: 'var(--gray-400)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.8px'
                                            }}>
                                                Subjects Taught
                                            </h4>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {teacherDetail.subjects.map((subj, i) => (
                                                    <span key={i} style={{
                                                        padding: '6px 14px',
                                                        borderRadius: '10px',
                                                        fontSize: '0.82rem',
                                                        fontWeight: 500,
                                                        background: 'rgba(99,102,241,0.08)',
                                                        color: 'var(--primary)',
                                                        border: '1px solid rgba(99,102,241,0.15)'
                                                    }}>
                                                        <FiBook style={{ marginRight: '6px', fontSize: '12px' }} />
                                                        {subj}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Schedule */}
                                    {teacherDetail.schedule && teacherDetail.schedule.length > 0 && (
                                        <div>
                                            <h4 style={{
                                                margin: '0 0 10px 0',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                color: 'var(--gray-400)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.8px'
                                            }}>
                                                <FiCalendar style={{ marginRight: '6px' }} />
                                                Class Schedule
                                            </h4>
                                            <div style={{
                                                background: 'var(--gray-50)',
                                                borderRadius: '12px',
                                                overflow: 'hidden'
                                            }}>
                                                {groupDays
                                                    .filter(day => teacherDetail.schedule.some(s => s.day === day))
                                                    .map((day, dayIdx) => (
                                                        <div key={day}>
                                                            {dayIdx > 0 && (
                                                                <div style={{ height: '1px', background: 'var(--gray-200)' }}></div>
                                                            )}
                                                            <div style={{ padding: '12px 16px' }}>
                                                                <div style={{
                                                                    fontSize: '0.78rem',
                                                                    fontWeight: 700,
                                                                    color: 'var(--primary)',
                                                                    marginBottom: '6px',
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: '0.5px'
                                                                }}>
                                                                    {day}
                                                                </div>
                                                                {teacherDetail.schedule
                                                                    .filter(s => s.day === day)
                                                                    .map((slot, i) => (
                                                                        <div key={i} style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '10px',
                                                                            marginTop: i > 0 ? '4px' : 0,
                                                                            fontSize: '0.82rem',
                                                                            color: 'var(--gray-700)'
                                                                        }}>
                                                                            {slot.time && (
                                                                                <span style={{
                                                                                    fontWeight: 600,
                                                                                    color: 'var(--gray-600)',
                                                                                    minWidth: '110px'
                                                                                }}>
                                                                                    {slot.time}
                                                                                </span>
                                                                            )}
                                                                            <span>{slot.subject}</span>
                                                                            <span style={{
                                                                                padding: '1px 8px',
                                                                                borderRadius: '6px',
                                                                                fontSize: '0.7rem',
                                                                                fontWeight: 500,
                                                                                textTransform: 'capitalize',
                                                                                background: slot.type === 'practical'
                                                                                    ? 'rgba(14,165,233,0.1)'
                                                                                    : 'rgba(99,102,241,0.1)',
                                                                                color: slot.type === 'practical'
                                                                                    ? '#0ea5e9'
                                                                                    : '#6366f1'
                                                                            }}>
                                                                                {slot.type}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>
                                <p>Could not load teacher details</p>
                                <button onClick={closeModal} className="btn btn-secondary" style={{ marginTop: '12px' }}>
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ================= All College Teachers Section ================= */}
            <div className="card" style={{ marginTop: '36px' }}>
                <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FiUsers style={{ color: 'var(--primary)' }} />
                            All College Faculty
                        </h2>
                        <p style={{ margin: '2px 0 0 0', color: 'var(--gray-500)', fontSize: '0.85rem' }}>
                            {pagination.total} faculty member{pagination.total !== 1 ? 's' : ''} in the college
                        </p>
                    </div>
                </div>

                {/* Filters Row */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    padding: '0 0 16px 0',
                    alignItems: 'center'
                }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '320px' }}>
                        <FiSearch style={{
                            position: 'absolute', left: '12px', top: '50%',
                            transform: 'translateY(-50%)', color: 'var(--gray-400)',
                            fontSize: '14px', pointerEvents: 'none'
                        }} />
                        <input
                            type="text"
                            placeholder="Search faculty..."
                            value={allSearchInput}
                            onChange={(e) => setAllSearchInput(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px 8px 34px',
                                borderRadius: '10px',
                                border: '1.5px solid var(--gray-200)',
                                fontSize: '0.85rem',
                                background: 'var(--white)',
                                color: 'var(--gray-800)',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--gray-200)'}
                        />
                    </div>

                    {/* Department Filter */}
                    <select
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '10px',
                            border: '1.5px solid var(--gray-200)',
                            fontSize: '0.85rem',
                            background: 'var(--white)',
                            color: filterDept ? 'var(--gray-800)' : 'var(--gray-400)',
                            outline: 'none',
                            cursor: 'pointer',
                            minWidth: '160px'
                        }}
                    >
                        <option value="">All Departments</option>
                        {departments.map(d => (
                            <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                        ))}
                    </select>

                    {/* Role Filter */}
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '10px',
                            border: '1.5px solid var(--gray-200)',
                            fontSize: '0.85rem',
                            background: 'var(--white)',
                            color: filterRole ? 'var(--gray-800)' : 'var(--gray-400)',
                            outline: 'none',
                            cursor: 'pointer',
                            minWidth: '140px'
                        }}
                    >
                        <option value="">All Roles</option>
                        <option value="teacher">Teacher</option>
                        <option value="hod">HOD</option>
                        <option value="classcoordinator">Class Coordinator</option>
                    </select>

                    {/* Clear filters */}
                    {(allSearchInput || filterDept || filterRole) && (
                        <button
                            onClick={() => { setAllSearchInput(''); setAllSearch(''); setFilterDept(''); setFilterRole(''); }}
                            style={{
                                padding: '8px 14px',
                                borderRadius: '10px',
                                border: '1.5px solid var(--gray-200)',
                                background: 'var(--gray-50)',
                                color: 'var(--gray-600)',
                                fontSize: '0.82rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-100)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
                        >
                            <FiX size={14} /> Clear
                        </button>
                    )}
                </div>

                {/* Teachers Table */}
                {allTeachersLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <div className="spinner"></div>
                    </div>
                ) : allTeachers.length > 0 ? (
                    <>
                        <div className="table-container" style={{ overflowX: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Department</th>
                                        <th>Role</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allTeachers.map((t) => {
                                        const roleBadges = getRoleBadge(t.roles, false);
                                        return (
                                            <tr
                                                key={t._id}
                                                onClick={() => handleAllTeacherClick(t)}
                                                style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = ''}
                                            >
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{
                                                            width: '34px', height: '34px',
                                                            borderRadius: '10px',
                                                            background: getAvatarColor(t.fullName),
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            color: '#fff', fontWeight: 700, fontSize: '0.75rem',
                                                            flexShrink: 0
                                                        }}>
                                                            {getInitials(t.fullName)}
                                                        </div>
                                                        <span style={{ fontWeight: 550, color: 'var(--gray-800)' }}>
                                                            {t.fullName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {t.department ? (
                                                        <span style={{ fontSize: '0.85rem' }}>
                                                            {t.department}
                                                            {t.departmentCode && (
                                                                <span style={{ color: 'var(--gray-400)', marginLeft: '4px', fontSize: '0.75rem' }}>
                                                                    ({t.departmentCode})
                                                                </span>
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'var(--gray-400)', fontStyle: 'italic', fontSize: '0.82rem' }}>—</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                        {roleBadges.map((badge, i) => (
                                                            <span key={i} style={{
                                                                padding: '2px 8px',
                                                                borderRadius: '6px',
                                                                fontSize: '0.7rem',
                                                                fontWeight: 600,
                                                                background: badge.bg,
                                                                color: badge.color
                                                            }}>
                                                                {badge.label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td>
                                                    {t.email ? (
                                                        <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>{t.email}</span>
                                                    ) : (
                                                        <span style={{ color: 'var(--gray-400)', fontSize: '0.82rem' }}>—</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {t.phone ? (
                                                        <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>{t.phone}</span>
                                                    ) : (
                                                        <span style={{ color: 'var(--gray-400)', fontSize: '0.82rem' }}>—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px 0 4px',
                                flexWrap: 'wrap',
                                gap: '10px'
                            }}>
                                <span style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>
                                    Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                                </span>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button
                                        disabled={pagination.page <= 1}
                                        onClick={() => fetchAllTeachers(pagination.page - 1)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            border: '1.5px solid var(--gray-200)',
                                            background: pagination.page <= 1 ? 'var(--gray-50)' : 'var(--white)',
                                            color: pagination.page <= 1 ? 'var(--gray-300)' : 'var(--gray-700)',
                                            cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                                            fontSize: '0.82rem',
                                            fontWeight: 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <FiChevronLeft size={14} /> Prev
                                    </button>

                                    {/* Page numbers */}
                                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                                        .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - pagination.page) <= 1)
                                        .reduce((acc, p, idx, arr) => {
                                            if (idx > 0 && p - arr[idx - 1] > 1) {
                                                acc.push('...');
                                            }
                                            acc.push(p);
                                            return acc;
                                        }, [])
                                        .map((p, i) => (
                                            p === '...' ? (
                                                <span key={`dots-${i}`} style={{ padding: '0 4px', color: 'var(--gray-400)', fontSize: '0.82rem' }}>…</span>
                                            ) : (
                                                <button
                                                    key={p}
                                                    onClick={() => fetchAllTeachers(p)}
                                                    style={{
                                                        padding: '6px 10px',
                                                        borderRadius: '8px',
                                                        border: p === pagination.page ? '1.5px solid var(--primary)' : '1.5px solid var(--gray-200)',
                                                        background: p === pagination.page ? 'var(--primary)' : 'var(--white)',
                                                        color: p === pagination.page ? '#fff' : 'var(--gray-700)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.82rem',
                                                        fontWeight: p === pagination.page ? 600 : 400,
                                                        minWidth: '34px',
                                                        transition: 'all 0.15s'
                                                    }}
                                                >
                                                    {p}
                                                </button>
                                            )
                                        ))}

                                    <button
                                        disabled={pagination.page >= pagination.totalPages}
                                        onClick={() => fetchAllTeachers(pagination.page + 1)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            border: '1.5px solid var(--gray-200)',
                                            background: pagination.page >= pagination.totalPages ? 'var(--gray-50)' : 'var(--white)',
                                            color: pagination.page >= pagination.totalPages ? 'var(--gray-300)' : 'var(--gray-700)',
                                            cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                                            fontSize: '0.82rem',
                                            fontWeight: 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        Next <FiChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500)' }}>
                        <FiUsers style={{ fontSize: '2rem', marginBottom: '10px', color: 'var(--gray-300)' }} />
                        <p>{allSearch || filterDept || filterRole ? 'No faculty match your filters' : 'No faculty records found'}</p>
                    </div>
                )}
            </div>

            {/* Animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(30px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
};

export default TeacherContacts;
