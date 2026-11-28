import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useDonor } from '../context/DonorContext';
import { notificationService, chatService, billService } from '../services/api';
import { getSocket } from '../services/socket';
import {
    LayoutDashboard,
    Bell,
    Droplet,
    HeartHandshake,
    Layers,
    Building2,
    Truck,
    Sparkles,
    FileText,
    MessageSquare,
    LogOut,
    ChevronDown,
    X,
} from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, badge, end, matchTab, onClick }) => {
    const location = useLocation();
    const [path, query] = to.split('?');
    const tabParam = query ? new URLSearchParams(`?${query}`).get('tab') : null;
    const currentTab = new URLSearchParams(location.search).get('tab');

    let isCustomActive = false;
    if (matchTab !== undefined) {
        if (matchTab === null) {
            isCustomActive = location.pathname === path && !currentTab;
        } else {
            isCustomActive = location.pathname === path && currentTab === matchTab;
        }
    }

    if (matchTab !== undefined) {
        return (
            <NavLink
                to={to}
                onClick={onClick}
                className={() => `sidebar-link ${isCustomActive ? 'sidebar-link-active' : ''}`}
            >
                <span className="sidebar-link-icon"><Icon size={19} /></span>
                <span className="sidebar-link-label">{label}</span>
                {badge > 0 && <span className="sidebar-badge">{badge > 9 ? '9+' : badge}</span>}
            </NavLink>
        );
    }

    return (
        <NavLink
            to={to}
            end={end}
            onClick={onClick}
            className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
        >
            <span className="sidebar-link-icon"><Icon size={19} /></span>
            <span className="sidebar-link-label">{label}</span>
            {badge > 0 && <span className="sidebar-badge">{badge > 9 ? '9+' : badge}</span>}
        </NavLink>
    );
};

const Sidebar = ({ isOpen, onClose }) => {
    const { user, logout } = useDonor();
    const navigate = useNavigate();
    const [unread, setUnread] = useState(0);
    const [msgUnread, setMsgUnread] = useState(0);
    const [billCount, setBillCount] = useState(0);

    useEffect(() => {
        if (!user) return;
        const refreshAlerts = () => notificationService.getAll()
            .then(({ data }) => setUnread(data.unreadCount || 0))
            .catch(() => {});
        const refreshMessages = () => chatService.getUnreadCount()
            .then(({ data }) => setMsgUnread(data.count || 0))
            .catch(() => {});
        const refreshBills = () => billService.getBills()
            .then(({ data }) => {
                const list = Array.isArray(data) ? data : [];
                const activeOrPending = list.filter((b) => b.status === 'Active').length;
                setBillCount(activeOrPending);
            })
            .catch(() => {});

        refreshAlerts();
        refreshMessages();
        refreshBills();

        const socket = getSocket();
        const onChatMsg = (msg) => {
            if (String(msg.toHospital?._id || msg.toHospital) === String(user._id || user.hospitalId)) {
                refreshMessages();
            }
        };
        socket.on('notification', refreshAlerts);
        socket.on('chat_message', onChatMsg);
        socket.on('bill_created', refreshBills);
        socket.on('bill_updated', refreshBills);
        socket.on('bill_completed', refreshBills);
        socket.on('bill_terminated', refreshBills);

        return () => {
            socket.off('notification', refreshAlerts);
            socket.off('chat_message', onChatMsg);
            socket.off('bill_created', refreshBills);
            socket.off('bill_updated', refreshBills);
            socket.off('bill_completed', refreshBills);
            socket.off('bill_terminated', refreshBills);
        };
    }, [user?._id]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
            {/* Top Brand Header */}
            <div className="sidebar-brand">
                <div className="sidebar-logo-icon">
                    {/* Blood droplet with pulse wave */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"
                            fill="#FFFFFF"
                        />
                        <path
                            d="M8.5 13.5h2l1-3 1.5 5 1-2h2"
                            stroke="#D84B46"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
                <div style={{ flex: 1 }}>
                    <div className="sidebar-logo-text">Donor<span>X</span></div>
                    <div className="sidebar-logo-sub">Healthcare Intelligence Network</div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: '#9BA09B', cursor: 'pointer', display: 'none' }}
                        className="mobile-close-btn"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Navigation List */}
            <nav className="sidebar-nav">
                <NavItem to="/home" icon={LayoutDashboard} label="Command Center" end onClick={onClose} />
                <NavItem to="/request" icon={Bell} label="New Emergency" badge={unread} onClick={onClose} />
                <NavItem to="/inventory?tab=blood" icon={Droplet} label="Blood Bank" matchTab="blood" onClick={onClose} />
                <NavItem to="/inventory?tab=organ" icon={HeartHandshake} label="Organ Bank" matchTab="organ" onClick={onClose} />
                <NavItem to="/inventory?tab=resource" icon={Layers} label="Resource Hub" matchTab="resource" onClick={onClose} />
                <NavItem to="/social" icon={Building2} label="Hospital Network" onClick={onClose} />
                <NavItem to="/map" icon={Truck} label="Ambulance Tracking" onClick={onClose} />
                <NavItem to="/request?mode=ai" icon={Sparkles} label="Clinical AI" onClick={onClose} />
                <NavItem to="/billing" icon={FileText} label="Reports" badge={billCount} onClick={onClose} />
                <NavItem to="/messages" icon={MessageSquare} label="Messages" badge={msgUnread} onClick={onClose} />
            </nav>

            {/* Bottom Hospital Identity Card & Sign Out */}
            <div className="sidebar-footer">
                <div className="sidebar-hospital-card" onClick={() => navigate('/social')}>
                    <div className="sidebar-hospital-icon">
                        <Building2 size={18} />
                    </div>
                    <div className="sidebar-hospital-info">
                        <div className="sidebar-hospital-name">
                            {user?.hospitalName || user?.name || 'Global Care Hospital'}
                        </div>
                        <div className="sidebar-hospital-loc">
                            {user?.address?.split(',')[0] || 'Chennai, TN'}
                        </div>
                    </div>
                    <ChevronDown size={15} color="#737873" />
                </div>

                <button type="button" className="sidebar-logout" onClick={handleLogout}>
                    <LogOut size={16} />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
