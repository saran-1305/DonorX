import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import { useDonor } from '../context/DonorContext';

const PAGE_META = {
    '/home': { title: 'Command Dashboard', subtitle: 'Real-time network intelligence & analytics' },
    '/request': { title: 'Emergency Request', subtitle: 'Create and dispatch critical resource requests' },
    '/inventory': { title: 'Hospital Inventory Hub', subtitle: 'Comprehensive tracking for critical resources' },
    '/social': { title: 'Hospital Network', subtitle: 'Connect and collaborate with registered hospitals' },
    '/tracking': { title: 'Live Tracking', subtitle: 'Monitor resource transport in real time' },
    '/dashboard': { title: 'Request Dashboard', subtitle: 'Manage incoming and outgoing requests' },
};

const INVENTORY_TABS = [
    { label: 'Dashboard', to: '/home' },
    { label: 'Blood Bank', to: '/inventory' },
    { label: 'Organ Bank', to: '/inventory?tab=organ' },
    { label: 'Resource Hub', to: '/inventory?tab=resource' },
];

const TopBar = () => {
    const { pathname, search } = useLocation();
    const { user } = useDonor();
    const basePath = pathname;
    const meta = PAGE_META[basePath] || { title: 'DonorX', subtitle: '' };
    const isInventory = basePath === '/inventory';
    const tab = new URLSearchParams(search).get('tab') || 'blood';

    return (
        <header className="topbar">
            <div className="topbar-left">
                <h1 className="topbar-title">{meta.title}</h1>
                <p className="topbar-subtitle">{meta.subtitle}</p>
            </div>

            {(isInventory || basePath === '/home') && (
                <div className="topbar-tabs">
                    {INVENTORY_TABS.map((t) => {
                        const isActive = t.to === '/home'
                            ? basePath === '/home'
                            : t.to.includes('tab=organ')
                                ? isInventory && tab === 'organ'
                                : t.to.includes('tab=resource')
                                    ? isInventory && tab === 'resource'
                                    : isInventory && tab !== 'organ' && tab !== 'resource';
                        return (
                            <Link key={t.to} to={t.to} className={`topbar-tab ${isActive ? 'topbar-tab-active' : ''}`}>
                                {t.label}
                            </Link>
                        );
                    })}
                </div>
            )}

            <div className="topbar-right">
                <NotificationBell />
                <div className="topbar-avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
            </div>
        </header>
    );
};

export default TopBar;
