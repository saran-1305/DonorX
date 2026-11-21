const { ResourceInventory } = require('../models');

const VALID_RESOURCE_TYPES = ['ICU_BED', 'VENTILATOR', 'OXYGEN_CYLINDER', 'AMBULANCE'];

const DEFAULT_RESOURCES = [
    { resourceType: 'ICU_BED', available: 5, total: 10 },
    { resourceType: 'VENTILATOR', available: 3, total: 6 },
    { resourceType: 'OXYGEN_CYLINDER', available: 20, total: 30 },
    { resourceType: 'AMBULANCE', available: 2, total: 4 },
];

// @desc    Get hospital resources
// @route   GET /api/resources
// @access  Private
exports.getResources = async (req, res) => {
    try {
        const hospitalId = req.user._id;

        let resources = await ResourceInventory.find({ hospitalId });

        if (!resources || resources.length === 0) {
            // Seed defaults for new facilities if none exist
            for (const def of DEFAULT_RESOURCES) {
                await ResourceInventory.create({
                    hospitalId,
                    resourceType: def.resourceType,
                    available: def.available,
                    total: def.total,
                    reserved: 0,
                });
            }
            resources = await ResourceInventory.find({ hospitalId });
        }

        const formatted = resources.map((r) => ({
            _id: r._id,
            resourceType: r.resourceType,
            available: r.available,
            total: r.total,
            reserved: r.reserved,
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update resource available count
// @route   PUT /api/resources
// @access  Private
exports.updateResources = async (req, res) => {
    const { resourceType, available } = req.body;

    if (!resourceType || !VALID_RESOURCE_TYPES.includes(resourceType)) {
        return res.status(400).json({
            message: 'Invalid resourceType. Must be one of: ICU_BED, VENTILATOR, OXYGEN_CYLINDER, AMBULANCE',
        });
    }

    if (typeof available !== 'number' || available < 0) {
        return res.status(400).json({ message: 'available must be a non-negative number' });
    }

    try {
        const hospitalId = req.user._id;

        const updated = await ResourceInventory.findOneAndUpdate(
            { hospitalId, resourceType },
            {
                $set: { available },
                $setOnInsert: { hospitalId, resourceType, total: available, reserved: 0 },
            },
            { upsert: true, new: true }
        );

        res.json({
            message: `${resourceType} available count updated to ${available}`,
            resource: updated,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
