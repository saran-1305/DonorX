const EmergencyRequest = require('../models/EmergencyRequest');
const Hospital = require('../models/Hospital');
const { findMatchingHospitals } = require('./matchingService');
const { createAuditLog } = require('./auditService');
const { createNotification } = require('./notificationService');
const { getIO } = require('../socket');
const { startTransport } = require('./transportService');

const ioEmitRequestRoom = (requestId, event, payload) => {
    const io = getIO();
    if (!io) return;
    io.to(`request_${requestId}`).emit(event, payload);
};

const emitToHospital = async (hospitalId, event, payload) => {
    const io = getIO();
    if (!io) return;
    io.to(String(hospitalId)).emit(event, payload);
};

const emitRequestToMatches = async (requestId) => {
    const fullRequest = await EmergencyRequest.findById(requestId)
        .populate('requestingHospital', 'name location')
        .populate('potentialMatches', 'name location');

    if (!fullRequest || !fullRequest.potentialMatches?.length) return;

    for (const hospital of fullRequest.potentialMatches) {
        const hospitalId = hospital._id || hospital;
        await emitToHospital(hospitalId, 'new_request', fullRequest);
        await createNotification(hospitalId, {
            type: 'EMERGENCY',
            title: 'Emergency request incoming',
            message: `${fullRequest.patientName} — ${fullRequest.urgency} urgency. Priority ${fullRequest.priorityScore}/100`,
            link: '/home',
            metadata: { requestId: fullRequest._id },
        });
    }
};

exports.notifyMatchedHospitals = emitRequestToMatches;

exports.processRequestMatching = async (requestId) => {
    try {
        const request = await EmergencyRequest.findById(requestId);
        if (!request || request.status !== 'Generated') {
            console.log(`Skipping matching for request ${requestId}: status is ${request?.status || 'not found'}`);
            return;
        }

        const matches = await findMatchingHospitals(request);

        if (matches.length > 0) {
            request.potentialMatches = matches;
            await request.save();
            await createAuditLog(requestId, 'MATCHES_FOUND', { count: matches.length, hospitals: matches });

            await emitRequestToMatches(requestId);

            const fullRequest = await EmergencyRequest.findById(requestId)
                .populate('potentialMatches', 'name location');
            await emitToHospital(request.requestingHospital, 'matches_updated', fullRequest);
            ioEmitRequestRoom(requestId, 'matches_updated', fullRequest);
        } else {
            await createAuditLog(requestId, 'NO_MATCHES_FOUND', { radius: request.searchRadius || 5 });
        }
    } catch (error) {
        console.error(`Error in processRequestMatching for request ${requestId}:`, error);
    }
};

exports.expandSearchRadius = async (requestId) => {
    const request = await EmergencyRequest.findById(requestId);
    if (!request || request.status !== 'Generated') return;

    request.searchRadius += 5;
    await request.save();

    await createAuditLog(requestId, 'RADIUS_EXPANDED', { newRadius: request.searchRadius });

    await emitToHospital(request.requestingHospital, 'radius_expanded', {
        requestId,
        searchRadius: request.searchRadius,
    });
    ioEmitRequestRoom(requestId, 'radius_expanded', {
        requestId,
        searchRadius: request.searchRadius,
    });

    await exports.processRequestMatching(requestId);

    const updated = await EmergencyRequest.findById(requestId)
        .populate('potentialMatches', 'name location');
    await emitToHospital(request.requestingHospital, 'matches_updated', updated);
    ioEmitRequestRoom(requestId, 'matches_updated', updated);
};

exports.handleDenial = async (requestId, hospitalId) => {
    const request = await EmergencyRequest.findById(requestId);
    if (!request) throw new Error('Request not found');

    request.potentialMatches = request.potentialMatches.filter(
        (m) => m.toString() !== hospitalId.toString()
    );
    await request.save();

    await createAuditLog(requestId, 'REQUEST_DENIED', { hospitalId });

    if (request.potentialMatches.length === 0) {
        await exports.processRequestMatching(requestId);
    }
};

