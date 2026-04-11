import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    FiHome, FiUsers, FiBook, FiCalendar, FiClock, FiGrid,
    FiFileText, FiClipboard, FiMessageSquare, FiSettings,
    FiUser, FiBookOpen, FiLayers, FiMapPin, FiInfo, FiAlertTriangle
} from 'react-icons/fi';
import { FaBullhorn } from 'react-icons/fa';
import appLogo from '../assets/logo.svg';

const Sidebar = ({ collapsed, mobileOpen, onMobileClose }) => {
    const { user } = useAuth();

    // Admin navigation items
    const adminNavItems = [
        { path: '/dashboard', icon: <FiHome />, label: 'Dashboard' },
        { path: '/students', icon: <FiUsers />, label: 'Students' },
        { path: '/teachers', icon: <FiUser />, label: 'Teachers' },
        { path: '/departments', icon: <FiGrid />, label: 'Departments' },
        { path: '/classes', icon: <FiLayers />, label: 'Classes' },
        { path: '/subjects', icon: <FiBook />, label: 'Subjects' },
        { path: '/test-types', icon: <FiFileText />, label: 'Test Types' },
        { path: '/lectures', icon: <FiBookOpen />, label: 'Lectures' },
        { path: '/timetable', icon: <FiCalendar />, label: 'Timetable' },
        { path: '/rooms', icon: <FiMapPin />, label: 'Classrooms' },
        { path: '/timeslots', icon: <FiClock />, label: 'Time Slots' },
        { path: '/academic-settings', icon: <FiSettings />, label: 'Academic Settings' },
        { path: '/college-detail', icon: <FiInfo />, label: 'College Detail' },
        { path: '/profile', icon: <FiSettings />, label: 'Profile' },
    ];

    // HOD navigation items
    const hodNavItems = [
        { path: '/hod/dashboard', icon: <FiHome />, label: 'Dashboard' },
        { path: '/hod/attendance', icon: <FiClipboard />, label: 'Attendance' },
        { path: '/hod/defaulters', icon: <FiAlertTriangle />, label: 'Defaulters' },
        { path: '/hod/assignments', icon: <FiBookOpen />, label: 'Assignments' },
        { path: '/hod/students', icon: <FiUsers />, label: 'Students' },
        { path: '/hod/teachers', icon: <FiUser />, label: 'Teachers' },
        { path: '/hod/subjects', icon: <FiBook />, label: 'Subjects' },
        { path: '/hod/lectures', icon: <FiBookOpen />, label: 'Lectures' },
        { path: '/hod/classes', icon: <FiLayers />, label: 'Classes' },
        { path: '/hod/timetable', icon: <FiCalendar />, label: 'Timetable' },
        { path: '/hod/leave-requests', icon: <FiFileText />, label: 'Leave Requests' },
        { path: '/hod/complaints', icon: <FiMessageSquare />, label: 'Complaints' },
        { path: '/hod/announcements', icon: <FaBullhorn />, label: 'Announcements' },
        { path: '/hod/about-college', icon: <FiInfo />, label: 'About College' },
        { path: '/profile', icon: <FiSettings />, label: 'Profile' },
    ];

    // Teacher navigation items
    const teacherNavItems = [
        { path: '/teacher/dashboard', icon: <FiHome />, label: 'Dashboard' },
        { path: '/teacher/attendance', icon: <FiClipboard />, label: 'Attendance' },
        { path: '/teacher/defaulters', icon: <FiAlertTriangle />, label: 'Defaulters' },
        { path: '/teacher/tests', icon: <FiFileText />, label: 'Tests' },
        { path: '/teacher/assignments', icon: <FiBookOpen />, label: 'Assignments' },
        { path: '/teacher/timetable', icon: <FiCalendar />, label: 'Timetable' },
        { path: '/teacher/leave-requests', icon: <FiFileText />, label: 'Leave Requests' },
        { path: '/teacher/complaints', icon: <FiMessageSquare />, label: 'Complaints' },
        { path: '/teacher/announcements', icon: <FaBullhorn />, label: 'Announcements' },
        { path: '/teacher/about-college', icon: <FiInfo />, label: 'About College' },
        { path: '/profile', icon: <FiSettings />, label: 'Profile' },
    ];

    // Student navigation items
    const studentNavItems = [
        { path: '/student/dashboard', icon: <FiHome />, label: 'Dashboard' },
        { path: '/student/timetable', icon: <FiCalendar />, label: 'Timetable' },
        { path: '/student/attendance', icon: <FiClipboard />, label: 'Attendance' },
        { path: '/student/tests', icon: <FiFileText />, label: 'Test Scores' },
        { path: '/student/assignments', icon: <FiBookOpen />, label: 'Assignments' },
        { path: '/student/leave-requests', icon: <FiFileText />, label: 'Leave Requests' },
        { path: '/student/complaints', icon: <FiMessageSquare />, label: 'Complaints' },
        { path: '/student/announcements', icon: <FaBullhorn />, label: 'Announcements' },
        { path: '/student/about-college', icon: <FiInfo />, label: 'About College' },
        { path: '/profile', icon: <FiSettings />, label: 'Profile' },
    ];

    // Parent navigation items
    const parentNavItems = [
        { path: '/parent/dashboard', icon: <FiHome />, label: 'Dashboard' },
        { path: '/parent/timetable', icon: <FiCalendar />, label: 'Timetable' },
        { path: '/parent/attendance', icon: <FiClipboard />, label: 'Attendance' },
        { path: '/parent/tests', icon: <FiFileText />, label: 'Test Scores' },
        { path: '/parent/assignments', icon: <FiBookOpen />, label: 'Assignments' },
        { path: '/parent/leave-requests', icon: <FiFileText />, label: 'Leave Requests' },
        { path: '/parent/complaints', icon: <FiMessageSquare />, label: 'Complaints' },
        { path: '/parent/announcements', icon: <FaBullhorn />, label: 'Announcements' },
        { path: '/parent/about-college', icon: <FiInfo />, label: 'About College' },
        { path: '/profile', icon: <FiSettings />, label: 'Profile' },
    ];

    // Class Coordinator navigation items
    const ccNavItems = [
        { path: '/cc/dashboard', icon: <FiHome />, label: 'Dashboard' },
        { path: '/cc/timetable', icon: <FiCalendar />, label: 'Timetable' },
        { path: '/cc/attendance', icon: <FiClipboard />, label: 'Attendance' },
        { path: '/cc/defaulters', icon: <FiAlertTriangle />, label: 'Defaulters' },
        { path: '/cc/tests', icon: <FiFileText />, label: 'Test Scores' },
        { path: '/cc/assignments', icon: <FiBookOpen />, label: 'Assignments' },
        { path: '/cc/students', icon: <FiUsers />, label: 'Students' },
        { path: '/cc/leave-requests', icon: <FiFileText />, label: 'Leave Requests' },
        { path: '/cc/complaints', icon: <FiMessageSquare />, label: 'Complaints' },
        { path: '/cc/announcements', icon: <FaBullhorn />, label: 'Announcements' },
        { path: '/cc/about-college', icon: <FiInfo />, label: 'About College' },
        { path: '/profile', icon: <FiSettings />, label: 'Profile' },
    ];

    // Select nav items based on user role
    const getNavItems = () => {
        switch (user?.role) {
            case 'hod':
                return hodNavItems;
            case 'teacher':
                return teacherNavItems;
            case 'classcoordinator':
                return ccNavItems;
            case 'student':
                return studentNavItems;
            case 'parent':
                return parentNavItems;
            default:
                return adminNavItems;
        }
    };

    const navItems = getNavItems();

    return (
        <>
            <div className={`mobile-overlay ${mobileOpen ? 'show' : ''}`} onClick={onMobileClose}></div>
            <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <img src={appLogo} alt="UniTracker" className="logo-icon-img" />
                        <span className="logo-text">UniTracker</span>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={onMobileClose}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
            </aside>
        </>
    );
};

export default Sidebar;
