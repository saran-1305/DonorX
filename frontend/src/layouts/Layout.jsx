import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import IncomingRequestModal from '../components/IncomingRequestModal';
import ToastContainer from '../components/ToastContainer';

const Layout = () => {
    return (
        <div className="os-layout">
            <Sidebar />
            <div className="os-main">
                <Header />
                <main className="os-content animate-fade-in">
                    <Outlet />
                </main>
            </div>
            {/* Keeping existing modals and toasts if they exist */}
            <IncomingRequestModal />
            <ToastContainer />
        </div>
    );
};

export default Layout;
