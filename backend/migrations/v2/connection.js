require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

/**
 * Creates distinct explicit connections for the Source (local donorx) and Destination (Atlas donorx_v2)
 * Ensuring strict isolation so the original database is never mutated by the migration.
 */
async function createMigrationConnections(sourceUri, destUri) {
    const defaultSourceUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/donorx';
    // Priority: explicit destUri > ATLAS_MONGO_URI > MONGO_URI_V2 > local donorx_v2 fallback
    const defaultDestUri = process.env.ATLAS_MONGO_URI || process.env.MONGO_URI_V2 || 'mongodb://127.0.0.1:27017/donorx_v2';

    const sUri = sourceUri || defaultSourceUri;
    const dUri = destUri || defaultDestUri;

    // Normalize URIs to prevent subtle string mismatches pointing to the same server & database
    const cleanS = sUri.replace(/\/+$/, '').trim();
    const cleanD = dUri.replace(/\/+$/, '').trim();

    if (cleanS === cleanD) {
        throw new Error('SAFETY BLOCK: Source and Destination URIs cannot be identical!');
    }

    const sourceConn = await mongoose.createConnection(cleanS).asPromise();
    const destConn = await mongoose.createConnection(cleanD).asPromise();

    if (sourceConn.name === destConn.name && sourceConn.host === destConn.host) {
        await sourceConn.close();
        await destConn.close();
        throw new Error(`SAFETY BLOCK: Both connections resolved to identical host and database: ${sourceConn.host}/${sourceConn.name}`);
    }

    return { sourceConn, destConn };
}

module.exports = {
    createMigrationConnections,
};
