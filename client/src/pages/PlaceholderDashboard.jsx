import { useAuth } from '../context/AuthContext';
import { FaHardHat } from 'react-icons/fa';

const PlaceholderDashboard = () => {
    const { user } = useAuth();

    const formatRole = (role) => {
        const roles = {
            hod: 'HOD',
            classcoordinator: 'Class Coordinator',
            teacher: 'Teacher',
            student: 'Student',
            parent: 'Parent'
        };
        return roles[role] || role;
    };

    return (
        <div className="placeholder-dashboard">
            <div className="placeholder-content">
                <div className="placeholder-icon"><FaHardHat size={48} /></div>
                <h2>{formatRole(user?.role)} Dashboard</h2>
                <p>Coming soon</p>
                <p style={{ marginTop: '16px', color: 'var(--gray-400)', fontSize: '14px' }}>
                    This dashboard is under development.<br />
                    Please check back later.
                </p>
            </div>
        </div>
    );
};

export default PlaceholderDashboard;
