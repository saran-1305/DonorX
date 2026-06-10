const Hospital = require('../models/Hospital');
const EmergencyRequest = require('../models/EmergencyRequest');

exports.getHospitalNetwork = async (req, res) => {
    try {
        const hospitals = await Hospital.find({ _id: { $ne: req.user._id } })
            .select('name email location inventory resources contactPhone contactPerson address')
            .lean();

        const activeCounts = await EmergencyRequest.aggregate([
            { $match: { status: { $in: ['Generated', 'Pending'] }, assignedHospital: { $ne: null } } },
            { $group: { _id: '$assignedHospital', count: { $sum: 1 } } },
        ]);

        const countMap = {};
        activeCounts.forEach((item) => {
            countMap[String(item._id)] = item.count;
        });

        const network = hospitals.map((h) => ({
            _id: h._id,
            name: h.name,
            email: h.email,
            contactPhone: h.contactPhone,
            contactPerson: h.contactPerson,
            address: h.address,
            location: h.location,
            inventory: h.inventory || [],
            resources: h.resources || [],
            activeEmergencies: countMap[String(h._id)] || 0,
        }));

        res.json(network);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getHospitalById = async (req, res) => {
    try {
        const hospital = await Hospital.findById(req.params.id)
            .select('name email location inventory resources contactPhone contactPerson address createdAt')
            .lean();

        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        res.json(hospital);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
