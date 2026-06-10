import React, { useState } from 'react';
import { 
    Heart, ShieldAlert, Activity, ArrowRight,
    MapPin, Users, Phone, Navigation, CheckCircle2
} from 'lucide-react';

const EmergencyCoordination = () => {
    const [step, setStep] = useState(1);

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
                    <h1>Emergency Coordination</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Declare, triage, and dispatch resources for critical emergencies.</p>
                </div>
                <div className="flex items-center gap-sm">
                    <button className="btn btn-secondary">History Logs</button>
                    {step < 5 && <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Next Step <ArrowRight size={16} /></button>}
                </div>
            </div>

            {/* Stepper Workflow */}
            <div className="flex items-center mb-xl" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem' }}>
                {['Create Request', 'Mozilla AI Triage', 'Resource Matching', 'Dispatch', 'Live Monitoring'].map((label, index) => (
                    <React.Fragment key={index}>
                        <div className="flex items-center gap-sm" style={{ opacity: step >= index + 1 ? 1 : 0.4 }}>
                            <div style={{ 
                                width: '32px', height: '32px', borderRadius: '50%', 
                                background: step > index + 1 ? 'var(--success)' : (step === index + 1 ? 'var(--primary-color)' : 'var(--bg-surface-hover)'),
                                color: step >= index + 1 ? 'white' : 'var(--text-secondary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 600, fontSize: '0.875rem'
                            }}>
                                {step > index + 1 ? <CheckCircle2 size={16} /> : index + 1}
                            </div>
                            <span style={{ fontWeight: step === index + 1 ? 600 : 500 }}>{label}</span>
                        </div>
                        {index < 4 && <div style={{ flex: 1, height: '2px', background: step > index + 1 ? 'var(--success)' : 'var(--border-color)', margin: '0 1rem' }}></div>}
                    </React.Fragment>
                ))}
            </div>

            {/* Dynamic Step Content */}
            <div className="card glass-panel" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                {step === 1 && (
                    <div className="animate-fade-in">
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Emergency Declaration</h2>
                        <div className="grid-2">
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Patient Name</label>
                                <input type="text" className="search-input" placeholder="Enter patient name..." style={{ width: '100%', marginBottom: '1rem' }} />
                                
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Required Resource</label>
                                <select className="search-input" style={{ width: '100%', marginBottom: '1rem', background: 'var(--bg-surface)' }}>
                                    <option>Blood (O-)</option>
                                    <option>ICU Bed</option>
                                    <option>Ventilator</option>
                                    <option>Ambulance</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Condition Notes (Voice or Text)</label>
                                <textarea className="search-input" rows="4" placeholder="Describe the critical situation..." style={{ width: '100%', height: '120px', resize: 'none' }}></textarea>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-fade-in" style={{ textAlign: 'center', margin: 'auto' }}>
                        <ShieldAlert size={48} color="var(--primary-color)" style={{ margin: '0 auto 1rem auto' }} />
                        <h2 style={{ marginBottom: '0.5rem' }}>Mozilla AI Triage Active</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Analyzing request parameters against national database...</p>
                        
                        <div className="flex justify-center gap-lg">
                            <div className="card" style={{ width: '200px' }}>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Calculated Severity</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}>CRITICAL</div>
                            </div>
                            <div className="card" style={{ width: '200px' }}>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Est. Response Target</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-color)' }}>{`< 8 mins`}</div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-fade-in">
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Resource Matching Matrix</h2>
                        <div className="data-grid-container">
                            <table className="data-grid">
                                <thead>
                                    <tr>
                                        <th>Facility</th>
                                        <th>Distance</th>
                                        <th>Availability</th>
                                        <th>AI Match Score</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>City General Hospital</td>
                                        <td>3.2 mi</td>
                                        <td><span className="badge badge-success">Available</span></td>
                                        <td>98%</td>
                                        <td><button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Select</button></td>
                                    </tr>
                                    <tr>
                                        <td>North Valley Med</td>
                                        <td>5.8 mi</td>
                                        <td><span className="badge badge-warning">Limited</span></td>
                                        <td>84%</td>
                                        <td><button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Select</button></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="animate-fade-in" style={{ textAlign: 'center', margin: 'auto' }}>
                        <Navigation size={48} color="var(--success)" style={{ margin: '0 auto 1rem auto' }} />
                        <h2 style={{ marginBottom: '0.5rem' }}>Dispatch Confirmed</h2>
                        <p style={{ color: 'var(--text-secondary)' }}>Resource allocation locked. Units deployed.</p>
                    </div>
                )}

                {step === 5 && (
                    <div className="animate-fade-in">
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Live Monitoring</h2>
                        <div className="card" style={{ height: '300px', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {/* Placeholder for Interactive Map */}
                            <MapPin size={32} color="var(--primary-color)" />
                            <span style={{ marginLeft: '1rem', fontWeight: 600 }}>Interactive Map Rendered Here (Leaflet)</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmergencyCoordination;
