import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiMail, FiPhone, FiCalendar, FiMapPin, FiInfo, FiUsers, FiSave, FiEdit, FiLock, FiKey, FiBook, FiHash, FiLayers, FiGrid, FiHeart } from 'react-icons/fi';

const Profile = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

    const [formData, setFormData] = useState({
        about: '',
        address: {
            street: '',
            city: '',
            state: '',
            pincode: ''
        },
        emergencyContact: {
            name: '',
            phone: '',
            relation: ''
        }
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await api.get('/profile');
            setProfile(response.data);
            setFormData({
                about: response.data.about || '',
                address: {
                    street: response.data.address?.street || '',
                    city: response.data.address?.city || '',
                    state: response.data.address?.state || '',
                    pincode: response.data.address?.pincode || ''
                },
                emergencyContact: {
                    name: response.data.emergencyContact?.name || '',
                    phone: response.data.emergencyContact?.phone || '',
                    relation: response.data.emergencyContact?.relation || ''
                }
            });
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            setMessage({ type: 'error', text: 'Failed to load profile' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            await api.put('/profile', formData);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setEditing(false);
            fetchProfile();
        } catch (error) {
            console.error('Failed to update profile:', error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update profile' });
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordMessage({ type: '', text: '' });

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setPasswordSaving(true);

        try {
            await api.put('/profile/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
            setTimeout(() => {
                setShowPasswordModal(false);
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setPasswordMessage({ type: '', text: '' });
            }, 1500);
        } catch (error) {
            console.error('Failed to change password:', error);
            setPasswordMessage({ type: 'error', text: error.response?.data?.message || 'Failed to change password' });
        } finally {
            setPasswordSaving(false);
        }
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatRole = (role) => {
        const roles = {
            admin: 'Admin',
            hod: 'Head of Department',
            classcoordinator: 'Class Coordinator',
            teacher: 'Teacher',
            student: 'Student',
            parent: 'Parent'
        };
        return roles[role] || role;
    };

    const formatGender = (gender) => {
        if (!gender) return 'N/A';
        return gender.charAt(0).toUpperCase() + gender.slice(1);
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
            {/* Profile Header Card */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiUser size={20} /> My Profile
                    </h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={() => { setShowPasswordModal(true); setPasswordMessage({ type: '', text: '' }); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <FiKey size={16} /> Change Password
                        </button>
                        {!editing && (
                            <button className="btn btn-primary" onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FiEdit size={16} /> Edit Profile
                            </button>
                        )}
                    </div>
                </div>

                {message.text && (
                    <div className={`alert alert-${message.type}`} style={{
                        margin: '0 24px 16px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: message.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
                        color: message.type === 'success' ? 'var(--success)' : 'var(--danger)'
                    }}>
                        {message.text}
                    </div>
                )}

                {/* Profile Header with Avatar */}
                <div style={{
                    padding: '24px',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '24px',
                    flexWrap: 'wrap'
                }}>
                    <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2.5rem',
                        fontWeight: 'bold'
                    }}>
                        {profile?.firstName?.charAt(0)}{profile?.lastName?.charAt(0)}
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.75rem' }}>{profile?.fullName}</h2>
                        <p style={{ margin: '8px 0 0', opacity: 0.9, textTransform: 'capitalize' }}>
                            {formatRole(profile?.role)} {profile?.rollNo ? `• Roll No: ${profile.rollNo}` : ''}
                        </p>
                        <p style={{ margin: '4px 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
                            @{profile?.username}
                        </p>
                    </div>
                </div>
            </div>

            {/* Basic Information (View Only) */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiInfo size={18} /> Basic Information
                    </h3>
                    <span className="badge badge-secondary">View Only</span>
                </div>
                <div style={{ padding: '24px' }}>
                    <div className="info-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '20px'
                    }}>
                        <div className="info-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                                <FiUser size={14} /> Full Name
                            </div>
                            <div style={{ fontWeight: '500', color: 'var(--gray-800)' }}>{profile?.fullName || 'N/A'}</div>
                        </div>
                        <div className="info-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                                <FiUser size={14} /> First Name
                            </div>
                            <div style={{ fontWeight: '500', color: 'var(--gray-800)' }}>{profile?.firstName || 'N/A'}</div>
                        </div>
                        <div className="info-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                                <FiUser size={14} /> Father's Name
                            </div>
                            <div style={{ fontWeight: '500', color: 'var(--gray-800)' }}>{profile?.fatherName || 'N/A'}</div>
                        </div>
                        <div className="info-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                                <FiUser size={14} /> Last Name
                            </div>
                            <div style={{ fontWeight: '500', color: 'var(--gray-800)' }}>{profile?.lastName || 'N/A'}</div>
                        </div>
                        {profile?.motherName && (
                            <div className="info-item">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                                    <FiUser size={14} /> Mother's Name
                                </div>
                                <div style={{ fontWeight: '500', color: 'var(--gray-800)' }}>{profile.motherName}</div>
                            </div>
                        )}
                        <div className="info-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                                <FiUser size={14} /> Username
                            </div>
                            <div style={{ fontWeight: '500', color: 'var(--gray-800)' }}>@{profile?.username || 'N/A'}</div>
                        </div>
                        <div className="info-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                                <FiCalendar size={14} /> Date of Birth
                            </div>
                            <div style={{ fontWeight: '500', color: 'var(--gray-800)' }}>{formatDate(profile?.dob)}</div>
                        </div>
                        <div className="info-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                                <FiHeart size={14} /> Gender
                            </div>
                            <div style={{ fontWeight: '500', color: 'var(--gray-800)' }}>{formatGender(profile?.gender)}</div>
                        </div>
                        <div className="info-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                                <FiPhone size={14} /> Phone Number
                            </div>
                            <div style={{ fontWeight: '500', color: 'var(--gray-800)' }}>{profile?.phone || 'N/A'}</div>
                        </div>
                        <div className="info-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                                <FiMail size={14} /> Email
                            </div>
                            <div style={{ fontWeight: '500', color: 'var(--gray-800)' }}>{profile?.email || 'N/A'}</div>
                        </div>
                        <div className="info-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                                <FiLayers size={14} /> Role
                            </div>
                            <div style={{ fontWeight: '500', color: 'var(--gray-800)', textTransform: 'capitalize' }}>{formatRole(profile?.role)}</div>
                        </div>
                        {profile?.departmentId && (
                            <div className="info-item">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                                    <FiGrid size={14} /> Department
                                </div>
                                <div style={{ fontWeight: '500', color: 'var(--gray-800)' }}>{profile.departmentId?.name || 'N/A'}</div>
                            </div>
                        )}
                        {profile?.classId && (
                            <div className="info-item">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                                    <FiBook size={14} /> Class
                                </div>
                                <div style={{ fontWeight: '500', color: 'var(--gray-800)' }}>{profile.classId?.name || 'N/A'}</div>
                            </div>
                        )}
                        {profile?.year && (
                            <div className="info-item">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                                    <FiCalendar size={14} /> Year
                                </div>
                                <div style={{ fontWeight: '500', color: 'var(--gray-800)' }}>Year {profile.year}</div>
                            </div>
                        )}
                        {profile?.rollNo && (
                            <div className="info-item">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                                    <FiHash size={14} /> Roll Number
                                </div>
                                <div style={{ fontWeight: '500', color: 'var(--gray-800)' }}>{profile.rollNo}</div>
                            </div>
                        )}
                        {profile?.parentPhone && (
                            <div className="info-item">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                                    <FiPhone size={14} /> Parent Phone
                                </div>
                                <div style={{ fontWeight: '500', color: 'var(--gray-800)' }}>{profile.parentPhone}</div>
                            </div>
                        )}
                        {profile?.parentEmail && (
                            <div className="info-item">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                                    <FiMail size={14} /> Parent Email
                                </div>
                                <div style={{ fontWeight: '500', color: 'var(--gray-800)' }}>{profile.parentEmail}</div>
                            </div>
                        )}
                        <div className="info-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', marginBottom: '4px' }}>
                                <FiCalendar size={14} /> Member Since
                            </div>
                            <div style={{ fontWeight: '500', color: 'var(--gray-800)' }}>{formatDate(profile?.createdAt)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {editing ? (
                /* Editable Form */
                <form onSubmit={handleSubmit}>
                    {/* About Me Section (Editable) */}
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div className="card-header">
                            <h3 className="card-title">About Me</h3>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <div className="form-group">
                                <textarea
                                    name="about"
                                    value={formData.about}
                                    onChange={handleChange}
                                    placeholder="Write something about yourself..."
                                    rows={4}
                                    maxLength={500}
                                    style={{ resize: 'vertical' }}
                                />
                                <small style={{ color: 'var(--gray-500)' }}>{formData.about.length}/500 characters</small>
                            </div>
                        </div>
                    </div>

                    {/* Address Section (Editable) */}
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div className="card-header">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FiMapPin size={18} /> Address
                            </h3>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label>Street Address</label>
                                <input
                                    type="text"
                                    name="address.street"
                                    value={formData.address.street}
                                    onChange={handleChange}
                                    placeholder="Enter street address"
                                />
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>City</label>
                                    <input
                                        type="text"
                                        name="address.city"
                                        value={formData.address.city}
                                        onChange={handleChange}
                                        placeholder="City"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>State</label>
                                    <input
                                        type="text"
                                        name="address.state"
                                        value={formData.address.state}
                                        onChange={handleChange}
                                        placeholder="State"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Pincode</label>
                                    <input
                                        type="text"
                                        name="address.pincode"
                                        value={formData.address.pincode}
                                        onChange={handleChange}
                                        placeholder="Pincode"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Emergency Contact Section (Editable) */}
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div className="card-header">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FiUsers size={18} /> Emergency Contact
                            </h3>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Contact Name</label>
                                    <input
                                        type="text"
                                        name="emergencyContact.name"
                                        value={formData.emergencyContact.name}
                                        onChange={handleChange}
                                        placeholder="Emergency contact name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Contact Phone</label>
                                    <input
                                        type="tel"
                                        name="emergencyContact.phone"
                                        value={formData.emergencyContact.phone}
                                        onChange={handleChange}
                                        placeholder="Emergency contact phone"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Relationship</label>
                                    <select
                                        name="emergencyContact.relation"
                                        value={formData.emergencyContact.relation}
                                        onChange={handleChange}
                                    >
                                        <option value="">Select relation</option>
                                        <option value="parent">Parent</option>
                                        <option value="sibling">Sibling</option>
                                        <option value="spouse">Spouse</option>
                                        <option value="friend">Friend</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => { setEditing(false); fetchProfile(); }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            {saving ? (
                                <>
                                    <span className="spinner" style={{ width: '16px', height: '16px' }}></span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <FiSave size={16} /> Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            ) : (
                /* View Mode */
                <>
                    {/* About Me Section (View) */}
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div className="card-header">
                            <h3 className="card-title">About Me</h3>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <p style={{ color: 'var(--gray-700)', lineHeight: 1.6 }}>
                                {profile?.about || <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>No information provided. Click "Edit Profile" to add.</span>}
                            </p>
                        </div>
                    </div>

                    {/* Address Section (View) */}
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div className="card-header">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FiMapPin size={18} /> Address
                            </h3>
                        </div>
                        <div style={{ padding: '24px' }}>
                            {profile?.address?.street || profile?.address?.city || profile?.address?.state ? (
                                <div>
                                    {profile?.address?.street && <p style={{ margin: '0 0 4px', color: 'var(--gray-700)' }}>{profile.address.street}</p>}
                                    <p style={{ margin: 0, color: 'var(--gray-600)' }}>
                                        {[profile?.address?.city, profile?.address?.state, profile?.address?.pincode].filter(Boolean).join(', ')}
                                    </p>
                                </div>
                            ) : (
                                <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>No address provided. Click "Edit Profile" to add.</span>
                            )}
                        </div>
                    </div>

                    {/* Emergency Contact Section (View) */}
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div className="card-header">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FiUsers size={18} /> Emergency Contact
                            </h3>
                        </div>
                        <div style={{ padding: '24px' }}>
                            {profile?.emergencyContact?.name ? (
                                <div className="info-grid" style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '16px'
                                }}>
                                    <div>
                                        <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginBottom: '4px' }}>Name</div>
                                        <div style={{ fontWeight: '500', color: 'var(--gray-800)' }}>{profile.emergencyContact.name}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginBottom: '4px' }}>Phone</div>
                                        <div style={{ fontWeight: '500', color: 'var(--gray-800)' }}>{profile.emergencyContact.phone || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginBottom: '4px' }}>Relationship</div>
                                        <div style={{ fontWeight: '500', color: 'var(--gray-800)', textTransform: 'capitalize' }}>{profile.emergencyContact.relation || 'N/A'}</div>
                                    </div>
                                </div>
                            ) : (
                                <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>No emergency contact provided. Click "Edit Profile" to add.</span>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="modal-content" style={{
                        background: 'white',
                        borderRadius: '12px',
                        width: '100%',
                        maxWidth: '400px',
                        margin: '16px'
                    }}>
                        <div className="card-header" style={{ borderBottom: '1px solid var(--gray-200)' }}>
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FiLock size={18} /> Change Password
                            </h3>
                            <button
                                onClick={() => { setShowPasswordModal(false); setPasswordMessage({ type: '', text: '' }); }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    color: 'var(--gray-500)'
                                }}
                            >
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handlePasswordChange} style={{ padding: '24px' }}>
                            {passwordMessage.text && (
                                <div style={{
                                    marginBottom: '16px',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    background: passwordMessage.type === 'success' ? 'var(--success-light, #d1fae5)' : 'var(--danger-light, #fee2e2)',
                                    color: passwordMessage.type === 'success' ? 'var(--success, #059669)' : 'var(--danger, #dc2626)',
                                    fontSize: '0.9rem'
                                }}>
                                    {passwordMessage.text}
                                </div>
                            )}
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label>Current Password</label>
                                <input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    placeholder="Enter current password"
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label>New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    placeholder="Enter new password"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '24px' }}>
                                <label>Confirm New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    placeholder="Confirm new password"
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => { setShowPasswordModal(false); setPasswordMessage({ type: '', text: '' }); }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={passwordSaving}
                                >
                                    {passwordSaving ? 'Changing...' : 'Change Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
