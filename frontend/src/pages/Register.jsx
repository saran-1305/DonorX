import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDonor } from '../context/DonorContext';

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
    const { register, showToast } = useDonor();
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const getLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData(prev => ({
                        ...prev,
                        location: {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        }
                    }));
                    showToast('Location fetched successfully!', 'success');
                },
                (err) => {
                    setError('Unable to retrieve location.');
                    console.error(err);
                }
            );
        } else {
            setError('Geolocation is not supported by your browser.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic Validation
        if (!formData.name || !formData.email || !formData.password || !formData.hospitalName) {
            setError('Please fill in all required fields.');
            return;
        }

        if (!formData.location.lat || !formData.location.lng) {
            setError('Please fetch your hospital location.');
            return;
        }

        const result = await register({
            name: formData.hospitalName,
            email: formData.email,
            password: formData.password,
            contactPerson: formData.name,
            contactPhone: formData.contactPhone,
            address: formData.address,
            location: {
                lat: formData.location.lat,
                lon: formData.location.lng
            }
        });

        if (result.success) {
            navigate('/home', { replace: true });
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card auth-card-wide">
                <div className="auth-brand"><span className="logo-accent">Donor</span>X</div>
                <h2>Register your hospital</h2>
                <p className="auth-sub">Join the DonorX network</p>

                {error && <div className="alert alert-error" style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: 'var(--radius-sm)' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Full Name *</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="form-control"
                            required
                            style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="hospitalName" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Hospital Name *</label>
                        <input
                            type="text"
                            id="hospitalName"
                            name="hospitalName"
                            value={formData.hospitalName}
                            onChange={handleChange}
                            className="form-control"
                            required
                            style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Email Address *</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="form-control"
                            required
                            placeholder="hospital@example.com"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Password *</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="form-control"
                            required
                            style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="contactPhone" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Contact Phone</label>
                        <input type="tel" id="contactPhone" name="contactPhone" value={formData.contactPhone} onChange={handleChange}
                            className="form-control" placeholder="+91 ..."
                            style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="address" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Hospital Address</label>
                        <input type="text" id="address" name="address" value={formData.address} onChange={handleChange}
                            className="form-control" placeholder="Street, City"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Hospital Location *</label>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <button type="button" onClick={getLocation} className="btn btn-outline" style={{ flex: 1, padding: '0.6rem' }}>
                                📍 Get Current Location
                            </button>
                            {formData.location.lat && (
                                <span style={{ fontSize: '0.9rem', color: 'green' }}>
                                    ✓ {formData.location.lat.toFixed(4)}, {formData.location.lng.toFixed(4)}
                                </span>
                            )}
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}>
                        Register Hospital
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                    <p>Already have an account?</p>
                    <Link to="/login" style={{ color: 'var(--primary-color)', fontWeight: '600', textDecoration: 'none' }}>
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
