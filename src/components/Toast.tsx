import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { ToastMessage } from './ToastContainer';

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const { i18n } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    // Show animation
    const showTimer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto hide after duration
    const hideTimer = setTimeout(() => {
      handleClose();
    }, toast.duration || 5000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [toast.duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStyles = () => {
    const borderDirection = isRTL ? 'border-r-4' : 'border-l-4';
    const baseStyles = `${borderDirection} shadow-lg bg-white border border-slate-200`;

    switch (toast.type) {
      case 'success':
        return `${baseStyles} ${isRTL ? 'border-r-green-500' : 'border-l-green-500'} bg-green-50`;
      case 'error':
        return `${baseStyles} ${isRTL ? 'border-r-red-500' : 'border-l-red-500'} bg-red-50`;
      case 'warning':
        return `${baseStyles} ${isRTL ? 'border-r-amber-500' : 'border-l-amber-500'} bg-amber-50`;
      case 'info':
        return `${baseStyles} ${isRTL ? 'border-r-blue-500' : 'border-l-blue-500'} bg-blue-50`;
      default:
        return `${baseStyles} ${isRTL ? 'border-r-blue-500' : 'border-l-blue-500'} bg-blue-50`;
    }
  };

  return (
    <div
      className={`
        relative max-w-sm w-full transform transition-all duration-300 ease-in-out
        ${isVisible && !isLeaving
          ? 'translate-x-0 opacity-100 scale-100'
          : isRTL
            ? 'translate-x-full opacity-0 scale-95'
            : '-translate-x-full opacity-0 scale-95'
        }
        ${getStyles()}
        rounded-lg p-4 shadow-xl backdrop-blur-sm
      `}
      role="alert"
      style={{
        direction: isRTL ? 'rtl' : 'ltr',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <div className={`flex items-start gap-3 ${isRTL ? 'text-right' : 'text-left'}`}>
        {/* الأيقونة - دائماً في البداية */}
        <div className="flex-shrink-0 order-1">
          {getIcon()}
        </div>

        {/* النص - دائماً في الوسط */}
        <div className="flex-1 min-w-0 order-2">
          <h4 className="text-sm font-semibold text-slate-800 mb-1 leading-tight">
            {toast.title}
          </h4>
          <p className="text-sm text-slate-600 leading-relaxed break-words whitespace-pre-wrap">
            {toast.message}
          </p>
        </div>

        {/* زر الإغلاق - دائماً في النهاية */}
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1 rounded-full hover:bg-slate-200 transition-colors order-3"
          aria-label={isRTL ? "إغلاق التنبيه" : "Close notification"}
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
