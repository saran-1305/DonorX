import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDonor } from '../context/DonorContext';
import { requestService } from '../services/api';
import { getSocket, joinHospitalRoom } from '../services/socket';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const RESOURCE_LABELS = {
    ICU_BED: 'ICU Bed',
    VENTILATOR: 'Ventilator',
    OXYGEN_CYLINDER: 'Oxygen Cylinder',
    AMBULANCE: 'Ambulance',
};

const Tracking = () => {
    const { addAuditLog, showToast, user } = useDonor();
    const navigate = useNavigate();
    const mapContainer = useRef(null);
    const mapInstance = useRef(null);
    const vehicleMarker = useRef(null);
    const routeLayer = useRef(null);
    const routeLine = useRef(null);
    const [routeInfo, setRouteInfo] = useState(null);
    const [activeRequest, setActiveRequest] = useState(null);
    const [transport, setTransport] = useState(null);

    const fetchActive = useCallback(async () => {
        try {
            const { data } = await requestService.getMyRequests();
            const active = data.find((r) => r.status === 'Pending') || data.find((r) => r.status === 'Generated');
            if (active) {
                setActiveRequest(active);
                try {
                    const { data: tracking } = await requestService.getTransport(active._id);
                    setTransport(tracking);
                } catch {
                    // transport may not exist yet
                }
            }
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
        fetchActive();
        if (user?._id) joinHospitalRoom(user._id);
    }, [fetchActive, user]);

    useEffect(() => {
        const socket = getSocket();
        const onTransport = (payload) => {
            const reqId = String(payload.requestId || '');
            if (activeRequest && reqId === String(activeRequest._id)) {
                setTransport(payload);
            } else if (!activeRequest && reqId) {
                fetchActive();
            }
        };
        const onAccepted = () => fetchActive();

        socket.on('transport_update', onTransport);
        socket.on('request_accepted', onAccepted);
        return () => {
            socket.off('transport_update', onTransport);
            socket.off('request_accepted', onAccepted);
        };
    }, [activeRequest, fetchActive]);

    useEffect(() => {
        if (!mapContainer.current) return;

        const origin = transport
            ? [transport.origin.lat, transport.origin.lng]
            : activeRequest?.assignedHospital?.location?.coordinates
                ? [activeRequest.assignedHospital.location.coordinates[1], activeRequest.assignedHospital.location.coordinates[0]]
                : [13.1075, 80.2878];

        const dest = transport
            ? [transport.destination.lat, transport.destination.lng]
            : activeRequest?.location?.coordinates
                ? [activeRequest.location.coordinates[1], activeRequest.location.coordinates[0]]
                : [13.0418, 80.2341];

        const current = transport?.currentPosition
            ? [transport.currentPosition.lat, transport.currentPosition.lng]
            : origin;

        if (mapInstance.current) {
            mapInstance.current.remove();
            mapInstance.current = null;
        }

        const centerLat = (origin[0] + dest[0]) / 2;
        const centerLng = (origin[1] + dest[1]) / 2;
        const map = L.map(mapContainer.current).setView([centerLat, centerLng], 12);
        mapInstance.current = map;

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
        }).addTo(map);

        const hospitalIcon = L.divIcon({
            className: 'custom-div-icon',
            html: "<div style='background-color:#00796B;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 4px 6px rgba(0,0,0,0.3);'></div>",
            iconSize: [16, 16],
        });
        L.marker(origin, { icon: hospitalIcon }).addTo(map).bindPopup(transport?.origin?.label || 'Source Hospital');

        const destIcon = L.divIcon({
            className: 'custom-div-icon',
            html: "<div style='background-color:#D32F2F;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 4px 6px rgba(0,0,0,0.3);'></div>",
            iconSize: [16, 16],
        });
        L.marker(dest, { icon: destIcon }).addTo(map).bindPopup('Patient / Destination');

        routeLine.current = L.polyline([origin, dest], {
            color: '#94A3B8', weight: 3, opacity: 0.5, dashArray: '8, 8',
        }).addTo(map);
        routeLayer.current = routeLine.current;

        const fetchOptimalRoute = async () => {
            try {
                const url = `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.code === 'Ok' && data.routes?.[0]) {
                    const route = data.routes[0];
                    const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
                    if (routeLayer.current) map.removeLayer(routeLayer.current);
                    routeLayer.current = L.polyline(coords, {
                        color: '#2563EB', weight: 5, opacity: 0.85,
                    }).addTo(map);
                    setRouteInfo({
                        distanceKm: (route.distance / 1000).toFixed(2),
                        durationMin: Math.round(route.duration / 60),
                    });
                    map.fitBounds(routeLayer.current.getBounds(), { padding: [50, 50] });
                }
            } catch {
                // keep straight line fallback
            }
        };
        fetchOptimalRoute();

        const vehicleIcon = L.divIcon({
            className: 'custom-div-icon',
            html: "<div style='background-color:#2563EB;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 4px 8px rgba(37,99,235,0.5);animation:pulse 1.5s infinite;'></div>",
            iconSize: [20, 20],
        });
        vehicleMarker.current = L.marker(current, { icon: vehicleIcon }).addTo(map)
            .bindPopup(`In Transit • ${transport?.progress || 0}%`).openPopup();

        map.fitBounds(L.latLngBounds([origin, dest, current]), { padding: [50, 50] });

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [transport, activeRequest]);

    useEffect(() => {
        if (vehicleMarker.current && transport?.currentPosition) {
            const pos = [transport.currentPosition.lat, transport.currentPosition.lng];
            vehicleMarker.current.setLatLng(pos);
            vehicleMarker.current.setPopupContent(`In Transit • ${transport.progress}% • ETA ${transport.etaMinutes} min`);
        }
    }, [transport]);

    const getResourceDisplay = () => {
        if (transport?.resourceLabel) return transport.resourceLabel;
        if (!activeRequest?.resourceNeeded) return 'Critical Resources';
        const { type, group, quantity } = activeRequest.resourceNeeded;
        if (type === 'BLOOD') return `${quantity} Units of ${group} Blood`;
        if (type === 'ORGAN') return `${quantity} x ${group}`;
        return `${quantity} x ${RESOURCE_LABELS[type] || type.replace(/_/g, ' ')}`;
    };

    const completeRequest = async () => {
        if (!activeRequest) return;
        try {
            await requestService.updateStatus(activeRequest._id, 'Completed');
            addAuditLog('Delivery Completed', `Resources delivered to ${activeRequest.patientName}`);
            showToast('Delivery confirmed.', 'success');
            setTimeout(() => navigate('/home'), 500);
        } catch (e) {
            showToast('Failed to update status.', 'error');
        }
    };

    const cancelRequest = async () => {
        if (!activeRequest) { navigate('/home'); return; }
        try {
            await requestService.updateStatus(activeRequest._id, 'Ended');
        } catch (e) {
            console.error(e);
        } finally {
            navigate('/home');
        }
    };

    const statusLabel = transport?.status?.replace(/_/g, ' ') || (activeRequest?.status === 'Pending' ? 'Awaiting Dispatch' : 'Searching');

    return (
        <div className="chih-page chih-page-full">
            <div ref={mapContainer} className="chih-tracking-map" />

            <div className="chih-tracking-overlay animate-fade-in">
                <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                    <div className="flex items-center gap-md">
                        <div style={{ background: '#EFF6FF', padding: '1rem', borderRadius: '50%', color: '#2563EB' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
                                <path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
                                <circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" />
                            </svg>
                        </div>
                        <div>
                            <h3 style={{ marginBottom: '0.25rem' }}>
                                Live Tracking: {activeRequest?.assignedHospital?.name || 'Awaiting Match'}
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                                {getResourceDisplay()}
                                {transport && (
                                    <> • {routeInfo?.distanceKm || transport.distanceKm} km • ETA {routeInfo?.durationMin || transport.etaMinutes} min • {transport.progress}% complete</>
                                )}
                            </p>
                            <div style={{ marginTop: '0.5rem' }}>
                                <span className="badge badge-high">{statusLabel}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-sm">
                        <button onClick={cancelRequest} className="btn" style={{ border: '1px solid var(--border-color)', color: 'var(--danger)' }}>
                            Cancel
                        </button>
                        {activeRequest?.status === 'Pending' && (
                            <button onClick={completeRequest} className="btn btn-primary">Mark Delivered</button>
                        )}
                    </div>
                </div>
                {transport && (
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ background: '#E5E7EB', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${transport.progress}%`, height: '100%',
                                background: 'linear-gradient(90deg, #2563EB, #059669)',
                                transition: 'width 0.5s ease',
                            }} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Tracking;
