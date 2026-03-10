import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { FiSave, FiPlus, FiTrash2, FiInfo, FiUpload, FiImage, FiX } from 'react-icons/fi';
import '../styles/CollegeDetail.css';

const CollegeDetail = () => {
    const [details, setDetails] = useState({
        collegeName: '',
        collegeLogo: '',
        address: '',
        aboutCollege: '',
        feesStructure: '',
        hostelAvailable: false,
        hostelDetails: '',
        contactNumbers: []
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [logoPreview, setLogoPreview] = useState('');
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchDetails();
    }, []);

    const fetchDetails = async () => {
        try {
            const response = await api.get('/college-detail');
            setDetails({
                collegeName: response.data.collegeName || '',
                collegeLogo: response.data.collegeLogo || '',
                address: response.data.address || '',
                aboutCollege: response.data.aboutCollege || '',
                feesStructure: response.data.feesStructure || '',
                hostelAvailable: response.data.hostelAvailable || false,
                hostelDetails: response.data.hostelDetails || '',
                contactNumbers: response.data.contactNumbers || []
            });
            if (response.data.collegeLogo) {
                setLogoPreview(response.data.collegeLogo);
            }
        } catch (error) {
            console.error('Failed to fetch college details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please upload an image file (JPEG, PNG, etc.)' });
            return;
        }

        // Validate file size (100MB max)
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            setMessage({ type: 'error', text: 'Image size exceeds 100MB limit' });
            return;
        }

        setUploadingLogo(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target.result;
            setLogoPreview(base64);
            setDetails(prev => ({ ...prev, collegeLogo: base64 }));
            setUploadingLogo(false);
        };
        reader.onerror = () => {
            setMessage({ type: 'error', text: 'Failed to read image file' });
            setUploadingLogo(false);
        };
        reader.readAsDataURL(file);
    };

    const removeLogo = () => {
        setLogoPreview('');
        setDetails(prev => ({ ...prev, collegeLogo: '' }));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            await api.put('/college-detail', details);
            setMessage({ type: 'success', text: 'College details saved successfully!' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save' });
        } finally {
            setSaving(false);
        }
    };

    const addContact = () => {
        setDetails(prev => ({
            ...prev,
            contactNumbers: [...prev.contactNumbers, { label: '', number: '' }]
        }));
    };

    const removeContact = (index) => {
        setDetails(prev => ({
            ...prev,
            contactNumbers: prev.contactNumbers.filter((_, i) => i !== index)
        }));
    };

    const updateContact = (index, field, value) => {
        setDetails(prev => ({
            ...prev,
            contactNumbers: prev.contactNumbers.map((c, i) =>
                i === index ? { ...c, [field]: value } : c
            )
        }));
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading college details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FiInfo size={24} /> College Details
                </h1>
                <p className="page-subtitle">Manage your college information visible to all users</p>
            </div>

            {message.text && (
                <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                    {message.text}
                </div>
            )}

            {/* College Logo Section */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiImage size={18} /> College Logo
                    </h2>
                </div>
                <div className="card-body">
                    <div className="college-logo-upload-area">
                        {logoPreview ? (
                            <div className="college-logo-preview-container">
                                <img
                                    src={logoPreview}
                                    alt="College Logo"
                                    className="college-logo-preview"
                                />
                                <div className="college-logo-actions">
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <FiUpload size={14} /> Change Logo
                                    </button>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={removeLogo}
                                    >
                                        <FiX size={14} /> Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="college-logo-dropzone"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <FiUpload size={36} className="college-logo-dropzone-icon" />
                                <p className="college-logo-dropzone-text">
                                    Click to upload college logo
                                </p>
                                <span className="college-logo-dropzone-hint">
                                    JPEG, PNG, SVG, or WebP (Max 100MB)
                                </span>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            style={{ display: 'none' }}
                        />
                        {uploadingLogo && (
                            <div style={{ marginTop: '10px', color: 'var(--primary)' }}>
                                <div className="spinner" style={{ width: '20px', height: '20px', display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }}></div>
                                Processing image...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: '20px' }}>
                <div className="card-header">
                    <h2 className="card-title">Basic Information</h2>
                </div>
                <div className="card-body">
                    <div className="form-group">
                        <label className="form-label">College Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={details.collegeName}
                            onChange={(e) => setDetails({ ...details, collegeName: e.target.value })}
                            placeholder="Enter college name"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Address</label>
                        <textarea
                            className="form-input"
                            rows="3"
                            value={details.address}
                            onChange={(e) => setDetails({ ...details, address: e.target.value })}
                            placeholder="Enter college address"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">About College</label>
                        <textarea
                            className="form-input"
                            rows="5"
                            value={details.aboutCollege}
                            onChange={(e) => setDetails({ ...details, aboutCollege: e.target.value })}
                            placeholder="Write about the college..."
                        />
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: '20px' }}>
                <div className="card-header">
                    <h2 className="card-title">Fee Structure</h2>
                </div>
                <div className="card-body">
                    <div className="form-group">
                        <label className="form-label">Fees Structure Details</label>
                        <textarea
                            className="form-input"
                            rows="5"
                            value={details.feesStructure}
                            onChange={(e) => setDetails({ ...details, feesStructure: e.target.value })}
                            placeholder="Enter fee structure details..."
                        />
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: '20px' }}>
                <div className="card-header">
                    <h2 className="card-title">Hostel Information</h2>
                </div>
                <div className="card-body">
                    <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="checkbox"
                                checked={details.hostelAvailable}
                                onChange={(e) => setDetails({ ...details, hostelAvailable: e.target.checked })}
                                style={{ width: 'auto' }}
                            />
                            Hostel Available
                        </label>
                    </div>
                    {details.hostelAvailable && (
                        <div className="form-group">
                            <label className="form-label">Hostel Details</label>
                            <textarea
                                className="form-input"
                                rows="4"
                                value={details.hostelDetails}
                                onChange={(e) => setDetails({ ...details, hostelDetails: e.target.value })}
                                placeholder="Enter hostel details (capacity, fees, facilities, etc.)"
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="card" style={{ marginTop: '20px' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="card-title">Contact Numbers</h2>
                    <button className="btn btn-primary btn-sm" onClick={addContact}>
                        <FiPlus /> Add Contact
                    </button>
                </div>
                <div className="card-body">
                    {details.contactNumbers.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                            No contact numbers added. Click "Add Contact" to add one.
                        </p>
                    ) : (
                        details.contactNumbers.map((contact, idx) => (
                            <div key={idx} className="contact-row" style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label">Label</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={contact.label}
                                        onChange={(e) => updateContact(idx, 'label', e.target.value)}
                                        placeholder="e.g., Main Office"
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="form-label">Number</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={contact.number}
                                        onChange={(e) => updateContact(idx, 'number', e.target.value)}
                                        placeholder="e.g., +91 12345 67890"
                                    />
                                </div>
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => removeContact(idx)}
                                    style={{ marginBottom: '4px' }}
                                >
                                    <FiTrash2 />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    <FiSave /> {saving ? 'Saving...' : 'Save College Details'}
                </button>
            </div>
        </div>
    );
};

export default CollegeDetail;
