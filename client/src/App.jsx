import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Lectures from './pages/Lectures';
import Departments from './pages/Departments';
import Classes from './pages/Classes';
import Rooms from './pages/Rooms';
import TimeSlots from './pages/TimeSlots';
import Timetable from './pages/Timetable';
import Subjects from './pages/Subjects';
import TestTypes from './pages/TestTypes';
import AcademicSettings from './pages/AcademicSettings';
import CollegeDetail from './pages/CollegeDetail';
import Profile from './pages/Profile';
import AboutCollegePage from './pages/AboutCollegePage';
import PlaceholderDashboard from './pages/PlaceholderDashboard';

// HOD Pages
import HodDashboard from './pages/hod/HodDashboard';
import HodAttendance from './pages/hod/HodAttendance';
import HodStudents from './pages/hod/HodStudents';
import HodTeachers from './pages/hod/HodTeachers';
import HodClasses from './pages/hod/HodClasses';
import HodTimetable from './pages/hod/HodTimetable';
import HodLeaveRequests from './pages/hod/HodLeaveRequests';
import HodComplaints from './pages/hod/HodComplaints';
import HodLectures from './pages/hod/HodLectures';
import HodSubjects from './pages/hod/HodSubjects';
import HodAnnouncements from './pages/hod/HodAnnouncements';
import HodDefaulters from './pages/hod/HodDefaulters';
import HodAssignments from './pages/hod/HodAssignments';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import TeacherAttendanceSheet from './pages/teacher/TeacherAttendanceSheet';
import TeacherTests from './pages/teacher/TeacherTests';
import TeacherTestSheet from './pages/teacher/TeacherTestSheet';
import TeacherTimetable from './pages/teacher/TeacherTimetable';
import TeacherLeaveRequests from './pages/teacher/TeacherLeaveRequests';
import TeacherComplaints from './pages/teacher/TeacherComplaints';
import TeacherAnnouncements from './pages/teacher/TeacherAnnouncements';
import TeacherDefaulters from './pages/teacher/TeacherDefaulters';
import TeacherAssignments from './pages/teacher/TeacherAssignments';
import TeacherAssignmentSheet from './pages/teacher/TeacherAssignmentSheet';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentTimetable from './pages/student/StudentTimetable';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentTestScores from './pages/student/StudentTestScores';
import StudentLeaveRequests from './pages/student/StudentLeaveRequests';
import StudentComplaints from './pages/student/StudentComplaints';
import StudentAnnouncements from './pages/student/StudentAnnouncements';
import StudentAssignments from './pages/student/StudentAssignments';

// Class Coordinator Pages
import CCDashboard from './pages/cc/CCDashboard';
import CCTimetable from './pages/cc/CCTimetable';
import CCAttendance from './pages/cc/CCAttendance';
import CCAttendanceSheet from './pages/cc/CCAttendanceSheet';
import CCTests from './pages/cc/CCTests';
import CCTestSheet from './pages/cc/CCTestSheet';
import CCStudents from './pages/cc/CCStudents';
import CCLeaveRequests from './pages/cc/CCLeaveRequests';
import CCComplaints from './pages/cc/CCComplaints';
import CCAnnouncements from './pages/cc/CCAnnouncements';
import CCDefaulters from './pages/cc/CCDefaulters';
import CCAssignments from './pages/cc/CCAssignments';
import CCAssignmentSheet from './pages/cc/CCAssignmentSheet';

import './index.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return children;
};

// Admin Only Route
const AdminRoute = ({ children }) => {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <PlaceholderDashboard />;
  }

  return children;
};

