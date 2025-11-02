import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const Layout = () => {
    return (
        <div className="min-h-screen">
            <Sidebar />
            <main className="ml-60 p-6 bg-gray-100 h-screen overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
