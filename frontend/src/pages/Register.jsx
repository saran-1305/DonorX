import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDonor } from '../context/DonorContext';
import { Building2, Mail, Lock, User, Phone, MapPin, ArrowRight } from 'lucide-react';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        hospitalName: '',
        contactPhone: '',
        address: '',
        location: { lat: '', lng: '' },
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register, showToast } = useDonor();
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const getLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData((prev) => ({
                        ...prev,
                        location: {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        },
                    }));
                    showToast('Hospital GPS coordinates acquired successfully!', 'success');
                },
                (err) => {
                    setError('Unable to retrieve location. Please check browser permissions.');
                    console.error(err);
                }
            );
        } else {
            setError('Geolocation is not supported by your browser.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.email || !formData.password || !formData.hospitalName) {
            setError('Please fill in all required fields.');
            return;
        }

        if (!formData.location.lat || !formData.location.lng) {
            setError('Please click "Acquire GPS Coordinates" to set your hospital location.');
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            const result = await register({
                name: formData.hospitalName,
                email: formData.email,
                password: formData.password,
                contactPerson: formData.name,
                contactPhone: formData.contactPhone,
                address: formData.address,
                location: {
                    lat: formData.location.lat,
                    lon: formData.location.lng,
                },
            });

            if (result.success) {
                navigate('/home', { replace: true });
            } else {
                setError(result.message || 'Registration failed.');
            }
        } catch (err) {
            setError(err.message || 'Registration failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="auth-page" style={{ background: 'var(--bg-main)' }}>
            <div
                className="auth-card auth-card-wide"
                style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--border-color)',
                    borderRadius: '24px',
                    boxShadow: '0 8px 30px rgba(23, 25, 24, 0.06)',
                    padding: '2.5rem',
                    maxWidth: '540px',
                    width: '100%',
                }}
            >
                {/* Brand Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div
                        style={{
                            width: '42px',
                            height: '42px',
                            background: 'linear-gradient(135deg, #D84B46, #B91C1C)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(216, 75, 70, 0.35)',
                        }}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="#FFFFFF" />
                            <path d="M8.5 13.5h2l1-3 1.5 5 1-2h2" stroke="#D84B46" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#171918', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                            Donor<span style={{ color: '#078F50' }}>X</span>
                        </div>
                        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#737873', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Healthcare Intelligence Network
                        </div>
                    </div>
                </div>

                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#171918', marginBottom: '0.35rem', letterSpacing: '-0.02em' }}>
                    Register your Hospital Facility
                </h2>
                <p style={{ color: '#737873', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    Connect to the regional healthcare resource and emergency telemetry grid.
                </p>

                {error && (
                    <div
                        style={{
                            marginBottom: '1.25rem',
                            padding: '0.75rem 1rem',
                            backgroundColor: '#FCE9E7',
                            color: '#D84B46',
                            border: '1px solid #F5C2BF',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                        }}
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: '#171918' }}>
                                Hospital Name *
                            </label>
                            <input
                                type="text"
                                name="hospitalName"
                                value={formData.hospitalName}
                                onChange={handleChange}
                                placeholder="e.g. Apollo Hospital"
                                required
                                style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: '#FAF9F6', fontSize: '0.88rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: '#171918' }}>
                                Contact Person Name *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g. Dr. Ramesh"
                                required
                                style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: '#FAF9F6', fontSize: '0.88rem' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: '#171918' }}>
                                Hospital Email *
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="admin@hospital.com"
                                required
                                style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: '#FAF9F6', fontSize: '0.88rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: '#171918' }}>
                                Password *
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Create strong password"
                                required
                                style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: '#FAF9F6', fontSize: '0.88rem' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: '#171918' }}>
                                Contact Phone
                            </label>
                            <input
                                type="tel"
                                name="contactPhone"
                                value={formData.contactPhone}
                                onChange={handleChange}
                                placeholder="+91 98765 43210"
                                style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: '#FAF9F6', fontSize: '0.88rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: '#171918' }}>
                                Facility Address
                            </label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                placeholder="Greams Rd, Thousand Lights, Chennai"
                                style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: '#FAF9F6', fontSize: '0.88rem' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.45rem', fontSize: '0.8rem', fontWeight: 600, color: '#171918' }}>
                            Hospital Geospatial Location *
                        </label>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <button
                                type="button"
                                onClick={getLocation}
                                style={{
                                    flex: 1,
                                    padding: '0.65rem 1rem',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-color)',
                                    background: '#FAF9F6',
                                    color: '#171918',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.45rem',
                                }}
                            >
                                <MapPin size={16} color="#078F50" />
                                <span>Acquire GPS Coordinates</span>
                            </button>
                            {formData.location.lat && (
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#078F50', background: 'var(--emerald-soft)', padding: '0.35rem 0.75rem', borderRadius: '20px' }}>
                                    ✓ {Number(formData.location.lat).toFixed(4)}, {Number(formData.location.lng).toFixed(4)}
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            width: '100%',
                            padding: '0.85rem',
                            background: '#078F50',
                            color: 'white',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            borderRadius: '12px',
                            border: 'none',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 14px rgba(7, 143, 80, 0.3)',
                            marginTop: '0.5rem',
                            opacity: isSubmitting ? 0.7 : 1,
                        }}
                    >
                        <span>{isSubmitting ? 'Registering Facility...' : 'Complete Facility Registration'}</span>
                        <ArrowRight size={17} />
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: '#737873' }}>
                    <span>Already a registered hospital? </span>
                    <Link to="/login" style={{ color: '#078F50', fontWeight: 700, textDecoration: 'none' }}>
                        Sign in here
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
