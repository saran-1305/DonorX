import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { statsService, analyticsService, hospitalService } from '../services/api';
import { getSocket } from '../services/socket';

const URGENCY_COLORS = { Critical: '#DC2626', High: '#F97316', Medium: '#F59E0B', Low: '#10B981' };
const RESOURCE_LABELS = { ICU_BED: 'ICU Bed', VENTILATOR: 'Ventilator', OXYGEN_CYLINDER: 'Oxygen', AMBULANCE: 'Ambulance' };

const Home = () => {
    const [stats, setStats] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [hospitals, setHospitals] = useState([]);
    const mapRef = useRef(null);
    const mapInstance = useRef(null);

    const fetchAll = useCallback(async () => {
        try {
            const [statsRes, analyticsRes, networkRes] = await Promise.all([
                statsService.getStats(),
                analyticsService.getPredictions(),
                hospitalService.getNetwork(),
            ]);
            setStats(statsRes.data);
            setAnalytics(analyticsRes.data);
            setHospitals(Array.isArray(networkRes.data) ? networkRes.data : []);
        } catch (e) {
            console.error('Dashboard fetch error:', e);
        }
    }, []);

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 45000);
        const socket = getSocket();
        socket.on('new_request', fetchAll);
        socket.on('request_accepted', fetchAll);
        return () => {
            clearInterval(interval);
            socket.off('new_request', fetchAll);
            socket.off('request_accepted', fetchAll);
        };
    }, [fetchAll]);

    useEffect(() => {
        if (!mapRef.current || hospitals.length === 0) return;
        if (mapInstance.current) mapInstance.current.remove();
        const map = L.map(mapRef.current).setView([13.0827, 80.2707], 11);
        mapInstance.current = map;
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);
        hospitals.forEach((h) => {
            const coords = h.location?.coordinates;
            if (!coords?.length) return;
            L.circleMarker([coords[1], coords[0]], { radius: 7, color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.8 }).addTo(map).bindPopup(h.name);
        });
        return () => { if (mapInstance.current) mapInstance.current.remove(); };
    }, [hospitals]);

    const urgencyData = stats?.requestsByUrgency
        ? Object.entries(stats.requestsByUrgency).map(([name, value]) => ({ name, value }))
        : [];
    const trendData = analytics?.dailyTrend || [];
    const shortageCount = analytics?.shortageAlerts?.length || 0;

    const statCards = [
        { label: 'Requests Today', value: stats?.totalRequestsToday ?? 0, color: '#3B82F6' },
        { label: 'Active Emergencies', value: stats?.activeRequests ?? 0, color: '#EF4444' },
        { label: 'Avg Response', value: `${stats?.averageResponseTimeMinutes ?? 0}m`, color: '#10B981' },
        { label: '7-Day Forecast', value: analytics?.summary?.forecastNext7Days ?? '—', color: '#6366F1' },
        { label: 'Shortage Alerts', value: shortageCount, color: shortageCount ? '#EF4444' : '#10B981' },
        { label: 'Weekly Growth', value: `${analytics?.summary?.weeklyGrowthPct > 0 ? '+' : ''}${analytics?.summary?.weeklyGrowthPct ?? 0}%`, color: '#F59E0B' },
    ];

    return (
        <div className="chih-page">
            <div className="chih-stat-row">
                {statCards.map((s) => (
                    <div key={s.label} className="chih-stat-card">
                        <div className="chih-stat-value" style={{ color: s.color }}>{s.value}</div>
                        <div className="chih-stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {analytics?.insights?.length > 0 && (
                <div className="chih-panel chih-insights-panel">
                    <div className="chih-panel-header"><h2>Network Intelligence</h2></div>
                    <ul className="chih-insights-list">
                        {analytics.insights.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                </div>
            )}

            <div className="chih-dashboard-grid">
                <div className="chih-panel">
                    <div className="chih-panel-header"><h2>Emergency Activity</h2></div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={urgencyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                {urgencyData.map((e) => <Cell key={e.name} fill={URGENCY_COLORS[e.name] || '#6366F1'} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="chih-panel">
                    <div className="chih-panel-header"><h2>7-Day Trend</h2></div>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Line type="monotone" dataKey="requests" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="chih-panel">
                    <div className="chih-panel-header"><h2>Recent Requests</h2></div>
                    <div className="chih-recent-list">
                        {(stats?.recentRequests || []).length === 0 ? (
                            <p className="chih-muted">No recent requests.</p>
                        ) : stats.recentRequests.map((req) => (
                            <div key={req._id} className="chih-recent-row">
                                <span className="chih-urgency-dot" style={{ background: URGENCY_COLORS[req.urgency] }} />
                                <span className="chih-recent-name">{req.patientName}</span>
                                <span className="chih-status chih-status-ok">{req.status}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="chih-panel">
                    <div className="chih-panel-header"><h2>Network Resources</h2></div>
                    <div className="chih-resource-mini-grid">
                        {Object.entries(stats?.resourceSummary || {}).map(([type, count]) => (
                            <div key={type} className="chih-resource-mini">
                                <span>{RESOURCE_LABELS[type] || type}</span>
                                <strong>{count}</strong>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="chih-panel chih-panel-map">
                    <div className="chih-panel-header"><h2>Network Map</h2></div>
                    <div ref={mapRef} className="chih-map" />
                </div>
            </div>

            {shortageCount > 0 && (
                <div className="chih-panel chih-alerts-panel">
                    <div className="chih-panel-header"><h2>Shortage Alerts</h2></div>
                    <div className="chih-alert-cards">
                        {analytics.shortageAlerts.slice(0, 4).map((alert, i) => (
                            <div key={i} className="chih-alert-card">
                                <strong>{alert.resource?.replace(/_/g, ' ')}</strong>
                                <p>{alert.recommendation}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
