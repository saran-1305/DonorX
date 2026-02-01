import React, { createContext, useContext, useState, useEffect } from 'react';

const DonorContext = createContext();

const STORAGE_KEYS = {
    REQUESTS: 'donorx_requests',
    AUDIT_LOGS: 'donorx_audit_logs'
};

const MOCK_DATA = {
    requests: [
        {
            id: 'REQ-1001',
            patientName: 'Priya Venkatesh',
            bloodGroup: 'O-',
            organType: 'Kidney',
            urgency: 'Critical',
            location: 'Apollo Hospital, Greams Road',
            status: 'Searching',
            timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        },
        {
            id: 'REQ-1002',
            patientName: 'Rahul Sharma',
            bloodGroup: 'AB+',
            organType: 'None',
            urgency: 'High',
            location: 'Fortis Malar, Adyar',
            status: 'Matched',
            timestamp: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
        }
    ],
    logs: [
        {
            id: 'LOG-5001',
            action: 'Request Created',
            details: 'Emergency request REQ-1001 initialized by System',
            timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
            id: 'LOG-5002',
            action: 'AI Prioritization',
            details: 'Urgency Score Calculated: 98/100 (Critical) for REQ-1001',
            timestamp: new Date(Date.now() - 3595000).toISOString()
        }
    ]
};

export const DonorProvider = ({ children }) => {
    const [requests, setRequests] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        // Initialize Data
        const storedRequests = localStorage.getItem(STORAGE_KEYS.REQUESTS);
        const storedLogs = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);

        if (!storedRequests) {
            console.log('Seeding initial data...');
            localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(MOCK_DATA.requests));
            localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(MOCK_DATA.logs));
            setRequests(MOCK_DATA.requests);
            setAuditLogs(MOCK_DATA.logs);
        } else {
            setRequests(JSON.parse(storedRequests));
            setAuditLogs(JSON.parse(storedLogs));
        }

        // Initialize Incoming Requests (Mock)
        setIncomingRequests([
            {
                id: 'INC-9001',
                patientName: 'Amit Verma',
                bloodGroup: 'B+',
                organType: 'Kidney',
                urgency: 'Critical',
                location: 'General Hospital, Park Town',
                status: 'Pending',
                timestamp: new Date(Date.now() - 1200000).toISOString()
            },
            {
                id: 'INC-9003',
                patientName: 'Sarah Thomas',
                bloodGroup: 'O-',
                organType: 'None',
                urgency: 'High',
                location: 'Billroth Hospitals, Aminjikarai',
                status: 'Completed',
                timestamp: new Date(Date.now() - 4500000).toISOString()
            }
        ]);

        startSimulation();
    }, []);

    const addRequest = (request) => {
        const newRequest = {
            ...request,
            id: `REQ-${1000 + requests.length + 1}`,
            status: 'Searching',
            timestamp: new Date().toISOString()
        };

        const updatedRequests = [newRequest, ...requests];
        setRequests(updatedRequests);
        localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(updatedRequests));

        // Format resource string for log
        let resourceStr = '';
        if (request.resources && request.resources.length > 0) {
            resourceStr = request.resources.map(r => r.type === 'Blood' ? `Blood ${r.group}` : `${r.organ}`).join(', ');
        } else {
            resourceStr = request.organType !== 'None' ? request.organType : `Blood ${request.bloodGroup}`;
        }

        addAuditLog('Request Created', `New request ${newRequest.id} for ${newRequest.patientName} (${resourceStr})`);

        // Simulating AI Prioritization
        setTimeout(() => {
            addAuditLog('AI Prioritization', `Calculated Urgency: ${request.urgency} for ${newRequest.id}`);
        }, 1500);

        return newRequest;
    };

    const addAuditLog = (action, details) => {
        const newLog = {
            id: `LOG-${5000 + auditLogs.length + 1}`,
            action,
            details,
            timestamp: new Date().toISOString()
        };
        const updatedLogs = [newLog, ...auditLogs];
        setAuditLogs(updatedLogs);
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(updatedLogs));
    };

    const getAuditLogsForRequest = (requestId) => {
        // Individual Request Log Generation (Mock)
        const baseLogs = [
            { action: 'Request Generated', details: `Emergency Protocol initialized for ${requestId}` },
            { action: 'Identity Verified', details: 'Patient ID verified against Aadhaar Database' },
            { action: 'AI Prioritization', details: 'Urgency Score Calculated: 92/100' },
            { action: 'Broadcast Sent', details: 'Encrypted broadcast to 5 nearby nodes' }
        ];

        if (requestId.startsWith('INC')) {
            baseLogs.push({ action: 'Incoming Signal', details: 'Received request from external node (General Hospital)' });
        } else {
            baseLogs.push({ action: 'Inventory Check', details: 'Internal stock reserved: Block #492a' });
        }

        // Add timestamps and hash
        return baseLogs.map((log, i) => ({
            ...log,
            hash: '0x' + Math.random().toString(16).substr(2, 40),
            timestamp: new Date(Date.now() - (10000 * (baseLogs.length - i))).toISOString()
        }));
    };

    const showToast = (message, type = 'default') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const startSimulation = () => {
        if (window.simulationStarted) return;
        window.simulationStarted = true;

        const messages = [
            { msg: "New kidney match found in MIOT Hospital, Manapakkam", type: "success" },
            { msg: "High urgency request incoming: O- Blood (Velachery)", type: "warning" },
            { msg: "Transport logistics updated for REQ-1002 (Anna Nagar)", type: "default" },
            { msg: "System health check: Chennai Zone Optimal", type: "default" },
            { msg: "Donor database synchronized with TN Organ Registry", type: "default" }
        ];

        // Random check every 15 seconds
        setInterval(() => {
            if (Math.random() > 0.6) {
                const item = messages[Math.floor(Math.random() * messages.length)];
                showToast(item.msg, item.type);
            }
        }, 8000);
    };

    const formatDate = (isoString) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <DonorContext.Provider value={{
            requests,
            auditLogs,
            incomingRequests,
            toasts,
            addRequest,
            getAuditLogsForRequest,
            showToast,
            removeToast,
            formatDate
        }}>
            {children}
        </DonorContext.Provider>
    );
};

export const useDonor = () => useContext(DonorContext);
