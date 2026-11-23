import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDonor } from '../context/DonorContext';
import Modal from '../components/Modal';
import { requestService } from '../services/api';
import { getSocket } from '../services/socket';

const Dashboard = () => {
    const { getAuditLogsForRequest, showToast, formatDate } = useDonor();
    const navigate = useNavigate();

    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [assignedRequests, setAssignedRequests] = useState([]);

    const activeRequests = outgoingRequests.length;
    const criticalRequests = outgoingRequests.filter(r => r.urgency === 'Critical' || r.urgency === 'High').length;

    const [isAuditOpen, setAuditOpen] = useState(false);
    const [selectedAuditId, setSelectedAuditId] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);

    const fetchAll = useCallback(async () => {
        try {
            const [myRes, incRes, assRes] = await Promise.all([
                requestService.getMyRequests(),
                requestService.getIncoming(),
                requestService.getAssigned(),
            ]);
            setOutgoingRequests(Array.isArray(myRes.data) ? myRes.data : []);
            setIncomingRequests(Array.isArray(incRes.data) ? incRes.data : []);
            setAssignedRequests(Array.isArray(assRes.data) ? assRes.data : []);
        } catch (e) {
            console.error('Dashboard fetch error:', e);
        }
    }, []);

    useEffect(() => {
        fetchAll();

        const socket = getSocket();

        const onNewRequest = (request) => {
            setIncomingRequests((prev) => {
                const exists = prev.some((r) => r._id === request._id);
                if (exists) {
                    return prev.map((r) => (r._id === request._id ? request : r));
                }
                return [request, ...prev];
            });
            showToast(`New emergency request: ${request.patientName}`, 'warning');
        };

        const onRequestAccepted = (request) => {
            fetchAll();
            showToast('Emergency request updated (Accepted)!', 'success');
        };

        const onRequestStatusUpdated = (request) => {
            fetchAll();
            if (request.status === 'Completed') {
                showToast(`🎉 Request for ${request.patientName} marked as Completed (Success)!`, 'success');
            }
        };

        socket.on('new_request', onNewRequest);
        socket.on('request_accepted', onRequestAccepted);
        socket.on('request_status_updated', onRequestStatusUpdated);
        socket.on('request_completed', onRequestStatusUpdated);

        return () => {
            socket.off('new_request', onNewRequest);
            socket.off('request_accepted', onRequestAccepted);
            socket.off('request_status_updated', onRequestStatusUpdated);
            socket.off('request_completed', onRequestStatusUpdated);
        };
    }, [fetchAll, showToast]);

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

    const handleOpenAudit = (requestId) => {
        setSelectedAuditId(requestId);
        setAuditLogs(getAuditLogsForRequest(requestId));
        setAuditOpen(true);
    };

    const getResDisplay = (req) => {
        if (!req.resourceNeeded) return '—';
        const { type, group, quantity } = req.resourceNeeded;
        if (type === 'BLOOD') {
            return (
                <div style={{ fontWeight: 500 }}>
                    Blood: {group} ({quantity} Units)
                </div>
            );
        }
        if (type === 'ORGAN') {
            return (
                <div style={{ fontWeight: 500 }}>
                    Organ: {group} (x{quantity})
                </div>
            );
        }
        return '—';
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
                        {incomingRequests.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No incoming requests. Create a request from another hospital to see it here.
                                </td>
                            </tr>
                        ) : (
                            incomingRequests.map(req => (
                                <tr key={req._id} onClick={() => handleOpenAudit(req._id)} style={{ cursor: 'pointer' }}>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{req.requestId || req._id}</td>
                                    <td style={{ fontWeight: 600 }}>{req.patientName}</td>
                                    <td>{req.resourceNeeded ? `${req.resourceNeeded.type}: ${req.resourceNeeded.group} (x${req.resourceNeeded.quantity})` : '—'}</td>
                                    <td>{req.requestingHospital?.name || 'Unknown Hospital'}</td>
                                    <td><span className={`badge ${getUrgencyClass(req.urgency)}`}>{req.urgency}</span></td>
                                    <td><span className={`badge ${getStatusClass(req.status)}`}>{req.status}</span></td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{formatDate(req.createdAt)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Accepted Emergencies (Fulfilling by Your Hospital) */}
            <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#059669' }}></span>
                    Accepted Emergencies (Fulfilling by Your Hospital)
                </h3>
            </div>
            <div className="card table-container animate-fade-in" style={{ padding: 0, marginBottom: '3rem' }}>
                <table className="interactive-table">
                    <thead>
                        <tr>
                            <th>Request ID</th>
                            <th>Patient</th>
                            <th>Resource</th>
                            <th>Requesting Hospital</th>
                            <th>Status</th>
                            <th>Actions & Bill</th>
                            <th>Accepted / Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assignedRequests.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No requests currently accepted or assigned to your hospital.
                                </td>
                            </tr>
                        ) : (
                            assignedRequests.map(req => (
                                <tr key={req._id}>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{req.requestId || req._id}</td>
                                    <td style={{ fontWeight: 600 }}>{req.patientName}</td>
                                    <td>{req.resourceNeeded ? `${req.resourceNeeded.type}: ${req.resourceNeeded.group} (x${req.resourceNeeded.quantity})` : '—'}</td>
                                    <td>{req.requestingHospital?.name || 'Unknown Hospital'}</td>
                                    <td>
                                        <span className={`badge ${req.status === 'Completed' ? 'badge-success' : req.status === 'Ended' ? 'badge-critical' : 'badge-matched'}`}>
                                            {req.status === 'Completed' ? '✓ Completed (Success)' : req.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/map?request=${req._id}`)}
                                                className="btn btn-sm"
                                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', border: '1px solid #CBD5E1' }}
                                            >
                                                Map Route
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/billing?request=${req._id}`)}
                                                className="btn btn-sm btn-primary"
                                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                            >
                                                Bill & Rate
                                            </button>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{formatDate(req.updatedAt || req.createdAt)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

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
                        {outgoingRequests.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No active requests found.
                                </td>
                            </tr>
                        ) : (
                            outgoingRequests.map(req => (
                                <tr key={req._id} onClick={() => handleOpenAudit(req._id)} style={{ cursor: 'pointer' }} title="Click to view Audit Log">
                                    <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{req.requestId || req._id}</td>
                                    <td style={{ fontWeight: 600 }}>{req.patientName || 'Anonymous'}</td>
                                    <td>{getResDisplay(req)}</td>
                                    <td>{req.location ? (req.location.address || 'Origin') : 'Origin'}</td>
                                    <td><span className={`badge ${getUrgencyClass(req.urgency)}`}>{req.urgency}</span></td>
                                    <td><span className={`badge ${getStatusClass(req.status)}`}>{req.status}</span></td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{formatDate(req.createdAt)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

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
        </div>
    );
};

export default Dashboard;
