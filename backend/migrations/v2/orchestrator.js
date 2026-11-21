const { initV2Models } = require('../../models/v2');
const { readSourceData } = require('./readers');
const {
    transformHospital,
    transformEmergencyRequest,
    transformTransportTracking,
    transformNotification,
    transformAuditLog,
} = require('./transformers');

/**
 * Migration Orchestrator: Transfers data from sourceConn into destConn idempotently.
 */
async function runMigration(sourceConn, destConn, options = { dryRun: false }) {
    const v2Models = initV2Models(destConn);
    const sourceData = await readSourceData(sourceConn);

    const ledger = {
        startedAt: new Date().toISOString(),
        dryRun: options.dryRun,
        counts: {
            hospitals: { source: sourceData.hospitals.length, migrated: 0, skipped: 0, errors: [] },
            users: { migrated: 0, errors: [] },
            bloodInventories: { migrated: 0, totalUnits: 0, errors: [] },
            organInventories: { migrated: 0, errors: [] },
            resourceInventories: { migrated: 0, errors: [] },
            emergencyRequests: { source: sourceData.emergencyrequests.length, migrated: 0, errors: [] },
            transportTrackings: { source: sourceData.transporttrackings.length, migrated: 0, errors: [] },
            notifications: { source: sourceData.notifications.length, migrated: 0, errors: [] },
            auditLogs: { source: sourceData.auditlogs.length, migrated: 0, errors: [] },
            chatMessages: { source: sourceData.chatmessages.length, migrated: 0, errors: [] },
            consultations: { source: sourceData.consultations.length, migrated: 0, errors: [] },
        },
    };

    if (options.dryRun) {
        ledger.completedAt = new Date().toISOString();
        return ledger;
    }

    // 1. Migrate Hospitals, Users, and Inventories
    for (const rawHosp of sourceData.hospitals) {
        try {
            const transformed = transformHospital(rawHosp);

            // Upsert Hospital without _id in $set
            const { _id: hospId, ...hospData } = transformed.cleanedHospital;
            await v2Models.Hospital.updateOne(
                { _id: hospId },
                { $set: hospData, $setOnInsert: { _id: hospId } },
                { upsert: true }
            );
            ledger.counts.hospitals.migrated++;

            // Upsert Primary Admin User without _id in $set
            const { _id: userId, email: userEmail, ...userData } = transformed.adminUser;
            await v2Models.User.updateOne(
                { email: userEmail },
                { $set: userData, $setOnInsert: { _id: userId, email: userEmail } },
                { upsert: true }
            );
            ledger.counts.users.migrated++;

            // Upsert Blood Inventories without _id in $set
            for (const bInv of transformed.bloodInventories) {
                const { _id: bId, hospitalId, bloodGroup, component, ...bData } = bInv;
                await v2Models.BloodInventory.updateOne(
                    { hospitalId, bloodGroup, component },
                    { $set: bData, $setOnInsert: { _id: bId, hospitalId, bloodGroup, component } },
                    { upsert: true }
                );
                ledger.counts.bloodInventories.migrated++;
                ledger.counts.bloodInventories.totalUnits += bInv.unitsAvailable;
            }

            // Upsert Organ Inventories without _id in $set
            for (const oInv of transformed.organInventories) {
                const { _id: oId, ...oData } = oInv;
                await v2Models.OrganInventory.updateOne(
                    { _id: oId },
                    { $set: oData, $setOnInsert: { _id: oId } },
                    { upsert: true }
                );
                ledger.counts.organInventories.migrated++;
            }

            // Upsert Resource Inventories without _id in $set
            for (const rInv of transformed.resourceInventories) {
                const { _id: rId, hospitalId, resourceType, ...rData } = rInv;
                await v2Models.ResourceInventory.updateOne(
                    { hospitalId, resourceType },
                    { $set: rData, $setOnInsert: { _id: rId, hospitalId, resourceType } },
                    { upsert: true }
                );
                ledger.counts.resourceInventories.migrated++;
            }
        } catch (err) {
            ledger.counts.hospitals.errors.push({ id: rawHosp._id, message: err.message });
        }
    }

    // 2. Migrate Emergency Requests without _id in $set
    for (const rawReq of sourceData.emergencyrequests) {
        try {
            const transformed = transformEmergencyRequest(rawReq);
            const { _id: reqId, ...reqData } = transformed;
            await v2Models.EmergencyRequest.updateOne(
                { _id: reqId },
                { $set: reqData, $setOnInsert: { _id: reqId } },
                { upsert: true }
            );
            ledger.counts.emergencyRequests.migrated++;
        } catch (err) {
            ledger.counts.emergencyRequests.errors.push({ id: rawReq._id, message: err.message });
        }
    }

    // 3. Migrate Transport Trackings without _id in $set
    for (const rawTrack of sourceData.transporttrackings) {
        try {
            const transformed = transformTransportTracking(rawTrack);
            const { _id: trackId, ...trackData } = transformed;
            await v2Models.TransportTracking.updateOne(
                { _id: trackId },
                { $set: trackData, $setOnInsert: { _id: trackId } },
                { upsert: true }
            );
            ledger.counts.transportTrackings.migrated++;
        } catch (err) {
            ledger.counts.transportTrackings.errors.push({ id: rawTrack._id, message: err.message });
        }
    }

    // 4. Migrate Notifications without _id in $set
    for (const rawNotif of sourceData.notifications) {
        try {
            const transformed = transformNotification(rawNotif);
            const { _id: notifId, ...notifData } = transformed;
            await v2Models.Notification.updateOne(
                { _id: notifId },
                { $set: notifData, $setOnInsert: { _id: notifId } },
                { upsert: true }
            );
            ledger.counts.notifications.migrated++;
        } catch (err) {
            ledger.counts.notifications.errors.push({ id: rawNotif._id, message: err.message });
        }
    }

    // 5. Migrate Audit Logs without _id in $set
    for (const rawAudit of sourceData.auditlogs) {
        try {
            const transformed = transformAuditLog(rawAudit);
            const { _id: auditId, ...auditData } = transformed;
            await v2Models.AuditLog.updateOne(
                { _id: auditId },
                { $set: auditData, $setOnInsert: { _id: auditId } },
                { upsert: true }
            );
            ledger.counts.auditLogs.migrated++;
        } catch (err) {
            ledger.counts.auditLogs.errors.push({ id: rawAudit._id, message: err.message });
        }
    }

    // 6. Migrate Consultations without _id in $set
    for (const rawConsult of sourceData.consultations) {
        try {
            const { _id: consultId, ...consultData } = rawConsult;
            await v2Models.Consultation.updateOne(
                { _id: consultId },
                { $set: consultData, $setOnInsert: { _id: consultId } },
                { upsert: true }
            );
            ledger.counts.consultations.migrated++;
        } catch (err) {
            ledger.counts.consultations.errors.push({ id: rawConsult._id, message: err.message });
        }
    }

    // 7. Migrate Chat Messages without _id in $set
    for (const rawChat of sourceData.chatmessages) {
        try {
            const { _id: chatId, ...chatData } = rawChat;
            await v2Models.ChatMessage.updateOne(
                { _id: chatId },
                { $set: chatData, $setOnInsert: { _id: chatId } },
                { upsert: true }
            );
            ledger.counts.chatMessages.migrated++;
        } catch (err) {
            ledger.counts.chatMessages.errors.push({ id: rawChat._id, message: err.message });
        }
    }

    ledger.completedAt = new Date().toISOString();
    return ledger;
}

module.exports = {
    runMigration,
};
