import React, { useState } from 'react';
import { Droplet, Search, Filter, ArrowRightLeft, Activity } from 'lucide-react';

const BloodExchange = () => {
    return (
        <div style={{ paddingBottom: '2rem' }}>
            <div className="flex justify-between items-center mb-lg">
                <div>
                    <div className="flex items-center gap-sm mb-xs">
                        <Droplet color="var(--primary-color)" size={20} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Operational Module
                        </span>
                    </div>
                    <h1>Blood Exchange Network</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Live national blood inventory and cross-hospital transfer logistics.</p>
                </div>
                <div className="flex items-center gap-sm">
                    <button className="btn btn-secondary">Predictive Analytics</button>
                    <button className="btn btn-primary">Request Transfer</button>
                </div>
            </div>

            <div className="grid-4 mb-lg">
                <div className="card">
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem' }}>O-Negative Status</div>
                    <div className="flex items-center gap-sm">
                        <span style={{ fontSize: '2rem', fontWeight: 800 }}>84</span>
                        <span className="badge badge-danger">Critical</span>
                    </div>
                </div>
                <div className="card">
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem' }}>O-Positive Status</div>
                    <div className="flex items-center gap-sm">
                        <span style={{ fontSize: '2rem', fontWeight: 800 }}>1,204</span>
                        <span className="badge badge-success">Healthy</span>
                    </div>
                </div>
                <div className="card">
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem' }}>A-Negative Status</div>
                    <div className="flex items-center gap-sm">
                        <span style={{ fontSize: '2rem', fontWeight: 800 }}>241</span>
                        <span className="badge badge-warning">Low</span>
                    </div>
                </div>
                <div className="card">
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem' }}>Total Network Units</div>
                    <div className="flex items-center gap-sm">
                        <span style={{ fontSize: '2rem', fontWeight: 800 }}>4,291</span>
                        <Activity size={24} color="var(--info)" />
                    </div>
                </div>
            </div>

            <div className="card glass-panel">
                <div className="flex justify-between items-center mb-md">
                    <h2 style={{ fontSize: '1.25rem' }}>Live Inventory Matrix</h2>
                    <div className="flex gap-sm">
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                            <input type="text" className="search-input" placeholder="Search hospital or region..." />
                        </div>
                        <button className="btn btn-secondary" style={{ padding: '0.5rem' }}><Filter size={18} /></button>
                    </div>
                </div>

                <div className="data-grid-container">
                    <table className="data-grid">
                        <thead>
                            <tr>
                                <th>Hospital</th>
                                <th>Region</th>
                                <th>O-</th>
                                <th>O+</th>
                                <th>A-</th>
                                <th>A+</th>
                                <th>B-</th>
                                <th>B+</th>
                                <th>AB-</th>
                                <th>AB+</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Metro General</td>
                                <td>North</td>
                                <td><span style={{ color: 'var(--danger)', fontWeight: 600 }}>2</span></td>
                                <td>145</td>
                                <td>12</td>
                                <td>89</td>
                                <td>5</td>
                                <td>34</td>
                                <td>1</td>
                                <td>12</td>
                                <td><button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}><ArrowRightLeft size={14} /></button></td>
                            </tr>
                            <tr>
                                <td>Valley Health</td>
                                <td>South</td>
                                <td><span style={{ color: 'var(--success)', fontWeight: 600 }}>45</span></td>
                                <td>320</td>
                                <td>45</td>
                                <td>150</td>
                                <td>15</td>
                                <td>80</td>
                                <td>5</td>
                                <td>25</td>
                                <td><button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}><ArrowRightLeft size={14} /></button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BloodExchange;
