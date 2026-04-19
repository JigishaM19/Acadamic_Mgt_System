import { FiX } from 'react-icons/fi';
import { createPortal } from 'react-dom';

/**
 * A reusable detail popup modal for viewing full details of leave requests, complaints, and announcements.
 * 
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Close handler
 * @param {string} title - Modal title
 * @param {Array} fields - Array of { label, value, badge?, badgeClass? } to display
 */
const DetailModal = ({ isOpen, onClose, title, fields = [] }) => {
    if (!isOpen) return null;

    return createPortal(
        <>
            <div
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.45)', zIndex: 9998,
                    animation: 'fadeIn 0.2s ease'
                }}
                onClick={onClose}
            />
            <div
                style={{
                    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    background: 'var(--white, #ffffff)', borderRadius: '16px', padding: '0',
                    width: '90%', maxWidth: '520px', maxHeight: '80vh', zIndex: 9999,
                    boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
                    display: 'flex', flexDirection: 'column',
                    animation: 'slideUp 0.25s ease'
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '20px 24px', borderBottom: '1px solid var(--gray-200, #e5e7eb)'
                }}>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--gray-800, #1f2937)' }}>
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--gray-400, #9ca3af)', padding: '4px',
                            borderRadius: '6px', display: 'flex', alignItems: 'center'
                        }}
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Body */}
                <div style={{
                    padding: '20px 24px', overflowY: 'auto', flex: 1
                }}>
                    {fields.map((field, index) => (
                        <div key={index} style={{ marginBottom: index < fields.length - 1 ? '16px' : 0 }}>
                            <div style={{
                                fontSize: '12px', fontWeight: 600, textTransform: 'uppercase',
                                letterSpacing: '0.5px', color: 'var(--gray-400, #9ca3af)',
                                marginBottom: '4px'
                            }}>
                                {field.label}
                            </div>
                            {field.badge ? (
                                <span style={{
                                    display: 'inline-block',
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    ...(field.badgeStyle || {})
                                }}>
                                    {field.value}
                                </span>
                            ) : (
                                <div style={{
                                    fontSize: '14px', color: 'var(--gray-700, #374151)',
                                    lineHeight: '1.6', whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word'
                                }}>
                                    {field.value || '—'}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px', borderTop: '1px solid var(--gray-200, #e5e7eb)',
                    display: 'flex', justifyContent: 'flex-end'
                }}>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </>,
        document.body
    );
};

export default DetailModal;
