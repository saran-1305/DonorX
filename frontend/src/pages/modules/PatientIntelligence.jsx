import React from 'react';
import { UserSquare2, Search, Activity, HeartPulse, AlertCircle, FileText } from 'lucide-react';

const PatientIntelligence = () => {
    return (
        <div style={{ paddingBottom: '2rem' }}>
            <div className="flex justify-between items-center mb-lg">
                <div>
                    <div className="flex items-center gap-sm mb-xs">
                        <UserSquare2 color="var(--primary-color)" size={20} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Intelligence Layer
                        </span>
                    </div>
                    <h1>Healthcare Digital Twin</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Comprehensive patient history, risk profiles, and predictive analytics.</p>
                </div>
                <div className="flex items-center gap-sm">
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input type="text" className="search-input" placeholder="Search patient ID or name..." style={{ width: '300px' }} />
                    </div>
                </div>
            </div>

            {/* Digital Twin Profile */}
            <div className="card glass-panel mb-lg" style={{ padding: '2rem' }}>
                <div className="flex justify-between items-start mb-lg" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
                    <div className="flex items-center gap-md">
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2rem', fontWeight: 700 }}>
                            JD
                        </div>
                        <div>
                            <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>John Doe</h2>
                            <div className="flex gap-sm" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                <span>ID: <strong>#PT-849201</strong></span>
                                <span>•</span>
                                <span>DOB: <strong>14-May-1982 (44)</strong></span>
                                <span>•</span>
                                <span>Blood: <strong style={{ color: 'var(--danger)' }}>O- Negative</strong></span>
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>AI Risk Score</div>
                        <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--warning)', lineHeight: 1 }}>74</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>High Risk Profile</div>
                    </div>
                </div>

                <div className="grid-3">
                    <div>
                        <h3 className="flex items-center gap-sm mb-md" style={{ fontSize: '1rem' }}><AlertCircle size={18} color="var(--danger)" /> Critical Alerts</h3>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <li style={{ padding: '0.75rem', background: 'var(--danger-bg)', color: '#991B1B', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 500 }}>
                                Severe Penicillin Allergy
                            </li>
                            <li style={{ padding: '0.75rem', background: 'var(--warning-bg)', color: '#92400E', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 500 }}>
                                History of Hypertension
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="flex items-center gap-sm mb-md" style={{ fontSize: '1rem' }}><Activity size={18} color="var(--primary-color)" /> Recent Activity</h3>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <li style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                                <strong>ER Visit</strong> - Chest Pain (2 mos ago)
                            </li>
                            <li style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                                <strong>Lab Test</strong> - Complete Blood Count (4 mos ago)
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="flex items-center gap-sm mb-md" style={{ fontSize: '1rem' }}><HeartPulse size={18} color="var(--success)" /> Vitals Snapshot</h3>
                        <div className="grid-2 gap-sm">
                            <div style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Blood Pressure</div>
                                <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>135/85 <span style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>↑</span></div>
                            </div>
                            <div style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Heart Rate</div>
                                <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>72 bpm</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center mb-md mt-xl">
                <h2 style={{ fontSize: '1.25rem' }}>Medical Documents & Reports</h2>
                <button className="btn btn-primary"><FileText size={16} /> Upload New Report</button>
            </div>
            
            <div className="data-grid-container">
                <table className="data-grid">
                    <thead>
                        <tr>
                            <th>Document Type</th>
                            <th>Date Uploaded</th>
                            <th>Provider</th>
                            <th>AI Summary Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Cardiology Consult Note</strong></td>
                            <td>Oct 12, 2025</td>
                            <td>Dr. Alan Smith</td>
                            <td><span className="badge badge-success">Analyzed</span></td>
                            <td><button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>View</button></td>
                        </tr>
                        <tr>
                            <td><strong>MRI Scan Results (Chest)</strong></td>
                            <td>Aug 04, 2025</td>
                            <td>Metro Imaging Center</td>
                            <td><span className="badge badge-success">Analyzed</span></td>
                            <td><button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>View</button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PatientIntelligence;
