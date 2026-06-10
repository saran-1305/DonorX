import React, { useState } from 'react';
import { 
    Heart, ShieldAlert, Activity, ArrowRight, CheckCircle2, Navigation2
} from 'lucide-react';
import { useDonor } from '../../context/DonorContext';
import { requestService } from '../../services/api';

const EmergencyCoordination = () => {
    const { showToast } = useDonor();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        patientName: '',
        conditionType: 'Trauma / Accident',
        urgency: 'High',
        resourceType: 'Blood', // Blood, Organ, Equipment
        bloodGroup: '',
        quantity: 1,
    });

    const handleNext = (e) => {
        e.preventDefault();
        if (!formData.patientName || !formData.urgency) {
            showToast('Please provide patient name and urgency.', 'warning');
            return;
        }
        setStep(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        let resourceNeeded = {};
        
        if (formData.resourceType === 'Blood') {
            if (!formData.bloodGroup) {
                showToast('Please select a blood group.', 'warning');
                return;
            }
            resourceNeeded = {
                resourceCategory: 'BLOOD',
                type: 'BLOOD',
                group: formData.bloodGroup,
                quantity: formData.quantity
            };
        } else if (formData.resourceType === 'Organ') {
            resourceNeeded = {
                resourceCategory: 'ORGAN',
                type: 'ORGAN',
                group: 'Kidney', // Defaulting for MVP
                quantity: formData.quantity
            };
        } else if (formData.resourceType === 'Equipment') {
            resourceNeeded = {
                resourceCategory: 'RESOURCE',
                type: 'ICU_BED', // Defaulting for MVP
                group: '',
                quantity: formData.quantity
            };
        }

        const payload = {
            patientName: formData.patientName,
            urgency: formData.urgency,
            condition: formData.conditionType,
            resourceNeeded,
            // Using a default coordinate for MVP simulation
            location: {
                lat: 13.0418,
                lon: 80.2341
            }
        };

        try {
            await requestService.create(payload);
            showToast('Emergency request broadcasted successfully!', 'success');
            setStep(3); // Success Screen
        } catch (error) {
            console.error('Request creation error:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
            showToast(`Failed to create request: ${errorMessage}`, 'error');
        }
    };

    return (
        <div style={{ paddingBottom: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <div className="flex justify-between items-center mb-lg">
                <div>
                    <div className="flex items-center gap-sm mb-xs">
                        <Heart color="var(--primary-color)" size={20} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            New Request
                        </span>
                    </div>
                    <h1>Emergency Coordination</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Declare an emergency and dispatch resources instantly.</p>
                </div>
            </div>

            {/* Stepper */}
            {step < 3 && (
                <div className="flex items-center mb-xl" style={{ paddingBottom: '2rem' }}>
                    {['Patient Details', 'Resource Requirements'].map((label, index) => (
                        <React.Fragment key={index}>
                            <div className="flex items-center gap-sm" style={{ opacity: step >= index + 1 ? 1 : 0.4 }}>
                                <div style={{ 
                                    width: '32px', height: '32px', borderRadius: '50%', 
                                    background: step > index + 1 ? 'var(--success)' : (step === index + 1 ? 'var(--primary-color)' : 'var(--bg-surface-hover)'),
                                    color: step >= index + 1 ? 'white' : 'var(--text-secondary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 600, fontSize: '0.875rem'
                                }}>
                                    {step > index + 1 ? <CheckCircle2 size={16} /> : index + 1}
                                </div>
                                <span style={{ fontWeight: step === index + 1 ? 600 : 500 }}>{label}</span>
                            </div>
                            {index === 0 && <div style={{ flex: 1, height: '2px', background: step > 1 ? 'var(--success)' : 'var(--border-color)', margin: '0 1rem' }}></div>}
                        </React.Fragment>
                    ))}
                </div>
            )}

            <div className="card glass-panel" style={{ padding: '2rem' }}>
                {step === 1 && (
                    <form onSubmit={handleNext} className="animate-fade-in flex-col gap-lg">
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Patient Name</label>
                            <input 
                                type="text" 
                                required
                                className="search-input" 
                                style={{ width: '100%', padding: '0.75rem', background: 'white' }}
                                placeholder="Enter patient name..." 
                                value={formData.patientName}
                                onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Condition Type</label>
                            <select 
                                className="search-input" 
                                style={{ width: '100%', padding: '0.75rem', background: 'white' }}
                                value={formData.conditionType}
                                onChange={e => setFormData({ ...formData, conditionType: e.target.value })}
                            >
                                <option>Trauma / Accident</option>
                                <option>Surgery</option>
                                <option>Organ Transplant</option>
                                <option>Internal Bleeding</option>
                                <option>ICU / Critical Care</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Urgency Level</label>
                            <div className="grid-4" style={{ gap: '1rem' }}>
                                {['Low', 'Medium', 'High', 'Critical'].map(level => {
                                    const isSelected = formData.urgency === level;
                                    let color = 'var(--text-secondary)';
                                    let bg = 'white';
                                    let border = 'var(--border-color)';
                                    
                                    if (isSelected) {
                                        if (level === 'Low') { color = '#065F46'; bg = 'var(--success-bg)'; border = 'var(--success)'; }
                                        if (level === 'Medium') { color = '#92400E'; bg = 'var(--warning-bg)'; border = 'var(--warning)'; }
                                        if (level === 'High') { color = '#9A3412'; bg = '#FFF7ED'; border = '#F97316'; }
                                        if (level === 'Critical') { color = '#991B1B'; bg = 'var(--danger-bg)'; border = 'var(--danger)'; }
                                    }

                                    return (
                                        <div 
                                            key={level}
                                            onClick={() => setFormData({ ...formData, urgency: level })}
                                            style={{
                                                padding: '0.75rem', textAlign: 'center', borderRadius: 'var(--radius-md)',
                                                border: `1px solid ${border}`, background: bg, color: color,
                                                fontWeight: isSelected ? 600 : 400, cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                        >
                                            {level}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex justify-end mt-md">
                            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
                                Next Step <ArrowRight size={18} />
                            </button>
                        </div>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleSubmit} className="animate-fade-in flex-col gap-lg">
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>What Resource is Needed?</label>
                            <div className="grid-3" style={{ gap: '1rem' }}>
                                {['Blood', 'Organ', 'Equipment'].map(type => (
                                    <div 
                                        key={type}
                                        onClick={() => setFormData({ ...formData, resourceType: type })}
                                        style={{
                                            padding: '1rem', textAlign: 'center', borderRadius: 'var(--radius-md)',
                                            border: formData.resourceType === type ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                            background: formData.resourceType === type ? '#F0F7FF' : 'white',
                                            color: formData.resourceType === type ? 'var(--primary-color)' : 'var(--text-secondary)',
                                            fontWeight: formData.resourceType === type ? 600 : 500, cursor: 'pointer'
                                        }}
                                    >
                                        {type}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid-2">
                            {formData.resourceType === 'Blood' && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Blood Group Required</label>
                                    <select 
                                        className="search-input" 
                                        style={{ width: '100%', padding: '0.75rem', background: 'white' }}
                                        value={formData.bloodGroup}
                                        onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Group</option>
                                        <option value="A+">A+</option>
                                        <option value="O+">O+</option>
                                        <option value="B+">B+</option>
                                        <option value="AB+">AB+</option>
                                        <option value="O-">O-</option>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Quantity</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    className="search-input" 
                                    style={{ width: '100%', padding: '0.75rem', background: 'white' }}
                                    value={formData.quantity}
                                    onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-md mt-md">
                            <button type="button" onClick={() => setStep(1)} className="btn btn-secondary" style={{ flex: 1, padding: '0.75rem' }}>
                                Back
                            </button>
                            <button type="submit" className="btn btn-danger" style={{ flex: 2, padding: '0.75rem', fontSize: '1rem' }}>
                                <ShieldAlert size={18} /> Broadcast Emergency Request
                            </button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <div className="animate-fade-in" style={{ textAlign: 'center', padding: '3rem 0' }}>
                        <div style={{ width: '80px', height: '80px', background: 'var(--success-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                            <Navigation2 size={40} color="var(--success)" />
                        </div>
                        <h2 style={{ marginBottom: '0.5rem' }}>Request Broadcasted</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                            Hospitals in the 10km vicinity have been notified. Waiting for acceptance.
                        </p>
                        <button className="btn btn-primary" onClick={() => setStep(1)}>
                            Create Another Request
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmergencyCoordination;
