const { createMigrationConnections } = require('./connection');
const { runMigration } = require('./orchestrator');
const { validateMigration } = require('./validator');

async function main() {
    console.log('=== DONORX 2.0 DATABASE MIGRATION SCRIPT ===');
    console.log('Source: donorx (READ ONLY)');
    console.log('Destination: donorx_v2 (WRITE ONLY)');

    let connections;
    try {
        connections = await createMigrationConnections();
        console.log('Successfully established isolated connections.');

        console.log('\n--- Step 1: Executing Migration ---');
        const ledger = await runMigration(connections.sourceConn, connections.destConn);
        console.log('Migration Ledger:', JSON.stringify(ledger, null, 2));

        console.log('\n--- Step 2: Validating Migrated Data ---');
        const report = await validateMigration(connections.sourceConn, connections.destConn);
        console.log('Validation Report:', JSON.stringify(report, null, 2));

        if (report.overallValid) {
            console.log('\nSUCCESS: Database migration validated with 100% integrity!');
        } else {
            console.error('\nFAILURE: Validation detected discrepancies!');
            process.exitCode = 1;
        }
    } catch (err) {
        console.error('Migration failed with fatal error:', err);
        process.exitCode = 1;
    } finally {
        if (connections) {
            await connections.sourceConn.close();
            await connections.destConn.close();
        }
    }
}

if (require.main === module) {
    main();
}

module.exports = main;
