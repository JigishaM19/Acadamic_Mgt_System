import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { FaUserGraduate, FaUserEdit, FaUserFriends, FaUserTie, FaUserShield, FaChalkboardTeacher, FaExclamationTriangle } from "react-icons/fa";
import { FiChevronDown, FiLogIn, FiHelpCircle, FiBook, FiShield, FiKey } from "react-icons/fi";
import appLogo from '../assets/logo.svg';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [selectedRole, setSelectedRole] = useState('');
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [collegeInfo, setCollegeInfo] = useState({ collegeName: '', collegeLogo: '' });
    const { login } = useAuth();
    const navigate = useNavigate();
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowRoleDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch college info for login page (public endpoint, no auth needed)
    useEffect(() => {
        const fetchCollegeInfo = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/college-detail/public');
                if (response.ok) {
                    const data = await response.json();
                    setCollegeInfo(data);
                }
            } catch (err) {
                console.error('Failed to fetch college info:', err);
            }
        };
        fetchCollegeInfo();
    }, []);

    const roles = [
        { value: 'student', icon: <FaUserGraduate />, label: 'Student' },
        { value: 'parent', icon: <FaUserFriends />, label: 'Parent' },
        { value: 'teacher', icon: <FaUserEdit />, label: 'Teacher' },
        { value: 'classcoordinator', icon: <FaUserEdit />, label: 'Class Coordinator' },
        { value: 'hod', icon: <FaUserTie />, label: 'Head of Department' },
        { value: 'admin', icon: <FaUserShield />, label: 'Admin' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!selectedRole) {
            setError('Please select a role');
            return;
        }

        setLoading(true);

        try {
            const result = await login(username, password, selectedRole);

            if (result.mustChangePassword) {
                navigate('/change-password');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* Animated background shapes */}
            <div className="login-bg-shapes">
                <div className="login-shape login-shape-1"></div>
                <div className="login-shape login-shape-2"></div>
                <div className="login-shape login-shape-3"></div>
            </div>

            {/* App branding bar at top */}
            <div className="login-app-bar">
                <img src={appLogo} alt="UniTracker" className="login-app-logo" />
                <span className="login-app-name">UniTracker</span>
            </div>

            <div className="login-card">
                {/* College branding section */}
                <div className="login-header">
                    {collegeInfo.collegeLogo ? (
                        <div className="login-college-logo-wrapper">
                            <img
                                src={collegeInfo.collegeLogo}
                                alt={collegeInfo.collegeName || 'College'}
                                className="login-college-logo"
                            />
                        </div>
                    ) : (
                        <div className="login-college-logo-placeholder">
                            <FiBook size={32} />
                        </div>
                    )}
                    <h1>{collegeInfo.collegeName || 'Welcome'}</h1>
                    <p className="login-subtitle">Academic Monitoring System</p>
                </div>

                {error && (
                    <div className="error-message">
                        <FiShield size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <form className="login-form" onSubmit={handleSubmit}>
                    {/* Role Selector */}
                    <div className="form-group">
                        <label className="form-label">I am a</label>
                        <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
                            <div
                                className={`login-role-selector ${showRoleDropdown ? 'open' : ''}`}
                                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                            >
                                <span className="login-role-selected">
                                    {selectedRole ? (
                                        <>
                                            <span className="login-role-icon">{roles.find(r => r.value === selectedRole)?.icon}</span>
                                            {roles.find(r => r.value === selectedRole)?.label}
                                        </>
                                    ) : 'Select your role'}
                                </span>
                                <FiChevronDown className={`login-role-arrow ${showRoleDropdown ? 'rotated' : ''}`} />
                            </div>
                            {showRoleDropdown && (
                                <div className="login-role-dropdown">
                                    {roles.map((role) => (
                                        <div
                                            key={role.value}
                                            className={`login-role-option ${selectedRole === role.value ? 'selected' : ''}`}
                                            onClick={() => { setSelectedRole(role.value); setShowRoleDropdown(false); }}
                                        >
                                            <span className="login-role-icon">{role.icon}</span>
                                            {role.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Username */}
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            required
                            className="login-input"
                        />
                    </div>

                    {/* Password */}
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div className="login-password-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                required
                                className="login-input"
                                style={{ paddingRight: '44px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="login-password-toggle"
                                title={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <AiFillEye /> : <AiFillEyeInvisible />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="login-submit-btn" disabled={loading}>
                        {loading ? (
                            <span className="login-btn-loading">
                                <span className="login-spinner"></span>
                                Signing in...
                            </span>
                        ) : (
                            <>
                                <FiLogIn size={18} />
                                Sign In
                            </>
                        )}
                    </button>
                </form>

                {/* Instructions Toggle */}
                <button
                    className="login-help-toggle"
                    onClick={() => setShowInstructions(!showInstructions)}
                >
                    <FiHelpCircle size={16} />
                    {showInstructions ? 'Hide' : 'Show'} Login Instructions
                </button>

                {/* Instructions Panel */}
                {showInstructions && (
                    <div className="login-instructions">
                        <div className="login-instructions-header">
                            <FiKey size={18} />
                            <h4>First Time Login Guide</h4>
                        </div>

                        <div className="login-instruction-group">
                            <div className="login-instruction-card">
                                <div className="login-instruction-icon student-icon">
                                    <FaUserGraduate size={16} />
                                </div>
                                <div className="login-instruction-content">
                                    <strong>Students</strong>
                                    <div className="login-credential-list">
                                        <div className="login-credential">
                                            <span className="login-credential-label">Username:</span>
                                            <code>firstname + lastname + birthyear</code>
                                        </div>
                                        <div className="login-credential">
                                            <span className="login-credential-label">Password:</span>
                                            <code>firstname + DOB (ddmmyy)</code>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="login-instruction-card">
                                <div className="login-instruction-icon parent-icon">
                                    <FaUserFriends size={16} />
                                </div>
                                <div className="login-instruction-content">
                                    <strong>Parents</strong>
                                    <div className="login-credential-list">
                                        <div className="login-credential">
                                            <span className="login-credential-label">Username:</span>
                                            <code>fathername + lastname + mothername + student's birthyear</code>
                                        </div>
                                        <div className="login-credential">
                                            <span className="login-credential-label">Password:</span>
                                            <code>Same as student's password</code>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="login-instruction-card">
                                <div className="login-instruction-icon teacher-icon">
                                    <FaChalkboardTeacher size={16} />
                                </div>
                                <div className="login-instruction-content">
                                    <strong>Teachers / HOD / Class Coordinator</strong>
                                    <div className="login-credential-list">
                                        <div className="login-credential">
                                            <span className="login-credential-label">Username:</span>
                                            <code>firstname + lastname + birthyear</code>
                                        </div>
                                        <div className="login-credential">
                                            <span className="login-credential-label">Password:</span>
                                            <code>firstname + DOB (ddmmyy)</code>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="login-instruction-notice">
                            <FaExclamationTriangle size={14} />
                            <span>You will be asked to change your password on first login.</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="login-footer">
                <span>Powered by</span>
                <img src={appLogo} alt="UniTracker" className="login-footer-logo" />
                <span>UniTracker</span>
            </div>
        </div>
    );
};

export default Login;
