import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDonor } from '../context/DonorContext';
import { hospitalService } from '../services/api';
import api from '../services/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { createLeafletMap, destroyLeafletMap } from '../utils/leafletMap';

const fetchRoute = async (fromLat, fromLng, toLat, toLng) => {
    try {
        const { data } = await api.get('/routes/driving', {
            params: { fromLat, fromLng, toLat, toLng },
        });
        if (data.code !== 'Ok' || !data.routes?.[0]) return null;
        const route = data.routes[0];
        return {
            coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
            distanceKm: (route.distance / 1000).toFixed(2),
            durationMin: Math.round(route.duration / 60),
        };
    } catch {
        return null;
    }
};

const MapPage = () => {
    const { user } = useDonor();
    const mapContainer = useRef(null);
    const mapInstance = useRef(null);
    const routeLayer = useRef(null);
    const markersLayer = useRef(null);
    const drawRouteRef = useRef(null);
    const mapReady = useRef(false);

    const [hospitals, setHospitals] = useState([]);
    const [selected, setSelected] = useState(null);
    const [routeInfo, setRouteInfo] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [loading, setLoading] = useState(true);

    const myLat = user?.location?.coordinates?.[1];
    const myLng = user?.location?.coordinates?.[0];
    const hasOrigin = myLat != null && myLng != null;

    const loadHospitals = useCallback(async () => {
        try {
            const { data } = await hospitalService.getNetwork();
            const list = Array.isArray(data) ? data : [];
            setHospitals(list.filter((h) => String(h._id) !== String(user?._id)));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [user?._id]);

    useEffect(() => { loadHospitals(); }, [loadHospitals]);

    const drawRoute = useCallback(async (hospital) => {
        const map = mapInstance.current;
        if (!map || !hasOrigin) return;

        const coords = hospital.location?.coordinates;
        if (!coords || coords.length < 2) return;

        const destLat = coords[1];
        const destLng = coords[0];

        setRouteLoading(true);
        setSelected(hospital);

        if (routeLayer.current) {
            map.removeLayer(routeLayer.current);
            routeLayer.current = null;
        }

        const route = await fetchRoute(myLat, myLng, destLat, destLng);

        if (!mapInstance.current) {
            setRouteLoading(false);
            return;
        }

        if (route) {
            routeLayer.current = L.polyline(route.coords, {
                color: '#2563EB',
                weight: 5,
                opacity: 0.9,
            }).addTo(mapInstance.current);

            const bounds = routeLayer.current.getBounds().extend([myLat, myLng]);
            mapInstance.current.fitBounds(bounds, { padding: [60, 60] });

            setRouteInfo({
                name: hospital.name,
                distanceKm: route.distanceKm,
                durationMin: route.durationMin,
            });
        } else {
            const fallback = L.polyline(
                [[myLat, myLng], [destLat, destLng]],
                { color: '#2563EB', weight: 4, dashArray: '8,8' },
            ).addTo(mapInstance.current);
            routeLayer.current = fallback;
            mapInstance.current.fitBounds(fallback.getBounds(), { padding: [60, 60] });
            setRouteInfo({ name: hospital.name, distanceKm: '—', durationMin: '—' });
        }

        setRouteLoading(false);
    }, [hasOrigin, myLat, myLng]);

    drawRouteRef.current = drawRoute;

    const clearRoute = () => {
        if (routeLayer.current && mapInstance.current) {
            mapInstance.current.removeLayer(routeLayer.current);
            routeLayer.current = null;
        }
        setSelected(null);
        setRouteInfo(null);
    };

    useEffect(() => {
        const container = mapContainer.current;
        if (!container || mapReady.current) return;

        const defaultCenter = [13.0827, 80.2707];
        const center = hasOrigin ? [myLat, myLng] : defaultCenter;

        const map = createLeafletMap(container, { preferCanvas: true });
        map.setView(center, hasOrigin ? 11 : 10);
        mapInstance.current = map;
        mapReady.current = true;

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
        }).addTo(map);

        markersLayer.current = L.layerGroup().addTo(map);

        return () => {
            routeLayer.current = null;
            markersLayer.current = null;
            mapReady.current = false;
            destroyLeafletMap(mapInstance, mapContainer);
        };
    }, [hasOrigin, myLat, myLng]);

    useEffect(() => {
        const map = mapInstance.current;
        const layer = markersLayer.current;
        if (!map || !layer || loading) return;

        layer.clearLayers();

        const peerHospitals = hospitals.filter((h) => {
            const c = h.location?.coordinates;
            return c?.length === 2 && String(h._id) !== String(user?._id);
        });

        peerHospitals.forEach((h) => {
            const coords = h.location.coordinates;
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: "<div class='map-marker map-marker-peer'></div>",
                iconSize: [16, 16],
                iconAnchor: [8, 8],
            });

            L.marker([coords[1], coords[0]], { icon })
                .addTo(layer)
                .bindPopup(`<strong>${h.name}</strong><br>Click to view route from your hospital`)
                .on('click', () => drawRouteRef.current?.(h));
        });

        const points = peerHospitals.map((h) => [h.location.coordinates[1], h.location.coordinates[0]]);
        if (points.length > 0) {
            map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
        } else if (hasOrigin) {
            map.setView([myLat, myLng], 11);
        }
    }, [hospitals, loading, hasOrigin, myLat, myLng, user?._id]);

    return (
        <div className="chih-page chih-page-full">
            <div className="chih-map-wrap">
                <div ref={mapContainer} className="chih-tracking-map" />
                {loading && (
                    <div className="chih-map-loading">
                        <div className="chih-spinner" />
                        <span>Loading map...</span>
                    </div>
                )}
            </div>

            <div className="chih-map-sidebar">
                <div className="chih-panel">
                    <div className="chih-panel-header">
                        <h2>Network Hospitals</h2>
                        <span className="chih-panel-tag">{hospitals.length} on map</span>
                    </div>
                    {!hasOrigin && (
                        <p className="chih-muted" style={{ marginBottom: '0.75rem' }}>
                            Your hospital location is not set. Re-register or update your profile to enable routes.
                        </p>
                    )}
                    {hasOrigin && (
                        <p className="chih-muted" style={{ marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                            Routes are calculated from your hospital to the selected destination.
                        </p>
                    )}
                    <div className="chih-map-list">
                        {loading ? (
                            <p className="chih-muted">Loading hospitals...</p>
                        ) : hospitals.length === 0 ? (
                            <p className="chih-muted">No other hospitals on the network yet.</p>
                        ) : (
                            hospitals.map((h) => (
                                <button
                                    key={h._id}
                                    type="button"
                                    className={`chih-map-list-item ${selected?._id === h._id ? 'chih-map-list-item-active' : ''}`}
                                    onClick={() => drawRoute(h)}
                                    disabled={!hasOrigin}
                                >
                                    <span className="chih-map-list-name">{h.name}</span>
                                    <span className="chih-map-list-meta">{h.email}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {(routeInfo || routeLoading) && (
                    <div className="chih-panel chih-route-panel">
                        <div className="chih-panel-header">
                            <h2>Route to {routeInfo?.name || selected?.name}</h2>
                        </div>
                        {routeLoading ? (
                            <p className="chih-muted">Calculating route...</p>
                        ) : (
                            <>
                                <div className="chih-route-stats">
                                    <div><span>Distance</span><strong>{routeInfo.distanceKm} km</strong></div>
                                    <div><span>Est. Time</span><strong>{routeInfo.durationMin} min</strong></div>
                                </div>
                                <p className="chih-muted">Driving route from your hospital</p>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={clearRoute} style={{ marginTop: '0.75rem' }}>
                                    Clear Route
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MapPage;
