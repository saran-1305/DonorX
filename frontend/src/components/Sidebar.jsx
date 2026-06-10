import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useDonor } from '../context/DonorContext';
import { notificationService } from '../services/api';
import { getSocket } from '../services/socket';

const IconDashboard = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
);
const IconRequest = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12h14" />
    </svg>
);
const IconBlood = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
);
const IconOrgan = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
);
const IconResource = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
);
const IconSocial = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);
const IconTrack = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="10" r="3" /><path d="M12 21a7 7 0 0 0 7-7c0-2-1-3.5-3-5l-4-4-4 4c-2 1.5-3 3-3 5a7 7 0 0 0 7 7z" />
    </svg>
);
const IconAlert = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

const NavItem = ({ to, icon, label, badge, end, matchTab }) => {
    const location = useLocation();
    const [path, query] = to.split('?');
    const tabParam = query ? new URLSearchParams(`?${query}`).get('tab') : null;
    const currentTab = new URLSearchParams(location.search).get('tab');

    let isCustomActive = false;
    if (matchTab !== undefined) {
        if (matchTab === null) {
            isCustomActive = location.pathname === path && !currentTab;
        } else {
            isCustomActive = location.pathname === path && currentTab === matchTab;
        }
    }

    if (matchTab !== undefined) {
        return (
            <NavLink
                to={to}
                className={() => `sidebar-link ${isCustomActive ? 'sidebar-link-active' : ''}`}
            >
                <span className="sidebar-link-icon">{icon}</span>
                <span className="sidebar-link-label">{label}</span>
                {badge > 0 && <span className="sidebar-badge">{badge > 9 ? '9+' : badge}</span>}
            </NavLink>
        );
    }

    return (
        <NavLink to={to} end={end} className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
            <span className="sidebar-link-icon">{icon}</span>
            <span className="sidebar-link-label">{label}</span>
            {badge > 0 && <span className="sidebar-badge">{badge > 9 ? '9+' : badge}</span>}
        </NavLink>
    );
};

const Sidebar = () => {
    const { user, logout } = useDonor();
    const navigate = useNavigate();
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        if (!user) return;
        notificationService.getAll()
            .then(({ data }) => setUnread(data.unreadCount || 0))
            .catch(() => {});
        const socket = getSocket();
        const refresh = () => notificationService.getAll()
            .then(({ data }) => setUnread(data.unreadCount || 0))
            .catch(() => {});
        socket.on('notification', refresh);
        return () => socket.off('notification', refresh);
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="sidebar-logo-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="#EF4444" />
                    </svg>
                </div>
                <div>
                    <div className="sidebar-logo-text">Donor<span>X</span></div>
                    <div className="sidebar-logo-sub">Healthcare Network</div>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="sidebar-section-label">MAIN NAVIGATION</div>
                <NavItem to="/home" icon={<IconDashboard />} label="Dashboard" end />
                <NavItem to="/request" icon={<IconRequest />} label="New Request" />
                <NavItem to="/inventory" icon={<IconBlood />} label="Blood Bank" matchTab={null} />
                <NavItem to="/inventory?tab=organ" icon={<IconOrgan />} label="Organ Bank" matchTab="organ" />
                <NavItem to="/inventory?tab=resource" icon={<IconResource />} label="Resource Hub" matchTab="resource" />
                <NavItem to="/social" icon={<IconSocial />} label="Hospital Network" />
                <NavItem to="/tracking" icon={<IconTrack />} label="Live Tracking" />

                <div className="sidebar-section-label">SYSTEM</div>
                <NavItem to="/home" icon={<IconAlert />} label="Alerts" badge={unread} end />
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'H'}</div>
                    <div className="sidebar-user-info">
                        <strong>{user?.name || 'Hospital'}</strong>
                        <span>{user?.email || ''}</span>
                    </div>
                </div>
                <button type="button" className="sidebar-logout" onClick={handleLogout}>
                    Sign out
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
