import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useDonor } from '../context/DonorContext';

const AuthLayout = () => {
    const { user } = useDonor();
    if (user) {
        return <Navigate to="/home" replace />;
    }
    return (
        <div className="auth-layout">
            <Outlet />
        </div>
    );
};

export default AuthLayout;
