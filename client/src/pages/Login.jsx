import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { FaUserGraduate, FaUserEdit, FaUserFriends, FaUserTie, FaUserShield, FaChalkboardTeacher, FaExclamationTriangle } from "react-icons/fa";
import { FiChevronDown, FiLogIn, FiHelpCircle, FiKey, FiBarChart2, FiUsers, FiClipboard, FiShield, FiCheckCircle } from "react-icons/fi";
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

    const features = [
        {
            icon: <FiBarChart2 />,
            title: 'Attendance Analytics',
            desc: 'Real-time tracking and visual reports for every class and student.'
        },
        {
            icon: <FiUsers />,
            title: 'Multi-Role Access',
            desc: 'Dedicated dashboards for students, parents, teachers, HODs, and admins.'
        },
        {
            icon: <FiClipboard />,
            title: 'Academic Monitoring',
            desc: 'Track academic progress, defaulter lists, and semester performance.'
        },
        {
            icon: <FiShield />,
            title: 'Secure & Reliable',
            desc: 'Role-based access control keeps every account private and safe.'
        }
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
            {/* ---- Left Panel: App Info ---- */}
            <div className="login-info-panel">
                <div className="login-info-inner">
                    {/* Brand */}
                    <div className="login-brand">
                        <img src={appLogo} alt="UniTracker" className="login-brand-logo" />
                        <span className="login-brand-name">UniTracker</span>
                    </div>

                    {/* Hero Text */}
                    <h1 className="login-hero-title">
                        Smarter Attendance.<br />Simpler Management.
                    </h1>
                    <p className="login-hero-subtitle">
                        The all-in-one academic monitoring platform that connects students,
                        parents, teachers, and administrators — making attendance tracking
                        effortless and transparent.
                    </p>

                    {/* Feature Cards */}
                    <div className="login-features">
                        {features.map((f, i) => (
                            <div className="login-feature-card" key={i} style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
                                <div className="login-feature-icon">{f.icon}</div>
                                <div>
                                    <h4>{f.title}</h4>
                                    <p>{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer credit */}
                <div className="login-info-footer">
                    <FiCheckCircle size={13} />
                    <span>Trusted by departments across the institution</span>
                </div>
            </div>

            {/* ---- Right Panel: Login Form ---- */}
            <div className="login-form-panel">
                <div className="login-card">
                    {/* College / App Branding */}
                    <div className="login-college-branding">
                        <img
                            src={collegeInfo.collegeLogo || appLogo}
                            alt={collegeInfo.collegeName || 'UniTracker'}
                            className="login-college-logo"
                        />
                        <span className="login-college-name">
                            {collegeInfo.collegeName || 'UniTracker'}
                        </span>
                    </div>

                    {/* Heading */}
                    <div className="login-card-header">
                        <h2>Welcome back</h2>
                        <p>Sign in to your {collegeInfo.collegeName ? collegeInfo.collegeName : 'UniTracker'} account</p>
                    </div>

                    {error && (
                        <div className="login-error">
                            <FiShield size={15} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form className="login-form" onSubmit={handleSubmit}>
                        {/* Role Selector */}
                        <div className="login-field">
                            <label>I am a</label>
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
                        <div className="login-field">
                            <label>Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                required
                                className="login-input"
                            />
                        </div>

                        {/* Password */}
                        <div className="login-field">
                            <label>Password</label>
                            <div className="login-password-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
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
                        <FiHelpCircle size={15} />
                        {showInstructions ? 'Hide' : 'Show'} Login Instructions
                    </button>

                    {/* Instructions Panel */}
                    {showInstructions && (
                        <div className="login-instructions">
                            <div className="login-instructions-header">
                                <FiKey size={16} />
                                <h4>First Time Login Guide</h4>
                            </div>

                            <div className="login-instruction-group">
                                <div className="login-instruction-card">
                                    <div className="login-instruction-icon student-icon">
                                        <FaUserGraduate size={14} />
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
                                        <FaUserFriends size={14} />
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
                                        <FaChalkboardTeacher size={14} />
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
                                <FaExclamationTriangle size={13} />
                                <span>You will be asked to change your password on first login.</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom subtle credit */}
                <div className="login-panel-footer">
                    <span>Powered by</span>
                    <img src={appLogo} alt="UniTracker" className="login-panel-footer-logo" />
                    <span>UniTracker</span>
                </div>
            </div>
        </div>
    );
};

export default Login;
