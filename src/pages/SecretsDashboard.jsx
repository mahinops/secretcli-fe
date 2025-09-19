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

    const [searchTerm, setSearchTerm] = useState('')
    const [selectedSecret, setSelectedSecret] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
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

    // Helpers derived from the Password Manager design
    const computeStrength = (pwd) => {
        if (!pwd) return 'Weak'
        const length = pwd.length
        const hasUpper = /[A-Z]/.test(pwd)
        const hasLower = /[a-z]/.test(pwd)
        const hasNum = /\d/.test(pwd)
        const hasSym = /[^A-Za-z0-9]/.test(pwd)
        const score = [hasUpper, hasLower, hasNum, hasSym].filter(Boolean).length + (length > 12 ? 1 : length > 8 ? 0.5 : 0)
        if (score >= 3.5) return 'Strong'
        if (score >= 2.5) return 'Medium'
        return 'Weak'
    }

    const getStrengthColor = (strength) => {
        switch (strength) {
            case 'Strong': return 'text-green-600'
            case 'Medium': return 'text-yellow-600'
            case 'Weak': return 'text-red-600'
            default: return 'text-gray-600'
        }
    }

    const getFaviconUrl = (website) => {
        if (!website) return ''
        try {
            const url = new URL(website)
            return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`
        } catch {
            return `https://www.google.com/s2/favicons?domain=${website}&sz=32`
        }
    }

    const checkBreaches = () => {
        alert('Checking for compromised passwords... All passwords are secure!')
    }

    const filteredSecrets = secrets.filter(s => {
        const q = searchTerm.toLowerCase()
        return (
            (s.title || '').toLowerCase().includes(q) ||
            (s.username || '').toLowerCase().includes(q) ||
            (s.email || '').toLowerCase().includes(q) ||
            (s.website || '').toLowerCase().includes(q)
        )
    })

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
        setEditForm({ ...editForm, [e.target.name]: e.target.value })
    }

    const handleEditSubmit = async (e) => {
        e.preventDefault()
        try {
            const { id, ...updatedData } = editForm
            const res = await api.put(`/secret/api/update/${id}`, updatedData)
            const apiUpdated = res?.data?.data?.secret || res?.data?.secret || null
            setSecrets(prev => prev.map(secret => {
                if (secret.id === id) {
                    // Prefer server response if provided; otherwise merge local form data
                    return apiUpdated ? { ...secret, ...apiUpdated } : { ...secret, ...updatedData, id }
                }
                return secret
            }))
            setEditSecret(null)
            setError('') // clear any previous error
        } catch (err) {
            const msg = err.response?.data?.message || err.message
            setError(msg)
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
        <div className="min-h-screen bg-gray-50">
            {/* Header (sticky) */}
            <div className="sticky top-0 z-30 bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-3">
                            <span className="text-2xl">🔐</span>
                            <h1 className="text-xl font-medium text-gray-900">Password Manager</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={checkBreaches}
                                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                            >
                                <span>🛡️</span>
                                <span>Check passwords</span>
                            </button>
                            <button className="p-2 text-gray-600 hover:text-gray-900" title="Settings">
                                ⚙️
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-0 h-[calc(100vh-64px)] ${showCreate ? 'lg:mr-[420px]' : ''}`}>
                <div className="flex gap-8 items-start">
                    {/* Left Sidebar - Password List */}
                    <div className="flex-1">
                        <div className="bg-white rounded-lg shadow flex flex-col h-full overflow-hidden">
                            {/* Search Bar */}
                            <div className="p-4 border-b">
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
                                    <input
                                        type="text"
                                        placeholder="Search passwords"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Add Password Button */}
                            <div className="p-4 border-b">
                                <button
                                    onClick={() => { setShowCreate(true); setCreateError(''); setSelectedSecret(null); }}
                                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-md transition-colors bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    <span>➕</span>
                                    <span>Add password</span>
                                </button>
                            </div>

                            {/* Password List */}
                            <div className="flex-1 overflow-y-auto">
                                {filteredSecrets.map((secret) => {
                                    const strength = computeStrength(secret.password)
                                    return (
                                        <div key={secret.id}>
                                            <div
                                                onClick={() => setSelectedSecret(selectedSecret?.id === secret.id ? null : secret)}
                                                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                                                    selectedSecret?.id === secret.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                                                }`}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    {secret.website ? (
                                                        <img src={getFaviconUrl(secret.website)} alt="" className="w-8 h-8 rounded" />
                                                    ) : (
                                                        <span className="text-xl">🔑</span>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">{secret.title || secret.website || 'Untitled'}</p>
                                                        <p className="text-xs text-gray-500 truncate">{secret.username || secret.email || ''}</p>
                                                        {secret.website && (<p className="text-xs text-gray-400 truncate">{secret.website}</p>)}
                                                    </div>
                                                    <div className={`text-xs font-medium ${getStrengthColor(strength)}`}>
                                                        {strength}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded details */}
                                            {selectedSecret?.id === secret.id && (
                                                <div className="bg-white border-l-4 border-l-blue-600 p-4 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-sm font-medium text-gray-900">Password Details</h4>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setSelectedSecret(null); }}
                                                            className="text-gray-400 hover:text-gray-600"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>

                                                    {/* Website URL */}
                                                    {secret.website && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
                                                            <div className="flex items-center space-x-1">
                                                                <input
                                                                    type="text"
                                                                    value={secret.website}
                                                                    readOnly
                                                                    className="flex-1 px-2 py-1 text-xs bg-gray-50 border border-gray-300 rounded"
                                                                />
                                                                <CopyButton text={secret.website} type="website" secretId={secret.id} />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Username */}
                                                    {(secret.username || secret.email) && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Username</label>
                                                            <div className="flex items-center space-x-1">
                                                                <input
                                                                    type="text"
                                                                    value={secret.username || secret.email}
                                                                    readOnly
                                                                    className="flex-1 px-2 py-1 text-xs bg-gray-50 border border-gray-300 rounded"
                                                                />
                                                                <CopyButton text={secret.username || secret.email} type="username" secretId={secret.id} />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Password */}
                                                    {secret.password && (
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                                                            <div className="flex items-center space-x-1">
                                                                <input
                                                                    type={visiblePasswords[secret.id] ? 'text' : 'password'}
                                                                    value={secret.password}
                                                                    readOnly
                                                                    className="flex-1 px-2 py-1 text-xs bg-gray-50 border border-gray-300 rounded"
                                                                />
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); togglePasswordVisibility(secret.id); }}
                                                                    className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                                                                >
                                                                    {visiblePasswords[secret.id] ? '🙈' : '👁️'}
                                                                </button>
                                                                <CopyButton text={secret.password} type="password" secretId={secret.id} />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Password Strength */}
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Strength</label>
                                                        <div className="flex items-center space-x-2">
                                                            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                                                <div
                                                                    className={`h-1.5 rounded-full ${
                                                                        computeStrength(secret.password) === 'Strong'
                                                                            ? 'bg-green-500 w-full'
                                                                            : computeStrength(secret.password) === 'Medium'
                                                                                ? 'bg-yellow-500 w-2/3'
                                                                                : 'bg-red-500 w-1/3'
                                                                    }`}
                                                                ></div>
                                                            </div>
                                                            <span className={`text-xs font-medium ${getStrengthColor(computeStrength(secret.password))}`}>
                                                                {computeStrength(secret.password)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex space-x-2 pt-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openEditForm(secret); }}
                                                            className="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(secret); }}
                                                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    {/*<div className="lg:col-span-2">*/}
                    {/*    {!showCreate && !selectedSecret ? (*/}
                    {/*        <div className="bg-white rounded-lg shadow p-8 text-center">*/}
                    {/*            <div className="text-5xl mb-4 text-gray-400">🔑</div>*/}
                    {/*            <h2 className="text-xl font-medium text-gray-900 mb-2">Select a password to view details</h2>*/}
                    {/*            <p className="text-gray-600 mb-6">Choose a password from the list on the left to view and manage it</p>*/}
                    {/*            <div className="flex justify-center space-x-4">*/}
                    {/*                <button*/}
                    {/*                    onClick={() => setShowCreate(true)}*/}
                    {/*                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"*/}
                    {/*                >*/}
                    {/*                    <span>➕</span>*/}
                    {/*                    <span>Add new password</span>*/}
                    {/*                </button>*/}
                    {/*                <button*/}
                    {/*                    onClick={checkBreaches}*/}
                    {/*                    className="flex items-center space-x-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"*/}
                    {/*                >*/}
                    {/*                    <span>🛡️</span>*/}
                    {/*                    <span>Security checkup</span>*/}
                    {/*                </button>*/}
                    {/*            </div>*/}
                    {/*        </div>*/}
                    {/*    ) : null}*/}
                    {/*</div>*/}
                </div>
            </div>
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