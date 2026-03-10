import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiUsers, FiUser, FiGrid, FiLayers } from 'react-icons/fi';

const Dashboard = () => {
    const [stats, setStats] = useState({
        students: 0,
        teachers: 0,
        departments: 0,
        classes: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon students"><FiUsers size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats.students}</h3>
                        <p>Total Students</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon teachers"><FiUser size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats.teachers}</h3>
                        <p>Total Teachers</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon departments"><FiGrid size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats.departments}</h3>
                        <p>Departments</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon classes"><FiLayers size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats.classes}</h3>
                        <p>Classes</p>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Welcome to UniTracker</h2>
                </div>
                <p style={{ color: 'var(--gray-600)' }}>
                    UniTracker - Your central dashboard for managing academic operations.
                    Use the sidebar navigation to access different modules.
                </p>
            </div>
        </div>
    );
};

export default Dashboard;

