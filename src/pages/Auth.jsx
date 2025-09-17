import React, { useState } from 'react';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';

export default function Auth() {
    const [activeTab, setActiveTab] = useState('login');

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
                <div className="flex mb-8 justify-center space-x-4">
                    <button
                        onClick={() => setActiveTab('login')}
                        className={`px-6 py-2 font-semibold rounded-md transition ${
                            activeTab === 'login'
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-gray-600 hover:text-indigo-600'
                        }`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => setActiveTab('register')}
                        className={`px-6 py-2 font-semibold rounded-md transition ${
                            activeTab === 'register'
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-gray-600 hover:text-indigo-600'
                        }`}
                    >
                        Register
                    </button>
                </div>

                {activeTab === 'login' ? <LoginForm /> : <RegisterForm />}
            </div>
        </div>
    );
}
