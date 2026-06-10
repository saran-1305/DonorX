import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { chatService, hospitalService } from '../services/api';
import { getSocket, joinHospitalRoom } from '../services/socket';
import { useDonor } from '../context/DonorContext';

const Messages = () => {
    const { user, showToast } = useDonor();
    const [searchParams, setSearchParams] = useSearchParams();
    const [conversations, setConversations] = useState([]);
    const [activePartner, setActivePartner] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const chatEndRef = useRef(null);

    const loadConversations = useCallback(async () => {
        try {
            const { data } = await chatService.getConversations();
            setConversations(Array.isArray(data) ? data : []);
        } catch {
            setConversations([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const openConversation = useCallback(async (partner) => {
        setActivePartner(partner);
        setSearchParams({ hospital: partner._id });
        try {
            const { data } = await chatService.getConversation(partner._id);
            setMessages(data || []);
            setConversations((prev) =>
                prev.map((c) =>
                    String(c.partner._id) === String(partner._id)
                        ? { ...c, unreadCount: 0 }
                        : c,
                ),
            );
        } catch {
            setMessages([]);
        }
    }, [setSearchParams]);

    useEffect(() => {
        if (!user?._id) return;
        joinHospitalRoom(user._id);
        loadConversations();
    }, [user, loadConversations]);

    useEffect(() => {
        const partnerId = searchParams.get('hospital');
        if (!partnerId || loading) return;
        if (activePartner && String(activePartner._id) === partnerId) return;

        const existing = conversations.find((c) => String(c.partner._id) === partnerId);
        if (existing) {
            openConversation(existing.partner);
            return;
        }

        hospitalService.getById(partnerId)
            .then(({ data }) => openConversation(data))
            .catch(() => {});
    }, [searchParams, conversations, loading, openConversation, activePartner]);

    useEffect(() => {
        const socket = getSocket();
        const onChat = (msg) => {
            const fromId = String(msg.fromHospital?._id || msg.fromHospital);
            const toId = String(msg.toHospital?._id || msg.toHospital);
            const myId = String(user?._id);

            if (fromId !== myId && toId !== myId) return;

            const partnerId = fromId === myId ? toId : fromId;
            const partnerName = fromId === myId
                ? msg.toHospital?.name
                : msg.fromHospital?.name;

            setConversations((prev) => {
                const idx = prev.findIndex((c) => String(c.partner._id) === partnerId);
                const entry = {
                    partner: fromId === myId ? msg.toHospital : msg.fromHospital,
                    lastMessage: msg,
                    unreadCount: activePartner && String(activePartner._id) === partnerId && toId === myId
                        ? 0
                        : toId === myId
                            ? (idx >= 0 ? prev[idx].unreadCount + 1 : 1)
                            : 0,
                };
                if (idx >= 0) {
                    const next = [...prev];
                    next.splice(idx, 1);
                    return [entry, ...next];
                }
                return [entry, ...prev];
            });

            if (activePartner && String(activePartner._id) === partnerId) {
                setMessages((prev) => {
                    if (prev.some((m) => m._id === msg._id)) return prev;
                    return [...prev, msg];
                });
                if (toId === myId) {
                    chatService.getConversation(partnerId).catch(() => {});
                }
            } else if (toId === myId) {
                showToast(`New message from ${partnerName || 'a hospital'}`, 'info');
            }
        };

        socket.on('chat_message', onChat);
        return () => socket.off('chat_message', onChat);
    }, [user, activePartner, showToast]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendChat = async () => {
        if (!activePartner || !newMessage.trim() || sending) return;
        setSending(true);
        try {
            const { data } = await chatService.sendMessage(activePartner._id, newMessage.trim());
            setMessages((prev) => [...prev, data]);
            setNewMessage('');
            setConversations((prev) => {
                const filtered = prev.filter((c) => String(c.partner._id) !== String(activePartner._id));
                return [{ partner: activePartner, lastMessage: data, unreadCount: 0 }, ...filtered];
            });
        } catch {
            showToast('Failed to send message', 'error');
        } finally {
            setSending(false);
        }
    };

    const timeLabel = (date) => {
        const d = new Date(date);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleDateString();
    };

    if (loading) {
        return <div className="chih-loading"><div className="chih-spinner" /> Loading messages...</div>;
    }

    return (
        <div className="chih-page messages-page">
            <div className="messages-layout">
                <aside className="chih-panel messages-sidebar">
                    <div className="chih-panel-header">
                        <h2>Conversations</h2>
                        <Link to="/social" className="chih-link-btn">Find hospitals</Link>
                    </div>
                    <div className="messages-conv-list">
                        {conversations.length === 0 ? (
                            <p className="chih-muted messages-empty">
                                No conversations yet. Open a hospital in{' '}
                                <Link to="/social">Hospital Network</Link> and send a message.
                            </p>
                        ) : (
                            conversations.map(({ partner, lastMessage, unreadCount }) => (
                                <button
                                    key={partner._id}
                                    type="button"
                                    className={`messages-conv-item ${activePartner?._id === partner._id ? 'active' : ''}`}
                                    onClick={() => openConversation(partner)}
                                >
                                    <div className="social-card-avatar small">{partner.name?.charAt(0)}</div>
                                    <div className="messages-conv-body">
                                        <div className="messages-conv-top">
                                            <strong>{partner.name}</strong>
                                            <span>{timeLabel(lastMessage.createdAt)}</span>
                                        </div>
                                        <p>{lastMessage.message}</p>
                                    </div>
                                    {unreadCount > 0 && (
                                        <span className="messages-unread-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </aside>

                <section className="chih-panel messages-thread">
                    {!activePartner ? (
                        <div className="messages-placeholder">
                            <h3>Select a conversation</h3>
                            <p className="chih-muted">Choose a hospital from the list or open one from Hospital Network.</p>
                        </div>
                    ) : (
                        <>
                            <div className="messages-thread-header">
                                <div className="social-card-avatar small">{activePartner.name?.charAt(0)}</div>
                                <div>
                                    <strong>{activePartner.name}</strong>
                                    <span className="chih-muted">{activePartner.email}</span>
                                </div>
                            </div>
                            <div className="chat-messages messages-thread-body">
                                {messages.length === 0 && (
                                    <p className="text-muted chat-empty">No messages yet. Say hello to {activePartner.name}.</p>
                                )}
                                {messages.map((m) => {
                                    const fromMe = String(m.fromHospital?._id || m.fromHospital) === String(user._id);
                                    return (
                                        <div key={m._id} className={`chat-bubble ${fromMe ? 'chat-mine' : 'chat-theirs'}`}>
                                            {!fromMe && <small>{m.fromHospital?.name}</small>}
                                            <p>{m.message}</p>
                                            <time>{timeLabel(m.createdAt)}</time>
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
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChat()}
                                />
                                <button type="button" className="btn btn-primary" onClick={sendChat} disabled={sending}>
                                    {sending ? 'Sending...' : 'Send'}
                                </button>
                            </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Messages;
