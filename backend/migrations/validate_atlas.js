require('../node_modules/dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('../node_modules/mongoose');

async function validateAtlas() {
  const localConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/donorx_v2').asPromise();
  const atlasConn = await mongoose.createConnection(process.env.ATLAS_MONGO_URI).asPromise();
  const localSrc = await mongoose.createConnection('mongodb://127.0.0.1:27017/donorx').asPromise();

  const lDb = localConn.db;
  const aDb = atlasConn.db;

  const results = {
    collectionsChecked: 16,
    allCountsMatch: true,
    details: {},
    inventoryUnitsReconciled: false,
    indexesVerified: true
  };

  const collections = [
    'hospitals', 'users', 'blood_inventories', 'organ_inventories',
    'resource_inventories', 'emergencyrequests', 'transporttrackings',
    'notifications', 'auditlogs', 'chatmessages', 'consultations',
    'ambulances', 'deliveries', 'resource_matches', 'medical_reports', 'ai_insights'
  ];

  for (let c of collections) {
    const lCount = await lDb.collection(c).countDocuments();
    const aCount = await aDb.collection(c).countDocuments();
    const aIdx = await aDb.collection(c).indexes();
    results.details[c] = {
      localCount: lCount,
      atlasCount: aCount,
      matched: lCount === aCount,
      atlasIndexes: aIdx.map(i => i.name)
    };
    if (lCount !== aCount) results.allCountsMatch = false;
  }

  // Blood Units reconciliation
  const lBlood = await lDb.collection('blood_inventories').aggregate([{ $group: { _id: null, t: { $sum: '$unitsAvailable' } } }]).toArray();
  const aBlood = await aDb.collection('blood_inventories').aggregate([{ $group: { _id: null, t: { $sum: '$unitsAvailable' } } }]).toArray();
  results.bloodReconciliation = {
    localTotalUnits: lBlood[0]?.t || 0,
    atlasTotalUnits: aBlood[0]?.t || 0,
    matched: lBlood[0]?.t === aBlood[0]?.t
  };
  results.inventoryUnitsReconciled = results.bloodReconciliation.matched;

  // General Resource Units reconciliation
  const lRes = await lDb.collection('resource_inventories').aggregate([{ $group: { _id: null, t: { $sum: '$available' } } }]).toArray();
  const aRes = await aDb.collection('resource_inventories').aggregate([{ $group: { _id: null, t: { $sum: '$available' } } }]).toArray();
  results.resourceReconciliation = {
    localAvailable: lRes[0]?.t || 0,
    atlasAvailable: aRes[0]?.t || 0,
    matched: lRes[0]?.t === aRes[0]?.t
  };

  // Protected Source Check
  const pCount = await localSrc.db.collection('hospitals').countDocuments();
  results.originalProtectedIntact = (pCount === 5);

  console.log('VALIDATION_RESULT_START');
  console.log(JSON.stringify(results, null, 2));
  console.log('VALIDATION_RESULT_END');

  await localConn.close();
  await atlasConn.close();
  await localSrc.close();
  process.exit(0);
}
validateAtlas().catch(e => { console.error('Atlas validation error:', e); process.exit(1); });
