import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { clearAuthData } from '../utils/tokenUtils.jsx';

// Dev-only guard to avoid double effect run in React 18 StrictMode
let shouldSkipNextEffectInDev = true;

const ErrorMessage = React.memo(({ message }) => (
    message ? (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm mb-2" role="alert" aria-live="assertive" id="secrets-error">{message}</div>
    ) : null
));

const computeStrength = (pwd) => {
    if (!pwd) return 'Weak';
    const length = pwd.length;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNum = /\d/.test(pwd);
    const hasSym = /[^A-Za-z0-9]/.test(pwd);
    const score = [hasUpper, hasLower, hasNum, hasSym].filter(Boolean).length + (length > 12 ? 1 : length > 8 ? 0.5 : 0);
    if (score >= 3.5) return 'Strong';
    if (score >= 2.5) return 'Medium';
    return 'Weak';
};
const getStrengthColor = (strength) => {
    switch (strength) {
        case 'Strong': return 'text-green-600';
        case 'Medium': return 'text-yellow-600';
        default: return 'text-red-600';
    }
};

const CopyButton = React.memo(({ text, type, secretId, isCopied, onCopy }) => (
    <button
        type="button"
        onClick={() => onCopy(text, type, secretId)}
        className="ml-2 p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
        title={`Copy ${type}`}
        aria-label={`Copy ${type}`}
    >
        {isCopied ? (
            <span aria-label="Copied" role="img">✅</span>
        ) : (
            <span aria-label="Copy" role="img">📋</span>
        )}
    </button>
));

