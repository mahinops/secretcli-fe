import React, { useState } from 'react';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import AuthTabs from '../components/AuthTabs';

export default function Auth() {
    const [activeTab, setActiveTab] = useState('login');

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
                <AuthTabs activeTab={activeTab} onTabChange={setActiveTab} />
                {activeTab === 'login' ? <LoginForm /> : <RegisterForm />}
            </div>
        </div>
    );
}
