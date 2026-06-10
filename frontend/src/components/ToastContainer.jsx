import React from 'react';
import { useDonor } from '../context/DonorContext';

const TOAST_DOT = {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    default: '#6B7280',
};

const ToastContainer = () => {
    const { toasts, removeToast } = useDonor();

    if (toasts.length === 0) return null;

    return (
        <div className="toast-container" id="toast-container">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`toast toast-${toast.type}`}
                    onClick={() => removeToast(toast.id)}
                >
                    <div
                        className="toast-dot"
                        style={{ background: TOAST_DOT[toast.type] || TOAST_DOT.default }}
                    />
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Notification</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {toast.message}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;
