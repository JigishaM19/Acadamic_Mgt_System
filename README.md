# ABAMS - AI-Based Academic Monitoring System

ABAMS is a role-based academic monitoring web application designed to manage and monitor academic activities. It supports multiple user roles including Admin, HOD, Class Coordinator, Subject Teacher, Student, and Parent.

## Features

- **Role-Based Access Control**: tailored dashboards for Admins, HODs, Teachers, Students, etc.
- **User Management**: Admin can add and manage users, departments, and classes.
- **Attendance & Timetable**: Manage and view academic schedules and attendance records.
- **Modern UI**: Clean, responsive interface built with React.

## Technology Stack

### Frontend
- **React** (v19)
- **Vite**
- **React Router Dom**
- **Axios**
- **React Icons**

### Backend
- **Node.js**
- **Express.js**
- **MongoDB** (with Mongoose)
- **JWT** (JSON Web Tokens) for authentication
- **Multer** for file uploads

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js**: [Download & Install](https://nodejs.org/)
- **MongoDB**: [Download & Install via MongoDB Compass](https://www.mongodb.com/try/download/compass) or use MongoDB Atlas.

## Installation & Setup

### 1. Backend Setup (Server)

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `server` directory and configure your environment variables:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/abams
   JWT_SECRET=your_jwt_secret_key_here
   ```
   *(Note: Replace `your_jwt_secret_key_here` with a secure secret string)*

4. Start the server:
   ```bash
   npm run dev
   ```
   The server will run on `http://localhost:5000`.

### 2. Frontend Setup (Client)

1. Open a new terminal and navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

## Usage

1. **Login**: Use the credentials provided by your Administrator.
   - Default Admin credentials should be set up during the initial database seeding or manual creation if not provided.

2. **Dashboards**:
   - **Admin**: Manage users, classes, departments, and timetables.
   - **HOD**: Monitor department-specific activities.
   - **Teacher**: Mark attendance, view schedules.
   - **Student**: View attendance, timetable.

## Project Structure

- **client/**: React frontend application.
  - `src/pages/`: Page components for different routes.
  - `src/components/`: Reusable UI components.
- **server/**: Express backend application.
  - `models/`: Mongoose database models.
  - `routes/`: API route definitions.
  - `middleware/`: Authentication and other middleware.

## License
This project is for educational/learning purposes.