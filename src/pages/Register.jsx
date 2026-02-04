import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDonor } from '../context/DonorContext';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        hospitalName: '',
        role: 'Coordinator', // Default role
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const { register, showToast } = useDonor();
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Basic Validation
        if (!formData.name || !formData.username || !formData.password || !formData.hospitalName) {
            setError('Please fill in all required fields.');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        const result = register({
            name: formData.name,
            phone: formData.phone,
            hospitalName: formData.hospitalName,
            role: formData.role,
            username: formData.username,
            password: formData.password
        });

        if (result.success) {
            showToast('Registration successful! Please login.', 'success');
            navigate('/login');
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '2rem 0' }}>
            <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--primary-color)' }}>Register Hospital Account</h2>

                {error && <div className="alert alert-error" style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: 'var(--radius-sm)' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
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
                        <div className="form-group">
                            <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Phone Number</label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="form-control"
                                style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ margin: '1rem 0' }}>
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

                    <div className="form-group" style={{ margin: '1rem 0' }}>
                        <label htmlFor="role" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Role</label>
                        <select
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="form-control"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                        >
                            <option value="Coordinator">Transplant Coordinator</option>
                            <option value="Admin">Hospital Administrator</option>
                            <option value="Doctor">Doctor/Surgeon</option>
                        </select>
                    </div>

                    <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid var(--border-color)' }} />

                    <div className="form-group" style={{ margin: '1rem 0' }}>
                        <label htmlFor="username" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Username *</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className="form-control"
                            required
                            placeholder="Choose a unique username"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="form-group">
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
                        <div className="form-group">
                            <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Confirm Password *</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="form-control"
                                required
                                style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                            />
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
