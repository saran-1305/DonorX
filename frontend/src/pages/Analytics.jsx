import React, { useState, useEffect, useCallback } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from 'recharts';
import { analyticsService } from '../services/api';

const RESOURCE_LABELS = {
    ICU_BED: 'ICU Beds',
    VENTILATOR: 'Ventilators',
    OXYGEN_CYLINDER: 'Oxygen',
    AMBULANCE: 'Ambulances',
    BLOOD: 'Blood',
    ORGAN: 'Organs',
};

const Analytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const { data: analytics } = await analyticsService.getPredictions();
            setData(analytics);
        } catch (e) {
            console.error('Analytics fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, [fetchData]);

    if (loading) {
        return <div className="container" style={{ padding: '4rem' }}>Loading predictive analytics...</div>;
    }

    if (!data) {
        return <div className="container" style={{ padding: '4rem' }}>Unable to load analytics.</div>;
    }

    const { summary, dailyTrend, categoryTrend, bloodInventory, resourceInventory, shortageAlerts, insights } = data;

    const resourceChartData = Object.entries(resourceInventory || {}).map(([key, val]) => ({
        name: RESOURCE_LABELS[key] || key,
        available: val,
    }));

    const categoryChartData = (categoryTrend || []).map((c) => ({
        name: RESOURCE_LABELS[c.category] || c.category?.replace(/_/g, ' ') || 'Other',
        requests: c.count,
    }));

    return (
        <div className="container animate-fade-in" style={{ padding: '2rem 1rem 4rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ marginBottom: '0.5rem' }}>Predictive Analytics</h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    AI-driven forecasting for resource consumption, shortage alerts, and network demand trends.
                </p>
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-color)' }}>{summary.requestsLast7Days}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Requests (7 days)</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: summary.weeklyGrowthPct > 0 ? '#DC2626' : '#059669' }}>
                        {summary.weeklyGrowthPct > 0 ? '+' : ''}{summary.weeklyGrowthPct}%
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Weekly Growth</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700 }}>{summary.forecastNext7Days}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Forecast (next 7d)</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700 }}>{summary.avgResponseMinutes || '—'} min</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Avg Response Time</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: shortageAlerts.length ? '#DC2626' : '#059669' }}>
                        {shortageAlerts.length}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Shortage Alerts</div>
                </div>
            </div>

            {insights?.length > 0 && (
                <div className="card" style={{ marginBottom: '2rem', background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Network Intelligence Insights</h3>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)' }}>
                        {insights.map((insight, i) => (
                            <li key={i} style={{ marginBottom: '0.5rem' }}>{insight}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Daily Request Trend</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={dailyTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Line type="monotone" dataKey="requests" stroke="#D32F2F" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Requests by Resource Category</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={categoryChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="requests" fill="#00796B" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Network Resource Availability</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={resourceChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="available" fill="#4338CA" name="Available Units" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Blood Inventory (Network Total)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                        {Object.entries(bloodInventory || {}).map(([group, qty]) => (
                            <div key={group} style={{
                                textAlign: 'center', padding: '0.75rem',
                                background: qty <= 5 ? '#FEE2E2' : '#F3F4F6',
                                borderRadius: '8px',
                            }}>
                                <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>{qty}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{group}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="card">
                <h3 style={{ marginBottom: '1rem' }}>Shortage Alerts &amp; Recommendations</h3>
                {shortageAlerts.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>No critical shortages predicted in the next 72 hours.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {shortageAlerts.map((alert, i) => (
                            <div key={i} style={{
                                padding: '1rem', borderRadius: '8px',
                                border: `1px solid ${alert.severity === 'Critical' ? '#FECACA' : '#FED7AA'}`,
                                background: alert.severity === 'Critical' ? '#FEF2F2' : '#FFFBEB',
                            }}>
                                <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                                    <strong>{alert.resource?.replace(/_/g, ' ')} ({alert.type})</strong>
                                    <span className={`badge badge-${alert.severity === 'Critical' ? 'critical' : 'high'}`}>
                                        {alert.severity}
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    Stock: {alert.currentStock}
                                    {alert.daysUntilShortage != null && ` • ~${alert.daysUntilShortage} days remaining`}
                                    {alert.utilizationPct != null && ` • ${alert.utilizationPct}% utilized`}
                                </p>
                                <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>{alert.recommendation}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Analytics;
