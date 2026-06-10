import React, { useState } from 'react';
import { Truck, Map as MapIcon, Navigation2, Activity, ShieldAlert, Radio } from 'lucide-react';

const AmbulanceIntelligence = () => {
    const [view, setView] = useState('map'); // map or list

    return (
        <div style={{ paddingBottom: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center mb-md">
                <div>
                    <div className="flex items-center gap-sm mb-xs">
                        <Truck color="var(--primary-color)" size={20} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Operational Module
                        </span>
                    </div>
                    <h1>Ambulance Intelligence</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Live fleet tracking, AI route optimization, and rapid dispatch.</p>
                </div>
                <div className="flex items-center gap-sm">
                    <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        <button 
                            style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', background: view === 'map' ? 'var(--bg-surface-hover)' : 'transparent', color: view === 'map' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                            onClick={() => setView('map')}
                        >
                            Map View
                        </button>
                        <button 
                            style={{ padding: '0.25rem 0.75rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', background: view === 'list' ? 'var(--bg-surface-hover)' : 'transparent', color: view === 'list' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                            onClick={() => setView('list')}
                        >
                            List View
                        </button>
                    </div>
                    <button className="btn btn-primary"><ShieldAlert size={16} /> Force Dispatch</button>
                </div>
            </div>

            <div className="grid-4 mb-md">
                <div className="card glass-panel" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Available</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>84</div>
                </div>
                <div className="card glass-panel" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>On Route to Scene</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>12</div>
                </div>
                <div className="card glass-panel" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Transporting to Hospital</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-color)' }}>28</div>
                </div>
                <div className="card glass-panel" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Maintenance</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-secondary)' }}>4</div>
                </div>
            </div>

            <div className="flex gap-lg" style={{ flex: 1 }}>
                <div className="card" style={{ flex: 3, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {view === 'map' ? (
                        <div style={{ flex: 1, background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                            <MapIcon size={48} color="var(--text-tertiary)" style={{ marginBottom: '1rem' }} />
                            <h3 style={{ color: 'var(--text-secondary)' }}>Live Leaflet Map Integration Here</h3>
                            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Showing real-time positions of 124 units.</p>
                        </div>
                    ) : (
                        <div className="data-grid-container" style={{ border: 'none', borderRadius: 0, height: '100%' }}>
                            <table className="data-grid">
                                <thead>
                                    <tr>
                                        <th>Unit ID</th>
                                        <th>Status</th>
                                        <th>Current Location</th>
                                        <th>Destination</th>
                                        <th>ETA</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>AMB-104</strong></td>
                                        <td><span className="badge badge-warning">On Route to Scene</span></td>
                                        <td>Highway 4, Exit 12</td>
                                        <td>7th Avenue Crash Site</td>
                                        <td><span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>4 mins</span></td>
                                        <td><button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Radio</button></td>
                                    </tr>
                                    <tr>
                                        <td><strong>AMB-092</strong></td>
                                        <td><span className="badge badge-info">Transporting</span></td>
                                        <td>Downtown Metro</td>
                                        <td>City General Hospital</td>
                                        <td><span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>12 mins</span></td>
                                        <td><button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Radio</button></td>
                                    </tr>
                                    <tr>
                                        <td><strong>AMB-201</strong></td>
                                        <td><span className="badge badge-success">Available</span></td>
                                        <td>Station 4</td>
                                        <td>--</td>
                                        <td>--</td>
                                        <td><button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Dispatch</button></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="card glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div className="flex items-center gap-sm mb-md">
                        <Navigation2 color="var(--primary-color)" size={20} />
                        <h2 style={{ fontSize: '1.125rem', margin: 0 }}>Active Optimizations</h2>
                    </div>
                    
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ padding: '1rem', background: 'var(--info-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid #BFDBFE' }}>
                            <div className="flex justify-between items-start mb-xs">
                                <h4 style={{ color: '#1E40AF', fontSize: '0.875rem' }}>AMB-104 Re-routed</h4>
                                <span className="badge" style={{ background: '#DBEAFE', color: '#1E40AF', fontSize: '0.65rem' }}>-4 mins</span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#1E3A8A' }}>AI detected heavy traffic on Highway 4. Rerouted via 7th Avenue.</p>
                        </div>
                        
                        <div style={{ padding: '1rem', background: 'var(--warning-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid #FDE68A' }}>
                            <div className="flex justify-between items-start mb-xs">
                                <h4 style={{ color: '#92400E', fontSize: '0.875rem' }}>AMB-092 Alert</h4>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#92400E' }}>Patient condition degrading. Requested priority landing at City General.</p>
                            <button className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.25rem', fontSize: '0.75rem', background: '#D97706' }}>Approve Priority</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AmbulanceIntelligence;
