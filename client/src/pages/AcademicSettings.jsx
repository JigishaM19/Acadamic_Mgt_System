import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiTarget, FiSave, FiRefreshCw, FiX, FiInfo } from 'react-icons/fi';
import { FaRuler } from 'react-icons/fa';

const AcademicSettings = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [formData, setFormData] = useState({
        iaTotal: 20,
        eseTotal: 80,
        utWeight: 10,
        assignmentWeight: 5,
        attendanceWeight: 5,
        practicalWeight: 5,
        minAttendancePercent: 75,
        minEsePercent: 40,
        currentSemesterType: 'odd',
        attendanceSlabs: [
            { min: 90, multiplier: 0.8 },
            { min: 80, multiplier: 0.6 },
            { min: 75, multiplier: 0.4 },
            { min: 65, multiplier: 0.2 },
            { min: 0, multiplier: 0 }
        ]
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/academic-settings');
            setSettings(response.data);
            setFormData({
                iaTotal: response.data.iaTotal,
                eseTotal: response.data.eseTotal,
                utWeight: response.data.utWeight,
                assignmentWeight: response.data.assignmentWeight,
                attendanceWeight: response.data.attendanceWeight,
                practicalWeight: response.data.practicalWeight,
                minAttendancePercent: response.data.minAttendancePercent,
                minEsePercent: response.data.minEsePercent,
                currentSemesterType: response.data.currentSemesterType || 'odd',
                attendanceSlabs: response.data.attendanceSlabs || []
            });
        } catch (error) {
            console.error('Failed to fetch academic settings:', error);
            setMessage({ type: 'error', text: 'Failed to load academic settings' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: parseFloat(value) || 0
        }));
    };

    const handleSlabChange = (index, field, value) => {
        const updated = [...formData.attendanceSlabs];
        updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
        setFormData(prev => ({ ...prev, attendanceSlabs: updated }));
    };

    const addSlab = () => {
        setFormData(prev => ({
            ...prev,
            attendanceSlabs: [...prev.attendanceSlabs, { min: 0, multiplier: 0 }]
        }));
    };

    const removeSlab = (index) => {
        setFormData(prev => ({
            ...prev,
            attendanceSlabs: prev.attendanceSlabs.filter((_, i) => i !== index)
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await api.put('/academic-settings', formData);
            setSettings(response.data);
            setMessage({ type: 'success', text: 'Settings saved successfully!' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error('Failed to save settings:', error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save settings' });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!window.confirm('Are you sure you want to reset all academic settings to defaults? This cannot be undone.')) return;

        setSaving(true);
        try {
            const response = await api.post('/academic-settings/reset');
            setSettings(response.data.settings);
            setFormData({
                iaTotal: response.data.settings.iaTotal,
                eseTotal: response.data.settings.eseTotal,
                utWeight: response.data.settings.utWeight,
                assignmentWeight: response.data.settings.assignmentWeight,
                attendanceWeight: response.data.settings.attendanceWeight,
                practicalWeight: response.data.settings.practicalWeight,
                minAttendancePercent: response.data.settings.minAttendancePercent,
                minEsePercent: response.data.settings.minEsePercent,
                currentSemesterType: response.data.settings.currentSemesterType || 'odd',
                attendanceSlabs: response.data.settings.attendanceSlabs || []
            });
            setMessage({ type: 'success', text: 'Settings reset to defaults.' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to reset settings' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p>Loading academic settings...</p>
            </div>
        );
    }


    return (
        <div style={styles.container}>
            {message.text && (
                <div style={{
                    ...styles.message,
                    backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
                    color: message.type === 'success' ? '#155724' : '#721c24',
                    borderColor: message.type === 'success' ? '#c3e6cb' : '#f5c6cb'
                }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSave}>
                {/* Current Semester Type */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}><FiInfo style={{ marginRight: '6px' }} /> Current Semester Type</h3>
                    <p style={styles.cardDesc}>Set the current semester type. This controls which timetable is visible to teachers, students, and coordinators.</p>
                    <div style={styles.fieldGrid}>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Semester Type</label>
                            <select
                                name="currentSemesterType"
                                value={formData.currentSemesterType}
                                onChange={(e) => setFormData(prev => ({ ...prev, currentSemesterType: e.target.value }))}
                                style={styles.input}
                            >
                                <option value="odd">Odd (SEM-1, 3, 5, 7)</option>
                                <option value="even">Even (SEM-2, 4, 6, 8)</option>
                            </select>
                        </div>
                    </div>
                </div>


                {/* Minimum Percentages */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}><FiTarget style={{ marginRight: '6px' }} /> Eligibility Thresholds</h3>
                    <p style={styles.cardDesc}>Set minimum percentages required for student eligibility.</p>
                    <div style={styles.fieldGrid}>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Min Attendance %</label>
                            <input
                                type="number"
                                name="minAttendancePercent"
                                value={formData.minAttendancePercent}
                                onChange={handleChange}
                                style={styles.input}
                                min="0"
                                max="100"
                            />
                            <span style={styles.hint}>Students below this are marked ineligible</span>
                        </div>
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Min ESE %</label>
                            <input
                                type="number"
                                name="minEsePercent"
                                value={formData.minEsePercent}
                                onChange={handleChange}
                                style={styles.input}
                                min="0"
                                max="100"
                            />
                            <span style={styles.hint}>Minimum passing marks in ESE</span>
                        </div>
                    </div>
                </div>

                {/* Attendance Slabs */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}><FaRuler style={{ marginRight: '6px' }} /> Attendance Slab Multipliers</h3>
                    <p style={styles.cardDesc}>
                        Define attendance percentage ranges and their multipliers. The multiplier is applied to the attendance weight
                        to calculate attendance IA marks. Slabs are checked from highest to lowest.
                    </p>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Min Attendance %</th>
                                <th style={styles.th}>Multiplier (0-1)</th>
                                <th style={styles.th}>Effective Marks</th>
                                <th style={styles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {formData.attendanceSlabs
                                .sort((a, b) => b.min - a.min)
                                .map((slab, index) => (
                                    <tr key={index}>
                                        <td style={styles.td}>
                                            <input
                                                type="number"
                                                value={slab.min}
                                                onChange={(e) => handleSlabChange(index, 'min', e.target.value)}
                                                style={styles.tableInput}
                                                min="0"
                                                max="100"
                                            />
                                        </td>
                                        <td style={styles.td}>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={slab.multiplier}
                                                onChange={(e) => handleSlabChange(index, 'multiplier', e.target.value)}
                                                style={styles.tableInput}
                                                min="0"
                                                max="1"
                                            />
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{
                                                ...styles.badge,
                                                backgroundColor: slab.multiplier >= 0.6 ? '#d4edda' : slab.multiplier >= 0.3 ? '#fff3cd' : '#f8d7da',
                                                color: slab.multiplier >= 0.6 ? '#155724' : slab.multiplier >= 0.3 ? '#856404' : '#721c24'
                                            }}>
                                                {(slab.multiplier * formData.attendanceWeight).toFixed(1)} / {formData.attendanceWeight}
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            <button
                                                type="button"
                                                onClick={() => removeSlab(index)}
                                                style={styles.deleteBtn}
                                                title="Remove slab"
                                            >
                                                <FiX />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                    <button type="button" onClick={addSlab} style={styles.addSlabBtn}>
                        + Add Slab
                    </button>
                </div>

                {/* Actions */}
                <div style={styles.actions}>
                    <button type="submit" style={styles.saveBtn} disabled={saving}>
                        {saving ? 'Saving...' : <><FiSave style={{ marginRight: '4px' }} /> Save Settings</>}
                    </button>
                    <button type="button" onClick={handleReset} style={styles.resetBtn} disabled={saving}>
                        <FiRefreshCw style={{ marginRight: '4px' }} /> Reset to Defaults
                    </button>
                </div>
            </form>

            {/* Info Card */}
            <div style={styles.infoCard}>
                <h4 style={{ margin: '0 0 12px 0' }}><FiInfo style={{ marginRight: '6px' }} /> New Marks System (Mumbai University CBSGS)</h4>
                <div style={styles.formulaGrid}>
                    <div style={styles.formulaItem}>
                        <strong>Final IA</strong>
                        <code style={styles.code}>(IA1 + IA2) / 2 → out of 20</code>
                    </div>
                    <div style={styles.formulaItem}>
                        <strong>Term Work (Auto)</strong>
                        <code style={styles.code}>Journal(10) + Assignments(5) + Lab(5) + Viva(5) = 25</code>
                    </div>
                    <div style={styles.formulaItem}>
                        <strong>Attendance Marks</strong>
                        <code style={styles.code}>slabMultiplier × attendanceWeight (displayed only)</code>
                    </div>
                    <div style={styles.formulaItem}>
                        <strong>Total</strong>
                        <code style={styles.code}>Final IA + TW + Oral(25) + ESE(80) = 150</code>
                    </div>
                    <div style={styles.formulaItem}>
                        <strong>Passing</strong>
                        <code style={styles.code}>ESE ≥ 32, TW ≥ 10, Total ≥ 60</code>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: {
        padding: '24px',
        maxWidth: '900px',
        margin: '0 auto'
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        color: '#666'
    },
    spinner: {
        width: 40,
        height: 40,
        border: '4px solid #e0e0e0',
        borderTopColor: '#4f46e5',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginBottom: 16
    },
    message: {
        padding: '12px 16px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid',
        fontSize: '14px',
        fontWeight: 500
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb'
    },
    cardTitle: {
        fontSize: '18px',
        fontWeight: 600,
        marginBottom: '4px',
        color: '#1e293b'
    },
    cardDesc: {
        fontSize: '13px',
        color: '#64748b',
        marginBottom: '20px',
        lineHeight: 1.5
    },
    fieldGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
    },
    fieldGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
    },
    label: {
        fontSize: '13px',
        fontWeight: 600,
        color: '#374151'
    },
    input: {
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 0.2s',
        width: '100%',
        boxSizing: 'border-box'
    },
    hint: {
        fontSize: '11px',
        color: '#9ca3af'
    },
    totalDisplay: {
        padding: '10px 12px',
        borderRadius: '8px',
        backgroundColor: '#f0f9ff',
        border: '1px solid #bfdbfe',
        fontSize: '18px',
        fontWeight: 700,
        color: '#1e40af',
        textAlign: 'center'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '12px'
    },
    th: {
        padding: '10px 12px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#6b7280',
        textAlign: 'left',
        borderBottom: '2px solid #e5e7eb',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    td: {
        padding: '8px 12px',
        borderBottom: '1px solid #f3f4f6'
    },
    tableInput: {
        padding: '8px 10px',
        borderRadius: '6px',
        border: '1px solid #d1d5db',
        fontSize: '14px',
        width: '100px',
        outline: 'none'
    },
    badge: {
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: 600
    },
    deleteBtn: {
        background: 'none',
        border: '1px solid #fca5a5',
        color: '#dc2626',
        borderRadius: '6px',
        cursor: 'pointer',
        padding: '4px 10px',
        fontSize: '14px',
        fontWeight: 600
    },
    addSlabBtn: {
        background: 'none',
        border: '1px dashed #9ca3af',
        color: '#6b7280',
        padding: '8px 16px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 500
    },
    actions: {
        display: 'flex',
        gap: '12px',
        marginBottom: '24px'
    },
    saveBtn: {
        backgroundColor: '#4f46e5',
        color: '#fff',
        border: 'none',
        padding: '12px 28px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer'
    },
    resetBtn: {
        backgroundColor: '#fff',
        color: '#dc2626',
        border: '1px solid #fca5a5',
        padding: '12px 28px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer'
    },
    infoCard: {
        backgroundColor: '#f0f9ff',
        border: '1px solid #bfdbfe',
        borderRadius: '12px',
        padding: '20px 24px'
    },
    formulaGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '12px'
    },
    formulaItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    code: {
        backgroundColor: '#e0f2fe',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#1e3a5f'
    }
};

export default AcademicSettings;
