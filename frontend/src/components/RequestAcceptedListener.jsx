import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../services/socket';
import { useDonor } from '../context/DonorContext';

const RequestAcceptedListener = () => {
    const { user, showToast } = useDonor();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user?._id) return;

        const socket = getSocket();
        const onAccepted = (payload) => {
            if (!payload?._id) return;
            const isRequester = String(payload.requestingHospital?._id || payload.requestingHospital) === String(user._id);
            const isAssignee = String(payload.assignedHospital?._id || payload.assignedHospital) === String(user._id);

            if (!isRequester && !isAssignee) return;

            const partnerName = isRequester
                ? payload.assignedHospital?.name
                : payload.requestingHospital?.name;

            showToast(
                isRequester
                    ? `${partnerName || 'A hospital'} accepted your request`
                    : `Request accepted — route ready to ${partnerName || 'requesting hospital'}`,
                'success'
            );

            navigate(`/map?request=${payload._id}`);
        };

        socket.on('request_accepted', onAccepted);
        return () => socket.off('request_accepted', onAccepted);
    }, [user, navigate, showToast]);

    return null;
};

export default RequestAcceptedListener;
