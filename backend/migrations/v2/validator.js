const { initV2Models } = require('../../models/v2');
const { readSourceData } = require('./readers');

/**
 * Validates data integrity between the Source and Destination databases.
 */
async function validateMigration(sourceConn, destConn) {
    const v2Models = initV2Models(destConn);
    const sourceData = await readSourceData(sourceConn);

    const report = {
        timestamp: new Date().toISOString(),
        overallValid: true,
        collectionCounts: {},
        inventoryReconciliation: {},
        referenceIntegrity: {
            usersWithValidHospitals: 0,
            requestsWithValidHospitals: 0,
            notificationsWithValidHospitals: 0,
            trackingsWithValidRequests: 0,
            orphansFound: [],
        },
        geoSpatialValidation: {
            hospitalsWithValidCoordinates: 0,
            requestsWithValidCoordinates: 0,
            invalidGeometries: [],
        },
    };

    // 1. Collection Counts
    const [
        destHospitalsCount,
        destUsersCount,
        destBloodCount,
        destOrganCount,
        destResourceCount,
        destRequestsCount,
        destTrackingCount,
        destNotifCount,
        destAuditCount,
    ] = await Promise.all([
        v2Models.Hospital.countDocuments(),
        v2Models.User.countDocuments(),
        v2Models.BloodInventory.countDocuments(),
        v2Models.OrganInventory.countDocuments(),
        v2Models.ResourceInventory.countDocuments(),
        v2Models.EmergencyRequest.countDocuments(),
        v2Models.TransportTracking.countDocuments(),
        v2Models.Notification.countDocuments(),
        v2Models.AuditLog.countDocuments(),
    ]);

    report.collectionCounts = {
        hospitals: { source: sourceData.hospitals.length, dest: destHospitalsCount },
        users: { created: destUsersCount, expected: sourceData.hospitals.length },
        bloodInventories: { dest: destBloodCount },
        organInventories: { dest: destOrganCount },
        resourceInventories: { dest: destResourceCount },
        emergencyRequests: { source: sourceData.emergencyrequests.length, dest: destRequestsCount },
        transportTrackings: { source: sourceData.transporttrackings.length, dest: destTrackingCount },
        notifications: { source: sourceData.notifications.length, dest: destNotifCount },
        auditLogs: { source: sourceData.auditlogs.length, dest: destAuditCount },
    };

    if (destHospitalsCount !== sourceData.hospitals.length) report.overallValid = false;
    if (destRequestsCount !== sourceData.emergencyrequests.length) report.overallValid = false;
    if (destTrackingCount !== sourceData.transporttrackings.length) report.overallValid = false;
    if (destNotifCount !== sourceData.notifications.length) report.overallValid = false;
    if (destAuditCount !== sourceData.auditlogs.length) report.overallValid = false;

    // 2. Inventory Quantity Reconciliation
    let sourceBloodUnits = 0;
    let sourceOrganCount = 0;
    for (const h of sourceData.hospitals) {
        if (Array.isArray(h.inventory)) {
            for (const item of h.inventory) {
                if (item.type === 'BLOOD') sourceBloodUnits += Number(item.quantity) || 0;
                if (item.type === 'ORGAN') sourceOrganCount += 1;
            }
        }
    }

    const bloodAgg = await v2Models.BloodInventory.aggregate([
        { $group: { _id: null, totalAvailable: { $sum: '$unitsAvailable' } } },
    ]);
    const destBloodUnits = bloodAgg[0]?.totalAvailable || 0;

    report.inventoryReconciliation = {
        bloodUnits: { source: sourceBloodUnits, dest: destBloodUnits, reconciled: sourceBloodUnits === destBloodUnits },
        organCount: { source: sourceOrganCount, dest: destOrganCount, reconciled: sourceOrganCount === destOrganCount },
    };

    if (!report.inventoryReconciliation.bloodUnits.reconciled) report.overallValid = false;
    if (!report.inventoryReconciliation.organCount.reconciled) report.overallValid = false;

    // 3. Reference Integrity Check
    const hospitalIds = new Set((await v2Models.Hospital.find({}, '_id')).map(h => h._id.toString()));

    const users = await v2Models.User.find({});
    for (const u of users) {
        if (hospitalIds.has(u.hospitalId.toString())) {
            report.referenceIntegrity.usersWithValidHospitals++;
        } else {
            report.referenceIntegrity.orphansFound.push({ entity: 'User', id: u._id, missingRef: u.hospitalId });
            report.overallValid = false;
        }
    }

    // 4. GeoSpatial Coordinate Validation
    const hospitals = await v2Models.Hospital.find({});
    for (const h of hospitals) {
        const coords = h.location?.coordinates;
        if (coords && coords.length === 2 && coords[0] >= -180 && coords[0] <= 180 && coords[1] >= -90 && coords[1] <= 90) {
            report.geoSpatialValidation.hospitalsWithValidCoordinates++;
        } else {
            report.geoSpatialValidation.invalidGeometries.push({ entity: 'Hospital', id: h._id, coords });
            report.overallValid = false;
        }
    }

    return report;
}

module.exports = {
    validateMigration,
};
