import React, { useRef, useState, useCallback, useMemo } from 'react';
import api from '../api';

const ErrorMessage = React.memo(({ message }) => (
    message ? (
        <div className="text-red-600 text-sm mt-2" role="alert" aria-live="assertive" id="passwordgen-error">{message}</div>
    ) : null
));

const PasswordGenerator = () => {
    const [length, setLength] = useState(12);
    const [includeSpecial, setIncludeSpecial] = useState(true);
    const [generated, setGenerated] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(false);
    const inFlightRef = useRef(false);
    const COOLDOWN_MS = useMemo(() => 600, []);

    const startCooldown = useCallback((ms = COOLDOWN_MS) => {
        setCooldown(true);
        setTimeout(() => setCooldown(false), ms);
    }, [COOLDOWN_MS]);

    const generatePassword = useCallback(async () => {
        if (inFlightRef.current || loading || cooldown) return;
        if (length < 6 || length > 64) {
            setError('Password length must be between 6 and 64.');
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
            const pwd = res?.data?.data?.password;
            if (!pwd) throw new Error('Invalid response format');
            setGenerated(pwd);
            setCopied(false);
        } catch (err) {
            const status = err?.response?.status;
            if (status === 429) {
                setError('Too many requests. Please wait a moment before trying again.');
                startCooldown(3000);
            } else {
                setError('Failed to generate password. Please try again.');
            }
            console.error('Failed to generate password:', err);
        } finally {
            setLoading(false);
            inFlightRef.current = false;
        }
    }, [length, includeSpecial, loading, cooldown, startCooldown]);

    const copyToClipboard = useCallback(() => {
        if (!generated) return;
        navigator.clipboard.writeText(generated).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }, [generated]);

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg max-w-lg w-full mx-auto mt-10" aria-labelledby="passwordgen-title">
            <h2 id="passwordgen-title" className="text-xl font-semibold text-gray-800 mb-4">🔐 Password Generator</h2>
            <div className="space-y-4">
                <div>
                    <label htmlFor="passwordgen-length" className="block mb-1 font-medium text-sm text-gray-700">Password Length</label>
                    <input
                        id="passwordgen-length"
                        type="number"
                        min={6}
                        max={64}
                        value={length}
                        onChange={e => setLength(Number(e.target.value))}
                        className="border border-gray-300 px-4 py-2 rounded-md w-full"
                        aria-label="Password Length"
                        aria-describedby={error ? 'passwordgen-error' : undefined}
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <input
                        id="passwordgen-special"
                        type="checkbox"
                        checked={includeSpecial}
                        onChange={() => setIncludeSpecial(!includeSpecial)}
                        className="h-4 w-4 text-indigo-600"
                        aria-label="Include special symbols"
                    />
                    <label htmlFor="passwordgen-special" className="text-sm text-gray-700">Include special symbols</label>
                </div>
                <button
                    type="button"
                    onClick={generatePassword}
                    disabled={loading || cooldown}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2 rounded-md transition disabled:opacity-50"
                    aria-busy={loading}
                >
                    {loading ? 'Generating...' : cooldown ? 'Please wait…' : 'Generate Password'}
                </button>
                <ErrorMessage message={error} />
                {generated && (
                    <div className="mt-4 flex items-center space-x-2">
                        <input
                            type="text"
                            value={generated}
                            readOnly
                            className="border border-gray-300 px-4 py-2 rounded-md w-full font-mono text-lg bg-gray-50"
                            aria-label="Generated password"
                        />
                        <button
                            type="button"
                            onClick={copyToClipboard}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md font-medium"
                            aria-label={copied ? 'Password copied' : 'Copy password'}
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PasswordGenerator;
