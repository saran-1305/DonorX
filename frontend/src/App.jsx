import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout';
import AppLayout from './layouts/AppLayout';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import Social from './pages/Social';
import NewRequest from './pages/NewRequest';
import Tracking from './pages/Tracking';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import { DonorProvider, useDonor } from './context/DonorContext';

const ProtectedRoute = ({ children }) => {
    const { user } = useDonor();
    const location = useLocation();
    if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
    return children;
};

const RootRedirect = () => {
    const { user } = useDonor();
    return <Navigate to={user ? '/home' : '/login'} replace />;
};

function App() {
    return (
        <DonorProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<RootRedirect />} />

                    <Route element={<AuthLayout />}>
                        <Route path="login" element={<Login />} />
                        <Route path="register" element={<Register />} />
                    </Route>

                    <Route element={
                        <ProtectedRoute>
                            <AppLayout />
                        </ProtectedRoute>
                    }>
                        <Route path="home" element={<Home />} />
                        <Route path="request" element={<NewRequest />} />
                        <Route path="inventory" element={<Inventory />} />
                        <Route path="social" element={<Social />} />
                        <Route path="tracking" element={<Tracking />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        {/* Legacy redirects */}
                        <Route path="command-center" element={<Navigate to="/home" replace />} />
                        <Route path="analytics" element={<Navigate to="/home" replace />} />
                        <Route path="directory" element={<Navigate to="/social" replace />} />
                        <Route path="hospital-dashboard" element={<Navigate to="/inventory" replace />} />
                    </Route>

                    <Route path="*" element={<RootRedirect />} />
                </Routes>
            </Router>
        </DonorProvider>
    );
}

export default App;