const SecretsDashboard = () => {
    const [secrets, setSecrets] = useState([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [editSecret, setEditSecret] = useState(null);
    const [editForm, setEditForm] = useState({ title: '', username: '', password: '', email: '', website: '', note: '', url: '' });

    // Create panel state
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ title: '', username: '', password: '', email: '', website: '', note: '', url: '' });
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState('');

    // New states for password visibility and copy functionality
    const [visiblePasswords, setVisiblePasswords] = useState({});
    const [copiedItems, setCopiedItems] = useState({});

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSecret, setSelectedSecret] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const navigate = useNavigate();

    // Throttling and retry guards to avoid rate limiting
    const inFlightRef = useRef(false);
    const lastFetchAtRef = useRef(0);
    const retryCountRef = useRef(0);
    const retryTimeoutRef = useRef(null);

    // Debounced search
    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Modularized fetch secrets with proper type checking
    const fetchSecrets = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await api.get('/secret/api/list');
            // Ensure we always set an array
            const secretsData = res?.data?.data?.secrets || res?.data?.data || [];
            setSecrets(Array.isArray(secretsData) ? secretsData : []);
        } catch (err) {
            if (err?.response?.status === 401) {
                clearAuthData();
                navigate('/');
            } else {
                setError(err?.response?.data?.message || 'Failed to fetch secrets');
            }
            // On error, ensure secrets is at least an empty array
            setSecrets([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Memoized filtered secrets with proper type checking
    const filteredSecrets = useMemo(() => {
        // Ensure secrets is always an array
        const secretsArray = Array.isArray(secrets) ? secrets : [];
        if (!debouncedSearch) return secretsArray;
        return secretsArray.filter(secret =>
            (secret?.title || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            (secret?.username || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            (secret?.email || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            (secret?.website || '').toLowerCase().includes(debouncedSearch.toLowerCase())
        );
    }, [secrets, debouncedSearch]);

    // Password visibility toggle
    const togglePasswordVisibility = useCallback((secretId) => {
        setVisiblePasswords(prev => ({
            ...prev,
            [secretId]: !prev[secretId]
        }));
    }, []);

    // Copy to clipboard functionality
    const copyToClipboard = useCallback(async (text, type, secretId) => {
        try {
            await navigator.clipboard.writeText(text);
            const key = `${secretId}-${type}`;
            setCopiedItems(prev => ({ ...prev, [key]: true }));
            setTimeout(() => {
                setCopiedItems(prev => ({ ...prev, [key]: false }));
            }, 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    }, []);


    useEffect(() => {
        fetchSecrets();
        // In React 18 StrictMode (dev), effects run twice. Skip the first run to avoid duplicate loads.
        if (import.meta?.env?.MODE !== 'production' && shouldSkipNextEffectInDev) {
            shouldSkipNextEffectInDev = false
            return
        }

        let cancelled = false
        const MIN_FETCH_INTERVAL_MS = 800
        const inFlightRefLocal = inFlightRef
        const lastFetchAtRefLocal = lastFetchAtRef
        const retryCountRefLocal = retryCountRef
        const retryTimeoutRefLocal = retryTimeoutRef

        const scheduleRetry = (delayMs) => {
            if (retryTimeoutRefLocal.current) clearTimeout(retryTimeoutRefLocal.current)
            retryTimeoutRefLocal.current = setTimeout(() => {
                if (!cancelled) fetchSecrets()
            }, delayMs)
        }


        fetchSecrets()
        return () => {
            cancelled = true
            if (retryTimeoutRefLocal.current) clearTimeout(retryTimeoutRefLocal.current)
            // Reset dev guard after a real effect run so future mounts still skip the first dev run
            if (import.meta?.env?.MODE !== 'production') {
                shouldSkipNextEffectInDev = true
            }
        }
    }, [navigate])

    const handleDelete = async (id) => {
        try {
            await api.delete(`/secret/api/delete/${id}`)
            setSecrets(prev => {
                const beforeLen = prev.length
                const next = prev.filter(s => String(s.id) !== String(id))
                // If nothing was removed (possible id type mismatch or stale list), fall back to refetch
                if (next.length === beforeLen) {
                    // Best-effort refresh without blocking UX
                    api.get('/secret/api/list')
                        .then(res => setSecrets(res.data?.data?.secrets || []))
                        .catch(() => {/* ignore */})
                }
                return next
            })
            // If the selected secret is the one deleted, clear it
            setSelectedSecret(prev => (prev && String(prev.id) === String(id) ? null : prev))
        } catch (err) {
            const msg = err.response?.data?.message || err.message
            setError(msg)
        }
    }

    const openEditForm = (secret) => {
        setEditSecret(secret)
        setEditForm({ ...secret })
    }

    const handleEditChange = (e) => {
        const { name, value } = e.target
        setEditForm(prev => ({
            ...prev,
            [name]: value,
            // Auto-populate url when website is changed
            ...(name === 'website' && { url: value })
        }))
    }

    const handleEditSubmit = async (e) => {
        e.preventDefault()
        try {
            const { id, ...updatedData } = editForm
            // Ensure url is included in the update
            const dataToSend = {
                ...updatedData,
                url: updatedData.url || updatedData.website
            }
            const res = await api.put(`/secret/api/update/${id}`, dataToSend)
            const apiUpdated = res?.data?.data?.secret || res?.data?.secret || null
            const updatedSecret = apiUpdated ? { ...editSecret, ...apiUpdated } : { ...editSecret, ...updatedData, id }
            setSecrets(prev => prev.map(secret => {
                if (secret.id === id) {
                    return updatedSecret
                }
                return secret
            }))
            // Update selectedSecret if it's the one being edited
            if (selectedSecret?.id === id) {
                setSelectedSecret(updatedSecret)
            }
            setEditSecret(null)
            setError('') // clear any previous error
        } catch (err) {
            const msg = err.response?.data?.message || err.message
            setError(msg)
        }
    };

    // Create form handlers
    const handleCreateChange = (e) => {
        const { name, value } = e.target
        setCreateForm(prev => ({
            ...prev,
            [name]: value,
            // Auto-populate url when website is changed
            ...(name === 'website' && { url: value })
        }))
    }

    const resetCreateForm = () => {
        setCreateForm({ title: '', username: '', password: '', email: '', website: '', note: '', url: '' })
        setCreateError('')
        setCreateLoading(false)
    }

    const closeCreatePanel = () => {
        setShowCreate(false)
        resetCreateForm()
    }

    const refreshSecretsAfterCreate = async () => {
        // After creating, avoid hammering the list endpoint which may be rate limited.
        // Respect Retry-After when present and use a short capped exponential backoff.
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
        let attempt = 0
        let delay = 600 // start with a short delay so the server can settle
        const MAX_RETRIES = 3
        while (attempt <= MAX_RETRIES) {
            try {
                if (attempt > 0) {
                    await sleep(delay)
                } else {
                    // tiny initial delay even before first attempt to reduce immediate 429 after POST
                    await sleep(300)
                }
                const res = await api.get('/secret/api/list')
                setSecrets(res.data?.data?.secrets || [])
                setError('')
                return
            } catch (err) {
                const status = err?.response?.status
                if (status === 429 && attempt < MAX_RETRIES) {
                    const retryAfter = err.response?.headers?.['retry-after']
                    const parsed = Number(retryAfter)
                    // if server suggests a wait, honor it (seconds)
                    if (!Number.isNaN(parsed) && parsed > 0) {
                        delay = Math.max(delay * 2, parsed * 1000)
                    } else {
                        delay = Math.min(delay * 2, 4000)
                    }
                    attempt += 1
                    continue
                }
                // Don't override a visible createError, but show a general error if needed
                const msg = err?.response?.data?.message || err.message
                setError(msg)
                return
            }
        }
    }

    const handleCreateSubmit = async (e) => {
        e.preventDefault()
        if (createLoading) return
        setCreateLoading(true)
        setCreateError('')
        try {
            await api.post('/secret/api/create', {
                title: createForm.title,
                username: createForm.username,
                password: createForm.password,
                note: createForm.note,
                email: createForm.email,
                website: createForm.website,
                url: createForm.url || createForm.website,
            })
            await refreshSecretsAfterCreate()
            closeCreatePanel()
        } catch (err) {
            const status = err?.response?.status
            if (status === 429) {
                const retryAfter = err.response?.headers?.['retry-after']
                let msg = 'Too many requests. Please wait a moment and try again.'
                if (retryAfter) msg += ` Retry after ${retryAfter} seconds.`
                setCreateError(msg)
            } else if (status === 401) {
                setCreateError('Your session expired. Please log in again.')
                clearAuthData()
                navigate('/')
                return
            } else {
                const msg = err.response?.data?.message || err.message
                setCreateError(msg)
            }
        } finally {
            setCreateLoading(false)
        }
    }


    return (
        <div className="min-h-screen bg-gray-50" aria-labelledby="secrets-dashboard-title">
            <div className="flex items-center justify-between mb-4">
                <h1 id="secrets-dashboard-title" className="text-2xl font-bold">Secrets Dashboard</h1>
                <button
                    type="button"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    onClick={() => setShowCreate(true)}
                    aria-label="Add Secret"
                    title="Add a new secret"
                >
                    + Add Secret
                </button>
            </div>
            <div className="mb-6">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search by title, username, email, or website..."
                    className="w-full max-w-md border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-400"
                    aria-label="Search secrets"
                />
            </div>
            <ErrorMessage message={error} />
            <nav aria-label="Password list navigation">
                {isLoading ? (
                    <div className="text-center text-gray-500 py-8" role="status" aria-live="polite">Loading secrets...</div>
                ) : filteredSecrets.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-4xl mb-2" aria-label="No secrets" role="img">🔒</div>
                        <div className="text-lg text-gray-700 mb-4">No secrets found.</div>
                        <button
                            type="button"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            onClick={() => setShowCreate(true)}
                            aria-label="Add your first secret"
                        >
                            Add your first secret
                        </button>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {filteredSecrets.map((secret) => {
                            const strength = computeStrength(secret.password);
                            const key = `${secret.id}-password`;
                            return (
                                <li key={secret.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSecret(selectedSecret?.id === secret.id ? null : secret)}
                                        className={`w-full p-4 text-left cursor-pointer hover:bg-gray-50 transition-all duration-200 ${
                                            selectedSecret?.id === secret.id
                                                ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                                : 'hover:border-gray-300'
                                        }`}
                                        aria-label={`View details for ${secret.title || secret.website || 'Untitled'}`}
                                        title="View secret details"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <span className="text-xl" aria-label="Password icon" role="img">🔑</span>
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900 truncate">
                                                        {secret.title || secret.website || 'Untitled'}
                                                    </div>
                                                    {secret.username || secret.email ? (
                                                        <div className="text-xs text-gray-500 truncate mt-0.5">
                                                            {secret.username || secret.email}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                                    strength === 'Strong' ? 'bg-green-100 text-green-700' :
                                                        strength === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                }`} title={`Password strength: ${strength}`}>{strength}</span>
                                                <span className={`text-gray-400 transition-transform duration-200 ${
                                                    selectedSecret?.id === secret.id ? 'rotate-180' : ''
                                                }`}>
                                                    ▼
                                                </span>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Expanded details */}
                                    {selectedSecret?.id === secret.id && (
                                        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-sm font-semibold text-gray-900">Password Details</h4>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedSecret(null); }}
                                                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full p-1 transition-colors"
                                                >
                                                    ✕
                                                </button>
                                            </div>

                                            {/* Website URL */}
                                            {secret.website && (
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-medium text-gray-700">Website</label>
                                                    <div className="flex items-center space-x-2">
                                                        <input
                                                            type="text"
                                                            value={secret.website}
                                                            readOnly
                                                            className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-md focus:outline-none"
                                                        />
                                                        <CopyButton text={secret.website} type="website" secretId={secret.id} />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Username */}
                                            {(secret.username || secret.email) && (
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-medium text-gray-700">Username</label>
                                                    <div className="flex items-center space-x-2">
                                                        <input
                                                            type="text"
                                                            value={secret.username || secret.email}
                                                            readOnly
                                                            className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-md focus:outline-none"
                                                        />
                                                        <CopyButton text={secret.username || secret.email} type="username" secretId={secret.id} />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Password */}
                                            {secret.password && (
                                                <div className="space-y-1">
                                                    <label className="block text-xs font-medium text-gray-700">Password</label>
                                                    <div className="flex items-center space-x-2">
                                                        <input
                                                            type={visiblePasswords[secret.id] ? 'text' : 'password'}
                                                            value={secret.password}
                                                            readOnly
                                                            className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-md focus:outline-none"
                                                        />
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); togglePasswordVisibility(secret.id); }}
                                                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white border border-gray-200 rounded-md transition-colors"
                                                        >
                                                            {visiblePasswords[secret.id] ? '🙈' : '👁️'}
                                                        </button>
                                                        <CopyButton text={secret.password} type="password" secretId={secret.id} />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Password Strength */}
                                            <div className="space-y-2">
                                                <label className="block text-xs font-medium text-gray-700">Password Strength</label>
                                                <div className="flex items-center space-x-3">
                                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full transition-all duration-300 ${
                                                                computeStrength(secret.password) === 'Strong'
                                                                    ? 'bg-green-500 w-full'
                                                                    : computeStrength(secret.password) === 'Medium'
                                                                        ? 'bg-yellow-500 w-2/3'
                                                                        : 'bg-red-500 w-1/3'
                                                            }`}
                                                        ></div>
                                                    </div>
                                                    <span className={`text-sm font-medium ${getStrengthColor(computeStrength(secret.password))}`}>
                                        {computeStrength(secret.password)}
                                    </span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex space-x-3 pt-3 border-t border-gray-200">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openEditForm(secret); }}
                                                    className="flex-1 px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(secret); }}
                                                    className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </nav>
            {/* Create secret panel */}
            {showCreate && (
                <div className="fixed right-0 top-16 z-40 h-[calc(100vh-64px)] w-full max-w-md bg-white shadow-xl border-l p-5 overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Create Secret</h2>
                        <button onClick={closeCreatePanel} className="text-gray-500 hover:text-gray-700">✕</button>
                    </div>
                    {createError && (
                        <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-sm">{createError}</div>
                    )}
                    <form onSubmit={handleCreateSubmit} className="space-y-3 text-sm">
                        {['title','username','password','email','website'].map((field) => (
                            <div key={field}>
                                <label className="block font-medium capitalize mb-1">{field}</label>
                                <input
                                    type={field === 'password' ? 'password' : 'text'}
                                    name={field}
                                    value={createForm[field]}
                                    onChange={handleCreateChange}
                                    required={field === 'title'}
                                    className="w-full border border-gray-300 p-2 rounded"
                                />
                            </div>
                        ))}
                        <div>
                            <label className="block font-medium mb-1">Note</label>
                            <textarea
                                name="note"
                                value={createForm.note}
                                onChange={handleCreateChange}
                                className="w-full border border-gray-300 p-2 rounded min-h-[80px]"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={closeCreatePanel} className="bg-gray-500 text-white px-4 py-2 rounded">
                                Cancel
                            </button>
                            <button type="submit" disabled={createLoading} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded">
                                {createLoading ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {editSecret && (
                <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-center justify-center z-50" onClick={() => setEditSecret(null)}>
                    <form onClick={(e) => e.stopPropagation()} onSubmit={handleEditSubmit} className="bg-white p-6 rounded shadow w-full max-w-sm space-y-4">
                        <h2 className="text-lg font-bold">Edit Secret</h2>
                        {['title', 'username', 'password', 'email', 'website'].map(field => (
                            <div key={field}>
                                <label className="block text-sm font-medium capitalize">{field}</label>
                                <input
                                    type={field === 'password' ? 'password' : field === 'email' ? 'email' : field === 'website' ? 'url' : 'text'}
                                    name={field}
                                    value={editForm[field] ?? ''}
                                    onChange={handleEditChange}
                                    className="w-full border border-gray-300 p-2 rounded text-sm"
                                />
                            </div>
                        ))}
                        <div>
                            <label className="block text-sm font-medium">Note</label>
                            <textarea
                                name="note"
                                value={editForm.note ?? ''}
                                onChange={handleEditChange}
                                className="w-full border border-gray-300 p-2 rounded text-sm min-h-[80px]"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setEditSecret(null)} className="bg-gray-500 text-white px-4 py-2 text-sm rounded">
                                Cancel
                            </button>
                            <button type="submit" className="bg-blue-600 text-white px-4 py-2 text-sm rounded">
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {deleteTarget && (
                <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-center justify-center z-50" onClick={() => setDeleteTarget(null)}>
                    <div className="bg-white p-6 rounded shadow w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-bold mb-2">Delete Secret</h2>
                        <p className="text-sm text-gray-700 mb-4">Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.</p>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setDeleteTarget(null)} className="bg-gray-500 text-white px-4 py-2 text-sm rounded">Cancel</button>
                            <button
                                type="button"
                                onClick={async () => { await handleDelete(deleteTarget.id); setDeleteTarget(null); setSelectedSecret(null); }}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm rounded"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SecretsDashboard
