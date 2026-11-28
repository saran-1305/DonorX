const { TransportTracking, EmergencyRequest } = require('../models');
const { getIO } = require('../socket');

const ACTIVE_SIMULATIONS = new Map();

const toRad = (deg) => (deg * Math.PI) / 180;

const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const interpolate = (start, end, fraction) => start + (end - start) * fraction;

const formatResourceLabel = (resourceNeeded) => {
    if (!resourceNeeded) return 'Critical Resources';
    const { type, group, quantity } = resourceNeeded;
    if (type === 'BLOOD') return `${quantity} units of ${group} Blood`;
    if (type === 'ORGAN') return `${quantity} x ${group}`;
    const labels = {
        ICU_BED: 'ICU Bed',
        VENTILATOR: 'Ventilator',
        OXYGEN_CYLINDER: 'Oxygen Cylinder',
        AMBULANCE: 'Ambulance',
    };
    return `${quantity} x ${labels[type] || type.replace(/_/g, ' ')}`;
};

const emitTransportUpdate = async (requestId, tracking) => {
    const io = getIO();
    if (!io) return;

    const request = await EmergencyRequest.findById(requestId).select('requestingHospital assignedHospital');
    if (!request) return;

    const payload = tracking.toObject ? tracking.toObject() : tracking;
    io.to(String(request.requestingHospital)).emit('transport_update', payload);
    if (request.assignedHospital) {
        io.to(String(request.assignedHospital)).emit('transport_update', payload);
    }
    io.to(`request_${requestId}`).emit('transport_update', payload);
};

const stopSimulation = (requestId) => {
    const key = String(requestId);
    if (ACTIVE_SIMULATIONS.has(key)) {
        clearInterval(ACTIVE_SIMULATIONS.get(key));
        ACTIVE_SIMULATIONS.delete(key);
    }
};

exports.startTransport = async (requestId) => {
    stopSimulation(requestId);

    const request = await EmergencyRequest.findById(requestId)
        .populate('assignedHospital', 'name location')
        .populate('requestingHospital', 'name location');

    if (!request || !request.assignedHospital) {
        throw new Error('Cannot start transport without assigned hospital');
    }

    const hospitalCoords = request.assignedHospital.location?.coordinates;
    let destCoords = request.location?.coordinates;

    if (!hospitalCoords || hospitalCoords.length < 2) {
        throw new Error('Assigned hospital has no location');
    }

    if (!destCoords || destCoords.length < 2) {
        destCoords = request.requestingHospital?.location?.coordinates || hospitalCoords;
    }

    const origin = { lat: hospitalCoords[1], lng: hospitalCoords[0] };
    const destination = { lat: destCoords[1], lng: destCoords[0] };
    const distanceKm = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng);
    const etaMinutes = Math.max(5, Math.round(distanceKm * 2));

    const trackingData = {
        requestId,
        origin: { ...origin, label: request.assignedHospital.name },
        destination: { ...destination, label: 'Patient / Request Location' },
        currentPosition: { ...origin },
        progress: 0,
        etaMinutes,
        distanceKm: Math.round(distanceKm * 100) / 100,
        resourceLabel: formatResourceLabel(request.resourceNeeded),
        status: 'DISPATCHED',
        updatedAt: new Date(),
    };

    const tracking = await TransportTracking.findOneAndUpdate(
        { requestId },
        { $set: trackingData },
        { new: true, upsert: true }
    );

    await emitTransportUpdate(requestId, tracking);

    let progress = 0;
    let isUpdating = false;
    const interval = setInterval(async () => {
        if (isUpdating) return;
        isUpdating = true;
        try {
            progress = Math.min(progress + 4, 100);
            const fraction = progress / 100;

            const currentPosition = {
                lat: interpolate(origin.lat, destination.lat, fraction),
                lng: interpolate(origin.lng, destination.lng, fraction),
            };
            const currentEta = Math.max(0, Math.round(etaMinutes * (1 - fraction)));
            const currentStatus = progress >= 100 ? 'ARRIVED' : 'IN_TRANSIT';

            const updatedTracking = await TransportTracking.findOneAndUpdate(
                { requestId },
                {
                    $set: {
                        currentPosition,
                        progress,
                        etaMinutes: currentEta,
                        status: currentStatus,
                        updatedAt: new Date(),
                    },
                },
                { new: true }
            );

            if (updatedTracking) {
                await emitTransportUpdate(requestId, updatedTracking);
            }

            if (progress >= 100) {
                stopSimulation(requestId);
            }
        } catch (simErr) {
            console.error('Transport simulation step error:', simErr.message);
        } finally {
            isUpdating = false;
        }
    }, 4000);

    ACTIVE_SIMULATIONS.set(String(requestId), interval);
    return tracking;
};

exports.getTransportByRequest = async (requestId) => {
    return TransportTracking.findOne({ requestId });
};

exports.completeTransport = async (requestId) => {
    stopSimulation(requestId);
    const tracking = await TransportTracking.findOneAndUpdate(
        { requestId },
        {
            $set: {
                status: 'DELIVERED',
                progress: 100,
                etaMinutes: 0,
                updatedAt: new Date(),
            },
        },
        { new: true }
    );
    if (!tracking) return null;
    await emitTransportUpdate(requestId, tracking);
    return tracking;
};

exports.cancelTransport = async (requestId) => {
    stopSimulation(requestId);
    await TransportTracking.findOneAndUpdate(
        { requestId },
        { status: 'CANCELLED', updatedAt: new Date() }
    );
};
