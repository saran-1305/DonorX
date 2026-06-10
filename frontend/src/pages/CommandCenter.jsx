import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity, ShieldAlert, Heart, Building2,
    TrendingUp, Droplet, Users, Truck
} from 'lucide-react';

const StatCard = ({ title, value, subtext, icon: Icon, trend, colorClass }) => (
    <div className="card">
        <div className="flex justify-between items-center mb-md">
            <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{title}</h3>
            <div className={`badge ${colorClass}`}>
                <Icon size={14} style={{ marginRight: '4px' }} />
                Live
            </div>
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
        <div className="flex items-center gap-sm mt-md" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <TrendingUp size={16} color={trend === 'up' ? 'var(--success)' : 'var(--danger)'} />
            {subtext}
        </div>
    </div>
);

const ModuleShortcut = ({ title, description, icon: Icon, path }) => {
    const navigate = useNavigate();
    return (
        <div 
            className="card" 
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            onClick={() => navigate(path)}
        >
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={24} color="var(--primary-color)" />
            </div>
            <div>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{description}</p>
            </div>
        </div>
    );
};

const CommandCenter = () => {
    return (
        <div style={{ paddingBottom: '2rem' }}>
            <div className="flex justify-between items-center mb-lg">
                <div>
                    <h1 style={{ marginBottom: '0.5rem' }}>Executive Command Center</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>National Healthcare Intelligence Overview.</p>
                </div>
                <div className="flex gap-sm">
                    <button className="btn btn-secondary">Generate Report</button>
                    <button className="btn btn-primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}>
                        <ShieldAlert size={16} /> Declare Emergency
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid-4 mb-lg">
                <StatCard 
                    title="Active Emergencies" 
                    value="14" 
                    subtext="+2 since last hour" 
                    icon={ShieldAlert} 
                    trend="up" 
                    colorClass="badge-danger" 
                />
                <StatCard 
                    title="Available Blood Units" 
                    value="4,291" 
                    subtext="Healthy reserves" 
                    icon={Droplet} 
                    trend="up" 
                    colorClass="badge-success" 
                />
                <StatCard 
                    title="ICU Capacity" 
                    value="82%" 
                    subtext="Nearing critical threshold" 
                    icon={Activity} 
                    trend="down" 
                    colorClass="badge-warning" 
                />
                <StatCard 
                    title="Ambulance Fleet" 
                    value="124" 
                    subtext="84 Active, 40 Standby" 
                    icon={Truck} 
                    trend="up" 
                    colorClass="badge-info" 
                />
            </div>

            <div className="grid-3 mb-lg">
                <div style={{ gridColumn: 'span 2' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Active Critical Alerts</h2>
                    <div className="data-grid-container">
                        <table className="data-grid">
                            <thead>
                                <tr>
                                    <th>Severity</th>
                                    <th>Region / Hospital</th>
                                    <th>Alert Type</th>
                                    <th>AI Recommendation</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><span className="badge badge-danger">Critical</span></td>
                                    <td>Metro General Hospital</td>
                                    <td>O- Blood Shortage</td>
                                    <td>Initiate inter-hospital transfer (City Center Med)</td>
                                    <td><button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Resolve</button></td>
                                </tr>
                                <tr>
                                    <td><span className="badge badge-warning">High</span></td>
                                    <td>Downtown Medical</td>
                                    <td>ICU Overflow Risk</td>
                                    <td>Divert incoming ambulances to Valley Health</td>
                                    <td><button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Resolve</button></td>
                                </tr>
                                <tr>
                                    <td><span className="badge badge-warning">High</span></td>
                                    <td>Valley Health Center</td>
                                    <td>Mass Casualty Incident</td>
                                    <td>Dispatch 4 additional ambulances</td>
                                    <td><button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Resolve</button></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Mozilla AI Insights</h2>
                    <div className="card glass-panel" style={{ height: 'calc(100% - 2.5rem)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-color)', marginTop: '8px' }}></div>
                            <div>
                                <h4 style={{ fontSize: '0.875rem' }}>Demand Spike Predicted</h4>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>O+ blood demand expected to rise 40% in North Region due to upcoming holiday weekend.</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', marginTop: '8px' }}></div>
                            <div>
                                <h4 style={{ fontSize: '0.875rem' }}>Route Optimization Active</h4>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>AI has re-routed 12 ambulances avoiding Highway 4 traffic, saving ~14 mins avg.</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', marginTop: '8px' }}></div>
                            <div>
                                <h4 style={{ fontSize: '0.875rem' }}>Organ Transport Delay</h4>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Flight tracking shows 15m delay for Heart Transport TX-204. ETA updated.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Quick Access Modules</h2>
            <div className="grid-4">
                <ModuleShortcut 
                    title="Emergency Coordination" 
                    description="Dispatch resources and triage incoming crises." 
                    icon={ShieldAlert} 
                    path="/modules/emergency" 
                />
                <ModuleShortcut 
                    title="Blood Exchange" 
                    description="Manage inventory and cross-hospital logistics." 
                    icon={Droplet} 
                    path="/modules/blood" 
                />
                <ModuleShortcut 
                    title="Organ Exchange" 
                    description="Track critical organ transplants and matches." 
                    icon={Heart} 
                    path="/modules/organ" 
                />
                <ModuleShortcut 
                    title="Hospital Network" 
                    description="Directory and real-time capability matrix." 
                    icon={Building2} 
                    path="/modules/hospitals" 
                />
            </div>
        </div>
    );
};

export default CommandCenter;
