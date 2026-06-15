import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const NotificationContext = createContext(null);

export const useToast = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useToast must be used within NotificationProvider');
  return context.toast;
};

export const useConfirm = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useConfirm must be used within NotificationProvider');
  return context.confirm;
};

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null); // { message, title, resolve }

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  // Helpers for toast types
  toast.success = useCallback((msg, dur) => toast(msg, 'success', dur), [toast]);
  toast.error = useCallback((msg, dur) => toast(msg, 'error', dur), [toast]);
  toast.warning = useCallback((msg, dur) => toast(msg, 'warning', dur), [toast]);
  toast.info = useCallback((msg, dur) => toast(msg, 'info', dur), [toast]);

  const confirm = useCallback((message, title = 'Confirm Action') => {
    return new Promise((resolve) => {
      setConfirmState({ message, title, resolve });
    });
  }, []);

  const handleConfirmResolve = (val) => {
    if (confirmState) {
      confirmState.resolve(val);
      setConfirmState(null);
    }
  };

  // Keyboard navigation for confirm modal
  useEffect(() => {
    if (!confirmState) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleConfirmResolve(false);
      } else if (e.key === 'Enter') {
        handleConfirmResolve(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmState]);

  return (
    <NotificationContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast Notifications Container */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`toast-item ${t.type}`}>
              {t.type === 'success' && <CheckCircle className="toast-icon" />}
              {t.type === 'error' && <AlertCircle className="toast-icon" />}
              {t.type === 'warning' && <AlertTriangle className="toast-icon" />}
              {t.type === 'info' && <Info className="toast-icon" />}
              <div className="toast-content">
                <div className="toast-message">{t.message}</div>
              </div>
              <button
                className="toast-close"
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                aria-label="Close notification"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal Overlay */}
      {confirmState && (
        <div className="confirm-overlay" onClick={() => handleConfirmResolve(false)}>
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-header">
              <div className="confirm-icon-wrapper">
                <AlertTriangle size={22} />
              </div>
              <h3 className="confirm-title">{confirmState.title}</h3>
            </div>
            <div className="confirm-body">
              {confirmState.message}
            </div>
            <div className="confirm-actions">
              <button
                className="confirm-btn confirm-btn-cancel"
                onClick={() => handleConfirmResolve(false)}
              >
                Cancel
              </button>
              <button
                className="confirm-btn confirm-btn-confirm"
                onClick={() => handleConfirmResolve(true)}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};
