import { Navigate } from 'react-router-dom';
import { getValidToken } from '../utils/tokenUtils.jsx';

const RequireAuth = ({ children }) => {
    const token = getValidToken();
    return token ? children : <Navigate to="/" />;
};

export default RequireAuth;
