import jwt from 'jsonwebtoken';
import { User } from '../models/associations.js';

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findByPk(decoded.userId);

        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized, user not found' });
        }

        if (!req.user.isActive) {
            return res.status(403).json({ message: 'This account has been deactivated' });
        }

        return next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Access token expired', code: 'TOKEN_EXPIRED' });
        }
        console.error('Auth Middleware Error:', error.message);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

export { protect };
