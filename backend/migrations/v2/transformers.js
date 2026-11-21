const mongoose = require('mongoose');

/**
 * Normalizes GeoJSON coordinates ensuring strict [longitude, latitude] format.
 */
function normalizeCoordinates(coords, fallbackLng = 80.25, fallbackLat = 13.05) {
    if (Array.isArray(coords) && coords.length >= 2) {
        const lng = Number(coords[0]);
        const lat = Number(coords[1]);
        if (!isNaN(lng) && !isNaN(lat) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
            return [lng, lat];
        }
    }
    return [fallbackLng, fallbackLat];
}

/**
 * Transforms Hospital documents into Hospital + User + BloodInventory + ResourceInventory + OrganInventory.
 */
function transformHospital(hospital) {
    const hospitalId = hospital._id;

    // 1. Clean Hospital Facility Document
    const cleanedHospital = {
        _id: hospitalId,
        hospitalId: hospital.hospitalId || hospitalId.toString(),
        name: hospital.name || 'Unnamed Healthcare Facility',
        email: (hospital.email || '').toLowerCase().trim(),
        contactPhone: hospital.contactPhone || '',
        contactPerson: hospital.contactPerson || '',
        address: hospital.address || '',
        type: hospital.type || 'Hospital',
        location: {
            type: 'Point',
            coordinates: normalizeCoordinates(hospital.location?.coordinates),
        },
        isActive: hospital.isActive !== undefined ? hospital.isActive : true,
        createdAt: hospital.createdAt || new Date(),
        updatedAt: hospital.updatedAt || hospital.createdAt || new Date(),
    };

    // 2. Initial Hospital Admin User Account
    // Uses the hospital's verified bcrypt password hash directly for exactly one admin account
    const adminUser = {
        _id: new mongoose.Types.ObjectId(),
        hospitalId: hospitalId,
        name: hospital.contactPerson || `${hospital.name} Admin`,
        email: (hospital.email || '').toLowerCase().trim(),
        password: hospital.password, // Pre-hashed bcrypt password preserved
        role: 'HOSPITAL_ADMIN',
        phone: hospital.contactPhone || '',
        isActive: true,
        createdAt: hospital.createdAt || new Date(),
        updatedAt: hospital.updatedAt || hospital.createdAt || new Date(),
    };

    // 3. Embedded Blood Inventories Extraction
    const bloodInventories = [];
    const organInventories = [];

    if (Array.isArray(hospital.inventory)) {
        for (const item of hospital.inventory) {
            if (item.type === 'BLOOD') {
                bloodInventories.push({
                    _id: item._id || new mongoose.Types.ObjectId(),
                    hospitalId: hospitalId,
                    bloodGroup: item.group,
                    component: 'WHOLE_BLOOD',
                    unitsAvailable: Number(item.quantity) || 0,
                    unitsReserved: 0,
                    unitsTotal: Number(item.quantity) || 0,
                    createdAt: hospital.createdAt || new Date(),
                    updatedAt: hospital.createdAt || new Date(),
                });
            } else if (item.type === 'ORGAN') {
                const organTypeUpper = (item.group || 'KIDNEY').toUpperCase();
                // Ensure deterministic ID preservation using source item._id
                const stableOrganId = item._id ? new mongoose.Types.ObjectId(item._id) : new mongoose.Types.ObjectId();
                organInventories.push({
                    _id: stableOrganId,
                    hospitalId: hospitalId,
                    organType: ['KIDNEY', 'LIVER', 'HEART', 'LUNGS', 'PANCREAS', 'CORNEA'].includes(organTypeUpper)
                        ? organTypeUpper
                        : 'KIDNEY',
                    donorBloodGroup: 'O+',
                    harvestedAt: null,
                    ischemiaDeadline: null,
                    status: 'REQUIRES_CLINICAL_REVIEW',
                    crossmatchDetails: {
                        hlaTyping: '',
                        serology: '',
                        tissueCompatibility: {},
                    },
                    createdAt: hospital.createdAt || new Date(),
                    updatedAt: hospital.createdAt || new Date(),
                });
            }
        }
    }

    // 4. Embedded General Resources Extraction
    const resourceInventories = [];
    if (Array.isArray(hospital.resources)) {
        for (const res of hospital.resources) {
            const avail = Number(res.available) || 0;
            const tot = Number(res.total) || avail;
            resourceInventories.push({
                _id: res._id || new mongoose.Types.ObjectId(),
                hospitalId: hospitalId,
                resourceType: res.resourceType,
                available: avail,
                reserved: 0,
                total: tot,
                createdAt: hospital.createdAt || new Date(),
                updatedAt: hospital.createdAt || new Date(),
            });
        }
    }

    return {
        cleanedHospital,
        adminUser,
        bloodInventories,
        organInventories,
        resourceInventories,
    };
}

