const { EmergencyRequest, Hospital, BloodInventory, ResourceInventory, OrganInventory } = require('../models');
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
            await EmergencyRequest.findByIdAndUpdate(requestId, {
                $set: { potentialMatches: matches },
            });
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

    const currentIteration = request.iteration || 1;
    const maxAllowed = request.maxIterations || 8;

    if (currentIteration >= maxAllowed || (request.searchRadius || 5) >= 40) {
        request.status = 'Ended';
        await request.save();
        await createAuditLog(requestId, 'MAX_RADIUS_REACHED_ENDED', {
            finalRadius: request.searchRadius,
            iterations: currentIteration,
        });
        return;
    }

    request.searchRadius = (request.searchRadius || 5) + 5;
    request.iteration = currentIteration + 1;
    await request.save();

    await createAuditLog(requestId, 'RADIUS_EXPANDED', { newRadius: request.searchRadius, iteration: request.iteration });

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

    const hospitalIdStr = hospitalId.toString();

    // Idempotent acceptance: if already claimed by this exact hospital, return gracefully
    if (request.status === 'Pending' && request.assignedHospital?.toString() === hospitalIdStr) {
        return;
    }

    if (request.status !== 'Generated') {
        throw new Error(`Request not available for acceptance. Current status: ${request.status}`);
    }

    const matchesStr = (request.potentialMatches || []).map((m) => m.toString());

    if (!matchesStr.includes(hospitalIdStr)) {
        throw new Error('Hospital not authorized to accept this request. Hospital not in potential matches.');
    }

    const { type, group, quantity, resourceCategory } = request.resourceNeeded;
    const category =
        resourceCategory ||
        (['ICU_BED', 'VENTILATOR', 'OXYGEN_CYLINDER', 'AMBULANCE'].includes(type) ? 'RESOURCE' : type);

    // 1. ATOMIC REQUEST CLAIM: Guarantees only one hospital can accept a request concurrently
    const claimedRequest = await EmergencyRequest.findOneAndUpdate(
        { _id: requestId, status: 'Generated' },
        { $set: { status: 'Pending', assignedHospital: hospitalId, potentialMatches: [] } },
        { new: true }
    );

    if (!claimedRequest) {
        throw new Error('Request already accepted by another hospital or is no longer available');
    }

    // 2. ATOMIC RESERVATION ON DISCRETE V2 INVENTORIES (With Hospital inventory fallback)
    try {
        if (category === 'RESOURCE') {
            const updatedRes = await ResourceInventory.findOneAndUpdate(
                { hospitalId, resourceType: type, available: { $gte: quantity } },
                { $inc: { available: -quantity, reserved: quantity } },
                { new: true }
            );
            if (!updatedRes) {
                // Fallback to embedded Hospital.resources array
                const hosp = await Hospital.findById(hospitalId);
                const resItem = hosp?.resources?.find((r) => r.resourceType === type);
                if (resItem && resItem.available >= quantity) {
                    resItem.available -= quantity;
                    await hosp.save();
                } else if (!hosp?.resources?.length) {
                    console.log(`Allowing resource acceptance for ${hospital.name} (fallback)`);
                } else {
                    throw new Error(`Insufficient ${type.replace(/_/g, ' ')} or conflicting reservation — need ${quantity}`);
                }
            }
        } else if (category === 'BLOOD') {
            const updatedBlood = await BloodInventory.findOneAndUpdate(
                { hospitalId, bloodGroup: group, unitsAvailable: { $gte: quantity } },
                { $inc: { unitsAvailable: -quantity, unitsReserved: quantity } },
                { new: true }
            );
            if (!updatedBlood) {
                // Fallback to embedded Hospital.inventory array
                const hosp = await Hospital.findById(hospitalId);
                const bloodItem = hosp?.inventory?.find((i) => i.type === 'BLOOD' && i.group === group);
                if (bloodItem && bloodItem.quantity >= quantity) {
                    bloodItem.quantity -= quantity;
                    await hosp.save();
                } else if (!hosp?.inventory?.length || !hosp.inventory.some((i) => i.type === 'BLOOD')) {
                    console.log(`Allowing blood acceptance for ${hospital.name} (fallback)`);
                } else {
                    throw new Error(`Insufficient ${group} Blood or units reserved concurrently — need ${quantity}`);
                }
            }
        } else if (category === 'ORGAN') {
            const organTypeUpper = (group || type).toUpperCase();
            const updatedOrgan = await OrganInventory.findOneAndUpdate(
                { hospitalId, organType: organTypeUpper, status: 'AVAILABLE' },
                { $set: { status: 'RESERVED' } },
                { new: true }
            );
            if (!updatedOrgan) {
                // Fallback to embedded Hospital.inventory array
                const hosp = await Hospital.findById(hospitalId);
                const organItem = hosp?.inventory?.find(
                    (i) => i.type === 'ORGAN' && (i.group || '').toUpperCase() === organTypeUpper
                );
                if (organItem && organItem.quantity >= quantity) {
                    organItem.quantity -= quantity;
                    await hosp.save();
                } else if (!hosp?.inventory?.length || !hosp.inventory.some((i) => i.type === 'ORGAN')) {
                    console.log(`Allowing organ acceptance for ${hospital.name} (fallback)`);
                } else {
                    throw new Error(`Organ ${group} is no longer available for reservation`);
                }
            }
        }
    } catch (reservationError) {
        // Safe rollback: restore request to Generated state
        await EmergencyRequest.updateOne(
            { _id: requestId },
            { $set: { status: 'Generated', assignedHospital: null, potentialMatches: request.potentialMatches } }
        );
        throw reservationError;
    }

    await createAuditLog(requestId, 'REQUEST_ACCEPTED', { hospitalId, name: hospital.name });

    const updatedRequest = await EmergencyRequest.findById(requestId)
        .populate('assignedHospital', 'name location email')
        .populate('requestingHospital', 'name location email');

    // 1. Emit to requesting hospital personal room
    await emitToHospital(request.requestingHospital, 'request_accepted', updatedRequest);
    // 2. Emit to accepting hospital personal room
    await emitToHospital(hospitalId, 'request_accepted', updatedRequest);
    // 3. Emit to request-specific room (joined by NewRequest.jsx)
    ioEmitRequestRoom(requestId, 'request_accepted', updatedRequest);

    // 4. Global broadcast so client-side listeners catch it reliably even across reconnects
    const io = getIO();
    if (io) {
        io.emit('request_accepted', updatedRequest);
    }

    const routeLink = `/map?request=${requestId}`;

    await createNotification(request.requestingHospital, {
        type: 'ACCEPTED',
        title: 'Emergency Request Accepted!',
        message: `${hospital.name} accepted your emergency request`,
        link: routeLink,
        metadata: { requestId, hospitalId, acceptedBy: hospital.name },
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

    try {
        const { generateBillForRequest } = require('./billService');
        await generateBillForRequest(requestId, null, hospitalId);
    } catch (billErr) {
        console.error('Initial bill generation error (non-critical):', billErr.message);
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

    const populated = await EmergencyRequest.findById(requestId)
        .populate('requestingHospital', 'name location email contactPhone address')
        .populate('assignedHospital', 'name location email contactPhone address');

    const reqHospId = populated.requestingHospital?._id || populated.requestingHospital;
    const assHospId = populated.assignedHospital?._id || populated.assignedHospital;

    // Real-time Socket.io dispatch
    if (reqHospId) {
        await emitToHospital(reqHospId, 'request_status_updated', populated);
        if (status === 'Completed') {
            await emitToHospital(reqHospId, 'request_completed', populated);
        }
    }
    if (assHospId) {
        await emitToHospital(assHospId, 'request_status_updated', populated);
        if (status === 'Completed') {
            await emitToHospital(assHospId, 'request_completed', populated);
        }
    }
    ioEmitRequestRoom(requestId, 'request_status_updated', populated);
    if (status === 'Completed') {
        ioEmitRequestRoom(requestId, 'request_completed', populated);
    }

    const io = getIO();
    if (io) {
        io.emit('request_status_updated', populated);
        if (status === 'Completed') {
            io.emit('request_completed', populated);
        }
    }

    // In-app Notifications
    if (reqHospId && assHospId) {
        const reqName = populated.requestingHospital.name || 'Requesting Hospital';
        const assName = populated.assignedHospital.name || 'Fulfilling Hospital';

        if (status === 'Completed') {
            await createNotification(assHospId, {
                type: 'COMPLETED',
                title: 'Emergency Request Completed (Success)!',
                message: `${reqName} confirmed successful delivery and completed the request.`,
                link: `/map?request=${requestId}`,
                metadata: { requestId, status: 'Completed' },
            });
            await createNotification(reqHospId, {
                type: 'COMPLETED',
                title: 'Request Marked Completed',
                message: `You marked the delivery from ${assName} as Completed (Success).`,
                link: `/map?request=${requestId}`,
                metadata: { requestId, status: 'Completed' },
            });
        } else if (status === 'Ended') {
            await createNotification(assHospId, {
                type: 'ENDED',
                title: 'Request Ended',
                message: `The request with ${reqName} was ended.`,
                link: `/map?request=${requestId}`,
                metadata: { requestId, status: 'Ended' },
            });
        }
    }

    return populated;
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
