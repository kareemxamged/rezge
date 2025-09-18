import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from './ToastContainer';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  itemType?: 'comment' | 'reply' | 'post' | 'item';
  isLoading?: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemType = 'item',
  isLoading = false
}) => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
      showSuccess(
        t('common.success'),
        t('comments.deleteSuccess')
      );
    } catch (error) {
      console.error('Error during deletion:', error);
      showError(
        t('common.error'),
        t('comments.deleteError')
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting && !isLoading) {
      onClose();
    }
  };

  const getItemIcon = () => {
    switch (itemType) {
      case 'comment':
      case 'reply':
        return '💬';
      case 'post':
        return '📝';
      default:
        return '📄';
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {t('common.actionCannotBeUndone')}
                  </p>
                </div>
              </div>
              {!isDeleting && !isLoading && (
                <button
                  onClick={handleClose}
                  className="rounded-full p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">{getItemIcon()}</div>
              <p className="text-slate-700 leading-relaxed text-base">
                {message}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-slate-50 flex gap-3 justify-end border-t border-slate-100">
            <button
              onClick={handleClose}
              disabled={isDeleting || isLoading}
              className="px-5 py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isDeleting || isLoading}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            >
              {isDeleting || isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('common.deleting')}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  {t('common.delete')}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
