import React, { useState } from 'react';
import { BrainCircuit, UploadCloud, Mic, FileText, Zap, BarChart2, ShieldCheck } from 'lucide-react';

const MozillaAIEngine = () => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState(false);

    const handleAnalyze = () => {
        setIsAnalyzing(true);
        setTimeout(() => {
            setIsAnalyzing(false);
            setResult(true);
        }, 3000);
    };

    return (
        <div style={{ paddingBottom: '2rem' }}>
            <div className="flex justify-between items-center mb-lg">
                <div>
                    <div className="flex items-center gap-sm mb-xs">
                        <BrainCircuit color="var(--primary-color)" size={20} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Intelligence Layer
                        </span>
                    </div>
                    <h1>Mozilla AI Clinical Engine</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Advanced LLM-powered triage, report analysis, and predictive forecasting.</p>
                </div>
            </div>

            <div className="grid-2 gap-lg mb-lg">
                <div className="card glass-panel">
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }} className="flex items-center gap-sm">
                        <UploadCloud size={20} color="var(--primary-color)" /> Data Ingestion
                    </h2>
                    <div 
                        style={{ 
                            border: '2px dashed var(--border-color)', 
                            borderRadius: 'var(--radius-md)', 
                            padding: '3rem 2rem', 
                            textAlign: 'center',
                            background: 'var(--bg-surface-hover)',
                            marginBottom: '1rem',
                            cursor: 'pointer'
                        }}
                    >
                        <FileText size={48} color="var(--text-tertiary)" style={{ margin: '0 auto 1rem auto' }} />
                        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Upload Medical Documents</h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Drag and drop lab results, MRI reports, or doctor notes (PDF, JPG, PNG)</p>
                    </div>
                    
                    <div className="flex items-center gap-md">
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>OR</span>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                        <button className="btn btn-secondary" style={{ width: '100%', padding: '1rem', justifyContent: 'center' }}>
                            <Mic size={20} color="var(--danger)" /> Start Voice Triage (Emergency)
                        </button>
                    </div>

                    <button 
                        className="btn btn-primary mt-lg" 
                        style={{ width: '100%', padding: '1rem', justifyContent: 'center', fontSize: '1rem' }}
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? 'Processing via Mozilla AI...' : 'Run Clinical Analysis'}
                    </button>
                </div>

                <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }} className="flex items-center gap-sm">
                        <Zap size={20} color="var(--warning)" /> AI Analysis Output
                    </h2>
                    
                    {!result && !isAnalyzing && (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', flexDirection: 'column' }}>
                            <BrainCircuit size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                            <p>Awaiting data ingestion for analysis...</p>
                        </div>
                    )}

                    {isAnalyzing && (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                            <div className="live-indicator" style={{ width: '24px', height: '24px', marginBottom: '1rem', background: 'var(--primary-color)' }}></div>
                            <p style={{ fontWeight: 600, color: 'var(--primary-color)' }}>Extracting clinical entities...</p>
                        </div>
                    )}

                    {result && (
                        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ padding: '1rem', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>AI Summary</div>
                                <p style={{ fontSize: '0.875rem' }}>Patient exhibits signs of acute myocardial infarction. Elevated troponin levels detected in attached lab report. Immediate cardiology consult recommended.</p>
                            </div>
                            
                            <div className="grid-2 gap-sm">
                                <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>Calculated Risk</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}>CRITICAL</div>
                                </div>
                                <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>AI Confidence Score</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>94%</div>
                                </div>
                            </div>

                            <div>
                                <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Recommended Actions</h4>
                                <ul style={{ fontSize: '0.875rem', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <li>Dispatch Advanced Life Support (ALS) Ambulance</li>
                                    <li>Alert nearest Level 1 Cardiac Center (Metro General)</li>
                                    <li>Prepare Cath Lab for immediate intake</li>
                                </ul>
                            </div>

                            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <ShieldCheck size={14} /> Doctor always remains the final decision maker.
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }} className="flex items-center gap-sm">
                <BarChart2 size={20} color="var(--primary-color)" /> National Demand Forecasting (7-Day Projection)
            </h2>
            <div className="card glass-panel" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
                <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Recharts Area Chart Integration Here</p>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginLeft: '1rem' }}>Showing projected ICU bed vs Ventilator demand.</p>
            </div>
        </div>
    );
};

export default MozillaAIEngine;
