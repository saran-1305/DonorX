import React, { useState } from 'react';
import { useDonor } from '../context/DonorContext';

const HospitalDashboard = () => {
    const { showToast } = useDonor();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortType, setSortType] = useState('name');

    // Static inventory data mimicking the prototype
    const [inventory, setInventory] = useState([
        { resource: 'Kidney', type: 'Left', qty: 1, id: '#6 (Locker 324)', status: 'Available' },
        { resource: 'Kidney', type: 'Right', qty: 0, id: '#6 (Locker 325)', status: 'Out of Stock' },
        { resource: 'Blood', type: 'O-', qty: '4 Units', id: 'Fridge B-12', status: 'Available' },
        { resource: 'Blood', type: 'A+', qty: '2 Units', id: 'Fridge A-04', status: 'Low Stock' },
        { resource: 'Blood', type: 'B+', qty: '8 Units', id: 'Fridge B-01', status: 'Available' },
        { resource: 'Tissue', type: 'Cornea', qty: '2 Pairs', id: 'Cold Storage C-2', status: 'Available' },
    ]);

    const handleSort = (e) => {
        const type = e.target.value;
        setSortType(type);
        showToast("Sorting updated", "default");
        // Implementing basic sort for demo
        const sorted = [...inventory].sort((a, b) => {
            if (type === 'name') return a.resource.localeCompare(b.resource);
            if (type === 'qty') return String(a.qty).localeCompare(String(b.qty));
            if (type === 'status') return a.status.localeCompare(b.status);
            return 0;
        });
        setInventory(sorted);
    };

    const filteredInventory = inventory.filter(item =>
        item.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status) => {
        if (status === 'Available') return 'badge-low';
        if (status === 'Out of Stock') return 'badge-critical';
        if (status === 'Low Stock') return 'badge-warning';
        return 'badge-low';
    };

    return (
        <div className="container" style={{ padding: '4rem 1rem' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <h2>Hospital Inventory Management</h2>
                <button className="btn btn-primary" onClick={() => showToast('Add Inventory feature coming soon', 'default')}>
                    + Add Resource
                </button>
            </div>

            {/* Inventory Section */}
            <div className="card animate-fade-in" style={{ marginBottom: '2rem' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                    <h3>Current Stock</h3>
                    <div className="flex gap-sm">
                        <input
                            type="text"
                            placeholder="Search inventory..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                        />
                        <select
                            onChange={handleSort}
                            value={sortType}
                            style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                        >
                            <option value="name">Sort by Name</option>
                            <option value="qty">Sort by Quantity</option>
                            <option value="status">Sort by Status</option>
                        </select>
                    </div>
                </div>
                <div className="table-container">
                    <table style={{ fontSize: '0.9rem' }}>
                        <thead>
                            <tr>
                                <th>Resource</th>
                                <th>Type/Group</th>
                                <th>Quantity</th>
                                <th>Locker / ID</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInventory.map((item, index) => (
                                <tr key={index}>
                                    <td><span style={{ fontWeight: 600 }}>{item.resource}</span></td>
                                    <td>{item.type}</td>
                                    <td>{item.qty}</td>
                                    <td>{item.id}</td>
                                    <td><span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span></td>
                                    <td><button className="btn" style={{ padding: '0.2rem 0.5rem', color: 'var(--primary-color)', background: 'transparent' }}>Edit</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HospitalDashboard;
