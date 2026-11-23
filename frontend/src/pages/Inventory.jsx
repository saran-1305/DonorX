import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
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
    const [uploadSummary, setUploadSummary] = useState(null);

    const bloodFileRef = useRef(null);
    const organFileRef = useRef(null);
    const resourceFileRef = useRef(null);

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

    // ==========================================
    // 2-COLUMN TEMPLATE GENERATORS
    // ==========================================
    const downloadTemplate = (moduleType) => {
        try {
            const wb = XLSX.utils.book_new();

            if (moduleType === 'blood') {
                // Strictly 2 columns: Blood Type & Current Units
                const data = BLOOD_GROUPS.map((group) => ({
                    'Blood Type': group,
                    'Current Units': bloodEdits[group] ?? 10,
                }));
                const ws = XLSX.utils.json_to_sheet(data);
                XLSX.utils.book_append_sheet(wb, ws, 'Blood_Inventory');
                XLSX.writeFile(wb, 'Blood_Inventory_Template.xlsx');
                showToast('Downloaded Blood template (Blood Type & Current Units)', 'info');
            } else if (moduleType === 'organ') {
                // Strictly 2 columns: Organ Type & Current Units
                const data = ORGANS.map((organ) => {
                    const existing = inventory.find((i) => i.type === 'ORGAN' && i.group === organ);
                    return {
                        'Organ Type': organ,
                        'Current Units': existing?.quantity ?? 1,
                    };
                });
                const ws = XLSX.utils.json_to_sheet(data);
                XLSX.utils.book_append_sheet(wb, ws, 'Organ_Inventory');
                XLSX.writeFile(wb, 'Organ_Inventory_Template.xlsx');
                showToast('Downloaded Organ template (Organ Type & Current Units)', 'info');
            } else if (moduleType === 'resource') {
                // Strictly 2 columns: Resource Type & Current Units
                const data = [
                    { 'Resource Type': 'ICU Beds', 'Current Units': resourceEdits['ICU_BED'] ?? 5 },
                    { 'Resource Type': 'Ventilators', 'Current Units': resourceEdits['VENTILATOR'] ?? 3 },
                    { 'Resource Type': 'Oxygen Cylinders', 'Current Units': resourceEdits['OXYGEN_CYLINDER'] ?? 20 },
                    { 'Resource Type': 'Ambulances', 'Current Units': resourceEdits['AMBULANCE'] ?? 2 },
                ];
                const ws = XLSX.utils.json_to_sheet(data);
                XLSX.utils.book_append_sheet(wb, ws, 'Resource_Hub');
                XLSX.writeFile(wb, 'Resource_Hub_Template.xlsx');
                showToast('Downloaded Resource Hub template (Resource Type & Current Units)', 'info');
            }
        } catch (err) {
            console.error('Template download error:', err);
            showToast('Failed to download template', 'error');
        }
    };

    // ==========================================
    // EXCEL / CSV PARSER WITH DIRECT FETCH & SAVE
    // ==========================================
    const handleFileSelect = async (e, moduleType) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset file input so user can re-upload same file
        e.target.value = '';

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                if (!firstSheetName) {
                    showToast('Excel workbook has no sheets', 'error');
                    return;
                }

                const worksheet = workbook.Sheets[firstSheetName];
                // Both raw rows (2D array) and object rows
                const objectRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                if (!objectRows || objectRows.length === 0) {
                    showToast('No data rows found in uploaded Excel file', 'error');
                    return;
                }

                if (moduleType === 'blood') {
                    await processBloodUpload(objectRows, rawRows, file.name);
                } else if (moduleType === 'organ') {
                    await processOrganUpload(objectRows, rawRows, file.name);
                } else if (moduleType === 'resource') {
                    await processResourceUpload(objectRows, rawRows, file.name);
                }
            } catch (err) {
                console.error('Excel parse error:', err);
                showToast('Failed to parse Excel file. Please ensure columns are valid.', 'error');
            }
        };

        reader.readAsArrayBuffer(file);
    };

    // Normalize blood group text (e.g. 'O+', 'o positive', 'A-', 'b pos')
    const normalizeBloodType = (raw) => {
        if (!raw) return null;
        const cleaned = String(raw).trim().toUpperCase().replace(/\s+/g, '');
        if (BLOOD_GROUPS.includes(cleaned)) return cleaned;

        const map = {
            'OPOS': 'O+', 'OPOSITIVE': 'O+', 'ONEG': 'O-', 'ONEGATIVE': 'O-',
            'APOS': 'A+', 'APOSITIVE': 'A+', 'ANEG': 'A-', 'ANEGATIVE': 'A-',
            'BPOS': 'B+', 'BPOSITIVE': 'B+', 'BNEG': 'B-', 'BNEGATIVE': 'B-',
            'ABPOS': 'AB+', 'ABPOSITIVE': 'AB+', 'ABNEG': 'AB-', 'ABNEGATIVE': 'AB-',
        };
        return map[cleaned] || null;
    };

    // Process and fetch Blood rows directly from Excel
    const processBloodUpload = async (objectRows, rawRows, filename) => {
        const bloodMap = new Map();

        // 1. First pass: Header-based matching (Blood Type & Current Units)
        for (const row of objectRows) {
            let foundType = null;
            let foundUnits = null;

            for (const [key, val] of Object.entries(row)) {
                const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');

                if (/blood|type|group/.test(k)) {
                    foundType = normalizeBloodType(val);
                } else if (/unit|curr|qty|count|avail/.test(k)) {
                    const parsed = parseInt(val, 10);
                    if (!isNaN(parsed)) foundUnits = Math.max(0, parsed);
                }
            }

            // Fallback: If cell value itself is a blood group
            if (!foundType) {
                for (const val of Object.values(row)) {
                    const matched = normalizeBloodType(val);
                    if (matched) { foundType = matched; break; }
                }
            }

            if (foundType && foundUnits !== null) {
                bloodMap.set(foundType, foundUnits);
            }
        }

        // 2. Second pass: Positional 2-column fallback ([Blood Type, Current Units])
        if (bloodMap.size === 0 && rawRows.length > 1) {
            for (let r = 1; r < rawRows.length; r++) {
                const row = rawRows[r];
                if (!Array.isArray(row) || row.length < 2) continue;
                const type = normalizeBloodType(row[0]);
                const units = parseInt(row[1], 10);
                if (type && !isNaN(units)) {
                    bloodMap.set(type, Math.max(0, units));
                }
            }
        }

        if (bloodMap.size === 0) {
            showToast('Could not fetch blood types from Excel. Ensure columns: "Blood Type" & "Current Units"', 'error');
            return;
        }

        const items = Array.from(bloodMap.entries()).map(([group, quantity]) => ({
            type: 'BLOOD',
            group,
            quantity,
        }));

        // Send directly to backend and put into application
        try {
            await inventoryService.updateInventory({ items });
            await load();

            const zeroCount = items.filter((i) => i.quantity === 0).length;
            const successMsg = `✓ Fetched ${items.length} blood types from "${filename}"! (${zeroCount} marked OUT OF STOCK)`;
            showToast(successMsg, 'success');

            setUploadSummary({
                module: 'Blood Bank',
                filename,
                updatedCount: items.length,
                zeroCount,
                items: items.map((i) => ({ label: `${i.group} Blood`, units: i.quantity, outOfStock: i.quantity === 0 })),
            });
        } catch (err) {
            console.error('Update inventory error:', err);
            showToast('Failed to save imported blood data to application', 'error');
        }
    };

    // Process and fetch Organ rows directly from Excel
    const processOrganUpload = async (objectRows, rawRows, filename) => {
        const organMap = new Map();

        const matchOrgan = (raw) => {
            if (!raw) return null;
            const str = String(raw).trim().toLowerCase();
            return ORGANS.find((o) => str.includes(o.toLowerCase())) || null;
        };

        // 1. Header-based matching
        for (const row of objectRows) {
            let foundOrgan = null;
            let foundUnits = null;

            for (const [key, val] of Object.entries(row)) {
                const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');

                if (/organ|type|name/.test(k)) {
                    foundOrgan = matchOrgan(val);
                } else if (/unit|curr|qty|avail|count|status/.test(k)) {
                    const parsed = parseInt(val, 10);
                    if (!isNaN(parsed)) {
                        foundUnits = Math.max(0, parsed);
                    } else {
                        const strVal = String(val).toLowerCase();
                        if (strVal.includes('out') || strVal.includes('none') || strVal.includes('0')) foundUnits = 0;
                        if (strVal.includes('avail') || strVal.includes('yes') || strVal.includes('1')) foundUnits = 1;
                    }
                }
            }

            if (!foundOrgan) {
                for (const val of Object.values(row)) {
                    const matched = matchOrgan(val);
                    if (matched) { foundOrgan = matched; break; }
                }
            }

            if (foundOrgan && foundUnits !== null) {
                organMap.set(foundOrgan, foundUnits);
            }
        }

        // 2. Positional 2-column fallback
        if (organMap.size === 0 && rawRows.length > 1) {
            for (let r = 1; r < rawRows.length; r++) {
                const row = rawRows[r];
                if (!Array.isArray(row) || row.length < 2) continue;
                const organ = matchOrgan(row[0]);
                const units = parseInt(row[1], 10);
                if (organ && !isNaN(units)) {
                    organMap.set(organ, Math.max(0, units));
                }
            }
        }

        if (organMap.size === 0) {
            showToast('Could not fetch organs from Excel. Ensure columns: "Organ Type" & "Current Units"', 'error');
            return;
        }

        const items = Array.from(organMap.entries()).map(([group, quantity]) => ({
            type: 'ORGAN',
            group,
            quantity,
        }));

        try {
            await inventoryService.updateInventory({ items });
            await load();

            const zeroCount = items.filter((i) => i.quantity === 0).length;
            const successMsg = `✓ Fetched ${items.length} organs from "${filename}"! (${zeroCount} marked OUT OF STOCK)`;
            showToast(successMsg, 'success');

            setUploadSummary({
                module: 'Organ Bank',
                filename,
                updatedCount: items.length,
                zeroCount,
                items: items.map((i) => ({ label: i.group, units: i.quantity, outOfStock: i.quantity === 0 })),
            });
        } catch (err) {
            console.error('Update organ inventory error:', err);
            showToast('Failed to save imported organ data to application', 'error');
        }
    };

    // Process and fetch Resource rows directly from Excel
    const processResourceUpload = async (objectRows, rawRows, filename) => {
        const resourceMap = new Map();

        const matchResource = (raw) => {
            if (!raw) return null;
            const str = String(raw).trim().toLowerCase();
            if (str.includes('icu')) return 'ICU_BED';
            if (str.includes('vent')) return 'VENTILATOR';
            if (str.includes('oxygen') || str.includes('o2')) return 'OXYGEN_CYLINDER';
            if (str.includes('amb')) return 'AMBULANCE';
            return null;
        };

        for (const row of objectRows) {
            let foundRes = null;
            let foundUnits = null;

            for (const [key, val] of Object.entries(row)) {
                const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');

                if (/resource|type|name/.test(k)) {
                    foundRes = matchResource(val);
                } else if (/unit|curr|qty|avail|count/.test(k)) {
                    const parsed = parseInt(val, 10);
                    if (!isNaN(parsed)) foundUnits = Math.max(0, parsed);
                }
            }

            if (!foundRes) {
                for (const val of Object.values(row)) {
                    const matched = matchResource(val);
                    if (matched) { foundRes = matched; break; }
                }
            }

            if (foundRes && foundUnits !== null) {
                resourceMap.set(foundRes, foundUnits);
            }
        }

        // Positional 2-column fallback
        if (resourceMap.size === 0 && rawRows.length > 1) {
            for (let r = 1; r < rawRows.length; r++) {
                const row = rawRows[r];
                if (!Array.isArray(row) || row.length < 2) continue;
                const res = matchResource(row[0]);
                const units = parseInt(row[1], 10);
                if (res && !isNaN(units)) {
                    resourceMap.set(res, Math.max(0, units));
                }
            }
        }

        if (resourceMap.size === 0) {
            showToast('Could not fetch resources from Excel. Ensure columns: "Resource Type" & "Current Units"', 'error');
            return;
        }

        const items = Array.from(resourceMap.entries()).map(([resourceType, available]) => ({
            resourceType,
            available,
        }));

        try {
            await resourceService.updateResource({ items });
            await load();

            const zeroCount = items.filter((i) => i.available === 0).length;
            const successMsg = `✓ Fetched ${items.length} resources from "${filename}"! (${zeroCount} marked OUT OF STOCK)`;
            showToast(successMsg, 'success');

            setUploadSummary({
                module: 'Resource Hub',
                filename,
                updatedCount: items.length,
                zeroCount,
                items: items.map((i) => ({ label: RESOURCE_LABELS[i.resourceType] || i.resourceType, units: i.available, outOfStock: i.available === 0 })),
            });
        } catch (err) {
            console.error('Update resources error:', err);
            showToast('Failed to save imported resource data to application', 'error');
        }
    };

    const organItems = inventory.filter((i) => i.type === 'ORGAN');
    const sectionMeta = TAB_TITLES[tab] || TAB_TITLES.blood;

    if (loading) {
        return <div className="chih-loading"><div className="chih-spinner" /> Loading inventory...</div>;
    }

    return (
        <div className="chih-page">
            {/* REAL-TIME EXCEL IMPORT SUMMARY BANNER */}
            {uploadSummary && (
                <div style={{
                    marginBottom: '1.25rem',
                    padding: '1rem 1.25rem',
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.4rem' }}>📊</span>
                        <div>
                            <strong style={{ color: '#065F46', fontSize: '0.95rem' }}>
                                Successfully Fetched & Updated from Excel: {uploadSummary.filename}
                            </strong>
                            <div style={{ fontSize: '0.825rem', color: '#047857', marginTop: '0.2rem' }}>
                                Applied {uploadSummary.updatedCount} items to {uploadSummary.module}.
                                {uploadSummary.zeroCount > 0 && (
                                    <span style={{ color: '#DC2626', fontWeight: 'bold', marginLeft: '0.4rem' }}>
                                        ({uploadSummary.zeroCount} items set to OUT OF STOCK)
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setUploadSummary(null)}
                        style={{ background: 'transparent', border: 'none', color: '#047857', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}
                        title="Dismiss"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* BLOOD BANK TAB */}
            {tab === 'blood' && (
                <section className="chih-panel chih-panel-single">
                    <div className="chih-panel-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <h2>{sectionMeta.title}</h2>
                            <span className="chih-panel-tag">{sectionMeta.tag}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => downloadTemplate('blood')}
                                style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                title="Download Excel template containing: Blood Type & Current Units"
                            >
                                📥 Template
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => bloodFileRef.current?.click()}
                                style={{ fontSize: '0.85rem', padding: '0.45rem 0.95rem', background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}
                                title="Upload Excel sheet (Blood Type & Current Units) to update blood inventory"
                            >
                                📊 Upload Excel / CSV
                            </button>
                            <input
                                type="file"
                                ref={bloodFileRef}
                                style={{ display: 'none' }}
                                accept=".xlsx, .xls, .csv"
                                onChange={(e) => handleFileSelect(e, 'blood')}
                            />
                        </div>
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
                                const isOutOfStock = qty === 0;
                                const isLowStock = qty > 0 && qty < goal * 0.3;
                                return (
                                    <tr key={group} className={isOutOfStock ? 'chih-row-critical' : isLowStock ? 'chih-row-low' : ''}>
                                        <td><span className="chih-blood-type">{group}</span></td>
                                        <td>
                                            <div className="chih-qty-cell">
                                                <strong>{qty}</strong>
                                                <span className="chih-goal">Goal: {goal}</span>
                                            </div>
                                        </td>
                                        <td>
                                            {isOutOfStock && (
                                                <span
                                                    className="chih-status chih-status-critical"
                                                    style={{ background: '#FEE2E2', color: '#DC2626', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}
                                                >
                                                    OUT OF STOCK
                                                </span>
                                            )}
                                            {isLowStock && !isOutOfStock && (
                                                <span
                                                    className="chih-status chih-status-warning"
                                                    style={{ background: '#FEF3C7', color: '#D97706', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}
                                                >
                                                    LOW STOCK
                                                </span>
                                            )}
                                            {!isOutOfStock && !isLowStock && (
                                                <span
                                                    className="chih-status chih-status-ok"
                                                    style={{ background: '#ECFDF5', color: '#059669', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}
                                                >
                                                    IN STOCK
                                                </span>
                                            )}
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

            {/* ORGAN BANK TAB */}
            {tab === 'organ' && (
                <section className="chih-panel chih-panel-single">
                    <div className="chih-panel-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <h2>{sectionMeta.title}</h2>
                            <span className="chih-panel-tag">{sectionMeta.tag}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => downloadTemplate('organ')}
                                style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                title="Download Excel template containing: Organ Type & Current Units"
                            >
                                📥 Template
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => organFileRef.current?.click()}
                                style={{ fontSize: '0.85rem', padding: '0.45rem 0.95rem', background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}
                                title="Upload Excel sheet (Organ Type & Current Units) to update organ inventory"
                            >
                                📊 Upload Excel / CSV
                            </button>
                            <input
                                type="file"
                                ref={organFileRef}
                                style={{ display: 'none' }}
                                accept=".xlsx, .xls, .csv"
                                onChange={(e) => handleFileSelect(e, 'organ')}
                            />
                        </div>
                    </div>

                    <div className="chih-organ-grid chih-organ-grid-wide">
                        {ORGANS.map((organ) => {
                            const qty = organItems.find((i) => i.group === organ)?.quantity || 0;
                            const isAvailable = qty > 0;
                            return (
                                <div key={organ} className={`chih-organ-card ${isAvailable ? '' : 'chih-organ-empty'}`}>
                                    <div className="chih-organ-abbr">{organ.slice(0, 2).toUpperCase()}</div>
                                    <h3>{organ}</h3>
                                    <div className="chih-organ-qty">{qty}</div>
                                    {isAvailable ? (
                                        <span
                                            className="chih-organ-badge chih-organ-badge-ok"
                                            style={{ background: '#ECFDF5', color: '#059669', fontWeight: 'bold' }}
                                        >
                                            {qty} Available
                                        </span>
                                    ) : (
                                        <span
                                            className="chih-organ-badge chih-organ-badge-out"
                                            style={{ background: '#FEE2E2', color: '#DC2626', fontWeight: 'bold' }}
                                        >
                                            OUT OF STOCK
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* RESOURCE HUB TAB */}
            {tab === 'resource' && (
                <section className="chih-panel chih-panel-single">
                    <div className="chih-panel-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <h2>{sectionMeta.title}</h2>
                            <span className="chih-panel-tag">{sectionMeta.tag}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => downloadTemplate('resource')}
                                style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                title="Download Excel template containing: Resource Type & Current Units"
                            >
                                📥 Template
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => resourceFileRef.current?.click()}
                                style={{ fontSize: '0.85rem', padding: '0.45rem 0.95rem', background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}
                                title="Upload Excel sheet (Resource Type & Current Units) to update facility resources"
                            >
                                📊 Upload Excel / CSV
                            </button>
                            <input
                                type="file"
                                ref={resourceFileRef}
                                style={{ display: 'none' }}
                                accept=".xlsx, .xls, .csv"
                                onChange={(e) => handleFileSelect(e, 'resource')}
                            />
                        </div>
                    </div>

                    <table className="chih-table chih-table-resource">
                        <thead>
                            <tr>
                                <th>Resource</th>
                                <th>Current Units</th>
                                <th>Status</th>
                                <th>Max Capacity</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {resources.map((r) => {
                                const avail = resourceEdits[r.resourceType] ?? r.available;
                                const isOutOfStock = avail === 0;
                                const isLowStock = avail > 0 && avail <= 2;
                                return (
                                    <tr key={r.resourceType} className={isOutOfStock ? 'chih-row-critical' : isLowStock ? 'chih-row-low' : ''}>
                                        <td>
                                            <span className="chih-resource-name">
                                                {RESOURCE_LABELS[r.resourceType] || r.resourceType.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <strong style={{ fontSize: '1.05rem', color: isOutOfStock ? '#DC2626' : 'inherit' }}>
                                                {avail}
                                            </strong>
                                            <span className="chih-muted"> units</span>
                                        </td>
                                        <td>
                                            {isOutOfStock && (
                                                <span
                                                    className="chih-status chih-status-critical"
                                                    style={{ background: '#FEE2E2', color: '#DC2626', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}
                                                >
                                                    OUT OF STOCK
                                                </span>
                                            )}
                                            {isLowStock && !isOutOfStock && (
                                                <span
                                                    className="chih-status chih-status-warning"
                                                    style={{ background: '#FEF3C7', color: '#D97706', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}
                                                >
                                                    LOW STOCK
                                                </span>
                                            )}
                                            {!isOutOfStock && !isLowStock && (
                                                <span
                                                    className="chih-status chih-status-ok"
                                                    style={{ background: '#ECFDF5', color: '#059669', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}
                                                >
                                                    IN STOCK
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <span className="chih-muted">{r.total} total</span>
                                        </td>
                                        <td>
                                            <div className="chih-action-cell">
                                                <Stepper
                                                    value={avail}
                                                    onChange={(v) => setResourceEdits((p) => ({ ...p, [r.resourceType]: v }))}
                                                />
                                                <button type="button" className="chih-link-btn" onClick={() => saveResource(r.resourceType)}>
                                                    Adjust
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </section>
            )}
        </div>
    );
};

export default Inventory;
