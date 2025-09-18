import React from 'react';
import { X, Shield, AlertTriangle, CheckCircle, User as UserIcon } from 'lucide-react';
import { type User } from '../../../lib/adminUsersService';

interface UnblockConfirmModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: string) => void;
  isLoading?: boolean;
}

const UnblockConfirmModal: React.FC<UnblockConfirmModalProps> = ({
  user,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false
}) => {
  if (!isOpen || !user) return null;

  // تتبع بيانات المستخدم للتشخيص
  console.log('🔍 UnblockConfirmModal - User data:', user);
  console.log('🔍 UnblockConfirmModal - blocked_at:', user.blocked_at);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm(user.id);
    }
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-70 backdrop-blur-lg flex items-center justify-center z-[999999] p-4 overflow-y-auto"
      style={{ margin: 0, width: '100vw', height: '100vh' }}
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full my-8 transform transition-all duration-300 scale-100 max-h-[calc(100vh-4rem)]"
           onClick={(e) => e.stopPropagation()}>
        {/* رأس النافذة */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                إلغاء حظر المستخدم
              </h2>
              <p className="text-sm text-gray-600">
                تأكيد العملية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* محتوى النافذة */}
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-12rem)]">
          {/* معلومات المستخدم */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {user.first_name} {user.last_name}
                </h3>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            </div>
            
            {/* معلومات الحظر */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">نوع الحظر:</span>
                <div className={`font-medium text-right ${
                  user.ban_type === 'temporary' ? 'text-orange-600' : 'text-red-600'
                }`}>
                  <div className="flex items-center gap-2">
                    <span>{user.ban_type === 'temporary' ? 'مؤقت' : 'دائم'}</span>
                    {user.ban_type === 'temporary' && user.ban_duration && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded" dir="rtl">
                        {user.ban_duration}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {user.blocked_at && (
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">تاريخ الحظر:</span>
                  <div className="text-gray-900 text-left" dir="ltr">
                    {/* التاريخ */}
                    <div className="font-medium text-sm">
                      {new Date(user.blocked_at).toLocaleDateString('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      })}
                    </div>

                    {/* الوقت */}
                    <div className="text-xs text-gray-500 mt-0.5">
                      {new Date(user.blocked_at).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true
                      })}
                    </div>
                  </div>
                </div>
              )}

              {user.ban_type === 'temporary' && user.ban_expires_at && (
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">ينتهي في:</span>
                  <div className="text-orange-600 font-medium">
                    {/* التاريخ والوقت */}
                    <div className="text-left" dir="ltr">
                      <div className="font-medium text-sm">
                        {new Date(user.ban_expires_at).toLocaleDateString('en-GB', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </div>

                      <div className="text-xs text-orange-500 mt-0.5">
                        {new Date(user.ban_expires_at).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true
                        })}
                      </div>
                    </div>

                    {/* الفترة المتبقية */}
                    <div className="text-xs text-orange-400 mt-2 bg-orange-50 px-2 py-1 rounded border border-orange-200" dir="rtl">
                      <div className="text-center">
                        {(() => {
                          const now = new Date();
                          const expiresAt = new Date(user.ban_expires_at);
                          const diffMs = expiresAt.getTime() - now.getTime();

                          if (diffMs <= 0) {
                            return 'انتهى الحظر';
                          }

                          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                          const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                          if (diffHours > 24) {
                            const diffDays = Math.floor(diffHours / 24);
                            const remainingHours = diffHours % 24;
                            return `باقي ${diffDays} يوم${diffDays > 1 ? '' : ''} ${remainingHours > 0 ? `و ${remainingHours} ساعة` : ''}`;
                          } else if (diffHours > 0) {
                            return `باقي ${diffHours} ساعة ${diffMinutes > 0 ? `و ${diffMinutes} دقيقة` : ''}`;
                          } else {
                            return `باقي ${diffMinutes} دقيقة`;
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {user.block_reason && (
                <div className="pt-3 mt-3 border-t border-gray-200">
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600 text-sm">السبب:</span>
                    <div className="text-gray-900 text-right max-w-xs">
                      <p className="text-sm leading-relaxed" dir="rtl">{user.block_reason}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* رسالة التأكيد */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-green-800 mb-1">
                  تأكيد إلغاء الحظر
                </h4>
                <p className="text-green-700 text-sm">
                  سيتمكن هذا المستخدم من الوصول للموقع والتفاعل مع المستخدمين الآخرين مرة أخرى.
                  هل أنت متأكد من إلغاء الحظر؟
                </p>
              </div>
            </div>
          </div>

          {/* تحذير إضافي للحظر الدائم */}
          {user.ban_type === 'permanent' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-yellow-800 mb-1">
                    تنبيه: حظر دائم
                  </h4>
                  <p className="text-yellow-700 text-sm">
                    هذا المستخدم محظور بشكل دائم. تأكد من مراجعة سبب الحظر قبل إلغائه.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* أزرار التحكم */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
            disabled={isLoading}
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                جاري المعالجة...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                إلغاء الحظر
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnblockConfirmModal;
