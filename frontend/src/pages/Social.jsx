import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { hospitalService, chatService } from '../services/api';
import { getSocket, joinHospitalRoom } from '../services/socket';
import { useDonor } from '../context/DonorContext';

const RESOURCE_LABELS = { ICU_BED: 'ICU Bed', VENTILATOR: 'Ventilator', OXYGEN_CYLINDER: 'Oxygen', AMBULANCE: 'Ambulance' };
const BLOOD_COLORS = { 'O+': '#DC2626', 'O-': '#B91C1C', 'A+': '#2563EB', 'A-': '#1D4ED8', 'B+': '#059669', 'B-': '#047857', 'AB+': '#7C3AED', 'AB-': '#6D28D9' };

const Social = () => {
    const { user } = useDonor();
    const [searchParams, setSearchParams] = useSearchParams();
    const [hospitals, setHospitals] = useState([]);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const chatEndRef = useRef(null);

    useEffect(() => {
        hospitalService.getNetwork()
            .then(({ data }) => setHospitals(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false));
        if (user?._id) joinHospitalRoom(user._id);
    }, [user]);

    useEffect(() => {
        const id = searchParams.get('hospital');
        if (id && hospitals.length) {
            const h = hospitals.find((x) => x._id === id);
            if (h) openHospital(h);
        }
    }, [searchParams, hospitals]);

    useEffect(() => {
        const socket = getSocket();
        const onChat = (msg) => {
            if (selected && (String(msg.fromHospital?._id || msg.fromHospital) === selected._id || String(msg.toHospital?._id || msg.toHospital) === selected._id)) {
                setMessages((prev) => [...prev, msg]);
            }
        };
        socket.on('chat_message', onChat);
        return () => socket.off('chat_message', onChat);
    }, [selected]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const openHospital = async (hospital) => {
        setSelected(hospital);
        setSearchParams({ hospital: hospital._id });
        try {
            const { data } = await chatService.getConversation(hospital._id);
            setMessages(data || []);
        } catch {
            setMessages([]);
        }
    };

    const closeDetail = () => {
        setSelected(null);
        setMessages([]);
        setSearchParams({});
    };

    const sendChat = async () => {
        if (!selected || !newMessage.trim()) return;
        try {
            const { data } = await chatService.sendMessage(selected._id, newMessage.trim());
            setMessages((prev) => [...prev, data]);
            setNewMessage('');
        } catch {
            // ignore
        }
    };

    const filtered = hospitals.filter((h) =>
        h.name?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="page-loading">Loading network...</div>;

    return (
        <div className="chih-page">
            <input
                className="chih-search"
                placeholder="Search hospitals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            <div className="social-grid">
                {filtered.map((h) => (
                    <div key={h._id} className="social-card" onClick={() => openHospital(h)}>
                        <div className="social-card-avatar">{h.name?.charAt(0)}</div>
                        <h3>{h.name}</h3>
                        <p className="text-muted">{h.address || h.email}</p>
                        <div className="social-tags">
                            {(h.inventory || []).filter((i) => i.type === 'BLOOD' && i.quantity > 0).slice(0, 3).map((i) => (
                                <span key={i.group} className="social-tag" style={{ color: BLOOD_COLORS[i.group] }}>{i.group}</span>
                            ))}
                            {(h.resources || []).slice(0, 2).map((r) => (
                                <span key={r.resourceType} className="social-tag">{RESOURCE_LABELS[r.resourceType]}: {r.available}</span>
                            ))}
                        </div>
                        {h.activeEmergencies > 0 && <span className="badge badge-critical">{h.activeEmergencies} active</span>}
                    </div>
                ))}
            </div>

            {selected && (
                <div className="social-overlay" onClick={closeDetail}>
                    <div className="social-detail" onClick={(e) => e.stopPropagation()}>
                        <button className="social-close" onClick={closeDetail}>×</button>
                        <div className="social-detail-header">
                            <div className="social-card-avatar large">{selected.name?.charAt(0)}</div>
                            <div>
                                <h2>{selected.name}</h2>
                                <p className="text-muted">{selected.address || 'Address not provided'}</p>
                            </div>
                        </div>

                        <div className="contact-grid">
                            <div className="contact-item"><label>Email</label><span>{selected.email}</span></div>
                            <div className="contact-item"><label>Phone</label><span>{selected.contactPhone || 'Not provided'}</span></div>
                            <div className="contact-item"><label>Contact Person</label><span>{selected.contactPerson || '—'}</span></div>
                        </div>

                        <h3>Resources</h3>
                        <div className="resource-visual-grid">
                            {(selected.inventory || []).filter((i) => i.quantity > 0).map((i) => (
                                <div key={`${i.type}-${i.group}`} className="resource-visual-card">
                                    <strong>{i.type === 'BLOOD' ? i.group : i.group}</strong>
                                    <span>{i.quantity} {i.type === 'BLOOD' ? 'units' : ''}</span>
                                </div>
                            ))}
                            {(selected.resources || []).map((r) => (
                                <div key={r.resourceType} className="resource-visual-card">
                                    <strong>{RESOURCE_LABELS[r.resourceType]}</strong>
                                    <span>{r.available} / {r.total}</span>
                                </div>
                            ))}
                        </div>

                        <h3>Chat</h3>
                        <div className="chat-panel">
                            <div className="chat-messages">
                                {messages.length === 0 && <p className="text-muted chat-empty">Start a conversation with {selected.name}</p>}
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
                                <button className="btn btn-primary" onClick={sendChat}>Send</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Social;