exports.handleAcceptance = async (requestId, hospitalId) => {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
        throw new Error('Hospital not found');
    }

    const request = await EmergencyRequest.findById(requestId);
    if (!request) {
        throw new Error('Request not found');
    }

    if (request.status !== 'Generated') {
        throw new Error(`Request not available for acceptance. Current status: ${request.status}`);
    }

    const hospitalIdStr = hospitalId.toString();
    const matchesStr = (request.potentialMatches || []).map((m) => m.toString());

    if (!matchesStr.includes(hospitalIdStr)) {
        throw new Error('Hospital not authorized to accept this request. Hospital not in potential matches.');
    }

    const { type, group, quantity, resourceCategory } = request.resourceNeeded;
    const category =
        resourceCategory ||
        (['ICU_BED', 'VENTILATOR', 'OXYGEN_CYLINDER', 'AMBULANCE'].includes(type) ? 'RESOURCE' : type);

    if (category === 'RESOURCE') {
        const resources = hospital.resources || [];
        const resourceItem = resources.find((r) => r.resourceType === type);
        if (!resourceItem || resourceItem.available < quantity) {
            throw new Error(`Insufficient ${type.replace(/_/g, ' ')} — need ${quantity}, have ${resourceItem?.available ?? 0}`);
        }
        resourceItem.available -= quantity;
    } else {
        const inventory = hospital.inventory || [];
        const inventoryItem = inventory.find((i) => i.type === type && i.group === group);
        if (!inventoryItem || inventoryItem.quantity < quantity) {
            throw new Error(`Insufficient ${group} ${type} — need ${quantity}, have ${inventoryItem?.quantity ?? 0}`);
        }
        inventoryItem.quantity -= quantity;
    }

    await hospital.save();

    request.status = 'Pending';
    request.assignedHospital = hospitalId;
    request.potentialMatches = [];
    await request.save();

    await createAuditLog(requestId, 'REQUEST_ACCEPTED', { hospitalId, name: hospital.name });

    const updatedRequest = await EmergencyRequest.findById(requestId)
        .populate('assignedHospital', 'name location email')
        .populate('requestingHospital', 'name location email');

    await emitToHospital(request.requestingHospital, 'request_accepted', updatedRequest);
    await emitToHospital(hospitalId, 'request_accepted', updatedRequest);

    const routeLink = `/map?request=${requestId}`;

    await createNotification(request.requestingHospital, {
        type: 'ACCEPTED',
        title: 'Request accepted',
        message: `${hospital.name} accepted your emergency request`,
        link: routeLink,
        metadata: { requestId, hospitalId },
    });

    await createNotification(hospitalId, {
        type: 'ACCEPTED',
        title: 'Request accepted',
        message: `You accepted the request from ${updatedRequest.requestingHospital?.name || 'a hospital'}`,
        link: routeLink,
        metadata: { requestId, hospitalId: request.requestingHospital },
    });

    try {
        await startTransport(requestId);
    } catch (transportErr) {
        console.error('Transport start error (non-critical):', transportErr.message);
    }

    return updatedRequest;
};

exports.updateLifecycle = async (requestId, status, locationData) => {
    const request = await EmergencyRequest.findById(requestId);
    if (!request) throw new Error('Request not found');

    const validTransitions = {
        Pending: ['Completed', 'Ended'],
    };

    if (!validTransitions[request.status]?.includes(status)) {
        throw new Error(`Invalid status transition from ${request.status} to ${status}`);
    }

    request.status = status;
    await request.save();

    await createAuditLog(requestId, `STATUS_UPDATE_${status.toUpperCase()}`, { location: locationData });
};

exports.handleTimeout = async (requestId) => {
    const request = await EmergencyRequest.findById(requestId);
    if (!request) return;

    if (request.status === 'Generated' && request.potentialMatches.length > 0) {
        await createAuditLog(requestId, 'MATCH_TIMEOUT', { matches: request.potentialMatches });

        request.potentialMatches = [];
        await request.save();

        await exports.processRequestMatching(requestId);

        const updated = await EmergencyRequest.findById(requestId);
        if (!updated.potentialMatches || updated.potentialMatches.length === 0) {
            await createAuditLog(requestId, 'NO_MATCH_AFTER_TIMEOUT', {});
            updated.status = 'Ended';
            await updated.save();
        }
    } else if (request.status === 'Generated') {
        await createAuditLog(requestId, 'NO_MATCH_AFTER_TIMEOUT', {});
        request.status = 'Ended';
        await request.save();
    }
};
