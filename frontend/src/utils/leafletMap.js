import L from 'leaflet';

export const destroyLeafletMap = (mapRef, containerRef) => {
    if (mapRef?.current) {
        try {
            mapRef.current.remove();
        } catch (e) {
            console.warn('Leaflet map remove notice:', e);
        }
        mapRef.current = null;
    }
    const el = containerRef?.current;
    if (el) {
        if (el._leaflet_id) {
            delete el._leaflet_id;
        }
        el.innerHTML = '';
    }
};

export const createLeafletMap = (container, options = {}) => {
    if (!container) return null;
    if (container._leaflet_id) {
        delete container._leaflet_id;
        container.innerHTML = '';
    }
    const map = L.map(container, {
        preferCanvas: true,
        zoomControl: true,
        ...options,
    });

    // Automatically invalidate size once DOM layout is settled
    setTimeout(() => {
        try {
            map.invalidateSize();
        } catch {
            // ignore
        }
    }, 200);

    return map;
};

export const addStandardTileLayer = (map) => {
    if (!map) return;
    return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
};
