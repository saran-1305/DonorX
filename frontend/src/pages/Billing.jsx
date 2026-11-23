import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDonor } from '../context/DonorContext';
import { billService } from '../services/api';
import { getSocket } from '../services/socket';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Billing = () => {
    const { user, showToast } = useDonor();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const paramRequestId = searchParams.get('request');

    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBill, setSelectedBill] = useState(null);
    const [activeTab, setActiveTab] = useState('auto'); // auto selects based on role
    const [searchTerm, setSearchTerm] = useState('');

    // Editing rate state (for providing hospital)
    const [editingBillId, setEditingBillId] = useState(null);
    const [editRateValue, setEditRateValue] = useState('');
    const [savingRate, setSavingRate] = useState(false);

    // PDF generation state
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const invoicePrintRef = useRef(null);

    const fetchBills = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await billService.getBills();
            const list = Array.isArray(data) ? data : [];
            setBills(list);

            if (paramRequestId) {
                const matched = list.find((b) => String(b.requestId) === String(paramRequestId));
                if (matched) {
                    setSelectedBill(matched);
                } else {
                    // Try fetching directly by request ID
                    try {
                        const { data: directBill } = await billService.getByRequestId(paramRequestId);
                        if (directBill) {
                            setSelectedBill(directBill);
                            setBills((prev) => [directBill, ...prev.filter((x) => x._id !== directBill._id)]);
                        }
                    } catch (e) {
                        console.error('Could not fetch bill by request param:', e);
                    }
                }
            } else if (list.length > 0 && !selectedBill) {
                setSelectedBill(list[0]);
            }
        } catch (err) {
            console.error('Error fetching bills:', err);
            showToast('Failed to load transaction bills', 'error');
        } finally {
            setLoading(false);
        }
    }, [paramRequestId, showToast]);

    useEffect(() => {
        fetchBills();

        const socket = getSocket();
        const onBillEvent = (updatedBill) => {
            setBills((prev) => {
                const index = prev.findIndex((b) => b._id === updatedBill._id);
                if (index > -1) {
                    const next = [...prev];
                    next[index] = updatedBill;
                    return next;
                }
                return [updatedBill, ...prev];
            });
            setSelectedBill((curr) => {
                if (curr && curr._id === updatedBill._id) {
                    return updatedBill;
                }
                return curr;
            });
        };

        socket.on('bill_created', onBillEvent);
        socket.on('bill_updated', onBillEvent);
        socket.on('bill_completed', onBillEvent);
        socket.on('bill_terminated', onBillEvent);

        return () => {
            socket.off('bill_created', onBillEvent);
            socket.off('bill_updated', onBillEvent);
            socket.off('bill_completed', onBillEvent);
            socket.off('bill_terminated', onBillEvent);
        };
    }, [fetchBills]);

    // Handle rate fixing by providing hospital
    const handleStartEditRate = (bill) => {
        setEditingBillId(bill._id);
        setEditRateValue(String(bill.unitRate || 0));
    };

    const handleSaveRate = async (billId) => {
        const rateNum = Number(editRateValue);
        if (isNaN(rateNum) || rateNum < 0) {
            showToast('Please enter a valid rate number', 'error');
            return;
        }

        try {
            setSavingRate(true);
            const { data: updated } = await billService.updateRate(billId, rateNum);
            setBills((prev) => prev.map((b) => (b._id === billId ? updated : b)));
            if (selectedBill?._id === billId) {
                setSelectedBill(updated);
            }
            setEditingBillId(null);
            showToast(`Resource rate fixed at ₹${rateNum.toLocaleString()}`, 'success');
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to update rate';
            showToast(msg, 'error');
        } finally {
            setSavingRate(false);
        }
    };

    // Handle completing bill
    const handleCompleteBill = async (billId) => {
        try {
            const { data: updated } = await billService.complete(billId);
            setBills((prev) => prev.map((b) => (b._id === billId ? updated : b)));
            if (selectedBill?._id === billId) {
                setSelectedBill(updated);
            }
            showToast('Transaction bill marked as Completed (Settled)!', 'success');
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to complete bill';
            showToast(msg, 'error');
        }
    };

    // Handle terminating bill
    const handleTerminateBill = async (billId) => {
        try {
            const { data: updated } = await billService.terminate(billId);
            setBills((prev) => prev.map((b) => (b._id === billId ? updated : b)));
            if (selectedBill?._id === billId) {
                setSelectedBill(updated);
            }
            showToast('Transaction bill terminated.', 'info');
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to terminate bill';
            showToast(msg, 'error');
        }
    };

    // Download PDF
    const handleDownloadPdf = async () => {
        if (!invoicePrintRef.current || !selectedBill) return;

        try {
            setDownloadingPdf(true);
            showToast('Generating official PDF invoice...', 'info');

            const element = invoicePrintRef.current;
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const fileName = `DonorX_Invoice_${selectedBill.billNumber || selectedBill._id}.pdf`;
            pdf.save(fileName);
            showToast('PDF downloaded successfully!', 'success');
        } catch (err) {
            console.error('PDF generation error:', err);
            showToast('Failed to generate PDF. You can also print the page.', 'error');
        } finally {
            setDownloadingPdf(false);
        }
    };

    // Categorize bills for the current hospital
    const myHospitalId = String(user?._id || '');

    const pendingBills = bills.filter((b) => {
        const isReq = String(b.requestingHospital?._id || b.requestingHospital) === myHospitalId;
        return isReq && b.status === 'Active';
    });

    const activeBills = bills.filter((b) => {
        const isProv = String(b.providingHospital?._id || b.providingHospital) === myHospitalId;
        return isProv && b.status === 'Active';
    });

    const completedBills = bills.filter((b) => b.status === 'Completed');
    const terminatedBills = bills.filter((b) => b.status === 'Terminated');

    // Auto default tab based on whether hospital has pending or active bills
    const currentTab =
        activeTab === 'auto'
            ? pendingBills.length > 0
                ? 'pending'
                : activeBills.length > 0
                    ? 'active'
                    : 'all'
            : activeTab;

    const displayedBills = bills.filter((b) => {
        const isReq = String(b.requestingHospital?._id || b.requestingHospital) === myHospitalId;
        const isProv = String(b.providingHospital?._id || b.providingHospital) === myHospitalId;

        if (currentTab === 'pending') {
            if (!(isReq && b.status === 'Active')) return false;
        } else if (currentTab === 'active') {
            if (!(isProv && b.status === 'Active')) return false;
        } else if (currentTab === 'completed') {
            if (b.status !== 'Completed') return false;
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const billNum = (b.billNumber || '').toLowerCase();
            const pat = (b.patientName || '').toLowerCase();
            const reqH = (b.requestingHospital?.name || '').toLowerCase();
            const provH = (b.providingHospital?.name || '').toLowerCase();
            return billNum.includes(term) || pat.includes(term) || reqH.includes(term) || provH.includes(term);
        }
        return true;
    });

    const isCurrentBillRequestor =
        selectedBill && String(selectedBill.requestingHospital?._id || selectedBill.requestingHospital) === myHospitalId;
    const isCurrentBillProvider =
        selectedBill && String(selectedBill.providingHospital?._id || selectedBill.providingHospital) === myHospitalId;

    return (
        <div className="chih-page" style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5">
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <line x1="2" y1="10" x2="22" y2="10" />
                        </svg>
                        Transaction & Billing Center
                    </h1>
                    <p style={{ color: '#64748B', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
                        Medical resource clearing, shortest-distance cold-chain logistics, and 5% platform settlement.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {selectedBill && (
                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            disabled={downloadingPdf}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#2563EB', borderColor: '#2563EB', fontWeight: '600', padding: '0.6rem 1.25rem' }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            {downloadingPdf ? 'Generating PDF...' : 'Download PDF Invoice'}
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#92400E', fontWeight: '600', textTransform: 'uppercase' }}>
                        Pending Bills (Payable)
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#B45309', marginTop: '0.25rem' }}>
                        {pendingBills.length}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#B45309', marginTop: '0.25rem' }}>
                        Obligations awaiting settlement
                    </div>
                </div>

                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#1E40AF', fontWeight: '600', textTransform: 'uppercase' }}>
                        Active Bills (Receivable)
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1D4ED8', marginTop: '0.25rem' }}>
                        {activeBills.length}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#1D4ED8', marginTop: '0.25rem' }}>
                        Deliveries fulfilled by your hospital
                    </div>
                </div>

                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#065F46', fontWeight: '600', textTransform: 'uppercase' }}>
                        Completed (Settled)
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#047857', marginTop: '0.25rem' }}>
                        {completedBills.length}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '0.25rem' }}>
                        Total settled transactions
                    </div>
                </div>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '600', textTransform: 'uppercase' }}>
                        Terminated / Void
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#64748B', marginTop: '0.25rem' }}>
                        {terminatedBills.length}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
                        Cancelled operations
                    </div>
                </div>
            </div>

            {/* Layout: Sidebar list on Left, Invoice Detail & PDF Canvas on Right */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 420px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
                {/* Left Column: Filter Tabs & Bill Cards */}
                <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    {/* Navigation Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => setActiveTab('pending')}
                            style={{
                                padding: '0.4rem 0.8rem',
                                fontSize: '0.825rem',
                                fontWeight: '600',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                background: currentTab === 'pending' ? '#FEF3C7' : 'transparent',
                                color: currentTab === 'pending' ? '#92400E' : '#64748B',
                            }}
                        >
                            Pending Bills ({pendingBills.length})
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('active')}
                            style={{
                                padding: '0.4rem 0.8rem',
                                fontSize: '0.825rem',
                                fontWeight: '600',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                background: currentTab === 'active' ? '#DBEAFE' : 'transparent',
                                color: currentTab === 'active' ? '#1E40AF' : '#64748B',
                            }}
                        >
                            Active Bills ({activeBills.length})
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('completed')}
                            style={{
                                padding: '0.4rem 0.8rem',
                                fontSize: '0.825rem',
                                fontWeight: '600',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                background: currentTab === 'completed' ? '#D1FAE5' : 'transparent',
                                color: currentTab === 'completed' ? '#065F46' : '#64748B',
                            }}
                        >
                            Completed ({completedBills.length})
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('all')}
                            style={{
                                padding: '0.4rem 0.8rem',
                                fontSize: '0.825rem',
                                fontWeight: '600',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                background: currentTab === 'all' ? '#F1F5F9' : 'transparent',
                                color: currentTab === 'all' ? '#0F172A' : '#64748B',
                            }}
                        >
                            All ({bills.length})
                        </button>
                    </div>

                    {/* Search bar */}
                    <div style={{ marginBottom: '1rem' }}>
                        <input
                            type="text"
                            placeholder="Search by Bill #, Patient, Hospital..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.5rem 0.75rem',
                                fontSize: '0.85rem',
                                border: '1px solid #CBD5E1',
                                borderRadius: '6px',
                            }}
                        />
                    </div>

                    {/* Bills List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '720px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                        {loading ? (
                            <p style={{ color: '#64748B', textAlign: 'center', padding: '2rem 0' }}>Loading bills...</p>
                        ) : displayedBills.length === 0 ? (
                            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748B' }}>
                                <p style={{ margin: 0, fontWeight: '500' }}>No bills found in this view.</p>
                                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                    When an emergency request is accepted between two hospitals, bills are automatically generated here.
                                </p>
                            </div>
                        ) : (
                            displayedBills.map((b) => {
                                const isReq = String(b.requestingHospital?._id || b.requestingHospital) === myHospitalId;
                                const isSelected = selectedBill?._id === b._id;
                                const isProv = String(b.providingHospital?._id || b.providingHospital) === myHospitalId;

                                return (
                                    <div
                                        key={b._id}
                                        onClick={() => setSelectedBill(b)}
                                        style={{
                                            padding: '0.9rem',
                                            borderRadius: '8px',
                                            border: `1.5px solid ${isSelected ? '#2563EB' : '#E2E8F0'}`,
                                            background: isSelected ? '#EFF6FF' : '#FFFFFF',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                            <span style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '0.85rem', color: '#1E293B' }}>
                                                {b.billNumber}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: '0.725rem',
                                                    fontWeight: '700',
                                                    padding: '0.15rem 0.45rem',
                                                    borderRadius: '999px',
                                                    background:
                                                        b.status === 'Completed'
                                                            ? '#ECFDF5'
                                                            : b.status === 'Terminated'
                                                                ? '#FEF2F2'
                                                                : isReq
                                                                    ? '#FEF3C7'
                                                                    : '#DBEAFE',
                                                    color:
                                                        b.status === 'Completed'
                                                            ? '#047857'
                                                            : b.status === 'Terminated'
                                                                ? '#B91C1C'
                                                                : isReq
                                                                    ? '#92400E'
                                                                    : '#1D4ED8',
                                                }}
                                            >
                                                {b.status === 'Completed'
                                                    ? 'Completed'
                                                    : b.status === 'Terminated'
                                                        ? 'Terminated'
                                                        : isReq
                                                            ? 'Pending Bill (Payable)'
                                                            : 'Active Bill (Receivable)'}
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#0F172A', marginBottom: '0.2rem' }}>
                                            {b.patientName} — {b.resourceType} {b.resourceGroup ? `(${b.resourceGroup})` : ''}
                                        </div>

                                        <div style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                            <span>From: {b.providingHospital?.name || 'Provider'}</span>
                                            <span>To: {b.requestingHospital?.name || 'Requester'}</span>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '0.4rem' }}>
                                            <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                                                {b.distanceKm} km • 5% fee included
                                            </span>
                                            <strong style={{ fontSize: '0.95rem', color: '#0F172A' }}>
                                                ₹{b.totalAmount?.toLocaleString()}
                                            </strong>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Column: Full Official Printable Invoice Canvas */}
                <div>
                    {selectedBill ? (
                        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                            {/* Actions Top Toolbar */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/map?request=${selectedBill.requestId}`)}
                                        className="btn btn-secondary btn-sm"
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
                                        View Delivery Route on Map
                                    </button>
                                </div>

                                {/* Bill Status Management Buttons */}
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {selectedBill.status === 'Active' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => handleTerminateBill(selectedBill._id)}
                                                className="btn btn-sm"
                                                style={{ border: '1px solid #EF4444', color: '#DC2626', fontWeight: '600', fontSize: '0.8rem' }}
                                            >
                                                Terminate Bill
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleCompleteBill(selectedBill._id)}
                                                className="btn btn-sm btn-primary"
                                                style={{ background: '#059669', borderColor: '#059669', fontWeight: '600', fontSize: '0.8rem' }}
                                            >
                                                Complete Bill (Settle)
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* The DOM element captured by html2canvas for PDF download */}
                            <div
                                ref={invoicePrintRef}
                                id="invoice-printable"
                                style={{
                                    background: '#FFFFFF',
                                    padding: '2rem',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '8px',
                                    color: '#0F172A',
                                    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                                }}
                            >
                                {/* Header with DonorX Logo and Invoice Title */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #E2E8F0', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            <div style={{ width: '32px', height: '32px', background: '#FEF2F2', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="#EF4444" />
                                                </svg>
                                            </div>
                                            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0F172A', margin: 0, letterSpacing: '-0.5px' }}>
                                                Donor<span style={{ color: '#EF4444' }}>X</span>
                                            </h2>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: '500' }}>
                                            Healthcare Emergency & Organ Logistics Network • UN SDG-3
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                            Automated Healthcare Clearinghouse & Geo-Spatial Settlement
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0F172A', textTransform: 'uppercase' }}>
                                            INVOICE
                                        </div>
                                        <div style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: '700', color: '#2563EB' }}>
                                            {selectedBill.billNumber}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem' }}>
                                            Date: {new Date(selectedBill.createdAt).toLocaleDateString()}
                                        </div>
                                        <div style={{ marginTop: '0.4rem' }}>
                                            <span
                                                style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: '700',
                                                    padding: '0.2rem 0.6rem',
                                                    borderRadius: '999px',
                                                    background:
                                                        selectedBill.status === 'Completed'
                                                            ? '#ECFDF5'
                                                            : selectedBill.status === 'Terminated'
                                                                ? '#FEF2F2'
                                                                : isCurrentBillRequestor
                                                                    ? '#FEF3C7'
                                                                    : '#EFF6FF',
                                                    color:
                                                        selectedBill.status === 'Completed'
                                                            ? '#047857'
                                                            : selectedBill.status === 'Terminated'
                                                                ? '#B91C1C'
                                                                : isCurrentBillRequestor
                                                                    ? '#92400E'
                                                                    : '#1D4ED8',
                                                    border: '1px solid currentColor',
                                                }}
                                            >
                                                STATUS:{' '}
                                                {selectedBill.status === 'Completed'
                                                    ? 'COMPLETED (SETTLED)'
                                                    : selectedBill.status === 'Terminated'
                                                        ? 'TERMINATED'
                                                        : isCurrentBillRequestor
                                                            ? 'PENDING BILL (PAYABLE)'
                                                            : 'ACTIVE BILL (RECEIVABLE)'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Hospital Parties Section */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.75rem' }}>
                                    <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '700', color: '#059669', marginBottom: '0.4rem' }}>
                                            FROM (PROVIDING / SUPPLIER HOSPITAL)
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0F172A' }}>
                                            {selectedBill.providingHospital?.name}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.25rem' }}>
                                            {selectedBill.providingHospital?.address || 'Healthcare Facility'}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                                            Email: {selectedBill.providingHospital?.email || 'N/A'}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                                            Phone: {selectedBill.providingHospital?.contactPhone || 'N/A'}
                                        </div>
                                    </div>

                                    <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '700', color: '#2563EB', marginBottom: '0.4rem' }}>
                                            BILL TO (REQUESTING / RECIPIENT HOSPITAL)
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0F172A' }}>
                                            {selectedBill.requestingHospital?.name}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.25rem' }}>
                                            {selectedBill.requestingHospital?.address || 'Healthcare Facility'}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                                            Email: {selectedBill.requestingHospital?.email || 'N/A'}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                                            Phone: {selectedBill.requestingHospital?.contactPhone || 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                {/* Patient & Clinical Case Info */}
                                <div style={{ background: '#F1F5F9', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.825rem' }}>
                                    <div>
                                        <span style={{ color: '#64748B' }}>Patient: </span>
                                        <strong style={{ color: '#0F172A' }}>{selectedBill.patientName}</strong>
                                    </div>
                                    <div>
                                        <span style={{ color: '#64748B' }}>Clinical Condition: </span>
                                        <strong style={{ color: '#0F172A' }}>{selectedBill.condition || 'Emergency'}</strong>
                                    </div>
                                    <div>
                                        <span style={{ color: '#64748B' }}>Urgency: </span>
                                        <strong style={{ color: '#DC2626' }}>{selectedBill.urgency || 'High'}</strong>
                                    </div>
                                    <div>
                                        <span style={{ color: '#64748B' }}>Request Reference: </span>
                                        <strong style={{ fontFamily: 'monospace' }}>{String(selectedBill.requestId).slice(0, 10)}...</strong>
                                    </div>
                                </div>

                                {/* Line Items Table */}
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.75rem' }}>
                                    <thead>
                                        <tr style={{ background: '#0F172A', color: '#FFFFFF', textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                            <th style={{ padding: '0.75rem 1rem', borderTopLeftRadius: '6px' }}>Item Description</th>
                                            <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Qty</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Rate (₹)</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'right', borderTopRightRadius: '6px' }}>Total (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody style={{ fontSize: '0.875rem' }}>
                                        {/* Resource line item */}
                                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                                            <td style={{ padding: '1rem' }}>
                                                <strong>
                                                    {selectedBill.resourceType} {selectedBill.resourceGroup ? `(${selectedBill.resourceGroup})` : ''}
                                                </strong>
                                                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>
                                                    {selectedBill.resourceCategory === 'ORGAN'
                                                        ? 'Transplant Organ Protocol & Cryogenic Preservation'
                                                        : selectedBill.resourceCategory === 'BLOOD'
                                                            ? 'Cross-Matched Tested Compatible Blood Unit'
                                                            : 'Critical Hospital Life Support Equipment'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{ fontSize: '0.75rem', background: '#F1F5F9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: '600' }}>
                                                    {selectedBill.resourceCategory || 'RESOURCE'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                {selectedBill.quantity}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                ₹{selectedBill.unitRate?.toLocaleString()}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700' }}>
                                                ₹{selectedBill.resourceTotal?.toLocaleString()}
                                            </td>
                                        </tr>

                                        {/* Transportation line item */}
                                        <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#FAFAFA' }}>
                                            <td style={{ padding: '1rem' }}>
                                                <strong>Cold-Chain Emergency Transport & Dispatch</strong>
                                                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>
                                                    Shortest driving route: {selectedBill.distanceKm} km (Base ₹{selectedBill.transportBaseFee} + ₹{selectedBill.transportRatePerKm}/km)
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{ fontSize: '0.75rem', background: '#EFF6FF', color: '#1E40AF', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: '600' }}>
                                                    LOGISTICS
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                1
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                ₹{selectedBill.transportTotal?.toLocaleString()}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700' }}>
                                                ₹{selectedBill.transportTotal?.toLocaleString()}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Summary & Financial Totals */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
                                    <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                                            <span>Subtotal (Resource + Transport):</span>
                                            <strong style={{ color: '#0F172A' }}>₹{selectedBill.subtotal?.toLocaleString()}</strong>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', padding: '0.25rem 0' }}>
                                            <span>DonorX Platform Fee (5%):</span>
                                            <strong>₹{selectedBill.commissionAmount?.toLocaleString()}</strong>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #0F172A', paddingTop: '0.6rem', marginTop: '0.25rem', fontSize: '1.15rem' }}>
                                            <strong style={{ color: '#0F172A' }}>Total Amount:</strong>
                                            <strong style={{ color: '#0F172A', fontWeight: '900' }}>
                                                ₹{selectedBill.totalAmount?.toLocaleString()}
                                            </strong>
                                        </div>

                                        <div style={{ fontSize: '0.75rem', color: '#94A3B8', textAlign: 'right' }}>
                                            Includes 5% DonorX Platform Network Surcharge
                                        </div>
                                    </div>
                                </div>

                                {/* Terms & Signatures */}
                                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1.5rem', fontSize: '0.75rem', color: '#64748B' }}>
                                    <div>
                                        <strong style={{ color: '#0F172A' }}>TERMS & CLEARING POLICY:</strong>
                                        <p style={{ margin: '0.25rem 0' }}>
                                            This invoice is generated by DonorX in accordance with emergency healthcare mutual aid standards.
                                            DonorX retains a 5% platform facilitation commission to support network operations.
                                        </p>
                                    </div>

                                    <div style={{ textAlign: 'center', borderTop: '1px solid #CBD5E1', paddingTop: '0.5rem' }}>
                                        <div style={{ fontWeight: '600', color: '#0F172A' }}>Authorized Provider</div>
                                        <div style={{ fontSize: '0.7rem' }}>{selectedBill.providingHospital?.name}</div>
                                    </div>

                                    <div style={{ textAlign: 'center', borderTop: '1px solid #CBD5E1', paddingTop: '0.5rem' }}>
                                        <div style={{ fontWeight: '600', color: '#0F172A' }}>Receiving Hospital</div>
                                        <div style={{ fontSize: '0.7rem' }}>{selectedBill.requestingHospital?.name}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Providing Hospital Rate Adjustment Control Box */}
                            {isCurrentBillProvider && selectedBill.status === 'Active' && (
                                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: '700', color: '#0F172A' }}>
                                        Fix or Adjust Resource Rate (Providing Hospital Only)
                                    </h4>
                                    <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0 0 0.75rem 0' }}>
                                        As the hospital providing the organ/resource, you can customize the unit rate before finalizing the bill.
                                    </p>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>₹</span>
                                        <input
                                            type="number"
                                            value={editingBillId === selectedBill._id ? editRateValue : selectedBill.unitRate}
                                            onFocus={() => handleStartEditRate(selectedBill)}
                                            onChange={(e) => setEditRateValue(e.target.value)}
                                            style={{
                                                padding: '0.4rem 0.6rem',
                                                fontSize: '0.9rem',
                                                border: '1px solid #CBD5E1',
                                                borderRadius: '6px',
                                                width: '160px',
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleSaveRate(selectedBill._id)}
                                            disabled={savingRate}
                                            className="btn btn-primary btn-sm"
                                            style={{ padding: '0.4rem 1rem', fontWeight: '600' }}
                                        >
                                            {savingRate ? 'Saving...' : 'Fix / Save Rate'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                            <p style={{ fontSize: '1rem', fontWeight: '600' }}>Select a bill from the list to view and download the official invoice.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Billing;
