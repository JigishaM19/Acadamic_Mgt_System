# UniTracker — University Academic Tracking & Management System

UniTracker (formerly ABAMS) is a comprehensive, role-based academic management web application designed for universities and colleges. It provides tailored dashboards for **Admins, HODs, Class Coordinators, Subject Teachers, Students, and Parents** to manage academic activities including attendance, timetables, tests, announcements, complaints, and more.

---

## ✨ Features

### 🔐 Authentication & Access Control
- JWT-based secure authentication
- Role-based dashboards and permissions (Admin, HOD, Class Coordinator, Teacher, Student, Parent)
- Password change & reset functionality
- User profile management with detailed personal information

### 👤 Admin Dashboard
- **User Management** — Add, edit, delete users; bulk upload via Excel; reset passwords
- **Student Management** — Manage students with department/class/year filters; bulk import
- **Teacher Management** — Manage teachers with role assignment (HOD, Class Coordinator); bulk import
- **Department Management** — Create and manage academic departments
- **Class Management** — Create classes, assign coordinators, view student rosters, reorganize batches
- **Subject Management** — Add subjects with theory/practical types, year/semester mapping; bulk import
- **Timetable Management** — Create and manage academic timetables with room/time slot allocation
- **Room & Time Slot Management** — Configure classrooms and lecture time slots
- **Test Type Configuration** — Define test types (Unit Test, Mid-Term, etc.)
- **Lecture Management** — Manage lecture configurations
- **Academic Settings** — Configure academic year, semesters, and other institution-wide settings
- **College Details** — Manage college information (name, address, logo, etc.)
- **Pagination** — All list views support pagination with 30, 50, 70, or 100 items per page

### 🎓 HOD Dashboard
- **Department Overview** — Stats and analytics for the department
- **Student Management** — View and manage department students; assign classes; bulk import/export
- **Teacher Management** — View department teachers and their class assignments
- **Subject Management** — Add/edit/delete department subjects; bulk upload
- **Class Management** — Create classes, assign coordinators, view students, reorganize batches; bulk upload
- **Timetable Management** — Configure department timetables with conflict detection
- **Lecture Management** — Manage department lectures
- **Attendance Monitoring** — View department-wide attendance data
- **Announcements** — Create and manage department announcements
- **Complaint Handling** — View and respond to student complaints
- **Leave Request Management** — Approve/reject student and teacher leave requests

### 📋 Class Coordinator Dashboard
- **Class Overview** — Dashboard with class statistics and recent activity
- **Student List** — View all students in assigned classes with search & pagination
- **Attendance Management** — Mark and view attendance; export attendance data to Excel
- **Test Management** — Create tests and manage test score sheets
- **Timetable View** — View class timetable
- **Announcements** — Create class-level announcements
- **Complaint Handling** — Manage student complaints
- **Leave Requests** — Handle student leave requests

### 👨‍🏫 Teacher Dashboard
- **Teaching Overview** — Dashboard with assigned subjects and classes
- **Attendance Marking** — Mark attendance with present/absent tracking; export to Excel
- **Test Score Management** — Enter and manage test scores
- **Timetable View** — View personal teaching schedule
- **Announcements** — Create subject-level announcements
- **Complaint Handling** — View and respond to student complaints
- **Leave Request Management** — Handle student leave requests; apply for own leave

### 🧑‍🎓 Student Dashboard
- **Academic Overview** — Dashboard with attendance, test scores, and announcements
- **Attendance View** — View personal attendance records and statistics
- **Test Scores** — View test scores and performance
- **Timetable** — View class timetable
- **Announcements** — View department and class announcements
- **Complaints** — Submit and track complaints
- **Leave Requests** — Apply for leave and track status

### 📊 Common Features
- **Pagination** — All data-heavy tables support pagination (30/50/70/100 items per page) with navigation arrows at top and bottom
- **Bulk Upload** — Excel-based bulk import for students, teachers, subjects, and classes with downloadable templates
- **Export to Excel** — Export attendance and other data to Excel format
- **Search & Filters** — All list views include search and filter capabilities
- **Real-time Notifications** — Bell notification system for important updates
- **Responsive Design** — Modern, clean UI that works across desktop and tablet devices
- **Announcements Banner** — Dashboard announcement carousel for latest updates

---

