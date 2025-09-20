import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

// Reusable error feedback component
const ErrorMessage = React.memo(({ message }) => (
    message ? (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm mb-2" role="alert" aria-live="assertive" id="login-error">{message}</div>
    ) : null
));

const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!validateEmail(email)) {
            setError('Please enter a valid email address.');
            return;
        }
        if (password.length < 2) {
            setError('Password must be at least 6 characters.');
            return;
        }
        try {
            const res = await api.post('/auth/api/login', { email, password });
            const token = res.data.data?.token;
            if (token) {
                localStorage.setItem('token', token);
                navigate('/dashboard');
            } else {
                setError('Login failed: No token received');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        }
    }, [email, password, navigate]);

    return (
        <form onSubmit={handleSubmit} className="space-y-6" aria-labelledby="login-form-title">
            <h2 id="login-form-title" className="sr-only">Login Form</h2>
            <ErrorMessage message={error} />
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                    aria-label="Email Address"
                    aria-describedby={error ? 'login-error' : undefined}
                    className="w-full px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    aria-label="Password"
                    aria-describedby={error ? 'login-error' : undefined}
                    className="w-full px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded font-semibold hover:bg-indigo-700 transition">Login</button>
        </form>
    );
};

export default LoginForm;
