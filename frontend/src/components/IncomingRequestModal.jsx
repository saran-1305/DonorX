import React, { useState, useEffect, useRef, useCallback } from 'react';
import Modal from './Modal';
import { requestService, inventoryService, resourceService } from '../services/api';
import { useDonor } from '../context/DonorContext';
import { useNavigate } from 'react-router-dom';
import { getSocket, joinHospitalRoom } from '../services/socket';

const RESOURCE_LABELS = {
    ICU_BED: 'ICU Bed',
    VENTILATOR: 'Ventilator',
    OXYGEN_CYLINDER: 'Oxygen Cylinder',
    AMBULANCE: 'Ambulance',
};

const IncomingRequestModal = () => {
    const [request, setRequest] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [inventoryMatch, setInventoryMatch] = useState(null);
    const [timeLeft, setTimeLeft] = useState(180);
    const lastShownRequestIdRef = useRef(null);
    const { showToast, user } = useDonor();
    const navigate = useNavigate();

    const formatRequired = (req) => {
        const { type, group, quantity, resourceCategory } = req.resourceNeeded;
        if (resourceCategory === 'RESOURCE' || RESOURCE_LABELS[type]) {
            return `${quantity} x ${RESOURCE_LABELS[type] || type.replace(/_/g, ' ')}`;
        }
        if (type === 'BLOOD') return `${quantity} units of ${group} Blood`;
        if (type === 'ORGAN') return `${quantity} x ${group}`;
        return `${group} ${type} (x${quantity})`;
    };

    const checkInventory = async (req) => {
        try {
            const { type, group, quantity, resourceCategory } = req.resourceNeeded;
            const isFacility = resourceCategory === 'RESOURCE' || RESOURCE_LABELS[type];

            if (isFacility) {
                const { data: resources } = await resourceService.getResources();
                const match = resources?.find((r) => r.resourceType === type && r.available >= quantity);
                setInventoryMatch(
                    match
                        ? `Available: ${match.available} ${RESOURCE_LABELS[type] || type} units`
                        : 'WARNING: Insufficient facility resources in system records.'
                );
                return;
            }

            const { data: inventory } = await inventoryService.getInventory();
            const match = inventory?.find((i) => i.type === type && i.group === group && i.quantity >= quantity);
            setInventoryMatch(
                match
                    ? `Available: ${match.quantity} units`
                    : 'WARNING: Insufficient inventory found in system records.'
            );
        } catch (error) {
            console.error(error);
        }
    };

    const openRequest = useCallback((incReq) => {
        if (!incReq?._id) return;
        if (lastShownRequestIdRef.current === incReq._id) return;
        lastShownRequestIdRef.current = incReq._id;
        setRequest(incReq);
        setIsOpen(true);
        setInventoryMatch(null);
        checkInventory(incReq);
    }, []);

    const checkForRequests = useCallback(async () => {
        if (!user?._id) return;
        try {
            const { data } = await requestService.getIncoming();
            if (data?.length > 0) {
                openRequest(data[0]);
            }
        } catch (err) {
            console.error('Incoming request poll error:', err);
        }
    }, [user, openRequest]);

    useEffect(() => {
        if (!user?._id) return;
        joinHospitalRoom(user._id);
        checkForRequests();
        const poll = setInterval(checkForRequests, 5000);

        const socket = getSocket();
        const onNewRequest = (payload) => {
            if (payload?.status === 'Generated') {
                openRequest(payload);
            } else {
                checkForRequests();
            }
        };
        socket.on('new_request', onNewRequest);

        return () => {
            clearInterval(poll);
            socket.off('new_request', onNewRequest);
        };
    }, [user, checkForRequests, openRequest]);

    useEffect(() => {
        if (!isOpen || !request) return;
        setTimeLeft(180);
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleAutoDeny();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isOpen, request]);

    const handleAutoDeny = async () => {
        if (!request) return;
        try {
            await requestService.respond(request._id, 'Deny');
            showToast('Request auto-denied after 3 minutes', 'warning');
            setIsOpen(false);
            setRequest(null);
            lastShownRequestIdRef.current = null;
        } catch (error) {
            console.error('Auto-deny error:', error);
        }
    };

    const handleRespond = async (status) => {
        if (!request) return;
        const requestId = request._id;
        try {
            const { data } = await requestService.respond(requestId, status);
            showToast(
                status === 'Accept' ? 'Request accepted! Opening route...' : 'Request denied',
                status === 'Accept' ? 'success' : 'info'
            );
            setIsOpen(false);
            setRequest(null);
            setTimeLeft(180);
            lastShownRequestIdRef.current = null;
            if (status === 'Accept') {
                navigate(`/map?request=${requestId}`);
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || 'Failed to respond';
            showToast(`Failed to respond: ${errorMessage}`, 'error');
            checkForRequests();
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!request) return null;

    return (
        <Modal isOpen={isOpen} onClose={() => {}} maxWidth="600px">
            <div style={{ textAlign: 'center', padding: '1rem' }}>
                <h2 style={{ color: '#D32F2F', marginBottom: '0.5rem' }}>Emergency Request Incoming</h2>
                <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{request.requestingHospital?.name || 'Unknown Hospital'}</p>
                <div style={{ margin: '1.5rem 0', textAlign: 'left', background: '#FFF5F5', padding: '1rem', borderRadius: '8px', border: '1px solid #FECACA' }}>
                    <div className="grid grid-cols-2 gap-4">
                        <div><strong>Patient:</strong> {request.patientName}</div>
                        <div><strong>Urgency:</strong> <span className="badge badge-critical">{request.urgency}</span></div>
                        <div><strong>Condition:</strong> {request.condition}</div>
                        <div><strong>Required:</strong> {formatRequired(request)}</div>
                        <div><strong>Priority Score:</strong> {request.priorityScore}/100</div>
                        {request.aiSummary && (
                            <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', fontStyle: 'italic', color: '#555' }}>
                                AI Triage: {request.aiSummary}
                            </div>
                        )}
                    </div>
                </div>

                {inventoryMatch && (
                    <div style={{
                        marginBottom: '1.5rem',
                        padding: '0.75rem',
                        background: inventoryMatch.startsWith('WARNING') ? '#FEF3C7' : '#ECFDF5',
                        color: inventoryMatch.startsWith('WARNING') ? '#92400E' : '#065F46',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                    }}>
                        {inventoryMatch}
                    </div>
                )}

                <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
                    Auto-Deny in <span style={{ color: '#D32F2F', fontWeight: 'bold', fontSize: '1.1rem' }}>{formatTime(timeLeft)}</span>
                </p>

                <div className="flex gap-4">
                    <button onClick={() => handleRespond('Deny')} className="btn btn-secondary w-full" style={{ borderColor: '#D32F2F', color: '#D32F2F' }}>
                        Deny
                    </button>
                    <button onClick={() => handleRespond('Accept')} className="btn btn-primary w-full" style={{ background: '#059669', borderColor: '#059669' }}>
                        ACCEPT REQUEST
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default IncomingRequestModal;
