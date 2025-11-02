import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import LogoutButton from './LogoutButton';

const NavItem = ({ to, icon, label, activeColor = 'blue' }) => {
    const location = useLocation();
    const isActive = location.pathname === to;
    
    return (
        <li>
            <Link
                to={to}
                className={`group flex items-center space-x-3 px-4 py-3 rounded-lg bg-gray-700/50 hover:bg-${activeColor}-600 transition-all duration-200 transform hover:translate-x-1 hover:shadow-lg${isActive ? ` bg-${activeColor}-600` : ''}`}
                aria-current={isActive ? 'page' : undefined}
            >
                {icon}
                <span className="font-medium text-gray-200 group-hover:text-white transition-colors">{label}</span>
            </Link>
        </li>
    );
};

const Sidebar = () => {
    const lockIcon = (
        <svg className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
    );

    const keyIcon = (
        <svg className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
    );

    return (
        <aside className="fixed inset-y-0 left-0 w-60 bg-gradient-to-b rounded-r-2xl from-gray-800 to-gray-900 text-white p-4 space-y-6 flex flex-col shadow-xl z-40" aria-label="Main sidebar navigation">
            <h1 className="text-xl font-bold text-center py-2" aria-label="Password Manager">🔐 Password Manager</h1>
            <nav className="space-y-3 flex-grow" aria-label="Main navigation">
                <ul>
                    <NavItem to="/dashboard" icon={lockIcon} label="Secrets" activeColor="blue" />
                    <NavItem to="/generate" icon={keyIcon} label="Generate Password" activeColor="green" />
                </ul>
            </nav>
            <LogoutButton />
        </aside>
    );
};

export default Sidebar;