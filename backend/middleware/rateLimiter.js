import rateLimit from 'express-rate-limit';

// Generic API-wide limiter — generous, just to blunt basic abuse/scraping.
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' },
});

// Tight limiter for login — the main brute-force target.
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
});

// Registration abuse / mass account creation.
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many accounts created from this address. Please try again later.' },
});

// Password-reset requests — prevents email-bombing a target inbox.
export const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many password reset requests. Please try again later.' },
});