// HOD Only Route
const HodRoute = ({ children }) => {
  const { user } = useAuth();

  if (user?.role !== 'hod') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Teacher Only Route
const TeacherRoute = ({ children }) => {
  const { user } = useAuth();

  if (user?.role !== 'teacher') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Class Coordinator Only Route
const CCRoute = ({ children }) => {
  const { user } = useAuth();

  if (user?.role !== 'classcoordinator') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Student Only Route
const StudentRoute = ({ children }) => {
  const { user } = useAuth();

  if (user?.role !== 'student') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Parent Only Route
const ParentRoute = ({ children }) => {
  const { user } = useAuth();

  if (user?.role !== 'parent') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Smart Dashboard - redirects based on role
const SmartDashboard = () => {
  const { user } = useAuth();

  if (user?.role === 'hod') {
    return <Navigate to="/hod/dashboard" replace />;
  }

  if (user?.role === 'teacher') {
    return <Navigate to="/teacher/dashboard" replace />;
  }

  if (user?.role === 'classcoordinator') {
    return <Navigate to="/cc/dashboard" replace />;
  }

  if (user?.role === 'student') {
    return <Navigate to="/student/dashboard" replace />;
  }

  if (user?.role === 'parent') {
    return <Navigate to="/parent/dashboard" replace />;
  }

  return <Dashboard />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<SmartDashboard />} />

            {/* Admin Routes */}
            <Route path="users" element={<AdminRoute><Users /></AdminRoute>} />
            <Route path="students" element={<AdminRoute><Students /></AdminRoute>} />
            <Route path="teachers" element={<AdminRoute><Teachers /></AdminRoute>} />
            <Route path="lectures" element={<AdminRoute><Lectures /></AdminRoute>} />
            <Route path="departments" element={<AdminRoute><Departments /></AdminRoute>} />
            <Route path="classes" element={<AdminRoute><Classes /></AdminRoute>} />
            <Route path="rooms" element={<AdminRoute><Rooms /></AdminRoute>} />
            <Route path="timeslots" element={<AdminRoute><TimeSlots /></AdminRoute>} />
            <Route path="timetable" element={<AdminRoute><Timetable /></AdminRoute>} />
            <Route path="subjects" element={<AdminRoute><Subjects /></AdminRoute>} />
            <Route path="test-types" element={<AdminRoute><TestTypes /></AdminRoute>} />
            <Route path="academic-settings" element={<AdminRoute><AcademicSettings /></AdminRoute>} />
            <Route path="college-detail" element={<AdminRoute><CollegeDetail /></AdminRoute>} />

            {/* Profile Route - accessible to all authenticated users */}
            <Route path="profile" element={<Profile />} />

            {/* HOD Routes */}
            <Route path="hod/dashboard" element={<HodRoute><HodDashboard /></HodRoute>} />
            <Route path="hod/attendance" element={<HodRoute><HodAttendance /></HodRoute>} />
            <Route path="hod/students" element={<HodRoute><HodStudents /></HodRoute>} />
            <Route path="hod/teachers" element={<HodRoute><HodTeachers /></HodRoute>} />
            <Route path="hod/subjects" element={<HodRoute><HodSubjects /></HodRoute>} />
            <Route path="hod/lectures" element={<HodRoute><HodLectures /></HodRoute>} />
            <Route path="hod/classes" element={<HodRoute><HodClasses /></HodRoute>} />
            <Route path="hod/timetable" element={<HodRoute><HodTimetable /></HodRoute>} />
            <Route path="hod/leave-requests" element={<HodRoute><HodLeaveRequests /></HodRoute>} />
            <Route path="hod/complaints" element={<HodRoute><HodComplaints /></HodRoute>} />
            <Route path="hod/announcements" element={<HodRoute><HodAnnouncements /></HodRoute>} />
            <Route path="hod/defaulters" element={<HodRoute><HodDefaulters /></HodRoute>} />
            <Route path="hod/assignments" element={<HodRoute><HodAssignments /></HodRoute>} />
            <Route path="hod/about-college" element={<HodRoute><AboutCollegePage /></HodRoute>} />

            {/* Teacher Routes */}
            <Route path="teacher/dashboard" element={<TeacherRoute><TeacherDashboard /></TeacherRoute>} />
            <Route path="teacher/attendance" element={<TeacherRoute><TeacherAttendance /></TeacherRoute>} />
            <Route path="teacher/attendance/:classId/:subject" element={<TeacherRoute><TeacherAttendanceSheet /></TeacherRoute>} />
            <Route path="teacher/tests" element={<TeacherRoute><TeacherTests /></TeacherRoute>} />
            <Route path="teacher/tests/:classId/:subject" element={<TeacherRoute><TeacherTestSheet /></TeacherRoute>} />
            <Route path="teacher/timetable" element={<TeacherRoute><TeacherTimetable /></TeacherRoute>} />
            <Route path="teacher/leave-requests" element={<TeacherRoute><TeacherLeaveRequests /></TeacherRoute>} />
            <Route path="teacher/complaints" element={<TeacherRoute><TeacherComplaints /></TeacherRoute>} />
            <Route path="teacher/announcements" element={<TeacherRoute><TeacherAnnouncements /></TeacherRoute>} />
            <Route path="teacher/defaulters" element={<TeacherRoute><TeacherDefaulters /></TeacherRoute>} />
            <Route path="teacher/assignments" element={<TeacherRoute><TeacherAssignments /></TeacherRoute>} />
            <Route path="teacher/assignments/:classId/:subject" element={<TeacherRoute><TeacherAssignmentSheet /></TeacherRoute>} />
            <Route path="teacher/about-college" element={<TeacherRoute><AboutCollegePage /></TeacherRoute>} />

            {/* Class Coordinator Routes */}
            <Route path="cc/dashboard" element={<CCRoute><CCDashboard /></CCRoute>} />
            <Route path="cc/timetable" element={<CCRoute><CCTimetable /></CCRoute>} />
            <Route path="cc/attendance" element={<CCRoute><CCAttendance /></CCRoute>} />
            <Route path="cc/attendance/:subject" element={<CCRoute><CCAttendanceSheet /></CCRoute>} />
            <Route path="cc/tests" element={<CCRoute><CCTests /></CCRoute>} />
            <Route path="cc/tests/:subject" element={<CCRoute><CCTestSheet /></CCRoute>} />
            <Route path="cc/students" element={<CCRoute><CCStudents /></CCRoute>} />
            <Route path="cc/leave-requests" element={<CCRoute><CCLeaveRequests /></CCRoute>} />
            <Route path="cc/complaints" element={<CCRoute><CCComplaints /></CCRoute>} />
            <Route path="cc/announcements" element={<CCRoute><CCAnnouncements /></CCRoute>} />
            <Route path="cc/defaulters" element={<CCRoute><CCDefaulters /></CCRoute>} />
            <Route path="cc/assignments" element={<CCRoute><CCAssignments /></CCRoute>} />
            <Route path="cc/assignments/:subject" element={<CCRoute><CCAssignmentSheet /></CCRoute>} />
            <Route path="cc/about-college" element={<CCRoute><AboutCollegePage /></CCRoute>} />

            {/* Student Routes */}
            <Route path="student/dashboard" element={<StudentRoute><StudentDashboard /></StudentRoute>} />
            <Route path="student/timetable" element={<StudentRoute><StudentTimetable /></StudentRoute>} />
            <Route path="student/attendance" element={<StudentRoute><StudentAttendance /></StudentRoute>} />
            <Route path="student/tests" element={<StudentRoute><StudentTestScores /></StudentRoute>} />
            <Route path="student/leave-requests" element={<StudentRoute><StudentLeaveRequests /></StudentRoute>} />
            <Route path="student/complaints" element={<StudentRoute><StudentComplaints /></StudentRoute>} />
            <Route path="student/announcements" element={<StudentRoute><StudentAnnouncements /></StudentRoute>} />
            <Route path="student/assignments" element={<StudentRoute><StudentAssignments /></StudentRoute>} />
            <Route path="student/about-college" element={<StudentRoute><AboutCollegePage /></StudentRoute>} />

            {/* Parent Routes - reuse student components */}
            <Route path="parent/dashboard" element={<ParentRoute><StudentDashboard /></ParentRoute>} />
            <Route path="parent/timetable" element={<ParentRoute><StudentTimetable /></ParentRoute>} />
            <Route path="parent/attendance" element={<ParentRoute><StudentAttendance /></ParentRoute>} />
            <Route path="parent/tests" element={<ParentRoute><StudentTestScores /></ParentRoute>} />
            <Route path="parent/leave-requests" element={<ParentRoute><StudentLeaveRequests /></ParentRoute>} />
            <Route path="parent/complaints" element={<ParentRoute><StudentComplaints /></ParentRoute>} />
            <Route path="parent/announcements" element={<ParentRoute><StudentAnnouncements /></ParentRoute>} />
            <Route path="parent/assignments" element={<ParentRoute><StudentAssignments /></ParentRoute>} />
            <Route path="parent/about-college" element={<ParentRoute><AboutCollegePage /></ParentRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

