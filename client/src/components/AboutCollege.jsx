import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiInfo, FiMapPin, FiPhone, FiGlobe } from 'react-icons/fi';
import '../styles/CollegeDetail.css';

const AboutCollege = () => {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const response = await api.get('/college-detail');
                setDetails(response.data);
            } catch (error) {
                console.error('Failed to fetch college details:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, []);

    if (loading) {
        return (
            <div className="about-college-loading">
                <div className="spinner"></div>
                <p>Loading college information...</p>
            </div>
        );
    }

    if (!details || !details.collegeName) return null;

    return (
        <div className="about-college-wrapper">
            {/* Hero Banner */}
            <div className="about-college-hero">
                <div className="about-college-hero-bg"></div>
                <div className="about-college-hero-content">
                    {details.collegeLogo ? (
                        <img
                            src={details.collegeLogo}
                            alt={details.collegeName}
                            className="about-college-hero-logo"
                        />
                    ) : (
                        <div className="about-college-hero-logo-placeholder">
                            <FiGlobe size={40} />
                        </div>
                    )}
                    <div className="about-college-hero-text">
                        <h1>{details.collegeName}</h1>
                        {details.address && (
                            <p className="about-college-hero-address">
                                <FiMapPin size={14} />
                                {details.address}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="about-college-content">
                {/* About Section */}
                {details.aboutCollege && (
                    <div className="about-college-card about-college-card-full">
                        <div className="about-college-card-header">
                            <div className="about-college-card-icon">
                                <FiInfo size={18} />
                            </div>
                            <h3>About</h3>
                        </div>
                        <div className="about-college-card-body">
                            <pre className="about-college-text">{details.aboutCollege}</pre>
                        </div>
                    </div>
                )}

                {/* Two-column layout for smaller sections */}
                <div className="about-college-grid-2col">

                    {/* Contact Numbers */}
                    {details.contactNumbers && details.contactNumbers.length > 0 && (
                        <div className="about-college-card">
                            <div className="about-college-card-header">
                                <div className="about-college-card-icon contact-icon">
                                    <FiPhone size={18} />
                                </div>
                                <h3>Contact Numbers</h3>
                            </div>
                            <div className="about-college-card-body">
                                <div className="about-college-contacts-list">
                                    {details.contactNumbers.map((c, i) => (
                                        <div key={i} className="about-college-contact-item">
                                            <span className="about-college-contact-label">{c.label}</span>
                                            <span className="about-college-contact-number">
                                                <FiPhone size={12} />
                                                {c.number}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AboutCollege;
