import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import ErrorBoundary from './components/ErrorBoundary'

const DebugOverlay = () => {
    const [error, setError] = useState('');
    const [path, setPath] = useState(window.location.pathname);
    
    useEffect(() => {
        const handleError = (e) => {
            setError(e.message || String(e));
        };
        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', (e) => handleError(e.reason));
        
        const interval = setInterval(() => {
            if (window.location.pathname !== path) {
                setPath(window.location.pathname);
            }
        }, 1000);
        
        return () => {
            window.removeEventListener('error', handleError);
            clearInterval(interval);
        };
    }, [path]);

    return (
        <div style={{ position: 'fixed', bottom: 10, right: 10, background: 'rgba(0,0,0,0.8)', color: 'white', padding: '10px', zIndex: 9999, fontSize: '12px', pointerEvents: 'none', maxWidth: '300px', wordWrap: 'break-word' }}>
            <div>Path: {path}</div>
            {error && <div style={{ color: 'red' }}>Error: {error}</div>}
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
            <DebugOverlay />
        </ErrorBoundary>
    </React.StrictMode>,
)
