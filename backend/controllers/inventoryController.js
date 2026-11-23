const { Hospital, BloodInventory, OrganInventory } = require('../models');

// @desc    Get hospital inventory (formatted identically to legacy [{ type, group, quantity }])
// @route   GET /api/inventory
// @access  Private
exports.getInventory = async (req, res) => {
    try {
        const hospitalId = req.user._id;

        const bloodStock = await BloodInventory.find({ hospitalId });
        const organStock = await OrganInventory.find({ hospitalId, status: { $in: ['AVAILABLE', 'REQUIRES_CLINICAL_REVIEW'] } });

        const inventory = [];

        // Map blood inventories
        for (const b of bloodStock) {
            inventory.push({
                _id: b._id,
                type: 'BLOOD',
                group: b.bloodGroup,
                quantity: b.unitsAvailable,
                component: b.component,
            });
        }

        // Map organ inventories
        for (const o of organStock) {
            // Title-case formatting for frontend display (e.g., Kidney, Liver)
            const organName = o.organType.charAt(0) + o.organType.slice(1).toLowerCase();
            inventory.push({
                _id: o._id,
                type: 'ORGAN',
                group: organName,
                quantity: 1,
                status: o.status,
            });
        }

        res.json(inventory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update hospital inventory
// @route   PUT /api/inventory
// @access  Private
exports.updateInventory = async (req, res) => {
    try {
        const hospitalId = req.user._id;

        const items = Array.isArray(req.body.items) && req.body.items.length > 0
            ? req.body.items
            : [req.body];

        for (const { type, group, quantity } of items) {
            if (!type || !group || typeof quantity !== 'number') {
                continue;
            }

            const normalizedType = type.toUpperCase();

            if (normalizedType === 'BLOOD') {
                await BloodInventory.updateOne(
                    { hospitalId, bloodGroup: group, component: 'WHOLE_BLOOD' },
                    {
                        $set: { unitsAvailable: Math.max(0, quantity), unitsTotal: Math.max(0, quantity) },
                        $setOnInsert: { hospitalId, bloodGroup: group, component: 'WHOLE_BLOOD', unitsReserved: 0 },
                    },
                    { upsert: true }
                );
            } else if (normalizedType === 'ORGAN') {
                const organTypeUpper = group.toUpperCase();
                if (quantity > 0) {
                    await OrganInventory.updateOne(
                        { hospitalId, organType: organTypeUpper },
                        {
                            $set: { status: 'AVAILABLE' },
                            $setOnInsert: {
                                hospitalId,
                                organType: organTypeUpper,
                                donorBloodGroup: 'O+',
                                crossmatchDetails: {},
                            },
                        },
                        { upsert: true }
                    );
                } else {
                    await OrganInventory.updateMany(
                        { hospitalId, organType: organTypeUpper, status: 'AVAILABLE' },
                        { $set: { status: 'TRANSPLANTED' } }
                    );
                }
            }
        }

        return exports.getInventory(req, res);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
