import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

const Layout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    const getPageTitle = () => {
        const path = location.pathname;

        // Exact match titles
        const exactTitles = {
            '/dashboard': 'Dashboard',
            '/users': 'User Management',
            '/departments': 'Departments',
            '/classes': 'Classes',
            '/timetable': 'Timetable',
            '/rooms': 'Classrooms & Labs',
            '/timeslots': 'Time Slots',
            '/students': 'Students',
            '/teachers': 'Teachers',
            '/lectures': 'Lectures',
            '/subjects': 'Subjects',
            '/test-types': 'Test Types',
            '/academic-settings': 'Academic Settings',
            '/profile': 'Profile',
            // HOD titles
            '/hod/dashboard': 'HOD Dashboard',
            '/hod/attendance': 'Attendance',
            '/hod/students': 'Students',
            '/hod/teachers': 'Teachers',
            '/hod/lectures': 'Lectures',
            '/hod/classes': 'Classes',
            '/hod/timetable': 'Timetable',
            '/hod/leave-requests': 'Leave Requests',
            '/hod/complaints': 'Complaints',
            '/hod/announcements': 'Announcements',
            // CC titles
            '/cc/dashboard': 'CC Dashboard',
            '/cc/timetable': 'Timetable',
            '/cc/attendance': 'Attendance',
            '/cc/tests': 'Tests',
            '/cc/students': 'Students',
            '/cc/leave-requests': 'Leave Requests',
            '/cc/complaints': 'Complaints',
            '/cc/announcements': 'Announcements',
            // Teacher titles
            '/teacher/dashboard': 'Teacher Dashboard',
            '/teacher/attendance': 'Attendance',
            '/teacher/tests': 'Tests',
            '/teacher/timetable': 'My Timetable',
            '/teacher/leave-requests': 'Leave Requests',
            '/teacher/complaints': 'Complaints',
            '/teacher/announcements': 'Announcements',
            // Student titles
            '/student/dashboard': 'Student Dashboard',
            '/student/timetable': 'Class Timetable',
            '/student/attendance': 'My Attendance',
            '/student/tests': 'Test Scores',
            '/student/leave-requests': 'Leave Requests',
            '/student/complaints': 'Complaints',
            '/student/announcements': 'Announcements',
            // Parent titles
            '/parent/dashboard': 'Parent Dashboard',
            '/parent/timetable': 'Class Timetable',
            '/parent/attendance': 'Attendance',
            '/parent/tests': 'Test Scores',
            '/parent/leave-requests': 'Leave Requests',
            '/parent/complaints': 'Complaints',
            '/parent/announcements': 'Announcements',
        };

        // Check exact match first
        if (exactTitles[path]) return exactTitles[path];

        // Handle nested routes (e.g., /teacher/attendance/:classId/:subject)
        if (path.startsWith('/teacher/attendance/')) return 'Attendance Sheet';
        if (path.startsWith('/teacher/tests/')) return 'Test Sheet';

        return 'Dashboard';
    };

    const handleToggle = () => {
        if (window.innerWidth <= 768) {
            setMobileOpen(!mobileOpen);
        } else {
            setCollapsed(!collapsed);
        }
    };

    return (
        <div className="main-layout">
            <Sidebar
                collapsed={collapsed}
                mobileOpen={mobileOpen}
                onMobileClose={() => setMobileOpen(false)}
            />
            <div className={`content-wrapper ${collapsed ? 'collapsed' : ''}`}>
                <TopNav
                    collapsed={collapsed}
                    onToggle={handleToggle}
                    pageTitle={getPageTitle()}
                />
                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
