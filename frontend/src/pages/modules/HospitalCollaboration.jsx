import React from 'react';
import { Building2, Search, MessageSquare, Plus, Activity, Star } from 'lucide-react';

const HospitalCollaboration = () => {
    return (
        <div style={{ paddingBottom: '2rem' }}>
            <div className="flex justify-between items-center mb-lg">
                <div>
                    <div className="flex items-center gap-sm mb-xs">
                        <Building2 color="var(--primary-color)" size={20} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Operational Module
                        </span>
                    </div>
                    <h1>Hospital Network & Collaboration</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Directory, capability verification, and inter-hospital communication.</p>
                </div>
                <div className="flex items-center gap-sm">
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input type="text" className="search-input" placeholder="Search hospitals, capabilities..." style={{ width: '250px' }} />
                    </div>
                    <button className="btn btn-primary"><Plus size={16} /> Add Facility</button>
                </div>
            </div>

            <div className="grid-3">
                <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                    <div className="flex justify-between items-start mb-md">
                        <div className="flex items-center gap-sm">
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Activity size={24} color="var(--info)" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>Metro General</h3>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Level 1 Trauma Center</div>
                            </div>
                        </div>
                        <span className="badge badge-success">Online</span>
                    </div>
                    <div className="flex gap-xs mb-md" style={{ flexWrap: 'wrap' }}>
                        <span className="badge badge-neutral">Cardiology</span>
                        <span className="badge badge-neutral">Neurology</span>
                        <span className="badge badge-neutral">Burn Unit</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>ICU Availability: <strong style={{ color: 'var(--text-primary)' }}>4 beds</strong></span>
                        <span>Distance: <strong>3.2 mi</strong></span>
                    </div>
                    <div className="flex gap-sm">
                        <button className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem' }}>View Profile</button>
                        <button className="btn btn-primary" style={{ flex: 1, padding: '0.5rem' }}><MessageSquare size={16} /> Message</button>
                    </div>
                </div>

                <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                    <div className="flex justify-between items-start mb-md">
                        <div className="flex items-center gap-sm">
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Activity size={24} color="var(--warning)" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>Valley Health</h3>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Level 2 Trauma Center</div>
                            </div>
                        </div>
                        <span className="badge badge-success">Online</span>
                    </div>
                    <div className="flex gap-xs mb-md" style={{ flexWrap: 'wrap' }}>
                        <span className="badge badge-neutral">Pediatrics</span>
                        <span className="badge badge-neutral">Orthopedics</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>ICU Availability: <strong style={{ color: 'var(--text-primary)' }}>12 beds</strong></span>
                        <span>Distance: <strong>8.5 mi</strong></span>
                    </div>
                    <div className="flex gap-sm">
                        <button className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem' }}>View Profile</button>
                        <button className="btn btn-primary" style={{ flex: 1, padding: '0.5rem' }}><MessageSquare size={16} /> Message</button>
                    </div>
                </div>

                <div className="card glass-panel" style={{ padding: '1.5rem' }}>
                    <div className="flex justify-between items-start mb-md">
                        <div className="flex items-center gap-sm">
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Star size={24} color="var(--danger)" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>City Center Med</h3>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Specialty Care</div>
                            </div>
                        </div>
                        <span className="badge badge-warning">High Load</span>
                    </div>
                    <div className="flex gap-xs mb-md" style={{ flexWrap: 'wrap' }}>
                        <span className="badge badge-neutral">Oncology</span>
                        <span className="badge badge-neutral">Transplant Center</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>ICU Availability: <strong style={{ color: 'var(--danger)' }}>0 beds</strong></span>
                        <span>Distance: <strong>12.1 mi</strong></span>
                    </div>
                    <div className="flex gap-sm">
                        <button className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem' }}>View Profile</button>
                        <button className="btn btn-primary" style={{ flex: 1, padding: '0.5rem' }}><MessageSquare size={16} /> Message</button>
                    </div>
                </div>
            </div>
            
            <h2 style={{ fontSize: '1.25rem', marginTop: '2rem', marginBottom: '1rem' }}>Recent Collaboration Activity</h2>
            <div className="card glass-panel">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div className="flex justify-between mb-xs">
                            <strong style={{ fontSize: '0.875rem' }}>Resource Request Fulfilled</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>2 mins ago</span>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Metro General successfully transferred 4 units of O- blood to Valley Health.</p>
                    </div>
                    <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div className="flex justify-between mb-xs">
                            <strong style={{ fontSize: '0.875rem' }}>New Protocol Shared</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>1 hour ago</span>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>City Center Med published updated Oncology intake protocols to the network.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HospitalCollaboration;
