import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDonor } from '../context/DonorContext';
import NotificationBell from './NotificationBell';

const navLinkClass = ({ isActive }) => `nav-pill ${isActive ? 'nav-pill-active' : ''}`;

const Header = () => {
    const { user, logout } = useDonor();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="app-header">
            <div className="container app-header-inner">
                <NavLink to="/home" className="logo">
                    <span className="logo-accent">Donor</span>X
                </NavLink>

                <nav className="app-nav">
                    <NavLink to="/home" className={navLinkClass} end>Home</NavLink>
                    <NavLink to="/request" className={navLinkClass}>Request</NavLink>
                    <NavLink to="/inventory" className={navLinkClass}>Inventory</NavLink>
                    <NavLink to="/social" className={navLinkClass}>Social</NavLink>
                </nav>

                <div className="app-header-actions">
                    <NotificationBell />
                    <div className="user-chip">
                        <div className="user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'H'}</div>
                        <span>{user?.name}</span>
                    </div>
                    <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>
                </div>
            </div>
        </header>
    );
};

export default Header;
