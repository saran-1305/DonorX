const { Bill, EmergencyRequest } = require('../models');
const {
    generateBillForRequest,
    updateBillResourceRate,
    completeBill,
    terminateBill,
} = require('../services/billService');

// @desc    Get bills for authenticated hospital
// @route   GET /api/bills
// @access  Private
exports.getBills = async (req, res) => {
    try {
        const hospitalId = req.user._id;
        const { status, view } = req.query;

        const query = {
            $or: [{ requestingHospital: hospitalId }, { providingHospital: hospitalId }],
        };

        if (status) {
            query.status = status;
        }

        const bills = await Bill.find(query)
            .populate('requestingHospital', 'name location email contactPhone address')
            .populate('providingHospital', 'name location email contactPhone address')
            .sort({ createdAt: -1 });

        // Add contextual helper fields for frontend
        const enhanced = bills.map((b) => {
            const doc = b.toObject();
            const isRequestor = String(b.requestingHospital?._id || b.requestingHospital) === String(hospitalId);
            const isProvider = String(b.providingHospital?._id || b.providingHospital) === String(hospitalId);

            return {
                ...doc,
                isRequestor,
                isProvider,
                // For hospital A (requestor), active bills are their "Pending Bills" (payable)
                // For hospital B (provider), active bills are their "Active Bills" (receivable)
                displayType: isRequestor ? 'Pending Bill' : 'Active Bill',
            };
        });

        // Optional filtering by view ('pending' for requestor, 'active' for provider)
        if (view === 'pending') {
            const pendingOnly = enhanced.filter(
                (b) => b.isRequestor && b.status === 'Active'
            );
            return res.json(pendingOnly);
        }
        if (view === 'active') {
            const activeOnly = enhanced.filter(
                (b) => b.isProvider && b.status === 'Active'
            );
            return res.json(activeOnly);
        }

        res.json(enhanced);
    } catch (error) {
        console.error('Error fetching bills:', error);
        res.status(500).json({ message: error.message || 'Failed to fetch bills' });
    }
};

// @desc    Get bill by emergency request ID
// @route   GET /api/bills/request/:requestId
// @access  Private
exports.getBillByRequestId = async (req, res) => {
    try {
        const { requestId } = req.params;
        let bill = await Bill.findOne({ requestId })
            .populate('requestingHospital', 'name location email contactPhone address')
            .populate('providingHospital', 'name location email contactPhone address');

        if (!bill) {
            // Check if request is accepted and can be billed
            const request = await EmergencyRequest.findById(requestId);
            if (request && request.assignedHospital) {
                bill = await generateBillForRequest(requestId, null, req.user._id);
            } else {
                return res.status(404).json({ message: 'Bill not generated yet for this request' });
            }
        }

        const doc = bill.toObject();
        const isRequestor = String(bill.requestingHospital?._id || bill.requestingHospital) === String(req.user._id);
        const isProvider = String(bill.providingHospital?._id || bill.providingHospital) === String(req.user._id);

        res.json({
            ...doc,
            isRequestor,
            isProvider,
            displayType: isRequestor ? 'Pending Bill' : 'Active Bill',
        });
    } catch (error) {
        console.error('Error fetching bill by request:', error);
        res.status(500).json({ message: error.message || 'Failed to fetch bill' });
    }
};

// @desc    Get single bill by ID
// @route   GET /api/bills/:id
// @access  Private
exports.getBillById = async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id)
            .populate('requestingHospital', 'name location email contactPhone address')
            .populate('providingHospital', 'name location email contactPhone address');

        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        const isRequestor = String(bill.requestingHospital?._id || bill.requestingHospital) === String(req.user._id);
        const isProvider = String(bill.providingHospital?._id || bill.providingHospital) === String(req.user._id);

        if (!isRequestor && !isProvider) {
            return res.status(403).json({ message: 'Not authorized to view this bill' });
        }

        const doc = bill.toObject();
        res.json({
            ...doc,
            isRequestor,
            isProvider,
            displayType: isRequestor ? 'Pending Bill' : 'Active Bill',
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Generate bill for request
// @route   POST /api/bills/generate
// @access  Private
exports.generateBill = async (req, res) => {
    try {
        const { requestId, customRate } = req.body;
        if (!requestId) {
            return res.status(400).json({ message: 'requestId is required' });
        }

        const bill = await generateBillForRequest(requestId, customRate, req.user._id);
        res.status(201).json(bill);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update resource rate (Providing hospital only)
// @route   PUT /api/bills/:id/rate
// @access  Private
exports.updateRate = async (req, res) => {
    try {
        const { unitRate } = req.body;
        if (unitRate == null || isNaN(unitRate)) {
            return res.status(400).json({ message: 'Valid unitRate number is required' });
        }

        const updatedBill = await updateBillResourceRate(req.params.id, unitRate, req.user._id);
        res.json(updatedBill);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Complete bill
// @route   PUT /api/bills/:id/complete
// @access  Private
exports.complete = async (req, res) => {
    try {
        const { note } = req.body || {};
        const completed = await completeBill(req.params.id, req.user._id, note);
        res.json(completed);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Terminate bill
// @route   PUT /api/bills/:id/terminate
// @access  Private
exports.terminate = async (req, res) => {
    try {
        const { note } = req.body || {};
        const terminated = await terminateBill(req.params.id, req.user._id, note);
        res.json(terminated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
