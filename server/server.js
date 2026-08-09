const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const dns = require('dns');

// Configure public DNS resolution for MongoDB Atlas SRV lookup
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
    console.log('DNS setServers notice:', e.message);
}

dotenv.config();
const app = express();
// Middleware
app.use(cors());
app.use(express.json({ limit: '110mb' }));
app.use(express.urlencoded({ limit: '110mb', extended: true }));
// MongoDB Connection
const { initAdmin } = require('./routes/auth');
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('MongoDB Connected');
        await initAdmin();
    })
    .catch(err => console.log('MongoDB Connection Error:', err));
// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/students', require('./routes/students'));
app.use('/api/teachers', require('./routes/teachers'));
app.use('/api/lectures', require('./routes/lectures'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/timeslots', require('./routes/timeslots'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/timetables', require('./routes/timetables'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/hod', require('./routes/hod'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/student', require('./routes/student'));
app.use('/api/cc', require('./routes/cc'));
app.use('/api/test-types', require('./routes/testTypes'));
app.use('/api/academic-settings', require('./routes/academicSettings'));
app.use('/api/college-detail', require('./routes/collegeDetail'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/profile', require('./routes/profile'));
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'UniTracker Server Running' });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});