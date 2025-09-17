import { Navigate } from 'react-router-dom';

const RequireAuth = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/" />;
};

export default RequireAuth;