/**
 * Transforms EmergencyRequest documents ensuring GeoJSON validity.
 */
function transformEmergencyRequest(reqDoc) {
    const coords = normalizeCoordinates(reqDoc.location?.coordinates);

    return {
        _id: reqDoc._id,
        requestId: reqDoc.requestId || reqDoc._id.toString(),
        patientName: reqDoc.patientName || 'Emergency Patient',
        urgency: ['Low', 'Medium', 'High', 'Critical'].includes(reqDoc.urgency) ? reqDoc.urgency : 'Medium',
        condition: reqDoc.condition || 'Emergency Care Required',
        resourceNeeded: {
            resourceCategory: reqDoc.resourceNeeded?.resourceCategory || 'BLOOD',
            type: reqDoc.resourceNeeded?.type || 'BLOOD',
            group: reqDoc.resourceNeeded?.group || 'O+',
            quantity: Number(reqDoc.resourceNeeded?.quantity) || 1,
        },
        requestingHospital: reqDoc.requestingHospital,
        createdBy: null,
        location: {
            type: 'Point',
            coordinates: coords,
        },
        status: reqDoc.status || 'Pending',
        priorityScore: Number(reqDoc.priorityScore) || 50,
        searchRadius: Number(reqDoc.searchRadius) || 5,
        iteration: Math.max(1, Math.floor((Number(reqDoc.searchRadius) || 5) / 5)),
        maxIterations: 6,
        potentialMatches: reqDoc.potentialMatches || [],
        assignedHospital: reqDoc.assignedHospital || null,
        aiSummary: reqDoc.aiSummary || '',
        createdAt: reqDoc.createdAt || new Date(),
        updatedAt: reqDoc.updatedAt || new Date(),
    };
}

/**
 * Transforms TransportTracking records.
 */
function transformTransportTracking(trackDoc) {
    const curLat = trackDoc.currentPosition?.lat || trackDoc.currentLocation?.lat || 0;
    const curLng = trackDoc.currentPosition?.lng || trackDoc.currentLocation?.lng || 0;

    return {
        _id: trackDoc._id,
        requestId: trackDoc.requestId,
        deliveryId: null,
        status: trackDoc.status || 'DISPATCHED',
        origin: {
            lat: trackDoc.origin?.lat || 0,
            lng: trackDoc.origin?.lng || 0,
            label: trackDoc.origin?.label || 'Source Hospital',
        },
        destination: {
            lat: trackDoc.destination?.lat || 0,
            lng: trackDoc.destination?.lng || 0,
            label: trackDoc.destination?.label || 'Destination Hospital',
        },
        currentPosition: {
            lat: curLat,
            lng: curLng,
        },
        currentLocation: {
            type: 'Point',
            coordinates: [curLng, curLat],
        },
        route: trackDoc.route || [],
        progress: Number(trackDoc.progress) || 0,
        etaMinutes: Number(trackDoc.etaMinutes) || 0,
        distanceKm: Number(trackDoc.distanceKm) || 0,
        resourceLabel: trackDoc.resourceLabel || '',
        createdAt: trackDoc.createdAt || trackDoc.updatedAt || new Date(),
        updatedAt: trackDoc.updatedAt || new Date(),
    };
}

/**
 * Transforms Notification records.
 */
function transformNotification(notifDoc) {
    return {
        _id: notifDoc._id,
        hospitalId: notifDoc.hospitalId,
        userId: null,
        type: notifDoc.type || 'SYSTEM',
        title: notifDoc.title || 'Notification',
        message: notifDoc.message || '',
        link: notifDoc.link || '',
        read: Boolean(notifDoc.read),
        metadata: notifDoc.metadata || {},
        createdAt: notifDoc.createdAt || new Date(),
        updatedAt: notifDoc.createdAt || new Date(),
    };
}

/**
 * Transforms AuditLog records.
 */
function transformAuditLog(auditDoc) {
    return {
        _id: auditDoc._id,
        requestId: auditDoc.requestId || null,
        action: auditDoc.action || 'SYSTEM_ACTION',
        actorUserId: null,
        hospitalId: auditDoc.payload?.hospitalId || null,
        payload: auditDoc.payload || {},
        prevHash: auditDoc.prevHash || 'GENESIS_HASH',
        hash: auditDoc.hash || 'MIGRATION_PLACEHOLDER_HASH',
        timestamp: auditDoc.timestamp || new Date(),
        createdAt: auditDoc.timestamp || new Date(),
        updatedAt: auditDoc.timestamp || new Date(),
    };
}

module.exports = {
    normalizeCoordinates,
    transformHospital,
    transformEmergencyRequest,
    transformTransportTracking,
    transformNotification,
    transformAuditLog,
};
