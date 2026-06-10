import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { LayoutGrid, List, ArrowLeft, Mail, Phone, MapPin, User } from 'lucide-react';
import { hospitalService, chatService } from '../services/api';
import { getSocket, joinHospitalRoom } from '../services/socket';
import { useDonor } from '../context/DonorContext';

const RESOURCE_LABELS = {
    ICU_BED: 'ICU Bed',
    VENTILATOR: 'Ventilator',
    OXYGEN_CYLINDER: 'Oxygen',
    AMBULANCE: 'Ambulance',
};

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-'];
const ORGANS = ['Kidney', 'Heart', 'Liver', 'Lungs'];
const BLOOD_COLORS = {
    'O+': '#DC2626', 'O-': '#B91C1C', 'A+': '#2563EB', 'A-': '#1D4ED8',
    'B+': '#059669', 'B-': '#047857', 'AB+': '#7C3AED', 'AB-': '#6D28D9',
};

const getQty = (hospital, type, group) =>
    (hospital?.inventory || []).find((i) => i.type === type && i.group === group)?.quantity || 0;

const getResource = (hospital, type) =>
    (hospital?.resources || []).find((r) => r.resourceType === type) || { available: 0, total: 0 };

const SemiGauge = ({ label, value, max = 20, color = '#2563EB' }) => {
    const r = 28;
    const cx = 40;
    const cy = 40;
    const pathLen = Math.PI * r;
    const pct = max > 0 ? Math.min(1, value / max) : 0;
    const filled = pathLen * pct;

    return (
        <div className="net-gauge">
            <svg width="80" height="44" viewBox="0 0 80 44" aria-hidden>
                <path
                    d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="6"
                    strokeLinecap="round"
                />
                <path
                    d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                    fill="none"
                    stroke={color}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${filled} ${pathLen}`}
                />
            </svg>
            <div className="net-gauge-value">{value}</div>
            <div className="net-gauge-label">{label}</div>
        </div>
    );
};

const ResourceBar = ({ label, available, total }) => {
    const pct = total > 0 ? Math.min(100, (available / total) * 100) : 0;
    return (
        <div className="net-resource-bar">
            <div className="net-resource-bar-head">
                <span>{label}</span>
                <span>{available} / {total}</span>
            </div>
            <div className="net-resource-bar-track">
                <div className="net-resource-bar-fill" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
};

const Social = () => {
    const { user } = useDonor();
    const [searchParams, setSearchParams] = useSearchParams();
    const [hospitals, setHospitals] = useState([]);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('cards');
    const [selected, setSelected] = useState(null);
    const [resourceTab, setResourceTab] = useState('general');
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const chatEndRef = useRef(null);

    const openHospital = useCallback(async (hospital) => {
        setSelected(hospital);
        setResourceTab('general');
        setSearchParams({ hospital: hospital._id });
        try {
            const [{ data: detail }, { data: msgs }] = await Promise.all([
                hospitalService.getById(hospital._id),
                chatService.getConversation(hospital._id),
            ]);
            setSelected({ ...hospital, ...detail });
            setMessages(msgs || []);
        } catch {
            setMessages([]);
        }
    }, [setSearchParams]);

    useEffect(() => {
        hospitalService.getNetwork()
            .then(({ data }) => {
                const list = Array.isArray(data) ? data : [];
                setHospitals(list.filter((h) => String(h._id) !== String(user?._id)));
            })
            .finally(() => setLoading(false));
        if (user?._id) joinHospitalRoom(user._id);
    }, [user]);

    useEffect(() => {
        const id = searchParams.get('hospital');
        if (id && hospitals.length && !selected) {
            const h = hospitals.find((x) => x._id === id);
            if (h) openHospital(h);
        }
    }, [searchParams, hospitals, selected, openHospital]);

    useEffect(() => {
        const socket = getSocket();
        const onChat = (msg) => {
            if (!selected || !user?._id) return;
            const from = String(msg.fromHospital?._id || msg.fromHospital);
            const to = String(msg.toHospital?._id || msg.toHospital);
            const partnerId = String(selected._id);
            const myId = String(user._id);
            const isThisThread =
                (from === myId && to === partnerId) || (from === partnerId && to === myId);
            if (!isThisThread) return;
            setMessages((prev) => {
                if (prev.some((m) => m._id === msg._id)) return prev;
                return [...prev, msg];
            });
        };
        socket.on('chat_message', onChat);
        return () => socket.off('chat_message', onChat);
    }, [selected, user]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const closeDetail = () => {
        setSelected(null);
        setMessages([]);
        setSearchParams({});
    };

    const sendChat = async () => {
        if (!selected || !newMessage.trim()) return;
        try {
            const { data } = await chatService.sendMessage(selected._id, newMessage.trim());
            setMessages((prev) => {
                if (prev.some((m) => m._id === data._id)) return prev;
                return [...prev, data];
            });
            setNewMessage('');
        } catch {
            // ignore
        }
    };

    const filtered = hospitals.filter((h) =>
        h.name?.toLowerCase().includes(search.toLowerCase())
        || h.email?.toLowerCase().includes(search.toLowerCase())
        || h.address?.toLowerCase().includes(search.toLowerCase())
    );

    const bloodSummary = (h) =>
        BLOOD_GROUPS.filter((g) => getQty(h, 'BLOOD', g) > 0).slice(0, 4);

    const establishedYear = selected?.createdAt
        ? new Date(selected.createdAt).getFullYear()
        : null;

    if (loading) {
        return <div className="chih-loading"><div className="chih-spinner" /> Loading network...</div>;
    }

    return (
        <div className="chih-page net-page">
            <div className="net-toolbar">
                {selected ? (
                    <button type="button" className="net-back-btn" onClick={closeDetail}>
                        <ArrowLeft size={16} />
                        Back to all hospitals
                    </button>
                ) : (
                    <span className="net-count">{filtered.length} hospitals on network</span>
                )}

                <input
                    className="chih-search net-search"
                    placeholder="Search hospitals..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                {!selected && (
                    <div className="net-view-toggle">
                        <button
                            type="button"
                            className={viewMode === 'cards' ? 'active' : ''}
                            onClick={() => setViewMode('cards')}
                            title="Card view"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            type="button"
                            className={viewMode === 'list' ? 'active' : ''}
                            onClick={() => setViewMode('list')}
                            title="List view"
                        >
                            <List size={18} />
                        </button>
                    </div>
                )}
            </div>

            {!selected && (
                <>
                    {filtered.length === 0 ? (
                        <div className="net-empty chih-panel">
                            <p>No other hospitals found on the DonorX network.</p>
                        </div>
                    ) : viewMode === 'cards' ? (
                        <div className="social-grid">
                            {filtered.map((h) => (
                                <button
                                    key={h._id}
                                    type="button"
                                    className="social-card"
                                    onClick={() => openHospital(h)}
                                >
                                    <div className="social-card-top">
                                        <div className="social-card-avatar">{h.name?.charAt(0)}</div>
                                        <div>
                                            <h3>{h.name}</h3>
                                            <p className="text-muted">{h.address || h.email}</p>
                                        </div>
                                    </div>
                                    <div className="social-tags">
                                        {bloodSummary(h).map((g) => (
                                            <span key={g} className="social-tag" style={{ color: BLOOD_COLORS[g] }}>{g}</span>
                                        ))}
                                        {getResource(h, 'ICU_BED').available > 0 && (
                                            <span className="social-tag">ICU: {getResource(h, 'ICU_BED').available}</span>
                                        )}
                                        {getResource(h, 'VENTILATOR').available > 0 && (
                                            <span className="social-tag">Vent: {getResource(h, 'VENTILATOR').available}</span>
                                        )}
                                    </div>
                                    {h.activeEmergencies > 0 && (
                                        <span className="badge badge-critical">{h.activeEmergencies} active emergencies</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="chih-panel net-list-panel">
                            <table className="chih-table">
                                <thead>
                                    <tr>
                                        <th>Hospital</th>
                                        <th>Contact</th>
                                        <th>Blood Stock</th>
                                        <th>Resources</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((h) => (
                                        <tr
                                            key={h._id}
                                            className="net-list-row"
                                            onClick={() => openHospital(h)}
                                        >
                                            <td>
                                                <div className="net-list-name">
                                                    <span className="social-card-avatar small">{h.name?.charAt(0)}</span>
                                                    <div>
                                                        <strong>{h.name}</strong>
                                                        <span className="text-muted">{h.address || 'Address not provided'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="net-list-contact">
                                                    <span>{h.email}</span>
                                                    <span>{h.contactPhone || 'Phone not provided'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="social-tags inline">
                                                    {bloodSummary(h).length ? bloodSummary(h).map((g) => (
                                                        <span key={g} className="social-tag" style={{ color: BLOOD_COLORS[g] }}>{g}</span>
                                                    )) : <span className="text-muted">None listed</span>}
                                                </div>
                                            </td>
                                            <td>
                                                ICU {getResource(h, 'ICU_BED').available} · Vent {getResource(h, 'VENTILATOR').available}
                                            </td>
                                            <td>
                                                {h.activeEmergencies > 0 ? (
                                                    <span className="badge badge-critical">{h.activeEmergencies} active</span>
                                                ) : (
                                                    <span className="chih-status chih-status-ok">Available</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {selected && (
                <div className="net-detail-grid">
                    <section className="chih-panel net-detail-hero">
                        <div className="chih-panel-header">
                            <h2>Selected Hospital</h2>
                        </div>
                        <div className="net-hero-body">
                            <div className="net-hero-main">
                                <div className="social-card-avatar large">{selected.name?.charAt(0)}</div>
                                <div>
                                    <h2 className="net-hero-name">{selected.name}</h2>
                                    <p className="net-hero-summary">
                                        {bloodSummary(selected).join('  ')}
                                        {getResource(selected, 'ICU_BED').available > 0 && `  ICU Bed: ${getResource(selected, 'ICU_BED').available}`}
                                        {getResource(selected, 'VENTILATOR').available > 0 && `  Ventilator: ${getResource(selected, 'VENTILATOR').available}`}
                                    </p>
                                    <div className="net-hero-bar">
                                        <div
                                            className="net-hero-bar-fill"
                                            style={{
                                                width: `${Math.min(100, (getResource(selected, 'ICU_BED').available / Math.max(getResource(selected, 'ICU_BED').total, 1)) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="net-hero-stats">
                                <div className="net-mini-stat">
                                    <span className="net-mini-stat-label">Blood Types</span>
                                    <div className="social-tags">
                                        {bloodSummary(selected).map((g) => (
                                            <span key={g} className="social-tag" style={{ color: BLOOD_COLORS[g] }}>{g}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="net-mini-stat">
                                    <span className="net-mini-stat-label">Critical Resources</span>
                                    <div className="net-mini-bars">
                                        <ResourceBar label="ICU Bed" {...getResource(selected, 'ICU_BED')} />
                                        <ResourceBar label="Ventilator" {...getResource(selected, 'VENTILATOR')} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="chih-panel net-detail-general">
                        <div className="chih-panel-header"><h2>General Information</h2></div>
                        <ul className="net-info-list">
                            <li><MapPin size={16} /><div><label>Address</label><span>{selected.address || 'Not provided'}</span></div></li>
                            <li><Mail size={16} /><div><label>Email</label><span>{selected.email}</span></div></li>
                            <li><Phone size={16} /><div><label>Phone</label><span>{selected.contactPhone || 'Not provided'}</span></div></li>
                            <li><User size={16} /><div><label>Contact Person</label><span>{selected.contactPerson || 'Not provided'}</span></div></li>
                        </ul>
                    </section>

                    <section className="chih-panel net-detail-about">
                        <div className="chih-panel-header"><h2>About {selected.name}</h2></div>
                        <div className="net-about-block">
                            <h4>Established</h4>
                            <p>{establishedYear || 'Registered on DonorX network'}</p>
                        </div>
                        <div className="net-about-block">
                            <h4>Accreditation</h4>
                            <p>DonorX Verified Healthcare Partner</p>
                        </div>
                        <div className="net-about-block">
                            <h4>Overview</h4>
                            <p>
                                {selected.name} is a registered member of the DonorX healthcare network,
                                contributing blood, organ, and facility resources for emergency coordination.
                            </p>
                        </div>
                        <div className="net-about-block">
                            <h4>Mission</h4>
                            <p>
                                To provide timely access to critical medical resources and collaborate with
                                partner hospitals during emergencies.
                            </p>
                        </div>
                    </section>

                    <section className="chih-panel net-detail-extra">
                        <div className="chih-panel-header"><h2>Detailed Info</h2></div>
                        <div className="net-about-block">
                            <h4>Affiliations</h4>
                            <p>Member of the DonorX regional emergency response network.</p>
                        </div>
                        <div className="net-about-block">
                            <h4>Network Status</h4>
                            <p>
                                {selected.activeEmergencies > 0
                                    ? `Currently handling ${selected.activeEmergencies} active emergency request(s).`
                                    : 'Available for new emergency coordination requests.'}
                            </p>
                        </div>
                        <div className="net-about-block">
                            <h4>Recent Activity</h4>
                            <p>
                                Inventory and resource counts reflect live data from {selected.name}&apos;s DonorX profile.
                            </p>
                        </div>
                    </section>

                    <div className="net-detail-sidebar">
                        <section className="chih-panel">
                            <div className="chih-panel-header">
                                <h2>Resource Availability</h2>
                            </div>
                            <div className="net-resource-tabs">
                                {['general', 'beds', 'resources'].map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        className={resourceTab === tab ? 'active' : ''}
                                        onClick={() => setResourceTab(tab)}
                                    >
                                        {tab === 'general' ? 'General' : tab === 'beds' ? 'Beds' : 'Resources'}
                                    </button>
                                ))}
                            </div>

                            {resourceTab === 'general' && (
                                <div className="net-gauge-grid">
                                    {BLOOD_GROUPS.slice(0, 4).map((g) => (
                                        <SemiGauge
                                            key={g}
                                            label={g}
                                            value={getQty(selected, 'BLOOD', g)}
                                            max={20}
                                            color={BLOOD_COLORS[g]}
                                        />
                                    ))}
                                    {ORGANS.slice(0, 2).map((o) => (
                                        <SemiGauge
                                            key={o}
                                            label={o}
                                            value={getQty(selected, 'ORGAN', o)}
                                            max={5}
                                            color="#6366F1"
                                        />
                                    ))}
                                </div>
                            )}

                            {resourceTab === 'beds' && (
                                <div className="net-resource-bars">
                                    <ResourceBar label="ICU Bed" {...getResource(selected, 'ICU_BED')} />
                                    <ResourceBar label="Ventilator" {...getResource(selected, 'VENTILATOR')} />
                                </div>
                            )}

                            {resourceTab === 'resources' && (
                                <div className="net-resource-bars">
                                    <ResourceBar label="Oxygen" {...getResource(selected, 'OXYGEN_CYLINDER')} />
                                    <ResourceBar label="Ambulance" {...getResource(selected, 'AMBULANCE')} />
                                    {BLOOD_GROUPS.slice(4).map((g) => (
                                        <ResourceBar
                                            key={g}
                                            label={`Blood ${g}`}
                                            available={getQty(selected, 'BLOOD', g)}
                                            total={20}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="chih-panel net-chat-panel">
                            <div className="chih-panel-header">
                                <h2>Chat</h2>
                                <Link to={`/messages?hospital=${selected._id}`} className="chih-link-btn">Open in Messages</Link>
                            </div>
                            <div className="chat-panel">
                                <div className="chat-messages">
                                    {messages.length === 0 && (
                                        <p className="text-muted chat-empty">Start a conversation with {selected.name}</p>
                                    )}
                                    {messages.map((m) => {
                                        const fromMe = String(m.fromHospital?._id || m.fromHospital) === String(user._id);
                                        return (
                                            <div key={m._id} className={`chat-bubble ${fromMe ? 'chat-mine' : 'chat-theirs'}`}>
                                                {!fromMe && <small>{m.fromHospital?.name}</small>}
                                                <p>{m.message}</p>
                                            </div>
                                        );
                                    })}
                                    <div ref={chatEndRef} />
                                </div>
                                <div className="chat-input-row">
                                    <input
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                                    />
                                    <button type="button" className="btn btn-primary" onClick={sendChat}>Send</button>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Social;
