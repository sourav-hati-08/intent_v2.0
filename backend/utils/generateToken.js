import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 30);

// Short-lived JWT used to authenticate API requests.
export const generateAccessToken = (userId, role) => {
    return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
};

// Long-lived, single-use, rotating refresh token.
// The raw token is only ever sent to the client (as an httpOnly cookie);
// only its SHA-256 hash is stored server-side, so a database leak cannot
// be used to mint new sessions.
export const generateRefreshToken = () => {
    const raw = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
    return { raw, tokenHash, expiresAt };
};

export const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

// Generic helper for email-verification / password-reset tokens:
// returns a raw token (emailed to the user) and its hash (stored in DB).
export const generateSecureToken = (expiresInMs) => {
    const raw = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + expiresInMs);
    return { raw, tokenHash, expiresAt };
};

export const REFRESH_COOKIE_NAME = 'refreshToken';

export const refreshCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
});

export default generateAccessToken;
