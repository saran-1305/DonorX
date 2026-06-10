import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
    Activity, 
    Heart, 
    Droplet, 
    Truck, 
    Building2, 
    UserSquare2, 
    BrainCircuit, 
    Map as MapIcon, 
    Settings 
} from 'lucide-react';

const Sidebar = () => {
    const location = useLocation();

    const navItems = [
        { path: '/command-center', label: 'Command Center', icon: Activity },
        { path: '/modules/emergency', label: 'Emergency', icon: Heart },
        { path: '/modules/blood', label: 'Blood Exchange', icon: Droplet },
        { path: '/modules/organ', label: 'Organ Exchange', icon: Heart },
        { path: '/modules/ambulance', label: 'Ambulance Intel', icon: Truck },
        { path: '/modules/hospitals', label: 'Hospital Network', icon: Building2 },
        { path: '/modules/patient', label: 'Patient Intel', icon: UserSquare2 },
        { path: '/modules/ai', label: 'Mozilla AI Engine', icon: BrainCircuit },
        { path: '/modules/grid', label: 'National Health Grid', icon: MapIcon },
    ];

    return (
        <aside className="os-sidebar">
            <div className="flex items-center gap-sm" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', minWidth: '260px' }}>
                <Activity color="var(--primary-color)" size={28} style={{ flexShrink: 0 }} />
                <span className="logo-text" style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>DonorX OS</span>
            </div>
            
            <div style={{ padding: '1rem 0', flex: 1, overflowY: 'auto', minWidth: '260px' }}>
                <div className="logo-text" style={{ padding: '0 1.5rem', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Core Modules
                </div>
                <nav>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname.includes(item.path);
                        return (
                            <NavLink 
                                key={item.path} 
                                to={item.path}
                                className={`nav-item ${isActive ? 'active' : ''}`}
                            >
                                <Icon size={20} style={{ flexShrink: 0 }} />
                                <span className="nav-label">{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>
            </div>
            
            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', minWidth: '260px' }}>
                <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '0.5rem 0' }}>
                    <Settings size={20} style={{ flexShrink: 0, marginLeft: '0.25rem' }} /> 
                    <span className="nav-label">Settings</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
