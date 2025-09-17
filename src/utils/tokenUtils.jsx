// tokenUtils.js
export const isTokenExpired = () => {
    const token = localStorage.getItem('token');
    if (!token) return true;

    try {
        // Decode JWT token to check expiry
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;

        return payload.exp < currentTime;
    } catch (error) {
        console.error('Error checking token expiry:', error);
        return true;
    }
};

export const clearAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('token_expires_at');
};

export const getValidToken = () => {
    if (isTokenExpired()) {
        clearAuthData();
        return null;
    }
    return localStorage.getItem('token');
};

export const handleAuthError = (error, navigate) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
        clearAuthData();
        navigate('/auth');
        return true;
    }
    return false;
};