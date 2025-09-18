import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Mail,
  X
} from 'lucide-react';
import { useToast } from './ToastContainer';

// إضافة CSS للأنيميشن
const animationStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes slideUpMobile {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (max-width: 640px) {
    .modal-animation {
      animation: slideUpMobile 0.3s ease-out !important;
    }
  }
`;

interface ShareProfileButtonProps {
  userId: string;
  userName: string;
  className?: string;
}

const ShareProfileButton: React.FC<ShareProfileButtonProps> = ({
  userId,
  userName,
  className = ''
}) => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // إضافة CSS للأنيميشن عند تحميل المكون
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = animationStyles;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // إنشاء رابط الملف الشخصي
  const profileUrl = `${window.location.origin}/profile/${userId}`;

  // نسخ الرابط إلى الحافظة
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      showSuccess(
        t('shareProfile.copySuccess'),
        t('shareProfile.copySuccessDesc')
      );
      
      // إعادة تعيين حالة النسخ بعد 3 ثوانٍ
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('خطأ في نسخ الرابط:', error);
      showError(
        t('shareProfile.copyError'),
        t('shareProfile.copyErrorDesc')
      );
    }
  };

  // مشاركة عبر WhatsApp
  const shareViaWhatsApp = () => {
    const message = encodeURIComponent(
      `${t('shareProfile.whatsappMessage', { name: userName })}\n${profileUrl}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  // مشاركة عبر البريد الإلكتروني
  const shareViaEmail = () => {
    const subject = encodeURIComponent(t('shareProfile.emailSubject', { name: userName }));
    const body = encodeURIComponent(
      `${t('shareProfile.emailBody', { name: userName })}\n\n${profileUrl}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  // مشاركة عبر Web Share API (للأجهزة المحمولة)
  const shareViaNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('shareProfile.shareTitle', { name: userName }),
          text: t('shareProfile.shareText', { name: userName }),
          url: profileUrl
        });
      } catch (error) {
        console.error('خطأ في المشاركة الأصلية:', error);
      }
    }
  };

  return (
    <>
      {/* زر المشاركة - أيقونة فقط */}
      <button
        onClick={() => setShowShareModal(true)}
        className={`
          p-2 bg-white/20 hover:bg-white/30 rounded-full
          text-white transition-all duration-200
          hover:scale-110 active:scale-95
          ${className}
        `}
        title={t('shareProfile.shareButton')}
      >
        <Share2 className="w-5 h-5" />
      </button>

      {/* نافذة المشاركة - باستخدام Portal */}
      {showShareModal && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4 md:p-6"
          style={{
            animation: 'fadeIn 0.3s ease-out',
            height: '100vh',
            width: '100vw',
            top: 0,
            left: 0
          }}
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="bg-white rounded-lg sm:rounded-xl shadow-2xl border border-gray-200 p-4 sm:p-6 w-full max-w-xs sm:max-w-md lg:max-w-lg mx-auto transform max-h-[90vh] overflow-y-auto modal-animation"
            style={{ animation: 'slideUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* عنوان النافذة */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
                {t('shareProfile.modalTitle')}
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 sm:p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 ml-2"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              </button>
            </div>

            {/* معاينة الرابط */}
            <div className="mb-4 sm:mb-6">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                {t('shareProfile.profileLink')}
              </label>
              <div className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 bg-gray-50 rounded-lg border">
                <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                <input
                  type="text"
                  value={profileUrl}
                  readOnly
                  className="flex-1 bg-transparent text-xs sm:text-sm text-gray-600 outline-none min-w-0"
                />
                <button
                  onClick={copyToClipboard}
                  className={`
                    p-1.5 sm:p-2 rounded-md transition-colors flex-shrink-0
                    ${copied
                      ? 'bg-green-100 text-green-600'
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }
                  `}
                >
                  {copied ? (
                    <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                  ) : (
                    <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* خيارات المشاركة */}
            <div className="space-y-2 sm:space-y-3">
              <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                {t('shareProfile.shareVia')}
              </h4>

              {/* مشاركة أصلية (للأجهزة المحمولة) */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={shareViaNative}
                  className="w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-gray-800 truncate">
                    {t('shareProfile.nativeShare')}
                  </span>
                </button>
              )}

              {/* WhatsApp */}
              <button
                onClick={shareViaWhatsApp}
                className="w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-gray-800 truncate">
                  {t('shareProfile.whatsapp')}
                </span>
              </button>

              {/* البريد الإلكتروني */}
              <button
                onClick={shareViaEmail}
                className="w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-gray-800 truncate">
                  {t('shareProfile.email')}
                </span>
              </button>

              {/* نسخ الرابط */}
              <button
                onClick={copyToClipboard}
                className="w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                )}
                <span className="text-xs sm:text-sm font-medium text-gray-800 truncate">
                  {copied ? t('shareProfile.copied') : t('shareProfile.copyLink')}
                </span>
              </button>
            </div>

            {/* ملاحظة */}
            <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs sm:text-sm text-amber-700 leading-relaxed">
                {t('shareProfile.privacyNote')}
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ShareProfileButton;
