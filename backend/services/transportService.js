const TransportTracking = require('../models/TransportTracking');
const EmergencyRequest = require('../models/EmergencyRequest');
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

    let tracking = await TransportTracking.findOne({ requestId });
    if (tracking) {
        tracking.status = 'DISPATCHED';
        tracking.origin = { ...origin, label: request.assignedHospital.name };
        tracking.destination = { ...destination, label: 'Patient / Request Location' };
        tracking.currentPosition = { ...origin };
        tracking.progress = 0;
        tracking.etaMinutes = etaMinutes;
        tracking.distanceKm = Math.round(distanceKm * 100) / 100;
        tracking.resourceLabel = formatResourceLabel(request.resourceNeeded);
        tracking.updatedAt = new Date();
    } else {
        tracking = new TransportTracking({
            requestId,
            origin: { ...origin, label: request.assignedHospital.name },
            destination: { ...destination, label: 'Patient / Request Location' },
            currentPosition: { ...origin },
            etaMinutes,
            distanceKm: Math.round(distanceKm * 100) / 100,
            resourceLabel: formatResourceLabel(request.resourceNeeded),
        });
    }

    await tracking.save();
    await emitTransportUpdate(requestId, tracking);

    let progress = 0;
    const interval = setInterval(async () => {
        progress = Math.min(progress + 4, 100);
        const fraction = progress / 100;

        tracking.currentPosition = {
            lat: interpolate(origin.lat, destination.lat, fraction),
            lng: interpolate(origin.lng, destination.lng, fraction),
        };
        tracking.progress = progress;
        tracking.etaMinutes = Math.max(0, Math.round(etaMinutes * (1 - fraction)));
        tracking.status = progress >= 100 ? 'ARRIVED' : 'IN_TRANSIT';
        tracking.updatedAt = new Date();

        await tracking.save();
        await emitTransportUpdate(requestId, tracking);

        if (progress >= 100) {
            stopSimulation(requestId);
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
    const tracking = await TransportTracking.findOne({ requestId });
    if (!tracking) return null;

    tracking.status = 'DELIVERED';
    tracking.progress = 100;
    tracking.etaMinutes = 0;
    tracking.currentPosition = { ...tracking.destination };
    tracking.updatedAt = new Date();
    await tracking.save();
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
