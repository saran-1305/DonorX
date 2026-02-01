import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './layouts/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import NewRequest from './pages/NewRequest';
import Tracking from './pages/Tracking';
import Audit from './pages/Audit';
import { DonorProvider } from './context/DonorContext';

function App() {
    return (
        <DonorProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Home />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="hospital-dashboard" element={<HospitalDashboard />} />
                        <Route path="request" element={<NewRequest />} />
                        <Route path="tracking" element={<Tracking />} />
                        <Route path="audit" element={<Audit />} />
                    </Route>
                </Routes>
            </Router>
        </DonorProvider>
    );
}

export default App;
