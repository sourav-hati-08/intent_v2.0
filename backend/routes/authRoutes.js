import express from 'express';
import {
    registerUser,
    loginUser,
    refreshToken,
    logoutUser,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    changePassword,
    getUserProfile,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { loginLimiter, registerLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', registerLimiter, registerUser);
router.post('/login', loginLimiter, loginUser);
router.post('/refresh', refreshToken);
router.post('/logout', logoutUser);

router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', passwordResetLimiter, resendVerification);

router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password/:token', resetPassword);

router.get('/profile', protect, getUserProfile);
router.put('/change-password', protect, changePassword);

export default router;
