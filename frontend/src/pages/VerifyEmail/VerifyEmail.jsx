import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../utils/api';
import '../Login/Login.css';

const VerifyEmail = () => {
    const { token } = useParams();
    const [status, setStatus] = useState('verifying'); // verifying | success | error
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verify = async () => {
            try {
                const { data } = await api.get(`/auth/verify-email/${token}`);
                setStatus('success');
                setMessage(data.message);
            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Verification link is invalid or has expired');
            }
        };
        verify();
    }, [token]);

    return (
        <div className="login-page-wrapper">
            <div className="login-card-modern">
                <div className="login-logo-circle">
                    <div className="logo-cutout"></div>
                </div>
                <h2>Email Verification</h2>
                <p className="login-subtitle">
                    {status === 'verifying' && 'Verifying your email...'}
                    {status !== 'verifying' && message}
                </p>

                {status === 'success' && (
                    <Link to="/login" className="btn-signin-blue" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                        Go to Sign In
                    </Link>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;
