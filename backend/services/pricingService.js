/**
 * Pricing Service for DonorX Emergency Resource & Organ Exchange
 * Defines standard rates for rare organs, rare blood groups, and healthcare resources,
 * and computes transportation costs along with a strict 5% platform commission for DonorX.
 */

const ORGAN_DEFAULT_RATES = {
    HEART: 500000,
    LIVER: 400000,
    KIDNEY: 350000,
    LUNG: 450000,
    PANCREAS: 250000,
    CORNEA: 50000,
    BONE_MARROW: 300000,
    ORGAN: 250000,
};

const BLOOD_DEFAULT_RATES = {
    // Rare Rh-negative blood groups
    'O-': 3500,
    'AB-': 3500,
    'B-': 3000,
    'A-': 3000,
    // Standard Rh-positive blood groups
    'O+': 2000,
    'A+': 1800,
    'B+': 1800,
    'AB+': 2000,
};

const RESOURCE_DEFAULT_RATES = {
    ICU_BED: 8000,
    VENTILATOR: 6500,
    AMBULANCE: 3000,
    OXYGEN_CYLINDER: 1500,
};

/**
 * Get recommended base unit rate for a given resource
 */
const getDefaultResourceRate = (resourceNeeded = {}) => {
    const category = (resourceNeeded.resourceCategory || resourceNeeded.type || '').toUpperCase();
    const type = (resourceNeeded.type || '').toUpperCase().trim();
    const group = (resourceNeeded.group || '').toUpperCase().trim();

    // Organs
    if (category === 'ORGAN' || type === 'ORGAN') {
        for (const [key, val] of Object.entries(ORGAN_DEFAULT_RATES)) {
            if (group.includes(key) || type.includes(key)) {
                return val;
            }
        }
        return ORGAN_DEFAULT_RATES.ORGAN;
    }

    // Blood
    if (category === 'BLOOD' || type === 'BLOOD') {
        if (BLOOD_DEFAULT_RATES[resourceNeeded.group]) {
            return BLOOD_DEFAULT_RATES[resourceNeeded.group];
        }
        if (BLOOD_DEFAULT_RATES[group]) {
            return BLOOD_DEFAULT_RATES[group];
        }
        return 2000;
    }

    // Other resources (ICU beds, ventilators, etc.)
    if (RESOURCE_DEFAULT_RATES[type]) {
        return RESOURCE_DEFAULT_RATES[type];
    }

    return 2000;
};

/**
 * Calculate distance in km between two geo coordinates [lng, lat] using Haversine formula
 */
const calculateHaversineDistanceKm = (coords1, coords2) => {
    if (!Array.isArray(coords1) || !Array.isArray(coords2) || coords1.length < 2 || coords2.length < 2) {
        return 5; // default fallback 5 km
    }
    const [lon1, lat1] = coords1;
    const [lon2, lat2] = coords2;

    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return Number(Math.max(0.5, dist).toFixed(2));
};

/**
 * Calculate full breakdown of bill amounts
 */
const computeBillBreakdown = ({
    unitRate,
    quantity = 1,
    distanceKm = 0,
    transportBaseFee = 500,
    transportRatePerKm = 40,
    commissionRate = 0.05,
}) => {
    const safeUnitRate = Math.max(0, Math.round(Number(unitRate) || 0));
    const safeQty = Math.max(1, Math.round(Number(quantity) || 1));
    const safeDistance = Math.max(0, Number(distanceKm) || 0);

    const resourceTotal = safeUnitRate * safeQty;
    const transportTotal = Math.round(transportBaseFee + safeDistance * transportRatePerKm);
    const subtotal = resourceTotal + transportTotal;
    const commissionAmount = Math.round(subtotal * commissionRate); // 5% platform commission
    const totalAmount = subtotal + commissionAmount;

    return {
        unitRate: safeUnitRate,
        quantity: safeQty,
        resourceTotal,
        distanceKm: safeDistance,
        transportBaseFee,
        transportRatePerKm,
        transportTotal,
        subtotal,
        commissionRate,
        commissionAmount,
        totalAmount,
    };
};

module.exports = {
    ORGAN_DEFAULT_RATES,
    BLOOD_DEFAULT_RATES,
    RESOURCE_DEFAULT_RATES,
    getDefaultResourceRate,
    calculateHaversineDistanceKm,
    computeBillBreakdown,
};
