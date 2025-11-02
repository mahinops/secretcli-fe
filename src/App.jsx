import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Auth from './pages/Auth';
import SecretsDashboard from './pages/SecretsDashboard';
import PasswordGenerator from './components/PasswordGenerator';
import RequireAuth from './components/RequireAuth';
import Layout from './layout/Layout';
import PasswordPage from './pages/PasswordPage';
import CreateSecret from './pages/CreateSecret';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Auth />} />
                    <Route element={<RequireAuth><Layout /></RequireAuth>}>
                        <Route path="/dashboard" element={<SecretsDashboard />} />
                        <Route path="/secrets/create" element={<CreateSecret />} />
                        <Route path="/generate" element={<PasswordGenerator />} />
                        <Route path="/generate-password" element={<RequireAuth><PasswordPage /></RequireAuth>} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </ErrorBoundary>
    );
}

export default App;
