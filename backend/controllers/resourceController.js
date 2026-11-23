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

// @desc    Update resource available count (supports single item or batch items array)
// @route   PUT /api/resources
// @access  Private
exports.updateResources = async (req, res) => {
    try {
        const hospitalId = req.user._id;

        const items = Array.isArray(req.body.items) && req.body.items.length > 0
            ? req.body.items
            : [req.body];

        const updatedList = [];

        for (const item of items) {
            const { resourceType, available, total } = item;
            if (!resourceType || !VALID_RESOURCE_TYPES.includes(resourceType)) {
                continue;
            }
            if (typeof available !== 'number' || available < 0) {
                continue;
            }

            const updateFields = { available };
            const insertFields = { hospitalId, resourceType, reserved: 0 };

            if (typeof total === 'number' && total >= available) {
                updateFields.total = total;
            } else {
                insertFields.total = Math.max(available, 10);
            }

            const updated = await ResourceInventory.findOneAndUpdate(
                { hospitalId, resourceType },
                {
                    $set: updateFields,
                    $setOnInsert: insertFields,
                },
                { upsert: true, new: true }
            );
            if (updated) {
                updatedList.push(updated);
            }
        }

        // Return single response format if called with legacy non-array body
        if (!Array.isArray(req.body.items) && updatedList.length === 1) {
            return res.json({
                message: `${updatedList[0].resourceType} available count updated to ${updatedList[0].available}`,
                resource: updatedList[0],
            });
        }

        return exports.getResources(req, res);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
