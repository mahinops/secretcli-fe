import axios from 'axios'

const api = axios.create({
    baseURL: 'http://localhost:8080',
})

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
            config.headers['Content-Type'] = 'application/json'
        }
        return config
    },
    (error) => Promise.reject(error)
)

export default api
