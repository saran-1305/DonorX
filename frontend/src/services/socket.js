import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;
let registeredHospitalId = null;
const registeredRequestRooms = new Set();

export const getSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL, { autoConnect: true });

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
            if (registeredHospitalId) {
                socket.emit('join_hospital', String(registeredHospitalId));
                console.log('Auto-rejoined hospital room:', registeredHospitalId);
            }
            registeredRequestRooms.forEach((reqId) => {
                socket.emit('join_request', String(reqId));
                console.log('Auto-rejoined request room:', reqId);
            });
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });
    }
    return socket;
};

export const joinHospitalRoom = (hospitalId) => {
    if (!hospitalId) return;
    registeredHospitalId = String(hospitalId);
    const s = getSocket();
    if (s.connected) {
        s.emit('join_hospital', String(hospitalId));
    }
    return s;
};

export const joinRequestRoom = (requestId) => {
    if (!requestId) return;
    registeredRequestRooms.add(String(requestId));
    const s = getSocket();
    if (s.connected) {
        s.emit('join_request', String(requestId));
    }
    return s;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    registeredHospitalId = null;
    registeredRequestRooms.clear();
};
