import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import '../Login/Login.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const submitHandler = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.post('/auth/forgot-password', { email });
            toast.success(data.message);
            setSubmitted(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page-wrapper">
            <div className="login-card-modern">
                <div className="login-logo-circle">
                    <div className="logo-cutout"></div>
                </div>
                <h2>Forgot Password</h2>
                <p className="login-subtitle">
                    {submitted
                        ? "If an account with that email exists, we've sent a reset link."
                        : "Enter your email and we'll send you a reset link"}
                </p>

                {!submitted && (
                    <form onSubmit={submitHandler} className="login-form-modern">
                        <div className="form-group-modern">
                            <label>Email</label>
                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="btn-signin-blue" disabled={loading}>
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                )}

                <div className="login-footer-modern">
                    <Link to="/login">Back to Sign In</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
