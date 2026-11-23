const { Bill, EmergencyRequest, Hospital } = require('../models');
const {
    getDefaultResourceRate,
    calculateHaversineDistanceKm,
    computeBillBreakdown,
} = require('./pricingService');
const { createNotification } = require('./notificationService');
const { createAuditLog } = require('./auditService');
const { getIO } = require('../socket');

const emitToHospital = async (hospitalId, event, payload) => {
    const io = getIO();
    if (!io || !hospitalId) return;
    io.to(String(hospitalId)).emit(event, payload);
};

const broadcastBill = (event, bill) => {
    const io = getIO();
    if (!io) return;
    const reqHospId = bill.requestingHospital?._id || bill.requestingHospital;
    const provHospId = bill.providingHospital?._id || bill.providingHospital;
    if (reqHospId) io.to(String(reqHospId)).emit(event, bill);
    if (provHospId) io.to(String(provHospId)).emit(event, bill);
    io.emit(event, bill);
};

/**
 * Generate a new or retrieve existing bill for an emergency request
 */
const generateBillForRequest = async (requestId, customRate = null, providerHospitalId = null) => {
    const request = await EmergencyRequest.findById(requestId)
        .populate('requestingHospital', 'name location email contactPhone address')
        .populate('assignedHospital', 'name location email contactPhone address');

    if (!request) {
        throw new Error('Emergency request not found');
    }

    if (!request.assignedHospital) {
        throw new Error('Cannot generate bill: Request does not have an assigned hospital yet');
    }

    // Check if bill already exists
    let bill = await Bill.findOne({ requestId: request._id })
        .populate('requestingHospital', 'name location email contactPhone address')
        .populate('providingHospital', 'name location email contactPhone address');

    if (bill) {
        // If providing hospital is passing a rate to fix/update at generation time
        if (customRate != null && !isNaN(customRate)) {
            return await updateBillResourceRate(bill._id, customRate, providerHospitalId || request.assignedHospital._id);
        }
        return bill;
    }

    // Calculate shortest distance between providing hospital and requesting hospital
    const providerCoords = request.assignedHospital.location?.coordinates;
    const requesterCoords =
        request.location?.coordinates || request.requestingHospital.location?.coordinates;
    const distanceKm = calculateHaversineDistanceKm(providerCoords, requesterCoords);

    // Determine initial unit rate
    const unitRate =
        customRate != null && !isNaN(customRate)
            ? Number(customRate)
            : getDefaultResourceRate(request.resourceNeeded);

    const quantity = request.resourceNeeded?.quantity || 1;
    const breakdown = computeBillBreakdown({
        unitRate,
        quantity,
        distanceKm,
    });

    const billNumber = `DXB-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    bill = new Bill({
        billNumber,
        requestId: request._id,
        requestingHospital: request.requestingHospital._id,
        providingHospital: request.assignedHospital._id,
        patientName: request.patientName,
        condition: request.condition,
        urgency: request.urgency,
        resourceCategory: request.resourceNeeded?.resourceCategory || request.resourceNeeded?.type,
        resourceType: request.resourceNeeded?.type,
        resourceGroup: request.resourceNeeded?.group || '',
        ...breakdown,
        status: 'Active',
        rateFixedBy: customRate != null ? providerHospitalId || request.assignedHospital._id : null,
        rateFixedAt: customRate != null ? new Date() : null,
    });

    await bill.save();

    const populated = await Bill.findById(bill._id)
        .populate('requestingHospital', 'name location email contactPhone address')
        .populate('providingHospital', 'name location email contactPhone address');

    broadcastBill('bill_created', populated);

    // Notifications
    await createNotification(request.requestingHospital._id, {
        type: 'BILL',
        title: 'New Transaction Bill (Pending)',
        message: `Bill ${billNumber} generated for ${request.patientName}. Total: ₹${breakdown.totalAmount.toLocaleString()} (Includes 5% DonorX Platform fee).`,
        link: `/billing?request=${request._id}`,
        metadata: { billId: bill._id, requestId: request._id },
    });

    await createNotification(request.assignedHospital._id, {
        type: 'BILL',
        title: 'Active Bill Generated',
        message: `Active Bill ${billNumber} created for request with ${request.requestingHospital.name}. You can review and fix the rate if needed.`,
        link: `/billing?request=${request._id}`,
        metadata: { billId: bill._id, requestId: request._id },
    });

    await createAuditLog(request._id, 'BILL_GENERATED', {
        billNumber,
        totalAmount: breakdown.totalAmount,
        commissionAmount: breakdown.commissionAmount,
    });

    return populated;
};

/**
 * Update the rate for the resource/organ - ONLY authorized for providing hospital
 */
const updateBillResourceRate = async (billId, newRate, hospitalId) => {
    const bill = await Bill.findById(billId);
    if (!bill) throw new Error('Bill not found');

    const providerId = bill.providingHospital.toString();
    const callerId = (hospitalId?._id || hospitalId).toString();

    if (providerId !== callerId) {
        throw new Error('Permission denied: Only the providing hospital can fix or adjust the resource rate');
    }

    if (bill.status === 'Completed' || bill.status === 'Terminated') {
        throw new Error(`Cannot modify rate: Bill is already ${bill.status}`);
    }

    const rateNum = Math.max(0, Number(newRate));
    const breakdown = computeBillBreakdown({
        unitRate: rateNum,
        quantity: bill.quantity,
        distanceKm: bill.distanceKm,
        transportBaseFee: bill.transportBaseFee,
        transportRatePerKm: bill.transportRatePerKm,
    });

    bill.unitRate = breakdown.unitRate;
    bill.resourceTotal = breakdown.resourceTotal;
    bill.transportTotal = breakdown.transportTotal;
    bill.subtotal = breakdown.subtotal;
    bill.commissionAmount = breakdown.commissionAmount;
    bill.totalAmount = breakdown.totalAmount;
    bill.rateFixedBy = hospitalId;
    bill.rateFixedAt = new Date();

    await bill.save();

    const populated = await Bill.findById(bill._id)
        .populate('requestingHospital', 'name location email contactPhone address')
        .populate('providingHospital', 'name location email contactPhone address');

    broadcastBill('bill_updated', populated);

    await createNotification(bill.requestingHospital, {
        type: 'BILL',
        title: 'Bill Rate Updated',
        message: `${populated.providingHospital.name} updated the resource rate to ₹${rateNum.toLocaleString()} for bill ${bill.billNumber}. New Total: ₹${breakdown.totalAmount.toLocaleString()}`,
        link: `/billing?request=${bill.requestId}`,
        metadata: { billId: bill._id, newTotal: breakdown.totalAmount },
    });

    return populated;
};

/**
 * Complete a bill (Paid/Settled) - authorized for both Hospital A and Hospital B
 */
const completeBill = async (billId, hospitalId, note = '') => {
    const bill = await Bill.findById(billId);
    if (!bill) throw new Error('Bill not found');

    const callerId = (hospitalId?._id || hospitalId).toString();
    const isReq = bill.requestingHospital.toString() === callerId;
    const isProv = bill.providingHospital.toString() === callerId;

    if (!isReq && !isProv) {
        throw new Error('Not authorized to complete this bill');
    }

    if (bill.status === 'Terminated') {
        throw new Error('Cannot complete a bill that has been terminated');
    }

    bill.status = 'Completed';
    bill.completedAt = new Date();

    if (isReq) {
        bill.actionByHospitalA = { action: 'Completed', actedAt: new Date(), note };
    }
    if (isProv) {
        bill.actionByHospitalB = { action: 'Completed', actedAt: new Date(), note };
    }

    await bill.save();

    const populated = await Bill.findById(bill._id)
        .populate('requestingHospital', 'name location email contactPhone address')
        .populate('providingHospital', 'name location email contactPhone address');

    broadcastBill('bill_completed', populated);
    broadcastBill('bill_updated', populated);

    const partnerId = isReq ? bill.providingHospital : bill.requestingHospital;
    const actorName = isReq ? populated.requestingHospital.name : populated.providingHospital.name;

    await createNotification(partnerId, {
        type: 'BILL',
        title: 'Bill Marked as Completed (Settled)',
        message: `${actorName} completed bill ${bill.billNumber} for ₹${bill.totalAmount.toLocaleString()}.`,
        link: `/billing?request=${bill.requestId}`,
        metadata: { billId: bill._id, status: 'Completed' },
    });

    await createAuditLog(bill.requestId, 'BILL_COMPLETED', {
        billNumber: bill.billNumber,
        completedBy: actorName,
        totalAmount: bill.totalAmount,
    });

    return populated;
};

/**
 * Terminate a bill (Cancelled/Disputed) - authorized for both Hospital A and Hospital B
 */
const terminateBill = async (billId, hospitalId, note = '') => {
    const bill = await Bill.findById(billId);
    if (!bill) throw new Error('Bill not found');

    const callerId = (hospitalId?._id || hospitalId).toString();
    const isReq = bill.requestingHospital.toString() === callerId;
    const isProv = bill.providingHospital.toString() === callerId;

    if (!isReq && !isProv) {
        throw new Error('Not authorized to terminate this bill');
    }

    if (bill.status === 'Completed') {
        throw new Error('Cannot terminate a bill that is already completed');
    }

    bill.status = 'Terminated';
    bill.terminatedAt = new Date();

    if (isReq) {
        bill.actionByHospitalA = { action: 'Terminated', actedAt: new Date(), note };
    }
    if (isProv) {
        bill.actionByHospitalB = { action: 'Terminated', actedAt: new Date(), note };
    }

    await bill.save();

    const populated = await Bill.findById(bill._id)
        .populate('requestingHospital', 'name location email contactPhone address')
        .populate('providingHospital', 'name location email contactPhone address');

    broadcastBill('bill_terminated', populated);
    broadcastBill('bill_updated', populated);

    const partnerId = isReq ? bill.providingHospital : bill.requestingHospital;
    const actorName = isReq ? populated.requestingHospital.name : populated.providingHospital.name;

    await createNotification(partnerId, {
        type: 'BILL',
        title: 'Bill Terminated',
        message: `${actorName} terminated bill ${bill.billNumber}.`,
        link: `/billing?request=${bill.requestId}`,
        metadata: { billId: bill._id, status: 'Terminated' },
    });

    await createAuditLog(bill.requestId, 'BILL_TERMINATED', {
        billNumber: bill.billNumber,
        terminatedBy: actorName,
    });

    return populated;
};

module.exports = {
    generateBillForRequest,
    updateBillResourceRate,
    completeBill,
    terminateBill,
};
