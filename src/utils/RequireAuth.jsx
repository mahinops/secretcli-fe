import { Navigate } from 'react-router-dom';

const RequireAuth = ({ children }) => {
    const token = localStorage.getItem('token');

    // Simple check: if token exists and looks like JWT (3 parts)
    if (!token || token.split('.').length !== 3) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default RequireAuth;
