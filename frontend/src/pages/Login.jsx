import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useDonor } from '../context/DonorContext';
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const { login } = useDonor();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/home';

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.email || !formData.password) {
            setError('Please enter both email and password.');
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            const result = await login(formData.email, formData.password);
            if (result.success) {
                navigate(from, { replace: true });
            } else {
                setError(result.message || 'Invalid email or password.');
            }
        } catch (err) {
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="auth-page" style={{ background: 'var(--bg-main)' }}>
            <div
                className="auth-card"
                style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--border-color)',
                    borderRadius: '24px',
                    boxShadow: '0 8px 30px rgba(23, 25, 24, 0.06)',
                    padding: '2.5rem',
                    maxWidth: '440px',
                    width: '100%',
                }}
            >
                {/* Brand Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
                    <div
                        style={{
                            width: '44px',
                            height: '44px',
                            background: 'linear-gradient(135deg, #D84B46, #B91C1C)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(216, 75, 70, 0.35)',
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="#FFFFFF" />
                            <path d="M8.5 13.5h2l1-3 1.5 5 1-2h2" stroke="#D84B46" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#171918', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                            Donor<span style={{ color: '#078F50' }}>X</span>
                        </div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#737873', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Healthcare Intelligence Network
                        </div>
                    </div>
                </div>

                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#171918', marginBottom: '0.35rem', letterSpacing: '-0.02em' }}>
                    Sign in to your hospital
                </h2>
                <p style={{ color: '#737873', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                    Access emergency coordination, inventory and dispatch telemetry.
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

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.2rem' }}>
                        <label htmlFor="email" style={{ display: 'block', marginBottom: '0.45rem', fontSize: '0.82rem', fontWeight: 600, color: '#171918' }}>
                            Hospital Email Address
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={17} color="#9BA09B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="e.g. apollo@donorx.com"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-color)',
                                    background: '#FAF9F6',
                                    fontSize: '0.9rem',
                                    color: '#171918',
                                    outline: 'none',
                                }}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="password" style={{ display: 'block', marginBottom: '0.45rem', fontSize: '0.82rem', fontWeight: 600, color: '#171918' }}>
                            Account Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={17} color="#9BA09B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter password"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 2.5rem 0.75rem 2.5rem',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-color)',
                                    background: '#FAF9F6',
                                    fontSize: '0.9rem',
                                    color: '#171918',
                                    outline: 'none',
                                }}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#737873',
                                }}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
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
                            opacity: isSubmitting ? 0.7 : 1,
                        }}
                    >
                        <span>{isSubmitting ? 'Signing in...' : 'Sign in to Network'}</span>
                        <ArrowRight size={17} />
                    </button>
                </form>

                <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.85rem', color: '#737873' }}>
                    <span>Need to register a new hospital? </span>
                    <Link to="/register" style={{ color: '#078F50', fontWeight: 700, textDecoration: 'none' }}>
                        Register facility
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
