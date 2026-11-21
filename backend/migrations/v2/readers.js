/**
 * Reads all collections from the source database in a strictly read-only manner.
 */
async function readSourceData(sourceConn) {
    const db = sourceConn.db;

    const [
        hospitals,
        emergencyrequests,
        notifications,
        transporttrackings,
        auditlogs,
        chatmessages,
        consultations,
    ] = await Promise.all([
        db.collection('hospitals').find({}).toArray(),
        db.collection('emergencyrequests').find({}).toArray(),
        db.collection('notifications').find({}).toArray(),
        db.collection('transporttrackings').find({}).toArray(),
        db.collection('auditlogs').find({}).toArray(),
        db.collection('chatmessages').find({}).toArray(),
        db.collection('consultations').find({}).toArray(),
    ]);

    return {
        hospitals,
        emergencyrequests,
        notifications,
        transporttrackings,
        auditlogs,
        chatmessages,
        consultations,
    };
}

module.exports = {
    readSourceData,
};
