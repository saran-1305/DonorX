import React from 'react';
import { Search, Bell, User } from 'lucide-react';

const Header = () => {
    return (
        <header className="os-header">
            <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input 
                    type="text" 
                    className="search-input" 
                    placeholder="Command Palette (Ctrl+K)..." 
                />
            </div>
            
            <div className="flex items-center gap-sm">
                <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }}>
                    <div style={{ position: 'relative' }}>
                        <Bell size={18} />
                        <span className="live-indicator" style={{ position: 'absolute', top: '-2px', right: '-2px' }}></span>
                    </div>
                </button>
                <div className="flex items-center gap-sm ml-2" style={{ padding: '0.25rem 0.5rem', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                    <div style={{ width: '32px', height: '32px', background: 'var(--primary-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>
                        Dr
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Dr. Sarah Jenkins</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Chief Coordinator</span>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
