import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import IncomingRequestModal from '../components/IncomingRequestModal';
import RequestAcceptedListener from '../components/RequestAcceptedListener';
import ToastContainer from '../components/ToastContainer';

const AppLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="app-shell">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="app-content">
                <TopBar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
                <main className="app-main-area">
                    <Outlet />
                </main>
            </div>
            <IncomingRequestModal />
            <RequestAcceptedListener />
            <ToastContainer />
        </div>
    );
};

export default AppLayout;
