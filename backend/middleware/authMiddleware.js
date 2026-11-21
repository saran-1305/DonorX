const jwt = require('jsonwebtoken');
const Hospital = require('../models/Hospital');
const { User } = require('../models');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            let hospital = null;
            let user = null;

            if (decoded.hospitalId) {
                hospital = await Hospital.findById(decoded.hospitalId).select('-password');
                if (decoded.userId) {
                    try { user = await User.findById(decoded.userId).select('-password'); } catch (e) {}
                }
            } else if (decoded.id) {
                hospital = await Hospital.findById(decoded.id).select('-password');
            }

            if (!hospital) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            req.user = hospital;
            req.authUser = user;
            req.hospital = hospital;

            return next();
        } catch (error) {
            console.error('Auth error:', error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    return res.status(401).json({ message: 'Not authorized, no token' });
};

module.exports = { protect };
