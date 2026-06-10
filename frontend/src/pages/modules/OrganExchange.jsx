import React from 'react';
import { Heart, Activity, Clock, ShieldCheck, ArrowRight } from 'lucide-react';

const OrganExchange = () => {
    return (
        <div style={{ paddingBottom: '2rem' }}>
            <div className="flex justify-between items-center mb-lg">
                <div>
                    <div className="flex items-center gap-sm mb-xs">
                        <Heart color="var(--primary-color)" size={20} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Operational Module
                        </span>
                    </div>
                    <h1>Organ Exchange & Compatibility</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>High-security patient matching and critical transport coordination.</p>
                </div>
                <div className="flex items-center gap-sm">
                    <button className="btn btn-secondary">Waitlist Registry</button>
                    <button className="btn btn-primary">Register Donor</button>
                </div>
            </div>

            <div className="grid-3 mb-lg">
                <div className="card glass-panel" style={{ gridColumn: 'span 2' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Active Compatibility Matches (AI Scored)</h2>
                    <div className="data-grid-container">
                        <table className="data-grid">
                            <thead>
                                <tr>
                                    <th>Organ</th>
                                    <th>Donor Location</th>
                                    <th>Recipient Location</th>
                                    <th>HLA Match</th>
                                    <th>Cold Ischemia Time</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><span style={{ fontWeight: 600 }}>Heart</span></td>
                                    <td>North Regional</td>
                                    <td>Metro General</td>
                                    <td><span style={{ color: 'var(--success)', fontWeight: 600 }}>6/6</span></td>
                                    <td><span style={{ color: 'var(--danger)', fontWeight: 600 }}>02:14:00</span></td>
                                    <td><span className="badge badge-warning">Transporting</span></td>
                                    <td><button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Track</button></td>
                                </tr>
                                <tr>
                                    <td><span style={{ fontWeight: 600 }}>Kidney</span></td>
                                    <td>Valley Health</td>
                                    <td>Eastside Med</td>
                                    <td><span style={{ color: 'var(--success)', fontWeight: 600 }}>5/6</span></td>
                                    <td>12:45:00</td>
                                    <td><span className="badge badge-info">Matching Review</span></td>
                                    <td><button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Review</button></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="flex items-center gap-sm mb-md">
                        <ShieldCheck color="var(--success)" size={24} />
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Transport Logistics</h2>
                    </div>
                    
                    <div style={{ flex: 1, borderLeft: '2px solid var(--border-color)', marginLeft: '12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '-27px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success)', border: '2px solid white' }}></div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Organ Harvested</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>North Regional • 08:00 AM</div>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '-27px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary-color)', border: '2px solid white' }}></div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Airborne (Flight TX-204)</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ETA: 45 mins</div>
                            <div style={{ marginTop: '0.5rem', background: 'var(--bg-surface-hover)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                                <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} /> Ischemia Clock: <strong style={{ color: 'var(--danger)' }}>02:14:00</strong>
                            </div>
                        </div>
                        <div style={{ position: 'relative', opacity: 0.5 }}>
                            <div style={{ position: 'absolute', left: '-27px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--border-color)', border: '2px solid white' }}></div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Arrival at Metro General</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pending</div>
                        </div>
                    </div>
                    
                    <button className="btn btn-secondary mt-md" style={{ width: '100%' }}>View Full Log <ArrowRight size={16} style={{ marginLeft: '4px' }}/></button>
                </div>
            </div>
        </div>
    );
};

export default OrganExchange;
