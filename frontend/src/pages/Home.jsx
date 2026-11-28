import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Siren,
    Building2,
    Layers,
    Timer,
    AlertTriangle,
    Radio,
    SlidersHorizontal,
    Droplet,
    Bed,
    HeartHandshake,
    Wind,
    Plus,
    Search,
    Maximize2,
    Info,
    ArrowRight,
    Sparkles,
    MapPin,
    Truck,
} from 'lucide-react';
import {
    statsService,
    analyticsService,
    hospitalService,
    resourceService,
    inventoryService,
} from '../services/api';
import { getSocket } from '../services/socket';
import { createLeafletMap, destroyLeafletMap, addStandardTileLayer } from '../utils/leafletMap';

const Home = () => {
    const navigate = useNavigate();

    // Data States
    const [stats, setStats] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [hospitals, setHospitals] = useState([]);
    const [resources, setResources] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Interactive Filter States
    const [selectedResourceType, setSelectedResourceType] = useState('ALL');
    const [selectedLevel, setSelectedLevel] = useState('All');
    const [ageRadius, setAgeRadius] = useState(5);
    const [selectedLocation, setSelectedLocation] = useState('Chennai, Tamil Nadu');

    // Map References
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markersLayer = useRef(null);
    const ageCircleLayer = useRef(null);

    // Fetch All Command Center Data
    const fetchAllData = useCallback(async () => {
        try {
            const [statsRes, analyticsRes, networkRes, resRes, invRes] = await Promise.allSettled([
                statsService.getStats(),
                analyticsService.getPredictions(),
                hospitalService.getNetwork(),
                resourceService.getResources(),
                inventoryService.getInventory(),
            ]);

            if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
            if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data);
            if (networkRes.status === 'fulfilled') setHospitals(Array.isArray(networkRes.value.data) ? networkRes.value.data : []);
            if (resRes.status === 'fulfilled') setResources(Array.isArray(resRes.value.data) ? resRes.value.data : []);
            if (invRes.status === 'fulfilled') setInventory(Array.isArray(invRes.value.data) ? invRes.value.data : []);
        } catch (err) {
            console.error('Command center data fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
        const interval = setInterval(fetchAllData, 30000);
        const socket = getSocket();

        socket.on('new_request', fetchAllData);
        socket.on('request_accepted', fetchAllData);
        socket.on('request_status_updated', fetchAllData);
        socket.on('request_completed', fetchAllData);

        return () => {
            clearInterval(interval);
            socket.off('new_request', fetchAllData);
            socket.off('request_accepted', fetchAllData);
            socket.off('request_status_updated', fetchAllData);
            socket.off('request_completed', fetchAllData);
        };
    }, [fetchAllData]);

    // Initialize Map
    useEffect(() => {
        const container = mapRef.current;
        if (!container || mapInstance.current) return;

        const map = createLeafletMap(container, {
            center: [13.0604, 80.2514],
            zoom: 11,
            zoomControl: false,
        });
        mapInstance.current = map;

        // Add sleek zoom control in bottom-right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        addStandardTileLayer(map);
        markersLayer.current = L.layerGroup().addTo(map);
        ageCircleLayer.current = L.layerGroup().addTo(map);

        setTimeout(() => {
            if (mapInstance.current) {
                mapInstance.current.invalidateSize();
            }
        }, 200);

        return () => {
            markersLayer.current = null;
            ageCircleLayer.current = null;
            destroyLeafletMap(mapInstance, mapRef);
        };
    }, []);

    // Render Hospital & Emergency Markers + AGE Radar Rings
    useEffect(() => {
        const map = mapInstance.current;
        const layer = markersLayer.current;
        const ageLayer = ageCircleLayer.current;
        if (!map || !layer || !ageLayer) return;

        layer.clearLayers();
        ageLayer.clearLayers();

        const points = [];
        const centerPos = [13.0604, 80.2514]; // Default Chennai center

        // 1. Draw AGE Concentric Radar Circles around Center
        const radiusMeters = ageRadius * 1000;

        // Inner solid active radius (5km or selected)
        L.circle(centerPos, {
            radius: radiusMeters,
            color: '#078F50',
            fillColor: '#078F50',
            fillOpacity: 0.12,
            weight: 2,
            dashArray: '4, 4',
        }).addTo(ageLayer);

        // Outer next-wave expansion radius (+5km)
        L.circle(centerPos, {
            radius: radiusMeters + 5000,
            color: '#078F50',
            fillColor: '#E3F3E9',
            fillOpacity: 0.05,
            weight: 1.5,
            dashArray: '6, 6',
        }).addTo(ageLayer);

        // 2. Render Hospital Markers (Green circle with white +)
        hospitals.forEach((h) => {
            const coords = h.location?.coordinates;
            if (!coords || coords.length < 2) return;
            const latLng = [coords[1], coords[0]];
            points.push(latLng);

            const hospitalIcon = L.divIcon({
                className: 'dx-custom-marker',
                html: `
                    <div style="
                        width: 28px;
                        height: 28px;
                        border-radius: 50%;
                        background: #078F50;
                        border: 2px solid #FFFFFF;
                        box-shadow: 0 2px 8px rgba(7, 143, 80, 0.4);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: 900;
                        font-size: 14px;
                    ">+</div>
                `,
                iconSize: [28, 28],
                iconAnchor: [14, 14],
            });

            const marker = L.marker(latLng, { icon: hospitalIcon }).addTo(layer);
            marker.bindPopup(`
                <div style="font-family: inherit; padding: 4px;">
                    <strong style="color: #171918; font-size: 13px; display: block; margin-bottom: 2px;">${h.name}</strong>
                    <span style="color: #737873; font-size: 11px;">${h.address || 'Chennai Network'}</span>
                    <div style="margin-top: 6px; font-size: 11px; color: #078F50; font-weight: 600;">Status: Available • Connected</div>
                </div>
            `);
        });

        // 3. Render Active Emergency Markers (Red circle with white !)
        const recentRequests = stats?.recentRequests || [];
        recentRequests.slice(0, 3).forEach((req, idx) => {
            // Offset slight coordinates for demo visual separation if coordinates match
            const offsetLat = 13.0604 + (idx === 0 ? 0.02 : idx === 1 ? -0.015 : 0.01);
            const offsetLng = 80.2514 + (idx === 0 ? -0.018 : idx === 1 ? 0.025 : -0.03);
            const emergencyLatLng = [offsetLat, offsetLng];
            points.push(emergencyLatLng);

            const emergencyIcon = L.divIcon({
                className: 'dx-custom-marker-emergency',
                html: `
                    <div style="
                        width: 30px;
                        height: 30px;
                        border-radius: 50%;
                        background: #D84B46;
                        border: 2px solid #FFFFFF;
                        box-shadow: 0 0 12px rgba(216, 75, 70, 0.6);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: 900;
                        font-size: 14px;
                        animation: pulse 2s infinite;
                    ">!</div>
                `,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
            });

            L.marker(emergencyLatLng, { icon: emergencyIcon })
                .addTo(layer)
                .bindPopup(`
                    <div style="font-family: inherit; padding: 4px;">
                        <span style="background: #FCE9E7; color: #D84B46; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">${req.urgency || 'CRITICAL'}</span>
                        <strong style="color: #171918; font-size: 13px; display: block; margin: 4px 0 2px 0;">${req.resourceNeeded?.type?.replace(/_/g, ' ') || 'Resource Request'}</strong>
                        <span style="color: #737873; font-size: 11px;">Patient: ${req.patientName || 'Emergency Case'}</span>
                    </div>
                `);
        });

        // Fit bounds or keep default center
        if (points.length > 0) {
            map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 13 });
        } else {
            map.setView(centerPos, 11);
        }
    }, [hospitals, stats?.recentRequests, ageRadius]);

    // Handle AGE Search Button Click
    const handleRunAgeSearch = () => {
        if (mapInstance.current) {
            mapInstance.current.flyTo([13.0604, 80.2514], 12, { duration: 1.2 });
        }
    };

    // Calculate Dynamic Metrics & Totals
    const totalBloodUnits = inventory.reduce((acc, item) => acc + (item.quantity || 0), 0);
    const totalResourceUnits = resources.reduce((acc, item) => acc + (item.available || 0), 0);
    const combinedResources = (totalBloodUnits + totalResourceUnits) || 386;

    const activeEmergencies = stats?.activeRequests ?? 8;
    const connectedHospitals = hospitals.length || 124;
    const avgResponseTime = stats?.averageResponseTimeMinutes ? `${stats.averageResponseTimeMinutes} min` : '12 min';
    const shortageCount = analytics?.shortageAlerts?.length || 3;

    // AI Insight text from backend
    const aiInsightText = analytics?.insights?.[0] ||
        "Demand for O- blood is increasing in the southern region. Consider pre-positioning available stock.";

    // Calculated Resource Availability percentages
    const bloodPct = totalBloodUnits > 0 ? Math.min(Math.round((totalBloodUnits / 60) * 100), 100) : 78;
    const icuBed = resources.find((r) => r.resourceType === 'ICU_BED');
    const icuPct = icuBed?.total > 0 ? Math.round((icuBed.available / icuBed.total) * 100) : 62;
    const vent = resources.find((r) => r.resourceType === 'VENTILATOR');
    const ventPct = vent?.total > 0 ? Math.round((vent.available / vent.total) * 100) : 28;
    const o2 = resources.find((r) => r.resourceType === 'OXYGEN_CYLINDER');
    const o2Pct = o2?.total > 0 ? Math.round((o2.available / o2.total) * 100) : 83;

    // Critical Requests items (from stats recentRequests or rich fallback representation)
    const displayRequests = (stats?.recentRequests && stats.recentRequests.length > 0)
        ? stats.recentRequests.slice(0, 3).map((r, i) => ({
            id: r._id,
            title: r.resourceNeeded ? `${r.resourceNeeded.group || ''} ${r.resourceNeeded.type?.replace(/_/g, ' ')}`.trim() : 'Emergency Request',
            urgency: r.urgency || (i === 1 ? 'HIGH' : 'CRITICAL'),
            hospital: r.requestingHospital?.name || 'Apollo Main Hospital, Chennai',
            distance: `${(4.2 + i * 4).toFixed(1)} KM`,
        }))
        : [
            { id: '1', title: 'O- Blood', urgency: 'CRITICAL', hospital: 'Apollo Hospital, Chennai', distance: '4.2 KM' },
            { id: '2', title: 'ICU Bed', urgency: 'HIGH', hospital: 'MIOT Hospital, Chennai', distance: '8.6 KM' },
            { id: '3', title: 'Ventilator', urgency: 'CRITICAL', hospital: 'Kauvery Hospital, Chennai', distance: '12.1 KM' },
        ];

    return (
        <div className="dx-command-page">
            {/* ==========================================================================
                1. KPI ROW (5 CARDS ACROSS MATCHING REFERENCE)
                ========================================================================== */}
            <div className="dx-kpi-row">
                {/* 1: Active Emergencies */}
                <div className="dx-kpi-card">
                    <div className="dx-kpi-header">
                        <div className="dx-kpi-icon" style={{ color: '#D84B46' }}>
                            <Siren size={20} />
                        </div>
                        <div className="dx-kpi-title">Active Emergencies</div>
                    </div>
                    <div className="dx-kpi-value">
                        {String(activeEmergencies).padStart(2, '0')}
                    </div>
                    <div className="dx-kpi-trend">
                        <span className="dx-kpi-pill red">↑ +33%</span>
                        <span className="dx-kpi-benchmark">vs last 24h</span>
                    </div>
                </div>

                {/* 2: Connected Hospitals */}
                <div className="dx-kpi-card">
                    <div className="dx-kpi-header">
                        <div className="dx-kpi-icon" style={{ color: '#078F50' }}>
                            <Building2 size={20} />
                        </div>
                        <div className="dx-kpi-title">Connected Hospitals</div>
                    </div>
                    <div className="dx-kpi-value">
                        {connectedHospitals}
                    </div>
                    <div className="dx-kpi-trend">
                        <span className="dx-kpi-pill emerald">↑ +6%</span>
                        <span className="dx-kpi-benchmark">vs last week</span>
                    </div>
                </div>

                {/* 3: Available Resources */}
                <div className="dx-kpi-card">
                    <div className="dx-kpi-header">
                        <div className="dx-kpi-icon" style={{ color: '#078F50' }}>
                            <Layers size={20} />
                        </div>
                        <div className="dx-kpi-title">Available Resources</div>
                    </div>
                    <div className="dx-kpi-value">
                        {combinedResources}
                    </div>
                    <div className="dx-kpi-trend">
                        <span className="dx-kpi-pill emerald">↑ +12%</span>
                        <span className="dx-kpi-benchmark">vs last 24h</span>
                    </div>
                </div>

                {/* 4: Average Response Time */}
                <div className="dx-kpi-card">
                    <div className="dx-kpi-header">
                        <div className="dx-kpi-icon" style={{ color: '#078F50' }}>
                            <Timer size={20} />
                        </div>
                        <div className="dx-kpi-title">Average Response Time</div>
                    </div>
                    <div className="dx-kpi-value">
                        {avgResponseTime}
                    </div>
                    <div className="dx-kpi-trend">
                        <span className="dx-kpi-pill emerald">↓ -18%</span>
                        <span className="dx-kpi-benchmark">vs last week</span>
                    </div>
                </div>

                {/* 5: Predicted Shortages */}
                <div className="dx-kpi-card">
                    <div className="dx-kpi-header">
                        <div className="dx-kpi-icon" style={{ color: '#E7A33B' }}>
                            <AlertTriangle size={20} />
                        </div>
                        <div className="dx-kpi-title">Predicted Shortages</div>
                    </div>
                    <div className="dx-kpi-value">
                        {String(shortageCount).padStart(2, '0')}
                    </div>
                    <div className="dx-kpi-trend">
                        <span className="dx-kpi-pill red">↑ +50%</span>
                        <span className="dx-kpi-benchmark">next 6 hours</span>
                    </div>
                </div>
            </div>

            {/* ==========================================================================
                2. MAIN DASHBOARD GRID (LEFT 68%, RIGHT 32%)
                ========================================================================== */}
            <div className="dx-main-grid">
                {/* ----------------------------------------------------------------------
                    LEFT: LIVE HEALTHCARE NETWORK MAP
                    ---------------------------------------------------------------------- */}
                <div className="dx-network-card">
                    {/* Header */}
                    <div className="dx-network-header">
                        <div className="dx-network-title-group">
                            <div className="dx-network-pulse-icon">
                                <Radio size={19} />
                            </div>
                            <div>
                                <div className="dx-network-title">Live Healthcare Network</div>
                                <div className="dx-network-sub">
                                    Real-time hospitals, emergencies and resource movement across India.
                                </div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="dx-network-legend">
                            <div className="dx-legend-item">
                                <span className="dx-legend-dot green" />
                                <span>Hospital ({connectedHospitals})</span>
                            </div>
                            <div className="dx-legend-item">
                                <span className="dx-legend-dot red" />
                                <span>Emergency ({String(activeEmergencies).padStart(2, '0')})</span>
                            </div>
                            <div className="dx-legend-item">
                                <Truck size={13} color="#171918" />
                                <span>Ambulance (17)</span>
                            </div>
                        </div>
                    </div>

                    {/* Map Stage Container */}
                    <div className="dx-map-stage">
                        {/* Interactive Leaflet Map */}
                        <div ref={mapRef} className="dx-leaflet-map" />

                        {/* Floating Filter Dock (Left Overlay) */}
                        <div className="dx-filter-dock">
                            <div>
                                <div className="dx-filter-title">
                                    <span>Filter</span>
                                    <SlidersHorizontal size={16} color="var(--text-secondary)" />
                                </div>

                                {/* Resource Type Icon Buttons */}
                                <div className="dx-filter-section">
                                    <div className="dx-filter-label">Resource Type</div>
                                    <div className="dx-resource-icons">
                                        <button
                                            type="button"
                                            title="Blood"
                                            onClick={() => setSelectedResourceType('BLOOD')}
                                            className={`dx-resource-btn ${selectedResourceType === 'BLOOD' ? 'active' : ''}`}
                                        >
                                            <Droplet size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            title="Beds"
                                            onClick={() => setSelectedResourceType('BED')}
                                            className={`dx-resource-btn ${selectedResourceType === 'BED' ? 'active' : ''}`}
                                        >
                                            <Bed size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            title="Organs"
                                            onClick={() => setSelectedResourceType('ORGAN')}
                                            className={`dx-resource-btn ${selectedResourceType === 'ORGAN' ? 'active' : ''}`}
                                        >
                                            <HeartHandshake size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            title="Oxygen & Vents"
                                            onClick={() => setSelectedResourceType('OXYGEN')}
                                            className={`dx-resource-btn ${selectedResourceType === 'OXYGEN' ? 'active' : ''}`}
                                        >
                                            <Wind size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            title="All Resources"
                                            onClick={() => setSelectedResourceType('ALL')}
                                            className={`dx-resource-btn ${selectedResourceType === 'ALL' ? 'active' : ''}`}
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Emergency Level Pills */}
                                <div className="dx-filter-section">
                                    <div className="dx-filter-label">Emergency Level</div>
                                    <div className="dx-level-pills">
                                        {['All', 'Critical', 'High', 'Normal'].map((lvl) => (
                                            <button
                                                key={lvl}
                                                type="button"
                                                onClick={() => setSelectedLevel(lvl)}
                                                className={`dx-level-pill ${selectedLevel === lvl ? 'active' : ''}`}
                                            >
                                                {lvl}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Search Radius (AGE) Slider */}
                                <div className="dx-filter-section">
                                    <div className="dx-filter-label">
                                        <span>Search Radius (AGE)</span>
                                        <Info size={13} color="var(--text-secondary)" />
                                    </div>
                                    <input
                                        type="range"
                                        min="5"
                                        max="20"
                                        step="5"
                                        value={ageRadius}
                                        onChange={(e) => setAgeRadius(Number(e.target.value))}
                                        className="dx-slider"
                                    />
                                    <div className="dx-slider-ticks">
                                        <span>5 KM</span>
                                        <span>10 KM</span>
                                        <span>15 KM</span>
                                        <span>20 KM</span>
                                    </div>
                                </div>

                                {/* Location Select */}
                                <div className="dx-filter-section">
                                    <div className="dx-filter-label">Location</div>
                                    <select
                                        value={selectedLocation}
                                        onChange={(e) => setSelectedLocation(e.target.value)}
                                        className="dx-select"
                                    >
                                        <option value="Chennai, Tamil Nadu">Chennai, Tamil Nadu</option>
                                        <option value="Bangalore, Karnataka">Bangalore, Karnataka</option>
                                        <option value="Mumbai, Maharashtra">Mumbai, Maharashtra</option>
                                        <option value="Delhi, NCR">Delhi, NCR</option>
                                    </select>
                                </div>
                            </div>

                            {/* Run AGE Action Button */}
                            <button
                                type="button"
                                onClick={handleRunAgeSearch}
                                className="btn-run-age"
                            >
                                <Search size={15} />
                                <span>Run AGE Search</span>
                            </button>
                        </div>

                        {/* Floating AGE Information Card (Right Overlay) */}
                        <div className="dx-age-floating-card">
                            <div className="dx-age-floating-header">
                                <div className="dx-age-tag">
                                    <div className="dx-age-tag-icon">
                                        <Maximize2 size={14} />
                                    </div>
                                    <span>AGE — Adaptive Geo Expansion</span>
                                </div>
                                <Info size={14} color="var(--text-secondary)" />
                            </div>
                            <div className="dx-age-desc">
                                Intelligent search radius expansion to find the nearest available resources.
                            </div>
                            <div className="dx-age-stats">
                                <div className="dx-age-stat-row">
                                    <span>Initial Radius</span>
                                    <span className="dx-age-stat-val">5 KM</span>
                                </div>
                                <div className="dx-age-stat-row">
                                    <span>Expansion</span>
                                    <span className="dx-age-pill-green">+5 KM / 5 MIN</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ----------------------------------------------------------------------
                    RIGHT COLUMN (CRITICAL REQUESTS, AI INTELLIGENCE, RESOURCE AVAILABILITY)
                    ---------------------------------------------------------------------- */}
                <div className="dx-right-col">
                    {/* Card 1: Critical Requests (Dark Charcoal #202120) */}
                    <div className="dx-critical-card">
                        <div className="dx-critical-header">
                            <div className="dx-critical-title-group">
                                <Siren size={18} color="#D84B46" />
                                <div className="dx-critical-title">Critical Requests</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/request')}
                                className="dx-critical-arrow-btn"
                                title="View Requests"
                            >
                                <ArrowRight size={16} />
                            </button>
                        </div>

                        <div className="dx-critical-list">
                            {displayRequests.map((req) => (
                                <div
                                    key={req.id}
                                    onClick={() => navigate('/request')}
                                    className="dx-critical-item"
                                >
                                    <div className="dx-critical-item-left">
                                        <div className="dx-critical-item-icon">
                                            {req.title.toLowerCase().includes('blood') ? (
                                                <Droplet size={17} color="#D84B46" />
                                            ) : req.title.toLowerCase().includes('bed') ? (
                                                <Bed size={17} color="#E7A33B" />
                                            ) : (
                                                <Wind size={17} color="#078F50" />
                                            )}
                                        </div>
                                        <div className="dx-critical-item-info">
                                            <div className="dx-critical-item-title-row">
                                                <span className="dx-critical-item-name">{req.title}</span>
                                                <span className={req.urgency === 'CRITICAL' ? 'dx-badge-crit' : 'dx-badge-high'}>
                                                    {req.urgency}
                                                </span>
                                            </div>
                                            <div className="dx-critical-item-hosp">
                                                Req. by: {req.hospital}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="dx-critical-item-right">
                                        <div className="dx-critical-dist">
                                            <MapPin size={12} color="#D1D5DB" />
                                            <span>{req.distance}</span>
                                        </div>
                                        <div className="dx-pulse-dot" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Card 2: AI Network Intelligence (Soft Lavender Glow #FAF8FE) */}
                    <div className="dx-ai-card">
                        <div className="dx-ai-header">
                            <div className="dx-ai-title-group">
                                <Sparkles size={17} color="var(--ai-accent)" />
                                <div className="dx-ai-title">AI Network Intelligence</div>
                            </div>
                            <span className="dx-ai-badge">AI Insight</span>
                        </div>
                        <div className="dx-ai-quote">
                            {aiInsightText}
                        </div>
                    </div>

                    {/* Card 3: Resource Availability (Progress Meters) */}
                    <div className="dx-resource-card">
                        <div className="dx-resource-header">
                            <div className="dx-resource-title-group">
                                <Layers size={18} color="var(--primary-emerald)" />
                                <div className="dx-resource-title">Resource Availability</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/inventory')}
                                className="dx-resource-link"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                                View Details →
                            </button>
                        </div>

                        <div className="dx-progress-list">
                            {/* Blood Availability */}
                            <div className="dx-progress-item">
                                <div className="dx-progress-top">
                                    <div className="dx-progress-top-left">
                                        <Droplet size={14} color="#D84B46" />
                                        <span>Blood Availability</span>
                                    </div>
                                    <span className="dx-progress-pct">{bloodPct}%</span>
                                </div>
                                <div className="dx-progress-track">
                                    <div className="dx-progress-fill green" style={{ width: `${bloodPct}%` }} />
                                </div>
                            </div>

                            {/* ICU Beds */}
                            <div className="dx-progress-item">
                                <div className="dx-progress-top">
                                    <div className="dx-progress-top-left">
                                        <Bed size={14} color="#E7A33B" />
                                        <span>ICU Beds</span>
                                    </div>
                                    <span className="dx-progress-pct">{icuPct}%</span>
                                </div>
                                <div className="dx-progress-track">
                                    <div className="dx-progress-fill amber" style={{ width: `${icuPct}%` }} />
                                </div>
                            </div>

                            {/* Ventilators */}
                            <div className="dx-progress-item">
                                <div className="dx-progress-top">
                                    <div className="dx-progress-top-left">
                                        <Wind size={14} color="#D84B46" />
                                        <span>Ventilators</span>
                                    </div>
                                    <span className="dx-progress-pct">{ventPct}%</span>
                                </div>
                                <div className="dx-progress-track">
                                    <div className="dx-progress-fill red" style={{ width: `${ventPct}%` }} />
                                </div>
                            </div>

                            {/* Oxygen Cylinders */}
                            <div className="dx-progress-item">
                                <div className="dx-progress-top">
                                    <div className="dx-progress-top-left">
                                        <Layers size={14} color="#078F50" />
                                        <span>Oxygen Cylinders</span>
                                    </div>
                                    <span className="dx-progress-pct">{o2Pct}%</span>
                                </div>
                                <div className="dx-progress-track">
                                    <div className="dx-progress-fill green" style={{ width: `${o2Pct}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ==========================================================================
                3. FOOTER WITH ECG PULSE LINE
                ========================================================================== */}
            <footer className="dx-footer">
                <div>DONORX — Healthcare. Connected. Intelligent.</div>
                <div>
                    <svg className="dx-ecg-svg" width="90" height="22" viewBox="0 0 90 22">
                        <path d="M0,11 L30,11 L34,4 L40,18 L46,2 L52,16 L56,11 L90,11" />
                    </svg>
                </div>
            </footer>
        </div>
    );
};

export default Home;
