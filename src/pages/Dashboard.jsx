import React, { useState, useEffect, useRef } from 'react';
import { useDonor } from '../context/DonorContext';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';

const Dashboard = () => {
    const { requests, incomingRequests, getAuditLogsForRequest, showToast, formatDate } = useDonor();
    const navigate = useNavigate();

    // Stats
    const activeRequests = requests.length;
    const criticalRequests = requests.filter(r => r.urgency === 'Critical' || r.urgency === 'High').length;

    // Audit Modal State
    const [isAuditOpen, setAuditOpen] = useState(false);
    const [selectedAuditId, setSelectedAuditId] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);

    // Incoming Request Modal State
    const [isIncomingOpen, setIncomingOpen] = useState(false);
    const [denyTimer, setDenyTimer] = useState("2:59");

    useEffect(() => {
        // Simulate Incoming Request Trigger (after 5s)
        const timer = setTimeout(() => {
            setIncomingOpen(true);
            startDenyTimer();
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    // Auto-scroll for Audit Modal
    const timelineRef = useRef(null);
    const outgoingRef = useRef(null);

    const scrollToOutgoing = () => {
        outgoingRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isAuditOpen && timelineRef.current) {
            setTimeout(() => {
                timelineRef.current.scrollTo({
                    top: timelineRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }, 100);
        }
    }, [isAuditOpen, auditLogs]);

    const startDenyTimer = () => {
        let timeLeft = 179;
        const interval = setInterval(() => {
            timeLeft--;
            const m = Math.floor(timeLeft / 60);
            const s = timeLeft % 60;
            setDenyTimer(`${m}:${s < 10 ? '0' + s : s}`);
            if (timeLeft <= 0) {
                setIncomingOpen(false);
                showToast('Request Time Out / Denied', 'warning');
                clearInterval(interval);
            }
        }, 1000);
        // Clean up interval not easily possible here without ref, but OK for prototype scope
    };

    const handleOpenAudit = (requestId) => {
        setSelectedAuditId(requestId);
        setAuditLogs(getAuditLogsForRequest(requestId));
        setAuditOpen(true);
    };

    const handleAcceptIncoming = () => {
        setIncomingOpen(false);
        showToast('Transfer Protocol Initiated', 'success');
        setTimeout(() => navigate('/tracking'), 1000);
    };

    const handleDenyIncoming = () => {
        setIncomingOpen(false);
        showToast('Request Denied', 'warning');
    };

    const getResDisplay = (req) => {
        if (req.resources && req.resources.length > 0) {
            return req.resources.map((r, i) => (
                <div key={i} style={{ fontWeight: 500 }}>
                    {r.type === 'Blood' ? `Blood: ${r.group} (${r.qty} Units)` : `Organ: ${r.organ}`}
                </div>
            ));
        }
        return (
            <>
                <div style={{ fontWeight: 500 }}>{req.bloodGroup !== 'N/A' ? req.bloodGroup : ''}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{req.organType !== 'None' ? req.organType : ''}</div>
            </>
        );
    };

    const getUrgencyClass = (urgency) => {
        switch (urgency) {
            case 'Medium': return 'badge-medium';
            case 'High': return 'badge-high';
            case 'Critical': return 'badge-critical';
            default: return 'badge-low';
        }
    };

    const getStatusClass = (status) => {
        if (status === 'Matched') return 'badge-matched';
        if (status === 'Completed') return 'badge-success';
        if (status === 'Ended') return 'badge-critical';
        return 'badge-searching';
    };

    return (
        <div className="container" style={{ padding: '4rem 1rem' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <h2>Live Emergency Dashboard</h2>
                <div className="flex gap-sm">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        <span style={{ width: '8px', height: '8px', background: 'var(--success)', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
                        System Operational
                    </span>
                </div>
            </div>

            <div className="stats-grid animate-fade-in">
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--info)' }}>{activeRequests}</div>
                    <div className="stat-label">Active Requests</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--danger)' }}>{criticalRequests}</div>
                    <div className="stat-label">Critical Priority</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--success)' }}>12m 30s</div>
                    <div className="stat-label">Avg. Match Time</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--warning)' }}>98.5%</div>
                    <div className="stat-label">AI Accuracy</div>
                </div>
            </div>

            {/* Incoming Requests */}
            <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Incoming Requests (Other Hospitals)</h3>
                <button
                    onClick={scrollToOutgoing}
                    className="btn"
                    style={{
                        fontSize: '0.8rem',
                        padding: '0.4rem 0.8rem',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                    }}
                >
                    Outgoing ↓
                </button>
            </div>
            <div className="card table-container animate-fade-in" style={{ padding: 0, marginBottom: '3rem' }}>
                <table className="interactive-table">
                    <thead>
                        <tr>
                            <th>Request ID</th>
                            <th>Patient</th>
                            <th>Resource</th>
                            <th>Origin Hospital</th>
                            <th>Urgency</th>
                            <th>Status</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {incomingRequests.map(req => (
                            <tr key={req.id} onClick={() => handleOpenAudit(req.id)} style={{ cursor: 'pointer' }}>
                                <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{req.id}</td>
                                <td style={{ fontWeight: 600 }}>{req.patientName}</td>
                                <td>
                                    <div style={{ fontWeight: 500 }}>{req.organType !== 'None' ? 'Organ: ' + req.organType : 'Blood: ' + req.bloodGroup}</div>
                                </td>
                                <td>{req.location}</td>
                                <td><span className={`badge ${getUrgencyClass(req.urgency)}`}>{req.urgency}</span></td>
                                <td><span className={`badge ${getStatusClass(req.status)}`}>{req.status}</span></td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{formatDate(req.timestamp)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Outgoing Requests */}
            <div ref={outgoingRef} className="card table-container animate-fade-in" style={{ padding: 0 }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                    <h3 style={{ margin: 0 }}>Outgoing Requests</h3>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Request ID</th>
                            <th>Patient</th>
                            <th>Blood / Organ</th>
                            <th>Location</th>
                            <th>Urgency</th>
                            <th>Status</th>
                            <th>Sent</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No active requests found.
                                </td>
                            </tr>
                        ) : (
                            requests.map(req => (
                                <tr key={req.id} onClick={() => handleOpenAudit(req.id)} style={{ cursor: 'pointer' }} title="Click to view Audit Log">
                                    <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{req.id}</td>
                                    <td style={{ fontWeight: 600 }}>{req.patientName || 'Anonymous'}</td>
                                    <td>{getResDisplay(req)}</td>
                                    <td>{req.location}</td>
                                    <td><span className={`badge ${getUrgencyClass(req.urgency)}`}>{req.urgency}</span></td>
                                    <td><span className={`badge ${getStatusClass(req.status)}`}>{req.status}</span></td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{formatDate(req.timestamp)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Audit Modal */}
            <Modal isOpen={isAuditOpen} onClose={() => setAuditOpen(false)} maxWidth="800px">
                <div className="flex justify-between items-center"
                    style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', textAlign: 'left' }}>
                    <div>
                        <div className="badge badge-low" style={{ marginBottom: '0.5rem', background: '#EEF2FF', color: '#4F46E5', display: 'inline-block' }}>
                            Blockchain Ledger</div>
                        <h3 style={{ margin: 0 }}>Audit Trail: <span style={{ fontFamily: 'monospace' }}>{selectedAuditId}</span></h3>
                    </div>
                </div>

                <div className="timeline" ref={timelineRef} style={{ textAlign: 'left', maxHeight: '60vh', overflowY: 'auto' }}>
                    {auditLogs.map((log, index) => (
                        <div key={index} className="timeline-item">
                            <div className="timeline-dot"></div>
                            <div className="timeline-content">
                                <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: '#F3F4F6', padding: '2px 6px', borderRadius: '4px' }}>
                                        TX: {log.hash ? log.hash.substr(0, 16) + '...' : ''}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(log.timestamp)}</span>
                                </div>
                                <h4 style={{ margin: '0 0 0.25rem 0' }}>{log.action}</h4>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{log.details}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>

            {/* Incoming Request Alert Modal */}
            <Modal isOpen={isIncomingOpen} onClose={() => { }} maxWidth="500px">
                <div style={{ textAlign: 'left', borderLeft: '6px solid var(--danger)', paddingLeft: '1rem' }}>
                    <div style={{ background: '#FEF2F2', color: 'var(--danger)', padding: '0.5rem', fontWeight: 'bold', marginBottom: '1rem', borderRadius: 'var(--radius-md)' }}>
                        ⚠ INCOMING EMERGENCY REQUEST
                    </div>
                    <h3 style={{ marginBottom: '0.5rem' }}>Critical Kidney Request</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>From: General Hospital (4.2km)</p>

                    <div style={{ background: '#F3F4F6', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'left', marginBottom: '1.5rem' }}>
                        <div className="flex justify-between" style={{ marginBottom: '0.5rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Patient:</span>
                            <span style={{ fontWeight: 600 }}>Ravi Shankar</span>
                        </div>
                        <div className="flex justify-between" style={{ marginBottom: '0.5rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Blood Group:</span>
                            <span style={{ fontWeight: 600 }}>B+</span>
                        </div>
                        <div className="flex justify-between">
                            <span style={{ color: 'var(--text-secondary)' }}>Organ:</span>
                            <span style={{ fontWeight: 600 }}>Kidney (Left)</span>
                        </div>
                    </div>

                    <div className="animate-pulse" style={{ background: '#ECFDF5', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: '#065F46', fontSize: '0.9rem', marginBottom: '1.5rem', border: '1px solid #10B981', fontWeight: 600, textAlign: 'center' }}>
                        ✅ AI Match: Inventory #6 (Locker 324)
                    </div>

                    <div className="flex gap-sm">
                        <button onClick={handleDenyIncoming} className="btn"
                            style={{ flex: 1, border: '1px solid var(--border-color)' }}>Deny ({denyTimer})</button>
                        <button onClick={handleAcceptIncoming} className="btn btn-primary" style={{ flex: 1 }}>Accept Request</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Dashboard;
