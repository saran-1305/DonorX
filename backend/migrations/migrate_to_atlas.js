require('../node_modules/dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('../node_modules/mongoose');
const { initV2Models } = require('../models/v2');

/**
 * Cloud Migration Script: Transfers validated local donorx_v2 into Atlas donorx_v2
 * Preserving: _id, references, timestamps, inventory quantities, audit hashes, GeoJSON, and indexes.
 */
async function migrateLocalV2ToAtlas() {
    console.log('=== DONORX 2.0 CLOUD MIGRATION: LOCAL V2 -> ATLAS V2 ===');
    const localUri = 'mongodb://127.0.0.1:27017/donorx_v2';
    const atlasUri = process.env.ATLAS_MONGO_URI;

    if (!atlasUri) {
        throw new Error('ATLAS_MONGO_URI is missing in backend/.env');
    }

    const localConn = await mongoose.createConnection(localUri).asPromise();
    const atlasConn = await mongoose.createConnection(atlasUri).asPromise();

    console.log('Source (Local V2):', localConn.host, '/', localConn.name);
    console.log('Destination (Atlas):', atlasConn.host, '/', atlasConn.name);

    if (localConn.host === atlasConn.host && localConn.name === atlasConn.name) {
        throw new Error('SAFETY BLOCK: Source and Destination cannot be the same host and database!');
    }

    // Initialize Mongoose models on Atlas connection to compile schema validation and create indexes
    const atlasModels = initV2Models(atlasConn);

    const localDb = localConn.db;
    const atlasDb = atlasConn.db;

    const collections = [
        'hospitals',
        'users',
        'blood_inventories',
        'organ_inventories',
        'resource_inventories',
        'emergencyrequests',
        'resource_matches',
        'ambulances',
        'deliveries',
        'transporttrackings',
        'notifications',
        'chatmessages',
        'consultations',
        'auditlogs',
        'medical_reports',
        'ai_insights',
    ];

    const report = {
        startedAt: new Date().toISOString(),
        collections: {},
    };

    for (const colName of collections) {
        console.log(`\nMigrating collection [${colName}]...`);
        const docs = await localDb.collection(colName).find({}).toArray();
        const indexes = await localDb.collection(colName).indexes();

        report.collections[colName] = {
            sourceCount: docs.length,
            destCount: 0,
            indexesRecreated: 0,
            errors: [],
        };

        // Recreate indexes on Atlas (skipping default _id_ index)
        for (const idx of indexes) {
            if (idx.name === '_id_') continue;
            try {
                const options = { name: idx.name };
                if (idx.unique) options.unique = true;
                if (idx.sparse) options.sparse = true;
                await atlasDb.collection(colName).createIndex(idx.key, options);
                report.collections[colName].indexesRecreated++;
            } catch (err) {
                // Index might already exist from Mongoose model compilation
                if (!err.message.includes('already exists')) {
                    report.collections[colName].errors.push({ index: idx.name, error: err.message });
                }
            }
        }

        // Transfer documents with exact _id preservation
        if (docs.length > 0) {
            for (const doc of docs) {
                const { _id, ...rest } = doc;
                await atlasDb.collection(colName).updateOne(
                    { _id },
                    { $set: rest, $setOnInsert: { _id } },
                    { upsert: true }
                );
            }
        }

        const atlasCount = await atlasDb.collection(colName).countDocuments();
        report.collections[colName].destCount = atlasCount;
        console.log(`-> Completed [${colName}]: Source ${docs.length} -> Atlas ${atlasCount}`);
    }

    report.completedAt = new Date().toISOString();

    await localConn.close();
    await atlasConn.close();

    return report;
}

if (require.main === module) {
    migrateLocalV2ToAtlas()
        .then(rep => {
            console.log('\n=== CLOUD MIGRATION COMPLETED SUCCESSFULLY ===');
            console.log(JSON.stringify(rep, null, 2));
            process.exit(0);
        })
        .catch(err => {
            console.error('\n=== CLOUD MIGRATION FAILED ===', err);
            process.exit(1);
        });
}

module.exports = { migrateLocalV2ToAtlas };
