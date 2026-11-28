import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import { useDonor } from '../context/DonorContext';
import { Menu, ChevronDown } from 'lucide-react';

const getPageMeta = (pathname, search) => {
    if (pathname === '/home' || pathname === '/') {
        return {
            title: 'Healthcare Command Center',
            subtitle: 'Real-time network intelligence and emergency coordination.',
        };
    }
    if (pathname === '/request') {
        const isAI = new URLSearchParams(search).get('mode') === 'ai';
        return {
            title: isAI ? 'Clinical AI Workspace' : 'Emergency Coordination',
            subtitle: isAI
                ? 'Automated medical report parsing & triage intelligence'
                : 'Rapid emergency resource requisition & dispatch',
        };
    }
    if (pathname === '/inventory') {
        const tab = new URLSearchParams(search).get('tab') || 'blood';
        const titles = {
            blood: { title: 'Blood Bank Intelligence', subtitle: 'Real-time blood component levels, reservation & shortage forecasting' },
            organ: { title: 'Organ Bank Registry', subtitle: 'Track viability, ischemia time windows and donor organ availability' },
            resource: { title: 'Resource Hub', subtitle: 'ICU beds, ventilators, oxygen cylinders & mobile assets' },
        };
        return titles[tab] || titles.blood;
    }
    if (pathname === '/social') {
        return { title: 'Hospital Intelligence Network', subtitle: 'Verified partner healthcare institutions across the region' };
    }
    if (pathname === '/messages') {
        return { title: 'Secure Clinical Communications', subtitle: 'Direct hospital-to-hospital emergency coordination channel' };
    }
    if (pathname === '/map') {
        return { title: 'Live Network & Ambulance Fleet', subtitle: 'Real-time GPS tracking and transit route monitoring' };
    }
    if (pathname === '/billing') {
        return { title: 'Healthcare Audit & Billing', subtitle: 'Digital dispatch invoices and operational expenditure records' };
    }
    return { title: 'Healthcare Command Center', subtitle: 'Real-time network intelligence and emergency coordination.' };
};

const TopBar = ({ onToggleSidebar }) => {
    const { pathname, search } = useLocation();
    const navigate = useNavigate();
    const { user } = useDonor();
    const meta = getPageMeta(pathname, search);
    const isHome = pathname === '/home' || pathname === '/';

    return (
        <header className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {onToggleSidebar && (
                    <button
                        onClick={onToggleSidebar}
                        style={{
                            background: 'white',
                            border: '1px solid var(--border-color)',
                            borderRadius: '10px',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <Menu size={20} color="var(--text-primary)" />
                    </button>
                )}
                <div className="topbar-left">
                    <h1 className="topbar-title">{meta.title}</h1>
                    <p className="topbar-subtitle">{meta.subtitle}</p>
                </div>
            </div>

            {/* View Pill Tabs from Reference Image */}
            <div className="topbar-view-tabs">
                <button
                    type="button"
                    onClick={() => navigate('/home')}
                    className={`topbar-view-tab ${isHome ? 'topbar-view-tab-active' : ''}`}
                >
                    Overview
                </button>
                <button
                    type="button"
                    onClick={() => navigate('/map')}
                    className={`topbar-view-tab ${pathname === '/map' ? 'topbar-view-tab-active' : ''}`}
                >
                    Live Map
                </button>
                <button
                    type="button"
                    onClick={() => navigate('/billing')}
                    className={`topbar-view-tab ${pathname === '/billing' ? 'topbar-view-tab-active' : ''}`}
                >
                    Analytics
                </button>
            </div>

            {/* Right Controls: Notification Bell + Avatar */}
            <div className="topbar-right">
                <NotificationBell />

                <div className="topbar-avatar-container" onClick={() => navigate('/social')}>
                    <div className="topbar-avatar-img">
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'H'}
                    </div>
                    <ChevronDown size={14} color="var(--text-secondary)" style={{ marginRight: '4px' }} />
                </div>
            </div>
        </header>
    );
};

export default TopBar;
