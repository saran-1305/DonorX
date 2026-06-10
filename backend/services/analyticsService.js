const EmergencyRequest = require('../models/EmergencyRequest');
const Hospital = require('../models/Hospital');

const RESOURCE_TYPES = ['ICU_BED', 'VENTILATOR', 'OXYGEN_CYLINDER', 'AMBULANCE'];
const SHORTAGE_THRESHOLD = 0.25;

exports.getPredictiveAnalytics = async () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [
        hospitals,
        requestsLast7Days,
        requestsPrev7Days,
        dailyTrend,
        categoryTrend,
        completedRequests,
    ] = await Promise.all([
        Hospital.find().select('name inventory resources').lean(),
        EmergencyRequest.find({ createdAt: { $gte: sevenDaysAgo } }).lean(),
        EmergencyRequest.find({ createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } }).lean(),
        EmergencyRequest.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        EmergencyRequest.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $in: ['$resourceNeeded.type', RESOURCE_TYPES] },
                            '$resourceNeeded.type',
                            '$resourceNeeded.type',
                        ],
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]),
        EmergencyRequest.find({ status: 'Completed', updatedAt: { $gte: sevenDaysAgo } })
            .select('resourceNeeded updatedAt createdAt')
            .lean(),
    ]);

    const bloodInventory = {};
    const resourceInventory = {};
    RESOURCE_TYPES.forEach((t) => { resourceInventory[t] = { available: 0, total: 0 }; });

    hospitals.forEach((h) => {
        (h.inventory || []).forEach((item) => {
            if (item.type === 'BLOOD' && item.group) {
                bloodInventory[item.group] = (bloodInventory[item.group] || 0) + (item.quantity || 0);
            }
        });
        (h.resources || []).forEach((r) => {
            if (resourceInventory[r.resourceType]) {
                resourceInventory[r.resourceType].available += r.available || 0;
                resourceInventory[r.resourceType].total += r.total || 0;
            }
        });
    });

    const consumptionByType = {};
    completedRequests.forEach((req) => {
        const rn = req.resourceNeeded;
        if (!rn) return;
        const key = rn.type === 'BLOOD' ? `BLOOD_${rn.group}` : rn.type;
        consumptionByType[key] = (consumptionByType[key] || 0) + (rn.quantity || 1);
    });

    const weeklyGrowth =
        requestsPrev7Days.length > 0
            ? Math.round(((requestsLast7Days.length - requestsPrev7Days.length) / requestsPrev7Days.length) * 100)
            : requestsLast7Days.length > 0 ? 100 : 0;

    const forecastNext7Days = Math.max(
        requestsLast7Days.length,
        Math.round(requestsLast7Days.length * (1 + weeklyGrowth / 100))
    );

    const shortageAlerts = [];

    Object.entries(bloodInventory).forEach(([group, qty]) => {
        const consumed = consumptionByType[`BLOOD_${group}`] || 0;
        const dailyRate = consumed / 7;
        const daysRemaining = dailyRate > 0 ? Math.round(qty / dailyRate) : null;
        if (qty <= 5 || (daysRemaining !== null && daysRemaining <= 3)) {
            shortageAlerts.push({
                type: 'BLOOD',
                resource: group,
                currentStock: qty,
                dailyConsumption: Math.round(dailyRate * 10) / 10,
                daysUntilShortage: daysRemaining,
                severity: daysRemaining !== null && daysRemaining <= 1 ? 'Critical' : 'High',
                recommendation: `Increase ${group} blood procurement or activate donor drive.`,
            });
        }
    });

    RESOURCE_TYPES.forEach((type) => {
        const inv = resourceInventory[type];
        const ratio = inv.total > 0 ? inv.available / inv.total : 0;
        const consumed = consumptionByType[type] || 0;
        const dailyRate = consumed / 7;

        if (ratio < SHORTAGE_THRESHOLD || inv.available <= 2) {
            shortageAlerts.push({
                type: 'RESOURCE',
                resource: type,
                currentStock: inv.available,
                capacity: inv.total,
                utilizationPct: Math.round((1 - ratio) * 100),
                dailyConsumption: Math.round(dailyRate * 10) / 10,
                severity: inv.available <= 1 ? 'Critical' : 'High',
                recommendation: `Reallocate ${type.replace(/_/g, ' ').toLowerCase()} capacity across network hospitals.`,
            });
        }
    });

    const avgResponseMinutes = completedRequests.length
        ? Math.round(
            completedRequests.reduce(
                (sum, r) => sum + (new Date(r.updatedAt) - new Date(r.createdAt)) / 60000,
                0
            ) / completedRequests.length * 10
        ) / 10
        : 0;

    return {
        summary: {
            requestsLast7Days: requestsLast7Days.length,
            weeklyGrowthPct: weeklyGrowth,
            forecastNext7Days,
            avgResponseMinutes,
            networkHospitals: hospitals.length,
            activeShortageAlerts: shortageAlerts.length,
        },
        dailyTrend: dailyTrend.map((d) => ({ date: d._id, requests: d.count })),
        categoryTrend: categoryTrend.map((c) => ({ category: c._id, count: c.count })),
        bloodInventory,
        resourceInventory: Object.fromEntries(
            Object.entries(resourceInventory).map(([k, v]) => [k, v.available])
        ),
        shortageAlerts: shortageAlerts.sort((a, b) =>
            (a.severity === 'Critical' ? 0 : 1) - (b.severity === 'Critical' ? 0 : 1)
        ),
        insights: [
            weeklyGrowth > 20
                ? `Emergency request volume up ${weeklyGrowth}% week-over-week — consider pre-positioning critical resources.`
                : weeklyGrowth < -10
                    ? `Request volume down ${Math.abs(weeklyGrowth)}% — network capacity is stabilizing.`
                    : 'Request volume is stable across the network.',
            shortageAlerts.length > 0
                ? `${shortageAlerts.length} resource shortage alert(s) require proactive allocation.`
                : 'No critical shortage alerts detected in the next 72 hours.',
            avgResponseMinutes > 0
                ? `Average fulfillment time: ${avgResponseMinutes} minutes across completed requests.`
                : 'Insufficient completed request data for response time analysis.',
        ],
    };
};
