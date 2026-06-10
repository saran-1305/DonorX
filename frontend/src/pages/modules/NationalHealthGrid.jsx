import React, { useState } from 'react';
import { Map as MapIcon, Filter, Layers, Zap, Heart, Droplet, Building2, Truck } from 'lucide-react';

const NationalHealthGrid = () => {
    const [activeLayer, setActiveLayer] = useState('emergencies');

    return (
        <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center mb-md">
                <div>
                    <div className="flex items-center gap-sm mb-xs">
                        <MapIcon color="var(--primary-color)" size={20} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Macro View
                        </span>
                    </div>
                    <h1>National Health Grid</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Real-time spatial visualization of the entire healthcare network.</p>
                </div>
                <div className="flex items-center gap-sm">
                    <button className="btn btn-secondary"><Filter size={16} /> Global Filters</button>
                    <button className="btn btn-primary"><Layers size={16} /> Save View</button>
                </div>
            </div>

            <div className="flex gap-lg" style={{ flex: 1, overflow: 'hidden' }}>
                {/* Layer Controls Sidebar */}
                <div className="card glass-panel" style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>Map Layers</h3>
                    
                    <button 
                        className={`resource-toggle ${activeLayer === 'emergencies' ? 'active' : ''}`} 
                        onClick={() => setActiveLayer('emergencies')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}
                    >
                        <Zap size={18} color={activeLayer === 'emergencies' ? 'var(--danger)' : 'var(--text-secondary)'} />
                        <span style={{ flex: 1 }}>Active Emergencies</span>
                        {activeLayer === 'emergencies' && <div className="live-indicator"></div>}
                    </button>

                    <button 
                        className={`resource-toggle ${activeLayer === 'blood' ? 'active' : ''}`} 
                        onClick={() => setActiveLayer('blood')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}
                    >
                        <Droplet size={18} color={activeLayer === 'blood' ? 'var(--primary-color)' : 'var(--text-secondary)'} />
                        <span style={{ flex: 1 }}>Blood Availability Heatmap</span>
                    </button>

                    <button 
                        className={`resource-toggle ${activeLayer === 'organs' ? 'active' : ''}`} 
                        onClick={() => setActiveLayer('organs')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}
                    >
                        <Heart size={18} color={activeLayer === 'organs' ? 'var(--info)' : 'var(--text-secondary)'} />
                        <span style={{ flex: 1 }}>Organ Transports</span>
                    </button>

                    <button 
                        className={`resource-toggle ${activeLayer === 'icu' ? 'active' : ''}`} 
                        onClick={() => setActiveLayer('icu')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}
                    >
                        <Building2 size={18} color={activeLayer === 'icu' ? 'var(--warning)' : 'var(--text-secondary)'} />
                        <span style={{ flex: 1 }}>ICU Bed Capacity</span>
                    </button>

                    <button 
                        className={`resource-toggle ${activeLayer === 'ambulance' ? 'active' : ''}`} 
                        onClick={() => setActiveLayer('ambulance')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}
                    >
                        <Truck size={18} color={activeLayer === 'ambulance' ? 'var(--success)' : 'var(--text-secondary)'} />
                        <span style={{ flex: 1 }}>Ambulance Fleet Live</span>
                    </button>

                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Legend</div>
                        <div className="flex items-center gap-xs mb-xs" style={{ fontSize: '0.875rem' }}>
                            <div style={{ width: '12px', height: '12px', background: 'var(--danger)', borderRadius: '50%' }}></div> Critical (0-10%)
                        </div>
                        <div className="flex items-center gap-xs mb-xs" style={{ fontSize: '0.875rem' }}>
                            <div style={{ width: '12px', height: '12px', background: 'var(--warning)', borderRadius: '50%' }}></div> Warning (11-40%)
                        </div>
                        <div className="flex items-center gap-xs" style={{ fontSize: '0.875rem' }}>
                            <div style={{ width: '12px', height: '12px', background: 'var(--success)', borderRadius: '50%' }}></div> Healthy ({'>'}40%)
                        </div>
                    </div>
                </div>

                {/* Main Map Area */}
                <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ width: '100%', height: '100%', background: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                        <MapIcon size={64} color="rgba(255,255,255,0.1)" style={{ marginBottom: '1rem' }} />
                        <h2 style={{ color: 'white', marginBottom: '0.5rem' }}>National Leaflet WebGL Map Rendering</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)' }}>Active Layer: <strong style={{ color: 'var(--info)' }}>{activeLayer.toUpperCase()}</strong></p>
                        
                        {/* Simulated UI Overlay on Map */}
                        <div style={{ position: 'absolute', bottom: '2rem', right: '2rem', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', padding: '1rem', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Area Stats (Metro)</div>
                            <div className="flex justify-between gap-xl" style={{ fontSize: '0.875rem' }}>
                                <span>Hospitals Online:</span>
                                <strong>24 / 24</strong>
                            </div>
                            <div className="flex justify-between gap-xl" style={{ fontSize: '0.875rem' }}>
                                <span>Total ICU Beds:</span>
                                <strong>142 / 850</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NationalHealthGrid;
