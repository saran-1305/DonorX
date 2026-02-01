import React from 'react';
import { NavLink, Link } from 'react-router-dom';

const Header = () => {
    return (
        <header className="main-header">
            <div className="container flex justify-between items-center" style={{ height: '100%' }}>
                <Link to="/" className="logo">
                    <span style={{ color: 'var(--primary-color)' }}>Donor</span>
                    <span style={{ color: 'var(--text-primary)' }}>X</span>
                </Link>
                <nav className="nav-links">
                    <NavLink to="/" className={({ isActive }) => isActive ? "active" : ""}>
                        Home
                    </NavLink>
                    <NavLink to="/hospital-dashboard" className={({ isActive }) => isActive ? "active" : ""}>
                        Hospital Dashboard
                    </NavLink>
                    <NavLink to="/dashboard" className={({ isActive }) => isActive ? "active" : ""}>
                        Request Dashboard
                    </NavLink>
                    <NavLink to="/audit" className={({ isActive }) => isActive ? "active" : ""}>
                        Audit Trail
                    </NavLink>
                    <Link to="/request" className="btn btn-primary" style={{ padding: '0.5rem 1rem', color: 'white' }}>
                        New Request
                    </Link>
                </nav>
            </div>
        </header>
    );
};

export default Header;
