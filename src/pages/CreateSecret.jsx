import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { clearAuthData } from '../utils/tokenUtils.jsx'

const CreateSecret = () => {
    const navigate = useNavigate()
    const [form, setForm] = useState({ title: '', username: '', password: '', email: '', website: '', note: '' })
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState('')

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (isCreating) return
        setError('')
        setIsCreating(true)
        try {
            const payload = {
                title: form.title,
                username: form.username,
                password: form.password,
                note: form.note,
                email: form.email,
                website: form.website,
            }
            const res = await api.post('/secret/api/create', payload)
            const code = res?.data?.code
            if (code !== 201) {
                throw new Error(res?.data?.message || 'Failed to create secret')
            }
            alert('Secret created successfully')
            navigate('/dashboard')
        } catch (err) {
            const status = err?.response?.status
            if (status === 429) {
                setError('Too many requests. Please wait a moment and try again.')
            } else if (status === 401) {
                clearAuthData()
                navigate('/')
            } else {
                const msg = err?.response?.data?.message || err.message
                setError(msg)
            }
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div className="p-4 max-w-xl mx-auto">
            <h1 className="text-xl font-semibold mb-4">Create Secret</h1>
            {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow space-y-4">
                {['title', 'username', 'password', 'email', 'website', 'note'].map((field) => (
                    <div key={field}>
                        <label className="block text-sm font-medium capitalize mb-1">{field}</label>
                        <input
                            name={field}
                            value={form[field]}
                            onChange={handleChange}
                            className="w-full border border-gray-300 p-2 rounded text-sm"
                        />
                    </div>
                ))}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="bg-gray-500 text-white px-4 py-2 text-sm rounded"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isCreating}
                        className="bg-green-600 text-white px-4 py-2 text-sm rounded disabled:opacity-50"
                    >
                        {isCreating ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default CreateSecret
