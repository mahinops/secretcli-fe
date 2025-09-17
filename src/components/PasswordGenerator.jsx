import React, { useRef, useState } from 'react';
import api from '../api';

const PasswordGenerator = () => {
    const [length, setLength] = useState(12);
    const [includeSpecial, setIncludeSpecial] = useState(true);
    const [generated, setGenerated] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(false);

    // Guard against double clicks and rapid firing before state updates
    const inFlightRef = useRef(false);
    const COOLDOWN_MS = 600; // throttle to ~1 request/second

    const startCooldown = (ms = COOLDOWN_MS) => {
        setCooldown(true);
        setTimeout(() => setCooldown(false), ms);
    };

    const generatePassword = async () => {
        // Prevent spamming and concurrent requests
        if (inFlightRef.current || loading || cooldown) {
            return;
        }
        inFlightRef.current = true;
        setLoading(true);
        startCooldown();
        try {
            setError('');
            const res = await api.post('/secret/api/generatepassword', {
                length,
                include_special_symbol: includeSpecial,
            });
            // API returns { code, message, data: { password } }
            const pwd = res?.data?.data?.password;
            if (!pwd) {
                throw new Error('Invalid response format');
            }
            setGenerated(pwd);
            setCopied(false);
        } catch (err) {
            // Provide clearer feedback on rate limit responses
            const status = err?.response?.status;
            if (status === 429) {
                setError('Too many requests. Please wait a moment before trying again.');
                // extend cooldown when rate limited
                startCooldown(3000);
            } else {
                setError('Failed to generate password. Please try again.');
            }
            console.error('Failed to generate password:', err);
        } finally {
            setLoading(false);
            inFlightRef.current = false;
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generated).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg max-w-lg w-full mx-auto mt-10">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">🔐 Password Generator</h2>
            <div className="space-y-4">
                <div>
                    <label className="block mb-1 font-medium text-sm text-gray-700">Password Length</label>
                    <input
                        type="number"
                        min={6}
                        max={64}
                        value={length}
                        onChange={(e) => setLength(Number(e.target.value))}
                        className="border border-gray-300 px-4 py-2 rounded-md w-full"
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={includeSpecial}
                        onChange={() => setIncludeSpecial(!includeSpecial)}
                        className="h-4 w-4 text-indigo-600"
                    />
                    <label className="text-sm text-gray-700">Include special symbols</label>
                </div>
                <button
                    onClick={generatePassword}
                    disabled={loading || cooldown}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2 rounded-md transition disabled:opacity-50"
                >
                    {loading ? 'Generating...' : cooldown ? 'Please wait…' : 'Generate Password'}
                </button>
                {error && (
                    <div className="text-red-600 text-sm mt-2" role="alert" aria-live="polite">{error}</div>
                )}
                {generated && (
                    <div className="mt-4">
                        <div className="bg-gray-100 border text-sm rounded flex items-center justify-between px-4 py-2">
                            <span className="break-all">{generated}</span>
                            <button
                                onClick={copyToClipboard}
                                className="text-indigo-600 text-xs ml-4 hover:underline"
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PasswordGenerator;
