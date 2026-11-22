const Hospital = require('../models/Hospital');
const { User, BloodInventory, ResourceInventory } = require('../models');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const generateToken = (payload) => {
    // If passed a simple ObjectId/string ID, wrap as { id }
    const tokenData = typeof payload === 'object' && payload !== null && !payload._bsontype
        ? payload
        : { id: payload };

    return jwt.sign(tokenData, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const registerValidation = [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('location.lat').isNumeric().withMessage('location.lat must be a number'),
    body('location.lon').isNumeric().withMessage('location.lon must be a number'),
];

const loginValidation = [
    body('email').notEmpty().withMessage('Email is required'),
    body('password').notEmpty().withMessage('Password is required'),
];

// @desc    Register a new hospital
// @route   POST /api/auth/register
// @access  Public
exports.registerHospital = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: errors.array()[0].msg,
            errors: errors.array(),
        });
    }

    const { name, email, password, location, contactPhone, contactPerson, address } = req.body;

    try {
        const cleanEmail = email.toLowerCase().trim();

        const hospitalExists = await Hospital.findOne({ email: cleanEmail });
        const userExists = await User.findOne({ email: cleanEmail });

        if (hospitalExists || userExists) {
            return res.status(400).json({ message: 'A hospital or user account already exists with this email' });
        }

        // 1. Create Hospital facility document
        const hospital = await Hospital.create({
            name: name.trim(),
            email: cleanEmail,
            contactPhone: contactPhone || '',
            contactPerson: contactPerson || name,
            address: address || '',
            location: {
                type: 'Point',
                coordinates: [Number(location.lon), Number(location.lat)],
            },
        });

        // 2. Create User account linked to the hospital
        const user = await User.create({
            hospitalId: hospital._id,
            name: contactPerson || name,
            email: cleanEmail,
            password: password, // Hashed by UserSchema pre-save hook
            role: 'HOSPITAL_ADMIN',
            phone: contactPhone || '',
            isActive: true,
        });

        // 3. Initialize default discrete inventories in V2 collections
        const initialBloodStocks = [
            { group: 'O+', quantity: 10 },
            { group: 'O-', quantity: 4 },
            { group: 'A+', quantity: 6 },
            { group: 'B+', quantity: 5 },
            { group: 'A-', quantity: 2 },
            { group: 'B-', quantity: 2 },
            { group: 'AB+', quantity: 3 },
            { group: 'AB-', quantity: 1 },
        ];

        for (const item of initialBloodStocks) {
            await BloodInventory.create({
                hospitalId: hospital._id,
                bloodGroup: item.group,
                component: 'WHOLE_BLOOD',
                unitsAvailable: item.quantity,
                unitsReserved: 0,
                unitsTotal: item.quantity,
            }).catch(() => {});
        }

        const initialResources = [
            { resourceType: 'ICU_BED', available: 5, total: 10 },
            { resourceType: 'VENTILATOR', available: 3, total: 6 },
            { resourceType: 'OXYGEN_CYLINDER', available: 20, total: 30 },
            { resourceType: 'AMBULANCE', available: 2, total: 4 },
        ];

        for (const item of initialResources) {
            await ResourceInventory.create({
                hospitalId: hospital._id,
                resourceType: item.resourceType,
                available: item.available,
                total: item.total,
                reserved: 0,
            }).catch(() => {});
        }

        if (hospital && user) {
            res.status(201).json({
                _id: hospital._id,
                userId: user._id,
                hospitalId: hospital._id,
                name: hospital.name,
                hospitalName: hospital.name,
                email: hospital.email,
                role: user.role,
                contactPhone: hospital.contactPhone,
                contactPerson: hospital.contactPerson,
                address: hospital.address,
                location: hospital.location,
                token: generateToken({
                    id: hospital._id,
                    userId: user._id,
                    hospitalId: hospital._id,
                }),
            });
        } else {
            res.status(400).json({ message: 'Invalid hospital registration data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth hospital & get token
// @route   POST /api/auth/login
// @access  Public
exports.loginHospital = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: errors.array()[0].msg,
            errors: errors.array(),
        });
    }

    const { email, password } = req.body;

    try {
        const cleanEmail = email.toLowerCase().trim();

        // 1. Authenticate against User account (primary in V2)
        const user = await User.findOne({ email: cleanEmail });
        let hospital = null;

        if (user && user.matchPassword && (await user.matchPassword(password))) {
            hospital = await Hospital.findById(user.hospitalId);
        } else {
            // 2. Fallback check against Hospital document directly if password exists
            hospital = await Hospital.findOne({ email: cleanEmail });
            if (hospital && hospital.matchPassword && (await hospital.matchPassword(password))) {
                // authenticated via hospital document directly
            } else {
                hospital = null;
            }
        }

        if (hospital) {
            res.json({
                _id: hospital._id,
                userId: user ? user._id : hospital._id,
                hospitalId: hospital._id,
                name: user ? user.name : hospital.name,
                hospitalName: hospital.name,
                email: cleanEmail,
                role: user ? user.role : 'HOSPITAL_ADMIN',
                contactPhone: hospital.contactPhone,
                contactPerson: hospital.contactPerson,
                address: hospital.address,
                location: hospital.location,
                token: generateToken({
                    id: hospital._id,
                    userId: user ? user._id : null,
                    hospitalId: hospital._id,
                }),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.registerValidation = registerValidation;
exports.loginValidation = loginValidation;
