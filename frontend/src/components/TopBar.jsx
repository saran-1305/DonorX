import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import { useDonor } from '../context/DonorContext';

const INVENTORY_TABS = [
    { label: 'Dashboard', to: '/home' },
    { label: 'Blood Bank', to: '/inventory?tab=blood' },
    { label: 'Organ Bank', to: '/inventory?tab=organ' },
    { label: 'Resource Hub', to: '/inventory?tab=resource' },
];

const getPageMeta = (pathname, search) => {
    if (pathname === '/home') {
        return { title: 'Command Dashboard', subtitle: 'Real-time network intelligence and analytics' };
    }
    if (pathname === '/request') {
        return { title: 'Emergency Request', subtitle: 'Create and dispatch critical resource requests' };
    }
    if (pathname === '/inventory') {
        const tab = new URLSearchParams(search).get('tab') || 'blood';
        const titles = {
            blood: { title: 'Blood Bank', subtitle: 'Manage blood type inventory and stock levels' },
            organ: { title: 'Organ Bank', subtitle: 'Track organ availability across your facility' },
            resource: { title: 'Resource Hub', subtitle: 'Monitor ICU beds, ventilators, oxygen, and ambulances' },
        };
        return titles[tab] || titles.blood;
    }
    if (pathname === '/social') {
        return { title: 'Hospital Network', subtitle: 'Connect and collaborate with registered hospitals' };
    }
    if (pathname === '/messages') {
        return { title: 'Messages', subtitle: 'Real-time chat with hospitals on the network' };
    }
    if (pathname === '/map') {
        return { title: 'Map', subtitle: 'View all network hospitals and plan routes' };
    }
    return { title: 'DonorX', subtitle: '' };
};

const TopBar = () => {
    const { pathname, search } = useLocation();
    const { user } = useDonor();
    const meta = getPageMeta(pathname, search);
    const isInventory = pathname === '/inventory';
    const tab = new URLSearchParams(search).get('tab') || 'blood';

    return (
        <header className="topbar">
            <div className="topbar-left">
                <h1 className="topbar-title">{meta.title}</h1>
                <p className="topbar-subtitle">{meta.subtitle}</p>
            </div>

            {(isInventory || pathname === '/home') && (
                <div className="topbar-tabs">
                    {INVENTORY_TABS.map((t) => {
                        const isActive = t.to === '/home'
                            ? pathname === '/home'
                            : t.to.includes('tab=organ')
                                ? isInventory && tab === 'organ'
                                : t.to.includes('tab=resource')
                                    ? isInventory && tab === 'resource'
                                    : isInventory && tab === 'blood';
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
