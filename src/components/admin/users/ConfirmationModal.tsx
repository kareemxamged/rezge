import React, { useState } from 'react';
import { X, AlertTriangle, Ban, Pause, RotateCcw } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  title: string;
  message: string;
  type: 'cancel' | 'suspend' | 'reactivate';
  loading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type,
  loading = false
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (type === 'suspend' && !reason.trim()) {
      return;
    }
    onConfirm(reason.trim() || undefined);
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'cancel':
        return <Ban className="w-12 h-12 text-red-500" />;
      case 'suspend':
        return <Pause className="w-12 h-12 text-orange-500" />;
      case 'reactivate':
        return <RotateCcw className="w-12 h-12 text-green-500" />;
      default:
        return <AlertTriangle className="w-12 h-12 text-yellow-500" />;
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'cancel':
        return 'bg-red-600 hover:bg-red-700';
      case 'suspend':
        return 'bg-orange-600 hover:bg-orange-700';
      case 'reactivate':
        return 'bg-green-600 hover:bg-green-700';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex flex-col items-center text-center mb-6">
            {getIcon()}
            <p className="text-gray-700 mt-4 text-base">{message}</p>
          </div>

          {/* Input for reason (only for suspend) */}
          {type === 'suspend' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                سبب التعليق <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="يرجى إدخال سبب تعليق التوثيق..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                rows={3}
                disabled={loading}
              />
              {!reason.trim() && (
                <p className="text-red-500 text-sm mt-1">سبب التعليق مطلوب</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 bg-gray-50 rounded-b-lg">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || (type === 'suspend' && !reason.trim())}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${getButtonColor()}`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                جاري المعالجة...
              </div>
            ) : (
              <>
                {type === 'cancel' && 'إلغاء التوثيق'}
                {type === 'suspend' && 'تعليق التوثيق'}
                {type === 'reactivate' && 'إعادة التفعيل'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
