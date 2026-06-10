import L from 'leaflet';

export const destroyLeafletMap = (mapRef, containerRef) => {
    if (mapRef?.current) {
        mapRef.current.remove();
        mapRef.current = null;
    }
    const el = containerRef?.current;
    if (el?._leaflet_id) {
        delete el._leaflet_id;
    }
};

export const createLeafletMap = (container, options = {}) => {
    if (!container) return null;
    if (container._leaflet_id) {
        delete container._leaflet_id;
    }
    return L.map(container, options);
};
