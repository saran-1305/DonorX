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
    const [timeLeft, setTimeLeft] = useState(15);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const lastShownRequestIdRef = useRef(null);
    const dismissedRequestIdsRef = useRef(new Set());
    const isOpenRef = useRef(false);
    const { showToast, user } = useDonor();
    const navigate = useNavigate();

    isOpenRef.current = isOpen;

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
        if (dismissedRequestIdsRef.current.has(incReq._id)) return;
        if (isOpenRef.current && lastShownRequestIdRef.current === incReq._id) return;
        lastShownRequestIdRef.current = incReq._id;
        setRequest(incReq);
        setIsOpen(true);
        setInventoryMatch(null);
        checkInventory(incReq);
    }, []);

    const checkForRequests = useCallback(async () => {
        if (!user?._id) return;
        if (isOpenRef.current) return;
        try {
            const { data } = await requestService.getIncoming();
            if (data?.length > 0) {
                const freshReq = data.find((r) => !dismissedRequestIdsRef.current.has(r._id));
                if (freshReq) {
                    openRequest(freshReq);
                }
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
        setTimeLeft(15);
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
        const reqId = request._id;
        dismissedRequestIdsRef.current.add(reqId);
        showToast('15-second response window expired — request is expanding to next 5km radius', 'info');
        setIsOpen(false);
        setRequest(null);
    };

    const handleRespond = async (status) => {
        if (!request || isSubmitting) return;
        setIsSubmitting(true);
        const requestId = request._id;
        dismissedRequestIdsRef.current.add(requestId);
        try {
            await requestService.respond(requestId, status);
            showToast(
                status === 'Accept' ? 'Request accepted! Opening route...' : 'Request denied',
                status === 'Accept' ? 'success' : 'info'
            );
            setIsOpen(false);
            setRequest(null);
            setTimeLeft(15);
            if (status === 'Accept') {
                navigate(`/map?request=${requestId}`);
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || 'Failed to respond';
            showToast(`Failed to respond: ${errorMessage}`, 'error');
            setIsOpen(false);
            setRequest(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!request) return null;

    return (
        <Modal isOpen={isOpen} onClose={() => {
            if (request?._id) dismissedRequestIdsRef.current.add(request._id);
            setIsOpen(false);
            setRequest(null);
        }} maxWidth="580px">
            <div style={{ textAlign: 'center', padding: '1.25rem 0.5rem' }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--soft-red)',
                    color: 'var(--medical-red)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.75rem auto',
                }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                </div>

                <h2 style={{ color: 'var(--text-primary)', fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
                    Incoming Emergency Requisition
                </h2>
                <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    From {request.requestingHospital?.name || 'Regional Hospital Network'}
                </p>

                <div style={{
                    margin: '1.25rem 0',
                    textAlign: 'left',
                    background: 'var(--bg-main)',
                    padding: '1.15rem',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.88rem' }}>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Patient:</strong> <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{request.patientName}</span></div>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Urgency:</strong> <span style={{ background: 'var(--soft-red)', color: 'var(--medical-red)', fontWeight: 800, fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase' }}>{request.urgency}</span></div>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Condition:</strong> <span style={{ fontWeight: 600 }}>{request.condition}</span></div>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Resource Needed:</strong> <span style={{ fontWeight: 700, color: 'var(--primary-emerald)' }}>{formatRequired(request)}</span></div>
                        <div style={{ gridColumn: '1 / -1' }}><strong style={{ color: 'var(--text-secondary)' }}>Triage Priority Score:</strong> <span style={{ fontWeight: 800, color: 'var(--medical-red)' }}>{request.priorityScore}/100</span></div>
                        {request.aiSummary && (
                            <div style={{ gridColumn: '1 / -1', marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--ai-accent)', fontStyle: 'italic', background: 'var(--ai-soft)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--ai-border)' }}>
                                AI Intelligence: {request.aiSummary}
                            </div>
                        )}
                    </div>
                </div>

                {inventoryMatch && (
                    <div style={{
                        marginBottom: '1.25rem',
                        padding: '0.75rem 1rem',
                        background: inventoryMatch.startsWith('WARNING') ? 'var(--soft-amber)' : 'var(--emerald-soft)',
                        color: inventoryMatch.startsWith('WARNING') ? '#92400E' : 'var(--primary-emerald)',
                        border: `1px solid ${inventoryMatch.startsWith('WARNING') ? '#FCD34D' : '#A7F3D0'}`,
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                    }}>
                        {inventoryMatch}
                    </div>
                )}

                <p style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Auto-Deny & Expand in <span style={{ color: 'var(--medical-red)', fontWeight: 800, fontSize: '1.1rem' }}>{formatTime(timeLeft)}</span>
                </p>

                <div className="flex gap-4">
                    <button
                        onClick={() => handleRespond('Deny')}
                        disabled={isSubmitting}
                        className="btn btn-secondary w-full"
                        style={{
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-secondary)',
                            background: 'white',
                            borderRadius: '12px',
                            fontWeight: 700,
                            padding: '0.8rem',
                            opacity: isSubmitting ? 0.6 : 1,
                        }}
                    >
                        Decline
                    </button>
                    <button
                        onClick={() => handleRespond('Accept')}
                        disabled={isSubmitting}
                        className="btn btn-primary w-full"
                        style={{
                            background: 'var(--primary-emerald)',
                            borderColor: 'var(--primary-emerald)',
                            borderRadius: '12px',
                            fontWeight: 800,
                            padding: '0.8rem',
                            boxShadow: '0 4px 14px rgba(7, 143, 80, 0.3)',
                            opacity: isSubmitting ? 0.6 : 1,
                        }}
                    >
                        {isSubmitting ? 'PROCESSING...' : 'ACCEPT EMERGENCY REQUEST'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default IncomingRequestModal;
