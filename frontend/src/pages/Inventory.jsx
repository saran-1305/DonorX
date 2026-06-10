import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { inventoryService, resourceService } from '../services/api';
import { useDonor } from '../context/DonorContext';

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const BLOOD_GOALS = { 'O+': 25, 'O-': 15, 'A+': 20, 'A-': 15, 'B+': 18, 'B-': 12, 'AB+': 10, 'AB-': 8 };
const ORGANS = ['Kidney', 'Heart', 'Liver', 'Lungs'];
const RESOURCE_LABELS = {
    ICU_BED: 'ICU Beds',
    VENTILATOR: 'Ventilators',
    OXYGEN_CYLINDER: 'Oxygen Cylinders',
    AMBULANCE: 'Ambulances',
};

const TAB_TITLES = {
    blood: { title: 'Blood Bank', tag: '8 Types' },
    organ: { title: 'Organ Bank', tag: '4 Types' },
    resource: { title: 'Resource Hub', tag: 'Facility Resources' },
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
    const sectionMeta = TAB_TITLES[tab] || TAB_TITLES.blood;

    if (loading) {
        return <div className="chih-loading"><div className="chih-spinner" /> Loading inventory...</div>;
    }

    return (
        <div className="chih-page">
            {tab === 'blood' && (
                <section className="chih-panel chih-panel-single">
                    <div className="chih-panel-header">
                        <h2>{sectionMeta.title}</h2>
                        <span className="chih-panel-tag">{sectionMeta.tag}</span>
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
            )}

            {tab === 'organ' && (
                <section className="chih-panel chih-panel-single">
                    <div className="chih-panel-header">
                        <h2>{sectionMeta.title}</h2>
                        <span className="chih-panel-tag">{sectionMeta.tag}</span>
                    </div>
                    <div className="chih-organ-grid chih-organ-grid-wide">
                        {ORGANS.map((organ) => {
                            const qty = organItems.find((i) => i.group === organ)?.quantity || 0;
                            const available = qty > 0;
                            return (
                                <div key={organ} className={`chih-organ-card ${available ? '' : 'chih-organ-empty'}`}>
                                    <div className="chih-organ-abbr">{organ.slice(0, 2).toUpperCase()}</div>
                                    <h3>{organ}</h3>
                                    <div className="chih-organ-qty">{qty}</div>
                                    {available ? (
                                        <span className="chih-organ-badge chih-organ-badge-ok">{qty} Available</span>
                                    ) : (
                                        <span className="chih-organ-badge chih-organ-badge-out">OUT OF STOCK</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {tab === 'resource' && (
                <section className="chih-panel chih-panel-single">
                    <div className="chih-panel-header">
                        <h2>{sectionMeta.title}</h2>
                        <span className="chih-panel-tag">{sectionMeta.tag}</span>
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
                            {resources.map((r) => (
                                <tr key={r.resourceType}>
                                    <td><span className="chih-resource-name">{RESOURCE_LABELS[r.resourceType] || r.resourceType.replace(/_/g, ' ')}</span></td>
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
                            ))}
                        </tbody>
                    </table>
                </section>
            )}
        </div>
    );
};

export default Inventory;
