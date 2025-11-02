import React from 'react';

const AuthTabs = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'login', label: 'Login' },
        { id: 'register', label: 'Register' }
    ];

    return (
        <div className="flex mb-8 justify-center space-x-4">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`px-6 py-2 font-semibold rounded-md transition ${
                        activeTab === tab.id
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'text-gray-600 hover:text-indigo-600'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

export default AuthTabs;