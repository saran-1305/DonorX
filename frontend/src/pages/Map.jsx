import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDonor } from '../context/DonorContext';
import { hospitalService, requestService, billService } from '../services/api';
import api from '../services/api';
import { getSocket } from '../services/socket';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { createLeafletMap, destroyLeafletMap, addStandardTileLayer } from '../utils/leafletMap';

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
    const { user, showToast } = useDonor();
    const navigate = useNavigate();
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

    // Bill state for the transaction
    const [transactionBill, setTransactionBill] = useState(null);
    const [isEditingRate, setIsEditingRate] = useState(false);
    const [customRateInput, setCustomRateInput] = useState('');
    const [savingRate, setSavingRate] = useState(false);

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
        if (!container) return;

        const defaultCenter = [13.0604, 80.2514];
        const center = hasOrigin ? [myLat, myLng] : defaultCenter;

        const map = createLeafletMap(container, { preferCanvas: true });
        map.setView(center, hasOrigin ? 12 : 11);
        mapInstance.current = map;
        mapReady.current = true;

        addStandardTileLayer(map);
        markersLayer.current = L.layerGroup().addTo(map);

        setMapInitialized(true);

        const onResize = () => {
            if (mapInstance.current) {
                mapInstance.current.invalidateSize();
            }
        };
        window.addEventListener('resize', onResize);

        setTimeout(() => {
            if (mapInstance.current) {
                mapInstance.current.invalidateSize();
            }
        }, 300);

        return () => {
            window.removeEventListener('resize', onResize);
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
        if (!map || !layer || loading || !mapInitialized) return;

        layer.clearLayers();

        // Plot current user hospital
        if (hasOrigin) {
            const selfIcon = L.divIcon({
                className: 'custom-div-icon',
                html: "<div class='map-marker map-marker-self' title='Your Hospital'></div>",
                iconSize: [20, 20],
                iconAnchor: [10, 10],
            });

            L.marker([myLat, myLng], { icon: selfIcon })
                .addTo(layer)
                .bindPopup(`<strong>${user?.name || 'Your Hospital'} (Current Facility)</strong><br>${user?.address || ''}`);
        }

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
                .bindPopup(`<strong>${h.name}</strong><br>${h.address || ''}<br><span style="color:#2563eb; cursor:pointer; font-weight:600;">Click to view route from your hospital</span>`)
                .on('click', () => drawRouteRef.current?.(h));
        });

        const points = peerHospitals.map((h) => [h.location.coordinates[1], h.location.coordinates[0]]);
        if (hasOrigin) {
            points.push([myLat, myLng]);
        }

        if (points.length > 1 && !routeInfo) {
            try {
                map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 14 });
            } catch {
                map.setView(hasOrigin ? [myLat, myLng] : [13.0604, 80.2514], 12);
            }
        } else if (hasOrigin && !routeInfo) {
            map.setView([myLat, myLng], 12);
        }

        setTimeout(() => {
            if (mapInstance.current) {
                mapInstance.current.invalidateSize();
            }
        }, 150);
    }, [hospitals, loading, hasOrigin, myLat, myLng, user?._id, requestId, routeInfo, mapInitialized]);

    const fetchBillForRequest = useCallback(async (reqId) => {
        if (!reqId) return;
        try {
            const { data } = await billService.getByRequestId(reqId);
            setTransactionBill(data);
            if (data?.unitRate) {
                setCustomRateInput(String(data.unitRate));
            }
        } catch (e) {
            console.error('Error fetching transaction bill:', e);
        }
    }, []);

    useEffect(() => {
        if (!requestId || !mapInitialized) return;

        let cancelled = false;
        requestService.getById(requestId)
            .then(({ data }) => {
                if (cancelled || !data) return;
                if (['Pending', 'Completed', 'Ended'].includes(data.status) && data.assignedHospital && data.requestingHospital) {
                    showAcceptedRequestRoute(data);
                    fetchBillForRequest(data._id);
                }
            })
            .catch(console.error);

        const socket = getSocket();

        const onStatusUpdated = (updatedReq) => {
            if (String(updatedReq?._id) === String(requestId)) {
                setAcceptedRequest(updatedReq);
                if (updatedReq.status === 'Completed') {
                    showToast('🎉 Emergency request completed successfully (Success)!', 'success');
                } else if (updatedReq.status === 'Ended') {
                    showToast('Emergency request was ended.', 'info');
                }
                fetchBillForRequest(requestId);
            }
        };

        const onBillUpdated = (updatedBill) => {
            if (String(updatedBill?.requestId) === String(requestId) || String(updatedBill?._id) === String(transactionBill?._id)) {
                setTransactionBill(updatedBill);
                if (updatedBill.unitRate) {
                    setCustomRateInput(String(updatedBill.unitRate));
                }
            }
        };

        socket.on('request_status_updated', onStatusUpdated);
        socket.on('request_completed', onStatusUpdated);
        socket.on('bill_created', onBillUpdated);
        socket.on('bill_updated', onBillUpdated);
        socket.on('bill_completed', onBillUpdated);
        socket.on('bill_terminated', onBillUpdated);

        return () => {
            cancelled = true;
            socket.off('request_status_updated', onStatusUpdated);
            socket.off('request_completed', onStatusUpdated);
            socket.off('bill_created', onBillUpdated);
            socket.off('bill_updated', onBillUpdated);
            socket.off('bill_completed', onBillUpdated);
            socket.off('bill_terminated', onBillUpdated);
        };
    }, [requestId, mapInitialized, showAcceptedRequestRoute, fetchBillForRequest, showToast, transactionBill?._id]);

    const isRequestor = acceptedRequest && (
        String(acceptedRequest.requestingHospital?._id || acceptedRequest.requestingHospital) === String(user?._id)
    );

    const isProvider = acceptedRequest && (
        String(acceptedRequest.assignedHospital?._id || acceptedRequest.assignedHospital) === String(user?._id)
    );

    const formatRequired = (req) => {
        if (!req?.resourceNeeded) return '—';
        const { type, group, quantity } = req.resourceNeeded;
        if (type === 'BLOOD') return `${quantity} unit(s) of ${group} Blood`;
        if (type === 'ORGAN') return `${quantity} x ${group || type}`;
        return `${quantity} x ${type.replace(/_/g, ' ')}`;
    };

    const handleSuccessRequest = async () => {
        if (!acceptedRequest?._id) return;
        try {
            await requestService.updateStatus(acceptedRequest._id, 'Completed');
            if (showToast) showToast('Request marked as Completed (Success)!', 'success');
            setAcceptedRequest((prev) => ({ ...prev, status: 'Completed' }));
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to update request status';
            if (showToast) showToast(`Failed: ${msg}`, 'error');
        }
    };

    const handleEndRequest = async () => {
        if (!acceptedRequest?._id) return;
        try {
            await requestService.updateStatus(acceptedRequest._id, 'Ended');
            if (showToast) showToast('Request marked as Ended.', 'info');
            setAcceptedRequest((prev) => ({ ...prev, status: 'Ended' }));
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to update request status';
            if (showToast) showToast(`Failed: ${msg}`, 'error');
        }
    };

    const handleSaveCustomRate = async () => {
        if (!transactionBill?._id) return;
        const rateNum = Number(customRateInput);
        if (isNaN(rateNum) || rateNum < 0) {
            if (showToast) showToast('Please enter a valid rate', 'error');
            return;
        }

        try {
            setSavingRate(true);
            const { data } = await billService.updateRate(transactionBill._id, rateNum);
            setTransactionBill(data);
            setIsEditingRate(false);
            if (showToast) showToast(`Resource rate fixed at ₹${rateNum.toLocaleString()}`, 'success');
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to update rate';
            if (showToast) showToast(msg, 'error');
        } finally {
            setSavingRate(false);
        }
    };

    const handleCompleteBill = async () => {
        if (!transactionBill?._id) return;
        try {
            const { data } = await billService.complete(transactionBill._id);
            setTransactionBill(data);
            if (showToast) showToast('Transaction Bill marked as Completed (Settled)!', 'success');
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to complete bill';
            if (showToast) showToast(msg, 'error');
        }
    };

    const handleTerminateBill = async () => {
        if (!transactionBill?._id) return;
        try {
            const { data } = await billService.terminate(transactionBill._id);
            setTransactionBill(data);
            if (showToast) showToast('Transaction Bill terminated.', 'info');
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to terminate bill';
            if (showToast) showToast(msg, 'error');
        }
    };

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
                            <span className={`chih-panel-tag ${acceptedRequest.status === 'Completed' ? 'chih-status-ok' : acceptedRequest.status === 'Ended' ? 'chih-status-warn' : 'chih-status-ok'}`}>
                                {acceptedRequest.status}
                            </span>
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
                            {acceptedRequest.resourceNeeded && (
                                <li>
                                    <div>
                                        <label>Required Resource</label>
                                        <span>{formatRequired(acceptedRequest)}</span>
                                    </div>
                                </li>
                            )}
                        </div>

                        {/* Requesting Hospital Control Buttons */}
                        {isRequestor && acceptedRequest.status === 'Pending' && (
                            <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.35rem', color: '#1E293B' }}>Request Actions</h3>
                                <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '1rem' }}>
                                    As the hospital that raised this request, complete or terminate the operation:
                                </p>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        type="button"
                                        onClick={handleEndRequest}
                                        className="btn btn-secondary"
                                        style={{ flex: 1, borderColor: '#EF4444', color: '#DC2626', fontWeight: '600' }}
                                    >
                                        End
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSuccessRequest}
                                        className="btn btn-primary"
                                        style={{ flex: 1, background: '#059669', borderColor: '#059669', fontWeight: '600' }}
                                    >
                                        Success
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Providing Hospital Delivery In-Progress Notice */}
                        {isProvider && acceptedRequest.status === 'Pending' && (
                            <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.35rem', color: '#166534' }}>Fulfilling Request (Active)</h3>
                                <p style={{ fontSize: '0.8rem', color: '#15803D', marginBottom: '0.75rem' }}>
                                    You accepted this request from {acceptedRequest.requestingHospital?.name}. Resources are in transit / prepared.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleSuccessRequest}
                                    className="btn btn-primary"
                                    style={{ width: '100%', background: '#059669', borderColor: '#059669', fontWeight: '600' }}
                                >
                                    Mark Delivered (Success)
                                </button>
                            </div>
                        )}

                        {acceptedRequest.status === 'Completed' && (
                            <div style={{ marginTop: '1rem', padding: '0.85rem', background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', borderRadius: '8px', fontWeight: '600', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                Request Completed (Success)
                            </div>
                        )}

                        {acceptedRequest.status === 'Ended' && (
                            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: '6px', fontWeight: '600', textAlign: 'center' }}>
                                ✕ Request Ended
                            </div>
                        )}

                        {/* Transaction Bill Card */}
                        {transactionBill && (
                            <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0F172A', margin: 0 }}>Transaction Bill</h3>
                                    <span style={{
                                        fontSize: '0.725rem',
                                        fontWeight: '600',
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '999px',
                                        background: transactionBill.status === 'Completed' ? '#ECFDF5' : transactionBill.status === 'Terminated' ? '#FEF2F2' : isRequestor ? '#FEF3C7' : '#EFF6FF',
                                        color: transactionBill.status === 'Completed' ? '#047857' : transactionBill.status === 'Terminated' ? '#B91C1C' : isRequestor ? '#B45309' : '#1D4ED8',
                                        border: '1px solid currentColor'
                                    }}>
                                        {transactionBill.status === 'Completed' ? 'Completed (Settled)' : transactionBill.status === 'Terminated' ? 'Terminated' : (isRequestor ? 'Pending Bill (Payable)' : 'Active Bill (Receivable)')}
                                    </span>
                                </div>

                                <div style={{ fontSize: '0.825rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Bill No:</span>
                                        <strong style={{ fontFamily: 'monospace' }}>{transactionBill.billNumber}</strong>
                                    </div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>Unit Rate ({transactionBill.resourceType}{transactionBill.resourceGroup ? ` - ${transactionBill.resourceGroup}` : ''}):</span>
                                        {isEditingRate ? (
                                            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                                <input
                                                    type="number"
                                                    value={customRateInput}
                                                    onChange={(e) => setCustomRateInput(e.target.value)}
                                                    style={{ width: '85px', padding: '0.2rem 0.4rem', fontSize: '0.8rem', border: '1px solid #CBD5E1', borderRadius: '4px' }}
                                                />
                                                <button type="button" className="btn btn-sm btn-primary" onClick={handleSaveCustomRate} disabled={savingRate} style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}>
                                                    Save
                                                </button>
                                                <button type="button" className="btn btn-sm" onClick={() => setIsEditingRate(false)} style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}>
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <strong>₹{transactionBill.unitRate?.toLocaleString()}</strong>
                                                {isProvider && transactionBill.status === 'Active' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsEditingRate(true)}
                                                        style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                                                        title="Providing hospital can fix the rate"
                                                    >
                                                        Fix Rate
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Resource Total ({transactionBill.quantity} unit{transactionBill.quantity > 1 ? 's' : ''}):</span>
                                        <strong>₹{transactionBill.resourceTotal?.toLocaleString()}</strong>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Shortest Distance & Transport ({transactionBill.distanceKm} km):</span>
                                        <strong>₹{transactionBill.transportTotal?.toLocaleString()}</strong>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                                        <span>DonorX Commission (5%):</span>
                                        <strong>₹{transactionBill.commissionAmount?.toLocaleString()}</strong>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '0.4rem', fontSize: '0.95rem', color: '#0F172A' }}>
                                        <strong>Total Amount:</strong>
                                        <strong style={{ color: '#0F172A', fontSize: '1rem' }}>₹{transactionBill.totalAmount?.toLocaleString()}</strong>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => navigate(`/billing?request=${acceptedRequest._id}`)}
                                        style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                        View Full Bill & Download PDF
                                    </button>

                                    {transactionBill.status === 'Active' && (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                type="button"
                                                onClick={handleTerminateBill}
                                                className="btn"
                                                style={{ flex: 1, border: '1px solid #FCA5A5', color: '#DC2626', fontSize: '0.8rem', padding: '0.4rem' }}
                                            >
                                                Terminate Bill
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCompleteBill}
                                                className="btn"
                                                style={{ flex: 1, background: '#059669', color: '#FFFFFF', border: 'none', fontSize: '0.8rem', padding: '0.4rem', fontWeight: '600' }}
                                            >
                                                Complete Bill
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
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
