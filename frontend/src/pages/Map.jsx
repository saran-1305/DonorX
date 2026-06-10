import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDonor } from '../context/DonorContext';
import { hospitalService, requestService } from '../services/api';
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

const coordsFromHospital = (hospital) => {
    const c = hospital?.location?.coordinates;
    if (!c || c.length < 2) return null;
    return { lat: c[1], lng: c[0], name: hospital.name || 'Hospital' };
};

const MapPage = () => {
    const { user } = useDonor();
    const [searchParams, setSearchParams] = useSearchParams();
    const requestId = searchParams.get('request');

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
    const [acceptedRequest, setAcceptedRequest] = useState(null);
    const [mapInitialized, setMapInitialized] = useState(false);

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

    const drawRouteOnMap = useCallback(async (fromLat, fromLng, toLat, toLng, label) => {
        const map = mapInstance.current;
        if (!map) return;

        setRouteLoading(true);
        setRouteInfo(null);

        if (routeLayer.current) {
            map.removeLayer(routeLayer.current);
            routeLayer.current = null;
        }

        const route = await fetchRoute(fromLat, fromLng, toLat, toLng);

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

            const bounds = routeLayer.current.getBounds().extend([fromLat, fromLng]).extend([toLat, toLng]);
            mapInstance.current.fitBounds(bounds, { padding: [60, 60] });

            setRouteInfo({
                name: label,
                distanceKm: route.distanceKm,
                durationMin: route.durationMin,
            });
        } else {
            const fallback = L.polyline(
                [[fromLat, fromLng], [toLat, toLng]],
                { color: '#2563EB', weight: 4, dashArray: '8,8' },
            ).addTo(mapInstance.current);
            routeLayer.current = fallback;
            mapInstance.current.fitBounds(fallback.getBounds(), { padding: [60, 60] });
            setRouteInfo({ name: label, distanceKm: '—', durationMin: '—' });
        }

        setRouteLoading(false);
    }, []);

    const drawRoute = useCallback(async (hospital) => {
        if (!hasOrigin) return;
        const coords = hospital.location?.coordinates;
        if (!coords || coords.length < 2) return;

        setSelected(hospital);
        setAcceptedRequest(null);
        setSearchParams({});

        await drawRouteOnMap(
            myLat,
            myLng,
            coords[1],
            coords[0],
            hospital.name,
        );
    }, [hasOrigin, myLat, myLng, drawRouteOnMap, setSearchParams]);

    drawRouteRef.current = drawRoute;

    const showAcceptedRequestRoute = useCallback(async (req) => {
        const supplier = coordsFromHospital(req.assignedHospital);
        const requester = coordsFromHospital(req.requestingHospital);
        if (!supplier || !requester) return;

        const map = mapInstance.current;
        const layer = markersLayer.current;
        if (!map || !layer) return;

        layer.clearLayers();

        const supplierIcon = L.divIcon({
            className: 'custom-div-icon',
            html: "<div class='map-marker map-marker-peer'></div>",
            iconSize: [16, 16],
            iconAnchor: [8, 8],
        });
        const requesterIcon = L.divIcon({
            className: 'custom-div-icon',
            html: "<div class='map-marker map-marker-requester'></div>",
            iconSize: [18, 18],
            iconAnchor: [9, 9],
        });

        L.marker([supplier.lat, supplier.lng], { icon: supplierIcon })
            .addTo(layer)
            .bindPopup(`<strong>${supplier.name}</strong><br>Supplying hospital`);

        L.marker([requester.lat, requester.lng], { icon: requesterIcon })
            .addTo(layer)
            .bindPopup(`<strong>${requester.name}</strong><br>Requesting hospital`);

        setAcceptedRequest(req);
        setSelected(null);

        await drawRouteOnMap(
            supplier.lat,
            supplier.lng,
            requester.lat,
            requester.lng,
            `${supplier.name} → ${requester.name}`,
        );
    }, [drawRouteOnMap]);

    const clearRoute = () => {
        if (routeLayer.current && mapInstance.current) {
            mapInstance.current.removeLayer(routeLayer.current);
            routeLayer.current = null;
        }
        setSelected(null);
        setRouteInfo(null);
        setAcceptedRequest(null);
        setSearchParams({});
        loadHospitals();
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
        setMapInitialized(true);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
        }).addTo(map);

        markersLayer.current = L.layerGroup().addTo(map);

        return () => {
            routeLayer.current = null;
            markersLayer.current = null;
            mapReady.current = false;
            setMapInitialized(false);
            destroyLeafletMap(mapInstance, mapContainer);
        };
    }, [hasOrigin, myLat, myLng]);

    useEffect(() => {
        if (requestId) return;

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
        if (points.length > 0 && !routeInfo) {
            map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
        } else if (hasOrigin && !routeInfo) {
            map.setView([myLat, myLng], 11);
        }
    }, [hospitals, loading, hasOrigin, myLat, myLng, user?._id, requestId, routeInfo]);

    useEffect(() => {
        if (!requestId || !mapInitialized) return;

        let cancelled = false;
        requestService.getById(requestId)
            .then(({ data }) => {
                if (cancelled || !data) return;
                if (data.status === 'Pending' && data.assignedHospital && data.requestingHospital) {
                    showAcceptedRequestRoute(data);
                }
            })
            .catch(console.error);

        return () => { cancelled = true; };
    }, [requestId, mapInitialized, showAcceptedRequestRoute]);

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
                {acceptedRequest ? (
                    <div className="chih-panel">
                        <div className="chih-panel-header">
                            <h2>Accepted Request Route</h2>
                            <span className="chih-panel-tag chih-status-ok">Pending</span>
                        </div>
                        <p className="chih-muted" style={{ marginBottom: '0.75rem' }}>
                            Optimal driving route between the supplying and requesting hospitals.
                        </p>
                        <div className="net-info-list" style={{ marginBottom: '1rem' }}>
                            <li>
                                <div>
                                    <label>From (Supplier)</label>
                                    <span>{acceptedRequest.assignedHospital?.name}</span>
                                </div>
                            </li>
                            <li>
                                <div>
                                    <label>To (Requester)</label>
                                    <span>{acceptedRequest.requestingHospital?.name}</span>
                                </div>
                            </li>
                            <li>
                                <div>
                                    <label>Patient</label>
                                    <span>{acceptedRequest.patientName}</span>
                                </div>
                            </li>
                        </div>
                    </div>
                ) : (
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
                )}

                {(routeInfo || routeLoading) && (
                    <div className="chih-panel chih-route-panel">
                        <div className="chih-panel-header">
                            <h2>{acceptedRequest ? 'Delivery Route' : `Route to ${routeInfo?.name || selected?.name}`}</h2>
                        </div>
                        {routeLoading ? (
                            <p className="chih-muted">Calculating optimal route...</p>
                        ) : (
                            <>
                                <div className="chih-route-stats">
                                    <div><span>Distance</span><strong>{routeInfo.distanceKm} km</strong></div>
                                    <div><span>Est. Time</span><strong>{routeInfo.durationMin} min</strong></div>
                                </div>
                                <p className="chih-muted">
                                    {acceptedRequest
                                        ? 'Driving route from supplying hospital to requesting hospital'
                                        : 'Driving route from your hospital'}
                                </p>
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
