const Consultation = require('../models/Consultation');
const { getIO } = require('../socket');

exports.createConsultation = async (req, res) => {
    const { toHospitalId, message, subject } = req.body;

    if (!toHospitalId || !message?.trim()) {
        return res.status(400).json({ message: 'toHospitalId and message are required' });
    }

    const consultation = await Consultation.create({
        fromHospital: req.user._id,
        toHospital: toHospitalId,
        message: message.trim(),
        subject: subject?.trim() || 'Inter-Hospital Consultation',
    });

    const populated = await Consultation.findById(consultation._id)
        .populate('fromHospital', 'name email')
        .populate('toHospital', 'name email');

    const io = getIO();
    if (io) {
        io.to(String(toHospitalId)).emit('consultation_incoming', {
            consultation: populated,
            fromHospitalId: req.user._id,
            message: message.trim(),
            timestamp: new Date(),
        });
    }

    res.status(201).json(populated);
};

exports.getMyConsultations = async (req, res) => {
    const consultations = await Consultation.find({
        $or: [{ fromHospital: req.user._id }, { toHospital: req.user._id }],
    })
        .populate('fromHospital', 'name email')
        .populate('toHospital', 'name email')
        .sort({ createdAt: -1 });

    res.json(consultations);
};

exports.replyToConsultation = async (req, res) => {
    const { message } = req.body;
    const consultation = await Consultation.findById(req.params.id);

    if (!consultation) {
        return res.status(404).json({ message: 'Consultation not found' });
    }

    const isParticipant =
        consultation.toHospital.toString() === req.user._id.toString() ||
        consultation.fromHospital.toString() === req.user._id.toString();

    if (!isParticipant) {
        return res.status(403).json({ message: 'Not authorized' });
    }

    consultation.replies.push({
        fromHospital: req.user._id,
        message: message.trim(),
    });
    consultation.status = 'REPLIED';
    await consultation.save();

    const populated = await Consultation.findById(consultation._id)
        .populate('fromHospital', 'name email')
        .populate('toHospital', 'name email');

    const notifyId =
        consultation.fromHospital.toString() === req.user._id.toString()
            ? consultation.toHospital
            : consultation.fromHospital;

    const io = getIO();
    if (io) {
        io.to(String(notifyId)).emit('consultation_reply', populated);
    }

    res.json(populated);
};
