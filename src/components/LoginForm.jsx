import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/auth/api/login', { email, password });
            console.log('Login response:', res.data);

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
    };


    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
                    {error}
                </div>
            )}
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                </label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                </label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full px-4 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 rounded hover:bg-indigo-700 transition"
            >
                Sign In
            </button>
        </form>
    );
};

export default LoginForm;
