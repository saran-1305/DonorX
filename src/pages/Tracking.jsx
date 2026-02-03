import React, { useEffect, useRef, useState } from 'react';
import { useDonor } from '../context/DonorContext';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
// Import separate from map init
import L from 'leaflet';

const Tracking = () => {
    const { requests, addAuditLog, showToast } = useDonor();
    const navigate = useNavigate();
    const mapContainer = useRef(null);
    const mapInstance = useRef(null);
    const vehicleMarker = useRef(null);
    const animationRef = useRef(null);
    const [activeRequest, setActiveRequest] = useState(null);

    // Initial Data
    const CHENNAI_COORDS = [13.0418, 80.2341];
    const HOSPITAL_COORDS = [13.1075, 80.2878]; // Stanely Medical

    useEffect(() => {
        if (requests.length > 0) {
            setActiveRequest(requests[0]);
        }
    }, [requests]);

    useEffect(() => {
        if (!mapContainer.current) return;
        if (mapInstance.current) return; // Initialize once

        const map = L.map(mapContainer.current).setView([13.07, 80.26], 12);
        mapInstance.current = map;

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO'
        }).addTo(map);

        // User Marker
        const userIcon = L.divIcon({
            className: 'custom-div-icon',
            html: "<div style='background-color:#D32F2F; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3);'></div>",
            iconSize: [16, 16]
        });
        L.marker(CHENNAI_COORDS, { icon: userIcon }).addTo(map).bindPopup("Patient Location");

        // Hospital Marker
        const hospitalIcon = L.divIcon({
            className: 'custom-div-icon',
            html: "<div style='background-color:#00796B; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3);'></div>",
            iconSize: [16, 16]
        });
        L.marker(HOSPITAL_COORDS, { icon: hospitalIcon }).addTo(map).bindPopup("Stanely Medical (Source)");

        // Route Line
        const latlngs = [
            CHENNAI_COORDS,
            [13.06, 80.25],
            [13.08, 80.27],
            HOSPITAL_COORDS
        ];
        const routeLine = L.polyline(latlngs, { color: '#3B82F6', weight: 4, opacity: 0.7, dashArray: '10, 10' }).addTo(map);
        map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

        // Vehicle Marker
        const vehicleIcon = L.divIcon({
            className: 'custom-div-icon',
            html: "<div style='font-size: 24px;'>🚑</div>",
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        vehicleMarker.current = L.marker(HOSPITAL_COORDS, { icon: vehicleIcon }).addTo(map);

        // Start Animation
        startAnimation();

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    const startAnimation = () => {
        let progress = 0;
        const animate = () => {
            if (progress >= 1) return;
            progress += 0.002;

            const lat = HOSPITAL_COORDS[0] + (CHENNAI_COORDS[0] - HOSPITAL_COORDS[0]) * progress;
            const lng = HOSPITAL_COORDS[1] + (CHENNAI_COORDS[1] - HOSPITAL_COORDS[1]) * progress;

            if (vehicleMarker.current) {
                vehicleMarker.current.setLatLng([lat, lng]);
            }
            animationRef.current = requestAnimationFrame(animate);
        };
        setTimeout(animate, 1000);
    };

    const getResourceDisplay = () => {
        if (!activeRequest) return "Critical Resources";
        if (activeRequest.resources && activeRequest.resources.length > 0) {
            return activeRequest.resources.map(r => r.type === 'Blood' ? `Blood (${r.group})` : r.organ).join(', ');
        }
        return activeRequest.organType !== 'None' ? activeRequest.organType : `Blood (${activeRequest.bloodGroup})`;
    };

    const completeRequest = () => {
        // Direct action without confirm to fix interaction issues
        addAuditLog('Delivery Completed', `Resources delivered successfully to ${activeRequest?.patientName}`);
        showToast("Delivery Confirmed. Protocol Solved.", "success");
        setTimeout(() => navigate('/dashboard'), 500);
    };

    const denyRequest = () => {
        addAuditLog('Request Cancelled', `User cancelled request for ${activeRequest?.patientName}`);
        navigate('/dashboard');
    };

    return (
        <div className="container" style={{ padding: '1rem', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div
                ref={mapContainer}
                className="map-container"
                style={{ height: '60vh', width: '100%', borderRadius: '1rem', zIndex: 1 }}
            ></div>

            <div className="overlay-card animate-fade-in"
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: 'absolute', bottom: '2rem', left: '2rem', right: '2rem',
                    background: 'white', padding: '1.5rem', borderRadius: '1rem',
                    boxShadow: 'var(--shadow-lg)', zIndex: 9999, pointerEvents: 'auto', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center', maxWidth: '800px', margin: '0 auto'
                }}>
                <div className="flex items-center gap-md">
                    <div style={{ background: '#ECFDF5', padding: '1rem', borderRadius: '50%', color: '#059669' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path
                                d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                        </svg>
                    </div>
                    <div>
                        <h3 style={{ marginBottom: '0.25rem' }}>Match Confirmed: Stanely Medical</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Transporting <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{getResourceDisplay()}</span> • ETA: <span style={{ color: 'var(--primary-color)', fontWeight: 700 }}>8 mins</span>
                        </p>
                    </div>
                </div>

                <div className="flex gap-sm">
                    <button onClick={denyRequest} className="btn"
                        style={{ border: '1px solid var(--border-color)', color: 'var(--danger)' }}>Deny / Cancel</button>
                    <button onClick={completeRequest} className="btn btn-primary">Mark Delivered</button>
                </div>
            </div>
        </div>
    );
};

export default Tracking;
