import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import ToastContainer from '../components/ToastContainer';

const Layout = () => {
    return (
        <>
            <Header />
            <main>
                <Outlet />
            </main>
            <ToastContainer />
        </>
    );
};

export default Layout;
