import React, { useEffect, useState, useRef } from 'react'
import api from '../api'
import { useNavigate } from "react-router-dom"
import { clearAuthData } from "../utils/tokenUtils.jsx"

// Dev-only guard to avoid double effect run in React 18 StrictMode
let shouldSkipNextEffectInDev = true

const SecretsDashboard = () => {
    const [secrets, setSecrets] = useState([])
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [editSecret, setEditSecret] = useState(null)
    const [editForm, setEditForm] = useState({ title: '', username: '', password: '', email: '', website: '', note: '' })

    // Create panel state
    const [showCreate, setShowCreate] = useState(false)
    const [createForm, setCreateForm] = useState({ title: '', username: '', password: '', email: '', website: '', note: '' })
    const [createLoading, setCreateLoading] = useState(false)
    const [createError, setCreateError] = useState('')

    // New states for password visibility and copy functionality
    const [visiblePasswords, setVisiblePasswords] = useState({})
    const [copiedItems, setCopiedItems] = useState({})

    const navigate = useNavigate()

    // Throttling and retry guards to avoid rate limiting
    const inFlightRef = useRef(false)
    const lastFetchAtRef = useRef(0)
    const retryCountRef = useRef(0)
    const retryTimeoutRef = useRef(null)

    // Password visibility toggle
    const togglePasswordVisibility = (secretId) => {
        setVisiblePasswords(prev => ({
            ...prev,
            [secretId]: !prev[secretId]
        }));
    };

    // Copy to clipboard functionality
    const copyToClipboard = async (text, type, secretId) => {
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
    };

    // Copy button component
    const CopyButton = ({ text, type, secretId }) => {
        const key = `${secretId}-${type}`;
        const isCopied = copiedItems[key];

        return (
            <button
                onClick={() => copyToClipboard(text, type, secretId)}
                className="ml-2 p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title={`Copy ${type}`}
            >
                {isCopied ? (
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                )}
            </button>
        );
    };

    useEffect(() => {
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

        const fetchSecrets = async () => {
            const now = Date.now()
            if (inFlightRefLocal.current) return
            if (now - lastFetchAtRefLocal.current < MIN_FETCH_INTERVAL_MS) return

            inFlightRefLocal.current = true
            lastFetchAtRefLocal.current = now
            setIsLoading(true)
            let willRetry = false
            try {
                const res = await api.get('/secret/api/list')
                if (!cancelled) {
                    setSecrets(res.data.data.secrets)
                    setError('')
                    retryCountRefLocal.current = 0
                }
            } catch (err) {
                if (cancelled) return
                if (err === 'Token expired') {
                    clearAuthData()
                    navigate('/')
                    return
                }
                const status = err.response?.status
                if (status === 429) {
                    // Use Retry-After if provided or exponential backoff
                    const retryAfter = err.response?.headers?.['retry-after']
                    let delay = 1500 * Math.pow(2, retryCountRefLocal.current)
                    const parsed = Number(retryAfter)
                    if (!Number.isNaN(parsed) && parsed > 0) {
                        delay = Math.max(delay, parsed * 1000)
                    }
                    if (retryCountRefLocal.current < 3) {
                        retryCountRefLocal.current += 1
                        setError('Too many requests. Retrying...')
                        willRetry = true
                        scheduleRetry(delay)
                        return
                    } else {
                        setError('Too many requests. Please try again later.')
                        return
                    }
                }
                const msg = err.response?.data?.message || err.message
                setError(msg)
                if (status === 401) {
                    clearAuthData()
                    navigate('/')
                }
            } finally {
                if (!cancelled && !willRetry) setIsLoading(false)
                inFlightRefLocal.current = false
            }
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
            setSecrets(prev => prev.filter(s => s.id !== id))
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
        setEditForm({ ...editForm, [e.target.name]: e.target.value })
    }

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const { id, ...updatedData } = editForm;
            const res = await api.put(`/secret/api/update/${id}`, updatedData);
            setSecrets(prev =>
                prev.map(secret => (secret.id === id ? res.data.data.secret : secret))
            );
            setEditSecret(null);
            setError(''); // clear any previous error
            alert('Secret updated successfully');
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            setError(msg);
        }
    };

    // Create form handlers
    const handleCreateChange = (e) => {
        setCreateForm({ ...createForm, [e.target.name]: e.target.value })
    }

    const resetCreateForm = () => {
        setCreateForm({ title: '', username: '', password: '', email: '', website: '', note: '' })
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
        <div className="p-4 max-w-6xl mx-auto bg-gray-50 min-h-screen">
            <div className="flex items-center justify-start gap-3 mb-6">
                <button
                    onClick={() => { setShowCreate(true); setCreateError(''); }}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm px-4 py-2 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                    + Add Secret
                </button>
                <h1 className="text-2xl font-bold text-gray-800">Your Secrets</h1>
            </div>
            {error && <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded-lg mb-4 shadow-sm">{error}</div>}
            {isLoading && <div className="text-center py-8 text-gray-600">Loading...</div>}
            {!error && !isLoading && secrets.length === 0 && <div className="text-center py-8 text-gray-600">No secrets found.</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {secrets.map(secret => (
                    <div key={secret.id} className="bg-white border-0 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        {/* Header with title and favicon */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                {secret.website && (
                                    <img
                                        src={`https://www.google.com/s2/favicons?domain=${secret.website}&sz=32`}
                                        alt=""
                                        className="w-8 h-8 rounded-full"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                )}
                                <div className="font-bold text-lg text-gray-800 truncate">{secret.title}</div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="space-y-3 text-sm">
                            {/* Username */}
                            {secret.username && (
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600 font-medium">Username:</span>
                                    <div className="flex items-center">
                                        <span className="text-gray-800 font-mono bg-gray-50 px-2 py-1 rounded">{secret.username}</span>
                                    </div>
                                </div>
                            )}

                            {/* Password */}
                            {secret.password && (
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600 font-medium">Password:</span>
                                    <div className="flex items-center">
                                        <span className="text-gray-800 font-mono bg-gray-50 px-2 py-1 rounded mr-2">
                                            {visiblePasswords[secret.id] ? secret.password : '••••••••'}
                                        </span>
                                        <button
                                            onClick={() => togglePasswordVisibility(secret.id)}
                                            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors mr-1"
                                            title={visiblePasswords[secret.id] ? 'Hide password' : 'Show password'}
                                        >
                                            {visiblePasswords[secret.id] ? (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                        <CopyButton text={secret.password} type="password" secretId={secret.id} />
                                    </div>
                                </div>
                            )}

                            {/* Email */}
                            {secret.email && (
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600 font-medium">Email:</span>
                                    <div className="flex items-center">
                                        <span className="text-gray-800 font-mono bg-gray-50 px-2 py-1 rounded">{secret.email}</span>
                                        <CopyButton text={secret.email} type="email" secretId={secret.id} />
                                    </div>
                                </div>
                            )}

                            {/* Website */}
                            {secret.website && (
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600 font-medium">Website:</span>
                                    <a
                                        href={secret.website}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-600 hover:text-blue-800 underline flex items-center"
                                    >
                                        <span className="mr-1">Visit</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                </div>
                            )}

                            {/* Note */}
                            {secret.note && (
                                <div className="pt-2 border-t border-gray-100">
                                    <span className="text-gray-600 font-medium block mb-1">Note:</span>
                                    <p className="text-gray-700 text-xs bg-gray-50 p-2 rounded">{secret.note}</p>
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="pt-4 flex justify-end gap-2 border-t border-gray-100 mt-4">
                            <button
                                onClick={() => openEditForm(secret)}
                                className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 py-2 rounded-lg transition-colors flex items-center space-x-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Edit</span>
                            </button>
                            <button
                                onClick={() => handleDelete(secret.id)}
                                className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-2 rounded-lg transition-colors flex items-center space-x-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>Delete</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {showCreate && (
                <div className="fixed inset-0 z-40 flex">
                    {/* overlay */}
                    <div className="flex-1 bg-transparent bg-opacity-30" onClick={closeCreatePanel} />
                    {/* right panel */}
                    <div className="w-full max-w-md h-full bg-white shadow-xl border-l p-5 overflow-y-auto">
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
                </div>
            )}

            {editSecret && (
                <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-center justify-center z-50">
                    <form onSubmit={handleEditSubmit} className="bg-white p-6 rounded shadow w-full max-w-sm space-y-4">
                        <h2 className="text-lg font-bold">Edit Secret</h2>
                        {['title', 'username', 'password', 'email', 'website', 'note'].map(field => (
                            <div key={field}>
                                <label className="block text-sm font-medium capitalize">{field}</label>
                                <input
                                    name={field}
                                    value={editForm[field]}
                                    onChange={handleEditChange}
                                    className="w-full border border-gray-300 p-2 rounded text-sm"
                                />
                            </div>
                        ))}
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
        </div>
    )
}

export default SecretsDashboard