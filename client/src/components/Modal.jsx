const Modal = ({ isOpen, onClose, title, children, footer, size = 'default' }) => {
    if (!isOpen) return null;

    const sizeClass = size === 'large' ? 'modal-large' : size === 'extra-large' ? 'modal-extra-large' : '';

    return (
        <div className={`modal-overlay ${isOpen ? 'show' : ''}`} onClick={onClose}>
            <div className={`modal ${sizeClass}`} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    );
};

export default Modal;

