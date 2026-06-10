import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { inventoryService, resourceService } from '../services/api';
import { useDonor } from '../context/DonorContext';

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const BLOOD_GOALS = { 'O+': 25, 'O-': 15, 'A+': 20, 'A-': 15, 'B+': 18, 'B-': 12, 'AB+': 10, 'AB-': 8 };
const ORGANS = [
    { key: 'Kidney', icon: '🫘', label: 'Kidney' },
    { key: 'Heart', icon: '❤️', label: 'Heart' },
    { key: 'Liver', icon: '🫀', label: 'Liver' },
    { key: 'Lungs', icon: '🫁', label: 'Lungs' },
];
const RESOURCE_META = {
    ICU_BED: { label: 'ICU Beds', icon: '🛏️' },
    VENTILATOR: { label: 'Ventilators', icon: '💨' },
    OXYGEN_CYLINDER: { label: 'Oxygen Cylinders', icon: '🫁' },
    AMBULANCE: { label: 'Ambulances', icon: '🚑' },
};

const Stepper = ({ value, onChange, min = 0 }) => (
    <div className="chih-stepper">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <input type="number" value={value} min={min} onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))} />
        <button type="button" onClick={() => onChange(value + 1)}>+</button>
    </div>
);

const Inventory = () => {
    const { showToast } = useDonor();
    const [searchParams] = useSearchParams();
    const tab = searchParams.get('tab') || 'blood';
    const bloodRef = useRef(null);
    const organRef = useRef(null);
    const resourceRef = useRef(null);

    const [inventory, setInventory] = useState([]);
    const [resources, setResources] = useState([]);
    const [bloodEdits, setBloodEdits] = useState({});
    const [resourceEdits, setResourceEdits] = useState({});
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const [invRes, resRes] = await Promise.all([
                inventoryService.getInventory(),
                resourceService.getResources(),
            ]);
            const inv = invRes.data || [];
            setInventory(inv);
            setResources(resRes.data || []);
            const b = {};
            BLOOD_GROUPS.forEach((g) => {
                b[g] = inv.find((i) => i.type === 'BLOOD' && i.group === g)?.quantity || 0;
            });
            setBloodEdits(b);
            const r = {};
            (resRes.data || []).forEach((x) => { r[x.resourceType] = x.available; });
            setResourceEdits(r);
        } catch {
            showToast('Failed to load inventory', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const ref = tab === 'organ' ? organRef : tab === 'resource' ? resourceRef : bloodRef;
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [tab]);

    const saveBlood = async (group) => {
        try {
            await inventoryService.updateInventory({
                items: [{ type: 'BLOOD', group, quantity: bloodEdits[group] }],
            });
            showToast(`${group} blood stock updated`, 'success');
            load();
        } catch {
            showToast('Update failed', 'error');
        }
    };

    const saveResource = async (resourceType) => {
        try {
            await resourceService.updateResource({
                resourceType,
                available: Number(resourceEdits[resourceType]),
            });
            showToast('Resource updated', 'success');
            load();
        } catch {
            showToast('Update failed', 'error');
        }
    };

    const organItems = inventory.filter((i) => i.type === 'ORGAN');

    if (loading) {
        return <div className="chih-loading"><div className="chih-spinner" /> Loading inventory...</div>;
    }

    return (
        <div className="chih-page">
            <div className="chih-inventory-grid">
                {/* Blood Bank */}
                <section ref={bloodRef} className="chih-panel chih-panel-blood">
                    <div className="chih-panel-header">
                        <h2>Blood Bank</h2>
                        <span className="chih-panel-tag">8 Types</span>
                    </div>
                    <table className="chih-table">
                        <thead>
                            <tr>
                                <th>Blood Type</th>
                                <th>Current Units</th>
                                <th>Status</th>
                                <th>Adjust</th>
                            </tr>
                        </thead>
                        <tbody>
                            {BLOOD_GROUPS.map((group) => {
                                const qty = bloodEdits[group] ?? 0;
                                const goal = BLOOD_GOALS[group];
                                const critical = qty === 0;
                                const low = qty > 0 && qty < goal * 0.3;
                                return (
                                    <tr key={group} className={critical ? 'chih-row-critical' : low ? 'chih-row-low' : ''}>
                                        <td><span className="chih-blood-type">{group}</span></td>
                                        <td>
                                            <div className="chih-qty-cell">
                                                <strong>{qty}</strong>
                                                <span className="chih-goal">Goal: {goal}</span>
                                            </div>
                                        </td>
                                        <td>
                                            {critical && <span className="chih-status chih-status-critical">CRITICAL LOW</span>}
                                            {low && !critical && <span className="chih-status chih-status-warning">LOW STOCK</span>}
                                            {!critical && !low && <span className="chih-status chih-status-ok">OK</span>}
                                        </td>
                                        <td>
                                            <div className="chih-action-cell">
                                                <Stepper
                                                    value={qty}
                                                    onChange={(v) => setBloodEdits((p) => ({ ...p, [group]: v }))}
                                                />
                                                <button type="button" className="chih-link-btn" onClick={() => saveBlood(group)}>Save</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </section>

                {/* Organ Bank */}
                <section ref={organRef} className="chih-panel chih-panel-organ">
                    <div className="chih-panel-header">
                        <h2>Organ Bank</h2>
                    </div>
                    <div className="chih-organ-grid">
                        {ORGANS.map(({ key, icon, label }) => {
                            const qty = organItems.find((i) => i.group === key)?.quantity || 0;
                            const available = qty > 0;
                            return (
                                <div key={key} className={`chih-organ-card ${available ? '' : 'chih-organ-empty'}`}>
                                    <div className="chih-organ-icon">{icon}</div>
                                    <h3>{label}</h3>
                                    <div className="chih-organ-qty">{qty}</div>
                                    {available ? (
                                        <span className="chih-organ-badge chih-organ-badge-ok">✓ {qty} Available</span>
                                    ) : (
                                        <span className="chih-organ-badge chih-organ-badge-out">OUT OF STOCK</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Resource Hub */}
                <section ref={resourceRef} className="chih-panel chih-panel-resource">
                    <div className="chih-panel-header">
                        <h2>Resource Hub</h2>
                    </div>
                    <table className="chih-table chih-table-resource">
                        <thead>
                            <tr>
                                <th>Resource</th>
                                <th>Current Count</th>
                                <th>Max Capacity</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {resources.map((r) => {
                                const meta = RESOURCE_META[r.resourceType] || { label: r.resourceType, icon: '📦' };
                                return (
                                    <tr key={r.resourceType}>
                                        <td>
                                            <div className="chih-resource-name">
                                                <span>{meta.icon}</span>
                                                {meta.label}
                                            </div>
                                        </td>
                                        <td>
                                            <strong>{resourceEdits[r.resourceType] ?? r.available}</strong>
                                            <span className="chih-muted"> / {r.total} available</span>
                                        </td>
                                        <td>
                                            <Stepper
                                                value={resourceEdits[r.resourceType] ?? r.available}
                                                onChange={(v) => setResourceEdits((p) => ({ ...p, [r.resourceType]: v }))}
                                            />
                                        </td>
                                        <td>
                                            <button type="button" className="chih-link-btn" onClick={() => saveResource(r.resourceType)}>
                                                Adjust
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </section>
            </div>
        </div>
    );
};

export default Inventory;
