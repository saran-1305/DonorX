exports.getDrivingRoute = async (req, res) => {
    const { fromLat, fromLng, toLat, toLng } = req.query;

    if (![fromLat, fromLng, toLat, toLng].every((v) => v != null && v !== '')) {
        return res.status(400).json({ message: 'fromLat, fromLng, toLat, toLng are required' });
    }

    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(502).json({ message: 'Route service unavailable', error: error.message });
    }
};
