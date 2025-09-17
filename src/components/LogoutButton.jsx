import React from 'react';
import { useNavigate } from 'react-router-dom';

const LogoutButton = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    return (
        <button
            onClick={handleLogout}
            className="group flex items-center space-x-3 px-4 py-3 rounded-lg bg-gray-700/50 hover:bg-red-600 transition-all duration-200 transform hover:translate-x-1 hover:shadow-lg w-full"
        >
            <svg className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium text-gray-200 group-hover:text-white transition-colors">
                Logout
            </span>
        </button>
    );
};

export default LogoutButton;