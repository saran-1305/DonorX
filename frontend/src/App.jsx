import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './layouts/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

// OS Pages & Modules
import CommandCenter from './pages/CommandCenter';
import EmergencyCoordination from './pages/modules/EmergencyCoordination';
import BloodExchange from './pages/modules/BloodExchange';
import OrganExchange from './pages/modules/OrganExchange';
import AmbulanceIntelligence from './pages/modules/AmbulanceIntelligence';
import HospitalCollaboration from './pages/modules/HospitalCollaboration';
import PatientIntelligence from './pages/modules/PatientIntelligence';
import MozillaAIEngine from './pages/modules/MozillaAIEngine';
import NationalHealthGrid from './pages/modules/NationalHealthGrid';

import { DonorProvider, useDonor } from './context/DonorContext';

const ProtectedRoute = ({ children }) => {
    const { user } = useDonor();
    const location = useLocation();

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

function App() {
    return (
        <DonorProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Home />} />
                        
                        {/* OS Protected Routes */}
                        <Route path="command-center" element={
                            <ProtectedRoute>
                                <CommandCenter />
                            </ProtectedRoute>
                        } />
                        
                        <Route path="modules/emergency" element={
                            <ProtectedRoute>
                                <EmergencyCoordination />
                            </ProtectedRoute>
                        } />
                        
                        <Route path="modules/blood" element={
                            <ProtectedRoute>
                                <BloodExchange />
                            </ProtectedRoute>
                        } />
                        
                        <Route path="modules/organ" element={
                            <ProtectedRoute>
                                <OrganExchange />
                            </ProtectedRoute>
                        } />
                        
                        <Route path="modules/ambulance" element={
                            <ProtectedRoute>
                                <AmbulanceIntelligence />
                            </ProtectedRoute>
                        } />
                        
                        <Route path="modules/hospitals" element={
                            <ProtectedRoute>
                                <HospitalCollaboration />
                            </ProtectedRoute>
                        } />
                        
                        <Route path="modules/patient" element={
                            <ProtectedRoute>
                                <PatientIntelligence />
                            </ProtectedRoute>
                        } />
                        
                        <Route path="modules/ai" element={
                            <ProtectedRoute>
                                <MozillaAIEngine />
                            </ProtectedRoute>
                        } />
                        
                        <Route path="modules/grid" element={
                            <ProtectedRoute>
                                <NationalHealthGrid />
                            </ProtectedRoute>
                        } />
                    </Route>
                </Routes>
            </Router>
        </DonorProvider>
    );
}

export default App;
