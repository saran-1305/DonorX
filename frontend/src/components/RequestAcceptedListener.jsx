import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../services/socket';
import { useDonor } from '../context/DonorContext';
import { requestService } from '../services/api';
import Modal from './Modal';

const RESOURCE_LABELS = {
    ICU_BED: 'ICU Bed',
    VENTILATOR: 'Ventilator',
    OXYGEN_CYLINDER: 'Oxygen Cylinder',
    AMBULANCE: 'Ambulance',
};

const RequestAcceptedListener = () => {
    const { user, showToast } = useDonor();
    const navigate = useNavigate();
    const [acceptedRequest, setAcceptedRequest] = useState(null);
    const [isOpen, setIsOpen] = useState(false);

    const formatRequired = (req) => {
        if (!req?.resourceNeeded) return 'Emergency Resource';
        const { type, group, quantity, resourceCategory } = req.resourceNeeded;
        if (resourceCategory === 'RESOURCE' || RESOURCE_LABELS[type]) {
            return `${quantity} x ${RESOURCE_LABELS[type] || type.replace(/_/g, ' ')}`;
        }
        if (type === 'BLOOD') return `${quantity} units of ${group} Blood`;
        if (type === 'ORGAN') return `${quantity} x ${group}`;
        return `${group || ''} ${type} (x${quantity})`.trim();
    };

    useEffect(() => {
        if (!user?._id) return;

        const myId = String(user.hospitalId || user._id);
        const socket = getSocket();

        const handleAcceptedPayload = (payload) => {
            if (!payload?._id) return;

            const reqHospId = String(payload.requestingHospital?._id || payload.requestingHospital || '');
            const isRequester = reqHospId === myId || reqHospId === String(user._id);

            if (isRequester) {
                const partnerName = payload.assignedHospital?.name || 'A partner hospital';
                showToast(`🎉 ${partnerName} accepted your emergency request!`, 'success');
                setAcceptedRequest(payload);
                setIsOpen(true);
            }
        };

        const onAccepted = (payload) => {
            handleAcceptedPayload(payload);
        };

        const onNotification = (n) => {
            if (n?.type === 'ACCEPTED' && n.metadata?.requestId) {
                requestService.getById(n.metadata.requestId).then(({ data }) => {
                    if (data && (data.status === 'Pending' || data.status === 'Completed')) {
                        handleAcceptedPayload(data);
                    }
                }).catch(() => {});
            }
        };

        socket.on('request_accepted', onAccepted);
        socket.on('notification', onNotification);

        return () => {
            socket.off('request_accepted', onAccepted);
            socket.off('notification', onNotification);
        };
    }, [user, showToast]);

    if (!acceptedRequest) return null;

    const partnerName = acceptedRequest.assignedHospital?.name || 'A partner hospital';

    const handleOpenRoute = () => {
        const reqId = acceptedRequest._id;
        setIsOpen(false);
        setAcceptedRequest(null);
        navigate(`/map?request=${reqId}`);
    };

    const handleClose = () => {
        setIsOpen(false);
        setAcceptedRequest(null);
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} maxWidth="560px">
            <div style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#ECFDF5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    margin: '0 auto 1rem',
                    border: '3px solid #A7F3D0',
                }}>
                    ✓
                </div>

                <h2 style={{ color: '#059669', marginBottom: '0.25rem' }}>Emergency Request Accepted!</h2>
                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1F2937' }}>
                    {partnerName} has accepted your request
                </p>

                <div style={{
                    margin: '1.25rem 0',
                    textAlign: 'left',
                    background: '#F0FDF4',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #BBF7D0',
                }}>
                    <div className="grid grid-cols-2 gap-4">
                        <div><strong>Patient:</strong> {acceptedRequest.patientName}</div>
                        <div><strong>Urgency:</strong> <span className="badge badge-critical">{acceptedRequest.urgency}</span></div>
                        <div><strong>Condition:</strong> {acceptedRequest.condition}</div>
                        <div><strong>Required:</strong> {formatRequired(acceptedRequest)}</div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <strong>Assigned Facility:</strong> <span style={{ color: '#059669', fontWeight: '600' }}>{partnerName}</span>
                        </div>
                    </div>
                </div>

                <p style={{ fontSize: '0.9rem', color: '#4B5563', marginBottom: '1.5rem' }}>
                    Medical inventory has been reserved. Shortest driving route between hospitals is ready.
                </p>

                <div className="flex flex-col gap-2">
                    <button
                        onClick={handleOpenRoute}
                        className="btn btn-primary w-full"
                        style={{
                            background: '#059669',
                            borderColor: '#059669',
                            padding: '0.75rem',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                        }}
                    >
                        VIEW LIVE ROUTE & DISPATCH →
                    </button>
                    <button
                        onClick={handleClose}
                        className="btn btn-secondary w-full"
                        style={{ marginTop: '0.5rem' }}
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default RequestAcceptedListener;
