import React, { useState } from 'react';
import { X, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

export type ModalType = 'confirm' | 'input' | 'info' | 'warning' | 'error' | 'success';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (inputValue?: string) => void | Promise<void>;
  title: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  inputPlaceholder?: string;
  inputRequired?: boolean;
  inputMaxLength?: number;
  inputType?: 'text' | 'textarea' | 'email';
  isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'confirm',
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  inputPlaceholder = '',
  inputRequired = false,
  inputMaxLength = 500,
  inputType,
  isLoading = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (inputType && inputRequired && !inputValue.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(inputValue.trim() || undefined);
    } finally {
      setIsSubmitting(false);
      setInputValue('');
    }
  };

  const handleClose = () => {
    setInputValue('');
    onClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-8 h-8 text-amber-500" />;
      case 'error':
        return <XCircle className="w-8 h-8 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'info':
        return <Info className="w-8 h-8 text-blue-500" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-amber-500" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
        };
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          button: 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
        };
      default:
        return {
          bg: 'bg-slate-50',
          border: 'border-slate-200',
          button: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500'
        };
    }
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
          {/* Header */}
          <div className={`px-6 py-4 ${colors.bg} ${colors.border} border-b`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getIcon()}
                <h3 className="text-lg font-semibold text-slate-800">
                  {title}
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="rounded-full p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <p className="text-slate-600 leading-relaxed mb-4">
              {message}
            </p>

            {/* Input field for input type */}
            {inputType && (
              <div className="mb-4">
                {inputType === 'textarea' ? (
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={inputPlaceholder}
                    maxLength={inputMaxLength}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    required={inputRequired}
                  />
                ) : (
                  <input
                    type={inputType}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={inputPlaceholder}
                    maxLength={inputMaxLength}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required={inputRequired}
                  />
                )}
                {inputMaxLength && (
                  <div className="text-xs text-slate-500 mt-1 text-left">
                    {inputValue.length}/{inputMaxLength}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-slate-50 flex gap-3 justify-end">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting || isLoading || (inputType && inputRequired && !inputValue.trim())}
              className={`px-4 py-2 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${colors.button}`}
            >
              {isSubmitting || isLoading ? 'جاري المعالجة...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
