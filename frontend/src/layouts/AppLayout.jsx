import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import IncomingRequestModal from '../components/IncomingRequestModal';
import RequestAcceptedListener from '../components/RequestAcceptedListener';
import ToastContainer from '../components/ToastContainer';

const AppLayout = () => {
    return (
        <div className="app-shell">
            <Sidebar />
            <div className="app-content">
                <TopBar />
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
