import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import LogoutButton from '../components/LogoutButton';

const Layout = () => {
    return (
        <div className="min-h-screen">
            {/* Fixed Sidebar */}
            <aside className="fixed inset-y-0 left-0 w-60 bg-gradient-to-b rounded-r-2xl from-gray-800 to-gray-900 text-white p-4 space-y-6 flex flex-col shadow-xl z-40">
                <h1 className="text-xl font-bold text-center py-2">🔐 Password Manager</h1>

                <nav className="space-y-3 flex-grow">
                    <Link
                        to="/dashboard"
                        className="group flex items-center space-x-3 px-4 py-3 rounded-lg bg-gray-700/50 hover:bg-blue-600 transition-all duration-200 transform hover:translate-x-1 hover:shadow-lg"
                    >
                        <svg className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="font-medium text-gray-200 group-hover:text-white transition-colors">
                Secrets
            </span>
                    </Link>

                    <Link
                        to="/generate"
                        className="group flex items-center space-x-3 px-4 py-3 rounded-lg bg-gray-700/50 hover:bg-green-600 transition-all duration-200 transform hover:translate-x-1 hover:shadow-lg"
                    >
                        <svg className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        <span className="font-medium text-gray-200 group-hover:text-white transition-colors">
                Generate Password
            </span>
                    </Link>
                </nav>
                <LogoutButton />
            </aside>
            {/* Scrollable Main area with left offset matching aside */}
            <main className="ml-60 p-6 bg-gray-100 h-screen overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
