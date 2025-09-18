import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  Upload,
  Trash2,
  User,
  Loader,
  X
} from 'lucide-react';
import { profileImageService } from '../lib/profileImageService';
import type { ProfileImage } from '../lib/profileImageService';
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
    .profile-modal-animation {
      animation: slideUpMobile 0.3s ease-out !important;
    }
  }
`;

interface ProfileImageUploadProps {
  userId: string;
  currentImage?: ProfileImage | null;
  onImageUpdate?: (image: ProfileImage | null) => void;
  className?: string;
}

const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({
  userId,
  currentImage,
  onImageUpdate,
  className = ''
}) => {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // حالات المكون
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');

  // إضافة CSS للأنيميشن عند تحميل المكون
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = animationStyles;
    document.head.appendChild(styleElement);

    return () => {
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  // رفع صورة جديدة
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // محاكاة تقدم الرفع
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await profileImageService.uploadProfileImage(userId, file, true);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success && result.image) {
        console.log('نجح رفع الصورة:', result);
        showSuccess(
          t('profileImage.uploadSuccess'),
          t('profileImage.uploadSuccess')
        );
        onImageUpdate?.(result.image);
        setShowOptions(false);

        // إرسال حدث لتحديث الهيدر
        window.dispatchEvent(new CustomEvent('profileImageUpdated'));
      } else {
        console.error('فشل رفع الصورة:', result);
        showError(
          t('profileImage.uploadError'),
          result.error || t('profileImage.uploadError')
        );
      }
    } catch (error) {
      showError(
        t('profileImage.uploadError'),
        t('profileImage.uploadError')
      );
      console.error('خطأ في رفع الصورة:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // حذف الصورة
  const handleDeleteImage = async () => {
    if (!currentImage) return;

    setIsDeleting(true);

    try {
      const result = await profileImageService.deleteProfileImage(userId, currentImage.id);

      if (result.success) {
        showSuccess(
          t('profileImage.deleteSuccess'),
          t('profileImage.deleteSuccess')
        );
        onImageUpdate?.(null);
        setShowOptions(false);

        // إرسال حدث لتحديث الهيدر
        window.dispatchEvent(new CustomEvent('profileImageUpdated'));
      } else {
        showError(
          t('profileImage.deleteError'),
          result.error || t('profileImage.deleteError')
        );
      }
    } catch (error) {
      showError(
        t('profileImage.deleteError'),
        t('profileImage.deleteError')
      );
      console.error('خطأ في حذف الصورة:', error);
    } finally {
      setIsDeleting(false);
    }
  };



  // معالجة اختيار الملف
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // مسح قيمة input لتمكين رفع نفس الملف مرة أخرى
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // فتح نافذة اختيار الملف
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  // تحديد موقع النافذة المنبثقة
  const handleToggleOptions = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const spaceBelow = windowHeight - rect.bottom;
    const spaceAbove = rect.top;

    // إذا كان هناك مساحة كافية أسفل العنصر (250px للنافذة)
    if (spaceBelow >= 250) {
      setDropdownPosition('bottom');
    } else if (spaceAbove >= 250) {
      setDropdownPosition('top');
    } else {
      // إذا لم تكن هناك مساحة كافية، استخدم الموقع الذي به مساحة أكبر
      setDropdownPosition(spaceBelow > spaceAbove ? 'bottom' : 'top');
    }

    setShowOptions(!showOptions);
  };

  // الحصول على URL الصورة
  const getImageUrl = () => {
    if (currentImage && currentImage.file_path) {
      console.log('URL الصورة:', currentImage.file_path);
      // إذا كان file_path يحتوي على signed URL كامل، استخدمه مباشرة
      if (currentImage.file_path.startsWith('http')) {
        return currentImage.file_path;
      }
      // إذا كان مجرد مسار، لا نستطيع عرضه مباشرة
      console.warn('المسار ليس signed URL، يحتاج إلى معالجة');
      return null;
    }
    console.log('لا توجد صورة أو مسار');
    return null;
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* عرض الصورة أو الأيقونة الافتراضية */}
      <div
        className="relative cursor-pointer group"
        onClick={handleToggleOptions}
        style={{ width: 'inherit', height: 'inherit' }}
      >
        <div className="w-full h-full rounded-full overflow-hidden border-4 border-white/20 bg-white/10 flex items-center justify-center shadow-lg">
          {currentImage && getImageUrl() ? (
            <img
              src={getImageUrl()!}
              alt={t('profileImage.profilePicture')}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('خطأ في تحميل الصورة:', e);
                // إخفاء الصورة وإظهار الأيقونة الافتراضية
                e.currentTarget.style.display = 'none';
              }}
              onLoad={() => {
                console.log('تم تحميل الصورة بنجاح');
              }}
            />
          ) : (
            <User className="w-8 h-8 md:w-12 md:h-12 text-white" />
          )}

          {/* أيقونة احتياطية في حالة فشل تحميل الصورة */}
          {currentImage && getImageUrl() && (
            <User className="w-8 h-8 md:w-12 md:h-12 text-white absolute" style={{ display: 'none' }} />
          )}
        </div>

        {/* أيقونة الكاميرا عند التمرير */}
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="w-8 h-8 text-white" />
        </div>



        {/* مؤشر التحميل */}
        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <div className="text-center text-white">
              <Loader className="w-4 h-4 md:w-6 md:h-6 animate-spin mx-auto mb-1" />
              <div className="text-xs">{uploadProgress}%</div>
            </div>
          </div>
        )}
      </div>

      {/* خيارات الإدارة - باستخدام Portal */}
      {showOptions && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4 md:p-6"
          style={{
            animation: 'fadeIn 0.3s ease-out',
            height: '100vh',
            width: '100vw',
            top: 0,
            left: 0
          }}
          onClick={() => setShowOptions(false)}
        >
          <div
            className="bg-white rounded-lg sm:rounded-xl shadow-2xl border border-gray-200 p-4 sm:p-6 w-full max-w-xs sm:max-w-sm lg:max-w-md mx-auto transform max-h-[90vh] overflow-y-auto profile-modal-animation"
            style={{ animation: 'slideUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* عنوان القائمة */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-medium text-gray-800 truncate">
                {t('profileImage.profilePicture')}
              </h3>
              <button
                onClick={() => setShowOptions(false)}
                className="p-1 sm:p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 ml-2"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {/* رفع صورة جديدة */}
              <button
                onClick={openFileDialog}
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm font-medium"
              >
                <Upload className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="truncate">
                  {currentImage ? t('profileImage.changeImage') : t('profileImage.uploadImage')}
                </span>
              </button>

              {/* حذف الصورة الحالية */}
              {currentImage && (
                <button
                  onClick={handleDeleteImage}
                  disabled={isDeleting}
                  className="w-full flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm font-medium"
                >
                  {isDeleting ? (
                    <Loader className="w-4 h-4 sm:w-5 sm:h-5 animate-spin flex-shrink-0" />
                  ) : (
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  )}
                  <span className="truncate">
                    {t('profileImage.deleteImage')}
                  </span>
                </button>
              )}

              {/* معلومات إضافية */}
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 text-center">
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                  {t('profileImage.supportedFormats')} • {t('profileImage.maxSize')}
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* حقل رفع الملف المخفي */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

    </div>
  );
};

export default ProfileImageUpload;
