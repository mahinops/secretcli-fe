import axios from 'axios'

// Use same-origin base URL so Vite dev server proxy can forward to the backend
const api = axios.create({
    baseURL: '/',
})

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
            // Let Axios set Content-Type when needed; avoid forcing it for all requests
        }
        return config
    },
    (error) => Promise.reject(error)
)

export default api