## 🛠️ Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | v19.2 | UI framework |
| Vite | v7.2 | Build tool & dev server |
| React Router DOM | v7.13 | Client-side routing |
| Axios | v1.13 | HTTP client |
| React Icons | v5.5 | Icon library (Feather, Font Awesome) |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | — | Runtime environment |
| Express.js | v4.18 | Web framework |
| MongoDB + Mongoose | v8.0 | Database & ODM |
| JWT (jsonwebtoken) | v9.0 | Authentication tokens |
| bcryptjs | v2.4 | Password hashing |
| Multer | v1.4 | File upload handling |
| xlsx | v0.18 | Excel file parsing & generation |

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18+): [Download & Install](https://nodejs.org/)
- **MongoDB**: [Download MongoDB Compass](https://www.mongodb.com/try/download/compass) or use [MongoDB Atlas](https://www.mongodb.com/atlas)
- **Git** (optional): [Download & Install](https://git-scm.com/)

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/SiddheshSD/UniTracker.git
cd UniTracker
```

### 2. Backend Setup (Server)

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install
```

Create a `.env` file in the `server/` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/unitracker
JWT_SECRET=your_secure_jwt_secret_key
```

> ⚠️ Replace `your_secure_jwt_secret_key` with a strong, random secret string.

Start the server:

```bash
npm run dev
```

The API server will start at `http://localhost:5000`.

### 3. Frontend Setup (Client)

Open a **new terminal**:

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

## 📂 Project Structure

```
UniTracker/
├── client/                          # React Frontend
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── Layout.jsx           # Main layout with sidebar & topnav
│   │   │   ├── Sidebar.jsx          # Navigation sidebar
│   │   │   ├── TopNav.jsx           # Top navigation bar
│   │   │   ├── Modal.jsx            # Reusable modal dialog
│   │   │   ├── Pagination.jsx       # Pagination component with hooks
│   │   │   ├── NotificationBell.jsx # Notification system
│   │   │   └── AboutCollege.jsx     # College information display
│   │   ├── pages/
│   │   │   ├── Login.jsx            # Authentication page
│   │   │   ├── Dashboard.jsx        # Admin dashboard
│   │   │   ├── Students.jsx         # Admin student management
│   │   │   ├── Teachers.jsx         # Admin teacher management
│   │   │   ├── Users.jsx            # Admin user management
│   │   │   ├── Classes.jsx          # Admin class management
│   │   │   ├── Subjects.jsx         # Admin subject management
│   │   │   ├── Timetable.jsx        # Admin timetable management
│   │   │   ├── hod/                 # HOD-specific pages
│   │   │   ├── cc/                  # Class Coordinator pages
│   │   │   ├── teacher/             # Teacher pages
│   │   │   └── student/             # Student pages
│   │   ├── services/
│   │   │   └── api.js               # Axios API configuration
│   │   └── index.css                # Global styles
│   └── package.json
├── server/                          # Express Backend
│   ├── models/                      # Mongoose database models
│   ├── routes/                      # API route definitions
│   ├── middleware/                   # Auth & other middleware
│   ├── server.js                    # Express server entry point
│   └── package.json
└── README.md
```

---

## 🔑 Usage

### First-Time Setup

1. Start both the backend and frontend servers as described above.
2. The system will need an initial Admin user. Create one directly in MongoDB or through a seeding script.
3. Log in with Admin credentials to set up departments, classes, subjects, and users.

### Role-Specific Workflows

| Role | Key Actions |
|---|---|
| **Admin** | Manage all users, departments, classes, subjects, timetables, and system settings |
| **HOD** | Oversee department activities, manage subjects/classes, handle complaints and leave requests |
| **Class Coordinator** | Manage assigned class students, mark attendance, handle complaints |
| **Teacher** | Mark attendance, enter test scores, view timetable, manage announcements |
| **Student** | View attendance, test scores, timetable, submit complaints, apply for leave |

---

## 📌 Version History

| Version | Highlights |
|---|---|
| **1.0.0** | Initial release with core role-based dashboards and user management |
| **1.1.0** | Added attendance, timetable, and test management features |
| **1.2.0** | Added bulk upload/import, announcements, complaints, and leave request systems |
| **1.2.1** | Attendance export to Excel, UI improvements |
| **1.2.2** | Enhanced subject details, marks tracking, performance graphs |
| **1.2.4** | File storage improvements, auto-renaming, About section with social links |
| **1.2.5** | Onboarding experience, settings export/import, subject data management |
| **1.2.6** | Pagination across all data tables (30/50/70/100 per page) with top & bottom navigation |

---

## 📄 License

This project is for educational and academic purposes.