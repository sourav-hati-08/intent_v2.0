import nodemailer from 'nodemailer';

let transporterPromise = null;

const getTransporter = () => {
    if (transporterPromise) return transporterPromise;

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporterPromise = Promise.resolve(
            nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT || 587),
                secure: Number(process.env.SMTP_PORT) === 465,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            })
        );
    } else {
        // No SMTP configured (e.g. local dev) — fall back to a disposable
        // Ethereal test inbox so the app still "sends" mail and prints a
        // preview link to the console instead of crashing.
        transporterPromise = nodemailer.createTestAccount().then((testAccount) =>
            nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: { user: testAccount.user, pass: testAccount.pass },
            })
        );
    }
    return transporterPromise;
};

export const sendEmail = async ({ to, subject, html, text }) => {
    try {
        const transporter = await getTransporter();
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Intent" <no-reply@intent.local>',
            to,
            subject,
            text,
            html,
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log(`Email preview (no SMTP configured): ${previewUrl}`);
        }
        return info;
    } catch (error) {
        // Never let email delivery failures break the request/response cycle.
        console.error('Email send failed:', error.message);
        return null;
    }
};

export const sendVerificationEmail = async (user, rawToken) => {
    const url = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email/${rawToken}`;
    await sendEmail({
        to: user.email,
        subject: 'Verify your Intent account',
        html: `<p>Hi ${user.name},</p>
               <p>Please verify your email by clicking the link below (expires in 24 hours):</p>
               <p><a href="${url}">${url}</a></p>`,
        text: `Verify your account: ${url}`,
    });
};

export const sendPasswordResetEmail = async (user, rawToken) => {
    const url = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${rawToken}`;
    await sendEmail({
        to: user.email,
        subject: 'Reset your Intent password',
        html: `<p>Hi ${user.name},</p>
               <p>You requested a password reset. This link expires in 1 hour:</p>
               <p><a href="${url}">${url}</a></p>
               <p>If you did not request this, you can safely ignore this email.</p>`,
        text: `Reset your password: ${url}`,
    });
};

export default sendEmail;
