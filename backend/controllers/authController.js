import { Op } from 'sequelize';
import { User, Student, Company, RefreshToken } from '../models/associations.js';
import {
    generateAccessToken,
    generateRefreshToken,
    generateSecureToken,
    hashToken,
    REFRESH_COOKIE_NAME,
    refreshCookieOptions,
} from '../utils/generateToken.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';
import { createNotification } from '../utils/notificationHelper.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

// Issues a fresh access token + rotated refresh token for a user,
// persists the refresh token (hashed) and sets it as an httpOnly cookie.
const issueTokens = async (req, res, user) => {
    const accessToken = generateAccessToken(user.id, user.role);
    const { raw, tokenHash, expiresAt } = generateRefreshToken();

    await RefreshToken.create({
        userId: user.id,
        tokenHash,
        expiresAt,
        userAgent: req.headers['user-agent'] || null,
        ip: req.ip,
    });

    res.cookie(REFRESH_COOKIE_NAME, raw, refreshCookieOptions());
    return accessToken;
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'Name, email, password and role are required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }

        const userExists = await User.findOne({ where: { email: email.toLowerCase().trim() } });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Enforce single admin rule
        if (role === 'admin') {
            const adminExists = await User.findOne({ where: { role: 'admin' } });
            if (adminExists) {
                return res.status(400).json({ message: 'Admin already exists. Only one administrator is allowed in the system.' });
            }
        }

        const { raw: verifyRaw, tokenHash: verifyHash, expiresAt: verifyExpires } = generateSecureToken(24 * 60 * 60 * 1000);

        const user = await User.create({
            name,
            email,
            password,
            role,
            emailVerificationTokenHash: verifyHash,
            emailVerificationExpires: verifyExpires,
        });

        // Create corresponding profile based on role
        if (role === 'student') {
            await Student.create({
                userId: user.id,
                university: req.body.university || '',
                program: req.body.program || '',
                enrollmentNumber: req.body.enrollmentNumber || '',
                semester: req.body.semester || '',
            });
        } else if (role === 'company') {
            await Company.create({
                userId: user.id,
                companyName: req.body.companyName || name,
                industry: req.body.industry || '',
                type: req.body.type || 'Software House',
                registrationDocument: req.body.registrationDocument || '',
            });
        }

        const admin = await User.findOne({ where: { role: 'admin' } });
        if (admin && role !== 'admin') {
            await createNotification(
                admin.id,
                'admin',
                `New ${role} registered: ${role === 'company' ? (req.body.companyName || name) : name}`,
                'registration'
            );
        }

        await sendVerificationEmail(user, verifyRaw);

        const accessToken = await issueTokens(req, res, user);

        res.status(201).json({
            ...user.toJSON(),
            token: accessToken,
            message: 'Registration successful. Please check your email to verify your account.',
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'User already exists' });
        }
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
    const { email, password, role } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.unscoped().findOne({ where: { email: email.toLowerCase().trim() } });

        // Same generic message whether the account doesn't exist or the
        // password is wrong, so login can't be used to enumerate accounts.
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (user.isLocked()) {
            const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
            return res.status(423).json({
                message: `Account temporarily locked due to too many failed login attempts. Try again in ${minutesLeft} minute(s).`,
            });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: 'This account has been deactivated. Contact support.' });
        }

        // Strict role validation
        if (role && user.role !== role) {
            return res.status(401).json({ message: `Incorrect role selected. This account is registered as a ${user.role}.` });
        }

        const passwordMatches = await user.matchPassword(password);

        if (!passwordMatches) {
            user.failedLoginAttempts += 1;
            if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
                user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
                user.failedLoginAttempts = 0;
            }
            await user.save();
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        user.failedLoginAttempts = 0;
        user.lockUntil = null;
        user.lastLoginAt = new Date();
        await user.save();

        const accessToken = await issueTokens(req, res, user);

        res.json({
            ...user.toJSON(),
            token: accessToken,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Refresh access token using the httpOnly refresh-token cookie
// @route   POST /api/auth/refresh
// @access  Public (requires valid refresh cookie)
export const refreshToken = async (req, res) => {
    try {
        const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
        if (!rawToken) {
            return res.status(401).json({ message: 'No refresh token provided' });
        }

        const tokenHash = hashToken(rawToken);
        const stored = await RefreshToken.findOne({ where: { tokenHash } });

        if (!stored || !stored.isActive()) {
            // Reuse of a revoked/expired token is a strong signal of theft —
            // revoke the whole session family for this user defensively.
            if (stored) {
                await RefreshToken.update(
                    { revokedAt: new Date() },
                    { where: { userId: stored.userId, revokedAt: null } }
                );
            }
            res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
            return res.status(401).json({ message: 'Invalid or expired refresh token, please log in again' });
        }

        const user = await User.findByPk(stored.userId);
        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'Account no longer available' });
        }

        // Rotate: revoke the old refresh token and issue a brand new one.
        const { raw, tokenHash: newHash, expiresAt } = generateRefreshToken();
        stored.revokedAt = new Date();
        stored.replacedByTokenHash = newHash;
        await stored.save();

        await RefreshToken.create({
            userId: user.id,
            tokenHash: newHash,
            expiresAt,
            userAgent: req.headers['user-agent'] || null,
            ip: req.ip,
        });

        res.cookie(REFRESH_COOKIE_NAME, raw, refreshCookieOptions());

        const accessToken = generateAccessToken(user.id, user.role);
        res.json({ token: accessToken });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Log out — revoke the current refresh token
// @route   POST /api/auth/logout
// @access  Public
export const logoutUser = async (req, res) => {
    try {
        const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
        if (rawToken) {
            const tokenHash = hashToken(rawToken);
            await RefreshToken.update({ revokedAt: new Date() }, { where: { tokenHash } });
        }
        res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify email address
// @route   GET /api/auth/verify-email/:token
// @access  Public
export const verifyEmail = async (req, res) => {
    try {
        const tokenHash = hashToken(req.params.token);
        const user = await User.unscoped().findOne({
            where: {
                emailVerificationTokenHash: tokenHash,
                emailVerificationExpires: { [Op.gt]: new Date() },
            },
        });

        if (!user) {
            return res.status(400).json({ message: 'Verification link is invalid or has expired' });
        }

        user.isVerified = true;
        user.emailVerificationTokenHash = null;
        user.emailVerificationExpires = null;
        await user.save();

        res.json({ message: 'Email verified successfully. You can now log in.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Resend the email verification link
// @route   POST /api/auth/resend-verification
// @access  Public
export const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.unscoped().findOne({ where: { email: (email || '').toLowerCase().trim() } });

        // Respond the same way regardless of whether the account exists,
        // to avoid leaking which emails are registered.
        if (user && !user.isVerified) {
            const { raw, tokenHash, expiresAt } = generateSecureToken(24 * 60 * 60 * 1000);
            user.emailVerificationTokenHash = tokenHash;
            user.emailVerificationExpires = expiresAt;
            await user.save();
            await sendVerificationEmail(user, raw);
        }

        res.json({ message: 'If an account with that email exists and is unverified, a new link has been sent.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Request a password reset email
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.unscoped().findOne({ where: { email: (email || '').toLowerCase().trim() } });

        if (user) {
            const { raw, tokenHash, expiresAt } = generateSecureToken(60 * 60 * 1000);
            user.passwordResetTokenHash = tokenHash;
            user.passwordResetExpires = expiresAt;
            await user.save();
            await sendPasswordResetEmail(user, raw);
        }

        // Always return a generic success message — don't reveal account existence.
        res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset password using a token from the reset email
// @route   POST /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }

        const tokenHash = hashToken(req.params.token);
        const user = await User.unscoped().findOne({
            where: {
                passwordResetTokenHash: tokenHash,
                passwordResetExpires: { [Op.gt]: new Date() },
            },
        });

        if (!user) {
            return res.status(400).json({ message: 'Reset link is invalid or has expired' });
        }

        user.password = password; // hashed by the beforeSave hook
        user.passwordResetTokenHash = null;
        user.passwordResetExpires = null;
        user.failedLoginAttempts = 0;
        user.lockUntil = null;
        await user.save();

        // Invalidate every existing session — a leaked password shouldn't
        // leave old refresh tokens usable.
        await RefreshToken.update({ revokedAt: new Date() }, { where: { userId: user.id, revokedAt: null } });

        res.json({ message: 'Password reset successfully. Please log in with your new password.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Change password while logged in
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters long' });
        }

        const user = await User.unscoped().findByPk(req.user.id);
        if (!user || !(await user.matchPassword(currentPassword))) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save();

        await RefreshToken.update({ revokedAt: new Date() }, { where: { userId: user.id, revokedAt: null } });

        res.json({ message: 'Password changed successfully. Please log in again.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);

        if (user) {
            let profile = null;
            if (user.role === 'student') {
                profile = await Student.findOne({ where: { userId: user.id } });
            } else if (user.role === 'company') {
                profile = await Company.findOne({ where: { userId: user.id } });
            }

            res.json({
                ...user.toJSON(),
                profile,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
