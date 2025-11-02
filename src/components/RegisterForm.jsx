import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const ErrorMessage = React.memo(({ message }) => (
    message ? (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm mb-2" role="alert" aria-live="assertive" id="register-error">{message}</div>
    ) : null
));

const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);
const validatePassword = (password) => password.length >= 6;

const RegisterForm = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setError('');
        if (!name.trim()) {
            setError('Name is required.');
            return;
        }
        if (!validateEmail(email)) {
            setError('Please enter a valid email address.');
            return;
        }
        if (!validatePassword(password)) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        try {
            const res = await api.post('/auth/api/register', { name, email, password });
            const token = res.data?.data?.token || res.data?.token;
            if (token) {
                localStorage.setItem('token', token);
                navigate('/dashboard');
            } else {
                setError('Registration failed: No token received');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        }
    }, [name, email, password, confirmPassword, navigate]);

    return (
        <form onSubmit={handleSubmit} className="space-y-6" aria-labelledby="register-form-title">
            <h2 id="register-form-title" className="sr-only">Register Form</h2>
            <ErrorMessage message={error} />
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    autoComplete="name"
                    aria-label="Full Name"
                    aria-describedby={error ? 'register-error' : undefined}
                    className="w-full px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
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
                    aria-describedby={error ? 'register-error' : undefined}
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
                    autoComplete="new-password"
                    aria-label="Password"
                    aria-describedby={error ? 'register-error' : undefined}
                    className="w-full px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
                <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    autoComplete="new-password"
                    aria-label="Confirm Password"
                    aria-describedby={error ? 'register-error' : undefined}
                    className="w-full px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded font-semibold hover:bg-indigo-700 transition">Register</button>
        </form>
    );
};

export default RegisterForm;
