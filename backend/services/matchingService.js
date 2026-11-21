const { Hospital, BloodInventory, ResourceInventory, OrganInventory } = require('../models');

const compatibility = {
    'O-': ['O-'],
    'O+': ['O-', 'O+'],
    'A-': ['O-', 'A-'],
    'A+': ['O-', 'O+', 'A-', 'A+'],
    'B-': ['O-', 'B-'],
    'B+': ['O-', 'O+', 'B-', 'B+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

const RESOURCE_TYPES = ['ICU_BED', 'VENTILATOR', 'OXYGEN_CYLINDER', 'AMBULANCE'];

const getResourceCategory = (resourceNeeded) => {
    if (resourceNeeded.resourceCategory) return resourceNeeded.resourceCategory;
    if (RESOURCE_TYPES.includes(resourceNeeded.type)) return 'RESOURCE';
    if (resourceNeeded.type === 'ORGAN') return 'ORGAN';
    return 'BLOOD';
};

exports.findMatchingHospitals = async (request) => {
    try {
        const { resourceNeeded, searchRadius = 5 } = request;

        if (!resourceNeeded || !resourceNeeded.type) {
            console.warn('Invalid resourceNeeded in findMatchingHospitals');
            return [];
        }

        const category = getResourceCategory(resourceNeeded);
        if (category !== 'RESOURCE' && !resourceNeeded.group) {
            console.warn('Invalid resourceNeeded.group in findMatchingHospitals');
            return [];
        }

        let coordinates;

        if (request.location && request.location.coordinates && request.location.coordinates.length === 2) {
            coordinates = request.location.coordinates;
        } else {
            const requestingHospital = await Hospital.findById(request.requestingHospital);
            if (!requestingHospital || !requestingHospital.location || !requestingHospital.location.coordinates) {
                console.warn('No location found for request or requesting hospital');
                return [];
            }
            coordinates = requestingHospital.location.coordinates;
        }

        if (!coordinates || coordinates.length !== 2) {
            console.warn('Invalid coordinates for geospatial search');
            return [];
        }

        // Strict radius boundary: radius in radians
        const radiusInRadians = (searchRadius || 5) / 6378.1;

        // Query only hospitals strictly within the current AGE radius
        const hospitalsInRadius = await Hospital.find({
            location: {
                $geoWithin: {
                    $centerSphere: [coordinates, radiusInRadians],
                },
            },
            _id: { $ne: request.requestingHospital },
        }).select('_id name location');

        if (hospitalsInRadius.length === 0) {
            return [];
        }

        const hospitalIds = hospitalsInRadius.map((h) => h._id);
        const matchedHospitalIds = new Set();

        if (category === 'RESOURCE') {
            const matchedRes = await ResourceInventory.find({
                hospitalId: { $in: hospitalIds },
                resourceType: resourceNeeded.type,
                available: { $gte: resourceNeeded.quantity || 1 },
            });
            matchedRes.forEach((r) => matchedHospitalIds.add(String(r.hospitalId)));
        } else if (category === 'BLOOD') {
            const compatibleGroups = compatibility[resourceNeeded.group] || [resourceNeeded.group];
            const matchedBlood = await BloodInventory.find({
                hospitalId: { $in: hospitalIds },
                bloodGroup: { $in: compatibleGroups },
                unitsAvailable: { $gte: resourceNeeded.quantity || 1 },
            });
            matchedBlood.forEach((b) => matchedHospitalIds.add(String(b.hospitalId)));
        } else if (category === 'ORGAN') {
            const organTypeUpper = (resourceNeeded.group || resourceNeeded.type).toUpperCase();
            const matchedOrgans = await OrganInventory.find({
                hospitalId: { $in: hospitalIds },
                organType: organTypeUpper,
                status: 'AVAILABLE',
            });
            matchedOrgans.forEach((o) => matchedHospitalIds.add(String(o.hospitalId)));
        }

        if (matchedHospitalIds.size > 0) {
            return Array.from(matchedHospitalIds);
        }

        // Fallback: Return facilities within search radius so emergency staff can respond manually
        return hospitalIds.map((id) => String(id));
    } catch (error) {
        console.error('Error in findMatchingHospitals:', error);
        return [];
    }
};
