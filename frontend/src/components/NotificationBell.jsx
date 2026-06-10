import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../services/api';
import { getSocket } from '../services/socket';
import { useDonor } from '../context/DonorContext';

const TYPE_ICONS = {
    EMERGENCY: '🚨',
    ACCEPTED: '✅',
    CHAT: '💬',
    CONSULTATION: '🏥',
    TRANSPORT: '🚑',
    SYSTEM: 'ℹ️',
};

const NotificationBell = () => {
    const { user } = useDonor();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const panelRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const { data } = await notificationService.getAll();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        if (!user) return;
        fetchNotifications();
        const socket = getSocket();
        const onNotification = (n) => {
            setNotifications((prev) => [n, ...prev].slice(0, 30));
            setUnreadCount((c) => c + 1);
        };
        socket.on('notification', onNotification);
        return () => socket.off('notification', onNotification);
    }, [user]);

    useEffect(() => {
        const handleClick = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleClick = async (n) => {
        if (!n.read) {
            await notificationService.markRead(n._id);
            setUnreadCount((c) => Math.max(0, c - 1));
            setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
        }
        setOpen(false);
        if (n.link) navigate(n.link);
    };

    const markAllRead = async () => {
        await notificationService.markAllRead();
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const timeAgo = (date) => {
        const mins = Math.floor((Date.now() - new Date(date)) / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        return `${Math.floor(mins / 60)}h ago`;
    };

    return (
        <div className="notification-bell" ref={panelRef}>
            <button className="notification-trigger" onClick={() => setOpen(!open)} aria-label="Notifications">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>

            {open && (
                <div className="notification-panel">
                    <div className="notification-panel-header">
                        <strong>Notifications</strong>
                        {unreadCount > 0 && (
                            <button className="notification-mark-all" onClick={markAllRead}>Mark all read</button>
                        )}
                    </div>
                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <p className="notification-empty">No notifications yet</p>
                        ) : (
                            notifications.map((n) => (
                                <button
                                    key={n._id}
                                    className={`notification-item ${n.read ? '' : 'notification-unread'}`}
                                    onClick={() => handleClick(n)}
                                >
                                    <span className="notification-icon">{TYPE_ICONS[n.type] || 'ℹ️'}</span>
                                    <div className="notification-content">
                                        <strong>{n.title}</strong>
                                        <p>{n.message}</p>
                                        <small>{timeAgo(n.createdAt)}</small>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
