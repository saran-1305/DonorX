const { Hospital, EmergencyRequest, BloodInventory, OrganInventory, ResourceInventory } = require('../models');

exports.getHospitalNetwork = async (req, res) => {
    try {
        const myHospitalId = req.user._id;

        const hospitals = await Hospital.find({ _id: { $ne: myHospitalId } })
            .select('name email location contactPhone contactPerson address')
            .lean();

        const hospitalIds = hospitals.map((h) => h._id);

        // Fetch discrete inventories for these hospitals in bulk
        const [allBlood, allOrgans, allResources, activeCounts] = await Promise.all([
            BloodInventory.find({ hospitalId: { $in: hospitalIds } }).lean(),
            OrganInventory.find({ hospitalId: { $in: hospitalIds }, status: { $in: ['AVAILABLE', 'REQUIRES_CLINICAL_REVIEW'] } }).lean(),
            ResourceInventory.find({ hospitalId: { $in: hospitalIds } }).lean(),
            EmergencyRequest.aggregate([
                { $match: { status: { $in: ['Generated', 'Pending'] }, assignedHospital: { $ne: null } } },
                { $group: { _id: '$assignedHospital', count: { $sum: 1 } } },
            ]),
        ]);

        const countMap = {};
        activeCounts.forEach((item) => {
            countMap[String(item._id)] = item.count;
        });

        // Group inventories by hospitalId
        const bloodMap = {};
        allBlood.forEach((b) => {
            const hid = String(b.hospitalId);
            if (!bloodMap[hid]) bloodMap[hid] = [];
            bloodMap[hid].push({
                _id: b._id,
                type: 'BLOOD',
                group: b.bloodGroup,
                quantity: b.unitsAvailable,
            });
        });

        const organMap = {};
        allOrgans.forEach((o) => {
            const hid = String(o.hospitalId);
            if (!organMap[hid]) organMap[hid] = [];
            const organName = o.organType.charAt(0) + o.organType.slice(1).toLowerCase();
            organMap[hid].push({
                _id: o._id,
                type: 'ORGAN',
                group: organName,
                quantity: 1,
            });
        });

        const resMap = {};
        allResources.forEach((r) => {
            const hid = String(r.hospitalId);
            if (!resMap[hid]) resMap[hid] = [];
            resMap[hid].push({
                _id: r._id,
                resourceType: r.resourceType,
                available: r.available,
                total: r.total,
            });
        });

        const network = hospitals.map((h) => {
            const hid = String(h._id);
            const combinedInventory = [...(bloodMap[hid] || []), ...(organMap[hid] || [])];
            return {
                _id: h._id,
                name: h.name,
                email: h.email,
                contactPhone: h.contactPhone,
                contactPerson: h.contactPerson,
                address: h.address,
                location: h.location,
                inventory: combinedInventory,
                resources: resMap[hid] || [],
                activeEmergencies: countMap[hid] || 0,
            };
        });

        res.json(network);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getHospitalById = async (req, res) => {
    try {
        const hospital = await Hospital.findById(req.params.id)
            .select('name email location contactPhone contactPerson address createdAt')
            .lean();

        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        const [blood, organs, resources] = await Promise.all([
            BloodInventory.find({ hospitalId: hospital._id }).lean(),
            OrganInventory.find({ hospitalId: hospital._id, status: { $in: ['AVAILABLE', 'REQUIRES_CLINICAL_REVIEW'] } }).lean(),
            ResourceInventory.find({ hospitalId: hospital._id }).lean(),
        ]);

        const inventory = [
            ...blood.map((b) => ({ _id: b._id, type: 'BLOOD', group: b.bloodGroup, quantity: b.unitsAvailable })),
            ...organs.map((o) => ({
                _id: o._id,
                type: 'ORGAN',
                group: o.organType.charAt(0) + o.organType.slice(1).toLowerCase(),
                quantity: 1,
            })),
        ];

        hospital.inventory = inventory;
        hospital.resources = resources;

        res.json(hospital);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
