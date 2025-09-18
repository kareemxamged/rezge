import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userService, messageService, blockService, reportService, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useToast } from './ToastContainer';
import { translateCountryName, translateLocation } from '../utils/locationTranslation';
import CountryFlagImage from './CountryFlagImage';
import { profileImageService } from '../lib/profileImageService';
import type { ProfileImage } from '../lib/profileImageService';
import LikesService from '../lib/likesService';
import ConfirmModal from './ConfirmModal';
import VerificationBadge from './VerificationBadge';
import {
  User,
  MapPin,
  Calendar,
  Book,
  GraduationCap,
  Heart,
  DollarSign,
  Globe,
  MessageSquare,
  ArrowLeft,
  Shield,
  Users,
  Home,
  Star,
  UserX,
  Flag,
  MoreVertical
} from 'lucide-react';

interface PublicUserProfile {
  id: string;
  first_name: string;
  last_name: string;
  age?: number;
  gender?: 'male' | 'female';
  city?: string;
  marital_status?: string;
  education?: string;
  profession?: string;
  religious_commitment?: string;
  bio?: string;
  looking_for?: string;
  verified?: boolean;
  status?: string;
  created_at?: string;
  marriage_type?: string;
  children_count?: number;
  residence_location?: string;
  nationality?: string;
  weight?: number;
  height?: number;
  skin_color?: string;
  body_type?: string;
  religiosity_level?: string;
  prayer_commitment?: string;
  profile_image_url?: string;
  profile_image_visible?: boolean;
  has_profile_image?: boolean;
  smoking?: string;
  beard?: string;
  hijab?: string;
  education_level?: string;
  financial_status?: string;
  allow_messages?: boolean;
  work_field?: string;
  job_title?: string;
  monthly_income?: string;
  health_status?: string;
}

const PublicProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { t, i18n } = useTranslation();
  const { showSuccess, showError, showWarning } = useToast();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [profileImage, setProfileImage] = useState<ProfileImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [likeSent, setLikeSent] = useState(false);
  const [sendingLike, setSendingLike] = useState(false);
  const [checkingLikeStatus, setCheckingLikeStatus] = useState(false);
  const [wasLoggedIn, setWasLoggedIn] = useState(false);

  // حالات الحظر والإبلاغ
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [checkingBlockStatus, setCheckingBlockStatus] = useState(false);

  // Get current language direction
  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    console.log('PublicProfilePage useEffect - currentUser:', currentUser?.id, 'userId:', userId);

    // تتبع حالة تسجيل الدخول
    if (currentUser) {
      setWasLoggedIn(true);
    }

    // إذا لم يكن هناك مستخدم حالي، انتظر قليلاً قبل إظهار خطأ المصادقة
    if (!currentUser) {
      console.log('No current user found, waiting for auth to initialize...');
      // لا نعرض خطأ فوراً، ننتظر AuthContext ينتهي من التحميل
      return;
    }

    if (userId) {
      console.log('Fetching profile for userId:', userId, 'currentUser:', currentUser.id);
      fetchUserProfile(userId);
    }
  }, [userId, currentUser]);

  // useEffect منفصل للتحقق من انتهاء تحميل المصادقة
  useEffect(() => {
    // إذا انتهى التحميل ولا يوجد مستخدم، اعرض خطأ المصادقة
    if (!loading && !currentUser) {
      console.log('Auth loading finished, no user found, showing auth required error');
      setError(t('publicProfile.error.authRequired'));
    }
  }, [loading, currentUser, t]);

  // useEffect للتحقق من تسجيل الخروج وإعادة التوجيه
  useEffect(() => {
    // إذا كان المستخدم مسجل دخول سابقاً ثم سجل خروج، أعد توجيهه لصفحة تسجيل الدخول
    if (!loading && !currentUser && wasLoggedIn) {
      console.log('User logged out while viewing profile, redirecting to login');
      navigate('/login', { replace: true });
    }
  }, [currentUser, loading, wasLoggedIn, navigate]);

  // إغلاق القائمة المنسدلة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMoreMenu) {
        const target = event.target as Element;
        if (!target.closest('.more-menu-container')) {
          setShowMoreMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreMenu]);

  // إضافة مستمع للأحداث لتحديث الصفحة عند تغيير إعدادات الخصوصية
  useEffect(() => {
    const handleProfileUpdate = () => {
      if (userId) {
        fetchUserProfile(userId);
      }
    };

    window.addEventListener('profileSettingsUpdated', handleProfileUpdate);
    window.addEventListener('profileImageUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileSettingsUpdated', handleProfileUpdate);
      window.removeEventListener('profileImageUpdated', handleProfileUpdate);
    };
  }, [userId]);

  const fetchUserProfile = async (id: string) => {
    try {
      setLoading(true);
      console.log('fetchUserProfile called with id:', id, 'currentUser?.id:', currentUser?.id);

      const { data, error } = await userService.getPublicUserProfile(id, currentUser?.id);
      console.log('getPublicUserProfile result - data:', !!data, 'error:', error, 'allow_messages:', data?.allow_messages);

      if (error) {
        console.log('Error in getPublicUserProfile:', error);
        // التحقق من نوع الخطأ
        const errorMessage = typeof error === 'string' ? error : (error as any)?.message || 'Unknown error';
        if (errorMessage === 'Profile is private') {
          setError(t('publicProfile.error.profilePrivate'));
        } else if (errorMessage === 'Authentication required') {
          setError(t('publicProfile.error.authRequired'));
        } else if (errorMessage === 'Profile requires verification') {
          setError(t('publicProfile.error.verificationRequired'));
        } else if (errorMessage === 'Invalid user status') {
          setError(t('publicProfile.error.invalidStatus'));
        } else if (errorMessage === 'Same gender access not allowed') {
          setError(t('publicProfile.error.sameGenderNotAllowed'));
        } else {
          setError(t('publicProfile.error.notFound'));
        }
        return;
      }

      if (!data) {
        setError(t('publicProfile.error.doesNotExist'));
        return;
      }

      setProfile(data);

      // التحقق من حالة الحظر والإعجاب
      if (currentUser?.id) {
        checkBlockStatus(currentUser.id, data.id);
        checkLikeStatus(currentUser.id, data.id);
      }

      console.log('Profile image settings - profile_image_visible:', data.profile_image_visible, 'has_profile_image:', data.has_profile_image);

      // جلب الصورة الشخصية إذا كانت مرئية
      if (data.profile_image_visible && data.has_profile_image) {
        console.log('Attempting to fetch profile image for user:', id);
        try {
          const image = await profileImageService.getUserPrimaryImage(id);
          console.log('Profile image fetched successfully:', !!image, image?.file_path);
          setProfileImage(image);
        } catch (imageError) {
          console.error('خطأ في جلب الصورة الشخصية:', imageError);
          // لا نعرض خطأ للصورة، فقط نتجاهلها
        }
      } else {
        console.log('Profile image not visible or not available - visible:', data.profile_image_visible, 'has_image:', data.has_profile_image);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(t('publicProfile.error.loadingError'));
    } finally {
      setLoading(false);
    }
  };

  // الحصول على URL الصورة الشخصية
  const getProfileImageUrl = () => {
    console.log('getProfileImageUrl called - profileImage:', !!profileImage, 'profile_image_visible:', profile?.profile_image_visible, 'file_path:', profileImage?.file_path);

    if (profileImage && profile?.profile_image_visible && profileImage.file_path) {
      if (profileImage.file_path.startsWith('http')) {
        console.log('Returning profile image URL:', profileImage.file_path);
        return profileImage.file_path;
      } else {
        console.log('Profile image path does not start with http:', profileImage.file_path);
      }
    } else {
      console.log('Profile image not available - profileImage:', !!profileImage, 'visible:', profile?.profile_image_visible, 'path:', profileImage?.file_path);
    }
    return null;
  };

  // دالة التحقق من حالة الحظر
  const checkBlockStatus = async (currentUserId: string, targetUserId: string) => {
    try {
      setCheckingBlockStatus(true);
      // التحقق من حالة الحظر باستخدام الدالة الآمنة
      const { data, error } = await supabase
        .rpc('check_active_block', {
          p_blocker_user_id: currentUserId,
          p_blocked_user_id: targetUserId
        })
        .single();

      if (error) {
        console.error('خطأ في التحقق من حالة الحظر:', error);
        return;
      }

      const isBlocked = data?.block_exists || false;
      setIsUserBlocked(isBlocked);
      console.log('Block status checked:', {
        currentUserId,
        targetUserId,
        isBlocked,
        blockExists: data?.block_exists
      });
    } catch (error) {
      console.error('خطأ في التحقق من حالة الحظر:', error);
      setIsUserBlocked(false);
    } finally {
      setCheckingBlockStatus(false);
    }
  };

  // دالة التحقق من حالة الإعجاب
  const checkLikeStatus = async (currentUserId: string, targetUserId: string) => {
    try {
      setCheckingLikeStatus(true);
      const { hasLiked } = await LikesService.checkLikeStatus(currentUserId, targetUserId);
      setLikeSent(hasLiked);
      console.log('Like status checked:', hasLiked);
    } catch (error) {
      console.error('خطأ في التحقق من حالة الإعجاب:', error);
      setLikeSent(false);
    } finally {
      setCheckingLikeStatus(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentUser || !profile) return;

    try {
      setSendingMessage(true);

      // Create or get conversation
      const { error: convError } = await messageService.createConversation(
        currentUser.id,
        profile.id
      );

      if (convError) {
        console.error('Error creating conversation:', convError);

        // Show appropriate error message
        const errorMessage = typeof convError === 'string' ? convError : convError.message || 'Unknown error';
        if (errorMessage.includes('لا يسمح بالرسائل') || errorMessage.includes('does not allow messages')) {
          showWarning(
            t('messages.errors.messagesDisabled'),
            t('messages.errors.messagesDisabledDesc'),
            5000
          );
        } else if (errorMessage.includes('غير موجود') || errorMessage.includes('not found')) {
          showError(
            t('messages.errors.userNotFound'),
            t('messages.errors.userNotFoundDesc'),
            5000
          );
        } else {
          showError(
            t('messages.errors.conversationSendingError'),
            t('messages.errors.conversationSendingErrorDesc'),
            5000
          );
        }
        return;
      }

      // Show success message and navigate to messages page
      showSuccess(
        t('messages.success.conversationStarted'),
        t('messages.success.conversationStartedDesc'),
        3000
      );

      // Navigate to messages page after a short delay
      setTimeout(() => {
        navigate('/messages');
      }, 1000);
    } catch (err) {
      console.error('Error starting conversation:', err);
      showError(
        t('messages.errors.conversationUnexpectedError'),
        t('messages.errors.unexpectedSendingError'),
        5000
      );
    } finally {
      setSendingMessage(false);
    }
  };

  // دالة إرسال/إلغاء الإعجاب
  const handleSendLike = async () => {
    if (!currentUser || !profile || sendingLike) {
      console.log('Cannot send/remove like:', { currentUser: !!currentUser, profile: !!profile, sendingLike });
      return;
    }

    setSendingLike(true);

    try {
      let result;
      if (likeSent) {
        // إلغاء الإعجاب
        console.log('Removing like from:', currentUser.id, 'to:', profile.id);
        result = await LikesService.removeLike(currentUser.id, profile.id);

        if (result.success) {
          setLikeSent(false);
          showSuccess(
            t('likes.success.likeRemoved'),
            t('likes.success.likeRemovedDesc'),
            3000
          );
        } else {
          console.error('Remove like failed:', result.error);
          showError(
            t('likes.errors.removingError'),
            t('likes.errors.removingErrorDesc'),
            5000
          );
        }
      } else {
        // إرسال إعجاب جديد
        console.log('Sending like from:', currentUser.id, 'to:', profile.id);
        result = await LikesService.sendLike(
          currentUser.id,
          profile.id,
          'like'
        );

        if (result.success) {
          setLikeSent(true);

          if (result.isMatch) {
            showSuccess(
              t('likes.success.mutualMatch'),
              t('likes.success.mutualMatchDesc'),
              6000
            );
          } else {
            showSuccess(
              t('likes.success.likeSent'),
              t('likes.success.likeSentDesc'),
              4000
            );
          }
        } else {
          console.error('Like failed:', result.error);
          showError(
            t('likes.errors.sendingError'),
            t('likes.errors.sendingErrorDesc'),
            5000
          );
        }
      }
    } catch (error) {
      console.error('خطأ في إرسال/إلغاء الإعجاب:', error);
      showError(
        t('likes.errors.unexpectedError'),
        t('likes.errors.unexpectedErrorDesc'),
        5000
      );
    } finally {
      setSendingLike(false);
    }
  };

  // دالة حظر/فك حظر المستخدم
  const handleBlockUser = async () => {
    if (!currentUser || !profile) return;

    setIsBlocking(true);
    try {
      let result;
      if (isUserBlocked) {
        // فك الحظر
        result = await blockService.unblockUserGlobally(currentUser.id, profile.id);
      } else {
        // حظر المستخدم
        result = await blockService.blockUserGlobally(currentUser.id, profile.id);
      }

      if (result.success) {
        const actionKey = isUserBlocked ? 'unblock' : 'block';
        showSuccess(
          t(`publicProfile.${actionKey}.success`),
          t(`publicProfile.${actionKey}.successDesc`, { name: `${profile.first_name} ${profile.last_name}` })
        );
        setShowBlockModal(false);
        setShowMoreMenu(false);

        // تحديث حالة الحظر
        setIsUserBlocked(!isUserBlocked);

        // إعادة فحص حالة الحظر للتأكد من التحديث
        if (currentUser?.id && profile?.id) {
          setTimeout(() => {
            checkBlockStatus(currentUser.id, profile.id);
          }, 500);
        }

        // لا نقوم بالتحويل التلقائي - نبقى في نفس الصفحة
        // المستخدم يمكنه الرجوع يدوياً إذا أراد ذلك
      } else {
        const actionKey = isUserBlocked ? 'unblock' : 'block';
        showError(
          t(`publicProfile.${actionKey}.error`),
          result.error || t(`publicProfile.${actionKey}.errorDesc`)
        );
      }
    } catch (error) {
      console.error('خطأ في حظر/فك حظر المستخدم:', error);
      const actionKey = isUserBlocked ? 'unblock' : 'block';
      showError(
        t(`publicProfile.${actionKey}.error`),
        t(`publicProfile.${actionKey}.errorDesc`)
      );
    } finally {
      setIsBlocking(false);
    }
  };

  // دالة الإبلاغ عن المستخدم
  const handleReportUser = async () => {
    if (!currentUser || !profile || !reportReason.trim()) return;

    if (reportDescription.trim().length < 10) {
      showError(
        t('publicProfile.report.descriptionTooShort'),
        t('publicProfile.report.descriptionTooShortDesc')
      );
      return;
    }

    setIsReporting(true);
    try {
      const { data, error } = await reportService.createReport(
        profile.id,
        currentUser.id,
        reportReason,
        reportDescription.trim(),
        'medium'
      );

      if (data && !error) {
        showSuccess(
          t('publicProfile.report.success'),
          t('publicProfile.report.successDesc')
        );
        setShowReportModal(false);
        setShowMoreMenu(false);
        setReportReason('');
        setReportDescription('');
      } else {
        showError(
          t('publicProfile.report.error'),
          error || t('publicProfile.report.errorDesc')
        );
      }
    } catch (error) {
      console.error('خطأ في الإبلاغ عن المستخدم:', error);
      showError(
        t('publicProfile.report.error'),
        t('publicProfile.report.errorDesc')
      );
    } finally {
      setIsReporting(false);
    }
  };

  // Helper functions for displaying data
  const getMaritalStatusText = (status?: string) => {
    if (!status) return t('publicProfile.values.notSpecified');
    return t(`publicProfile.values.maritalStatus.${status}`, { defaultValue: status });
  };

  const getMarriageTypeText = (type?: string) => {
    if (!type) return '';
    return t(`publicProfile.values.marriageType.${type}`, { defaultValue: '' });
  };

  const getReligiousCommitmentText = (level?: string) => {
    if (!level) return t('publicProfile.values.notSpecified');
    return t(`publicProfile.values.religiousCommitment.${level}`, { defaultValue: level });
  };

  const getReligiosityLevelText = (level?: string) => {
    if (!level) return '';
    return t(`publicProfile.values.religiosityLevel.${level}`, { defaultValue: '' });
  };

  const getPrayerCommitmentText = (commitment?: string) => {
    if (!commitment) return '';
    return t(`publicProfile.values.prayerCommitment.${commitment}`, { defaultValue: '' });
  };

  const getEducationLevelText = (level?: string) => {
    if (!level) return '';
    return t(`publicProfile.values.educationLevel.${level}`, { defaultValue: '' });
  };

  const getFinancialStatusText = (status?: string) => {
    if (!status) return '';
    return t(`publicProfile.values.financialStatus.${status}`, { defaultValue: '' });
  };

  const getMonthlyIncomeText = (income?: string) => {
    if (!income) return '';
    return t(`publicProfile.values.monthlyIncome.${income}`, { defaultValue: '' });
  };

  const getHealthStatusText = (status?: string) => {
    if (!status) return '';
    return t(`publicProfile.values.healthStatus.${status}`, { defaultValue: '' });
  };

  const getHijabText = (hijab?: string) => {
    if (!hijab) return '';
    return t(`publicProfile.values.hijab.${hijab}`, { defaultValue: '' });
  };

  const getSkinColorText = (color?: string) => {
    if (!color) return '';
    return t(`publicProfile.values.skinColor.${color}`, { defaultValue: '' });
  };

  const getBodyTypeText = (type?: string) => {
    if (!type) return '';
    return t(`publicProfile.values.bodyType.${type}`, { defaultValue: '' });
  };

  // دوال ترجمة الجنسية ومكان الإقامة
  const getNationalityText = (nationality?: string) => {
    if (!nationality) return t('publicProfile.values.notSpecified');
    return translateCountryName(nationality, i18n.language);
  };

  const getResidenceLocationText = (location?: string) => {
    if (!location) return t('publicProfile.values.notSpecified');
    return translateLocation(location, i18n.language);
  };

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">{t('publicProfile.loading.message')}</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('publicProfile.error.unavailable')}</h2>
          <p className="text-slate-600 mb-6">
            {error && error.startsWith('publicProfile.') ? t(error) : error || t('publicProfile.error.notFound')}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            {t('publicProfile.error.backButton')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-4 sm:py-6 lg:py-8 ${isRTL ? 'rtl' : 'ltr'} relative`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors self-start"
          >
            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
            <span className="hidden sm:inline">{t('publicProfile.header.backButton')}</span>
            <span className="sm:hidden">رجوع</span>
          </button>

          {currentUser && currentUser.id !== profile.id && (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              {/* زر الإعجاب */}
              <button
                onClick={handleSendLike}
                disabled={sendingLike || checkingLikeStatus}
                className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base ${
                  likeSent
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600'
                    : 'bg-white border-2 border-pink-500 text-pink-500 hover:bg-pink-50'
                }`}
                title={likeSent ? t('publicProfile.header.removeLike') : t('publicProfile.header.sendLike')}
              >
                {sendingLike || checkingLikeStatus ? (
                  <>
                    <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
                      likeSent ? 'border-white' : 'border-pink-500'
                    }`}></div>
                    <span className="hidden sm:inline">
                      {checkingLikeStatus
                        ? t('publicProfile.header.checking')
                        : likeSent
                        ? t('publicProfile.header.removing')
                        : t('publicProfile.header.sending')
                      }
                    </span>
                    <span className="sm:hidden">
                      {checkingLikeStatus
                        ? 'فحص...'
                        : likeSent
                        ? 'جاري الإلغاء...'
                        : 'إرسال...'
                      }
                    </span>
                  </>
                ) : (
                  <>
                    <Heart className={`w-4 h-4 ${likeSent ? 'fill-current' : ''}`} />
                    <span className="hidden sm:inline">
                      {likeSent ? t('publicProfile.header.removeLike') : t('publicProfile.header.sendLike')}
                    </span>
                    <span className="sm:hidden">
                      {likeSent ? 'إلغاء الإعجاب' : 'إعجاب'}
                    </span>
                  </>
                )}
              </button>

              {/* زر الرسالة */}
              {profile.allow_messages && (
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage}
                  className="bg-gradient-to-r from-primary-600 to-emerald-600 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-medium hover:from-primary-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {sendingMessage ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="hidden sm:inline">{t('publicProfile.header.sending')}</span>
                      <span className="sm:hidden">إرسال...</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4" />
                      <span className="hidden sm:inline">{t('publicProfile.header.sendMessage')}</span>
                      <span className="sm:hidden">رسالة</span>
                    </>
                  )}
                </button>
              )}

              {/* زر القائمة المنسدلة (حظر وإبلاغ) */}
              <div className="relative more-menu-container">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 px-3 py-2 sm:py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center"
                  title={t('publicProfile.header.moreOptions')}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* القائمة المنسدلة */}
                {showMoreMenu && (
                  <div className={`absolute top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200 py-2 min-w-[180px] max-w-[200px] z-50 ${
                    isRTL
                      ? 'left-0 transform -translate-x-0'
                      : 'right-0 transform translate-x-0'
                  }`}
                  style={{
                    [isRTL ? 'left' : 'right']: '0',
                    maxWidth: 'calc(100vw - 2rem)'
                  }}>
                    <button
                      onClick={() => {
                        setShowBlockModal(true);
                        setShowMoreMenu(false);
                      }}
                      className={`w-full px-4 py-3 transition-colors flex items-center gap-3 text-right ${
                        isUserBlocked
                          ? 'hover:bg-green-50 text-green-600 hover:text-green-700'
                          : 'hover:bg-red-50 text-red-600 hover:text-red-700'
                      }`}
                      disabled={checkingBlockStatus}
                    >
                      {isUserBlocked ? (
                        <>
                          <UserX className="w-4 h-4 transform rotate-180" />
                          <span className="text-sm font-medium">{t('publicProfile.actions.unblockUser')}</span>
                        </>
                      ) : (
                        <>
                          <UserX className="w-4 h-4" />
                          <span className="text-sm font-medium">{t('publicProfile.actions.blockUser')}</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowReportModal(true);
                        setShowMoreMenu(false);
                      }}
                      className="w-full px-4 py-3 hover:bg-orange-50 transition-colors flex items-center gap-3 text-orange-600 hover:text-orange-700 text-right"
                    >
                      <Flag className="w-4 h-4" />
                      <span className="text-sm font-medium">{t('publicProfile.actions.reportUser')}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Content */}
        <div className="space-y-6 sm:space-y-8">
          {/* Profile Header Card - الأولوية الأولى */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-lg border border-white/20 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-6 sm:mb-8 relative">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 flex-shrink-0">
                {/* الصورة الشخصية */}
                <div className="w-full h-full bg-gradient-to-br from-primary-500 to-emerald-500 rounded-full flex items-center justify-center overflow-hidden relative z-10">
                  {getProfileImageUrl() ? (
                    <img
                      src={getProfileImageUrl()!}
                      alt={`${profile.first_name} ${profile.last_name}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // في حالة فشل تحميل الصورة، أظهر الأيقونة الافتراضية
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          const userIcon = parent.querySelector('.user-icon-fallback');
                          if (userIcon) {
                            (userIcon as HTMLElement).style.display = 'block';
                          }
                        }
                      }}
                    />
                  ) : null}
                  <User className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-white user-icon-fallback ${getProfileImageUrl() ? 'hidden' : 'block'}`} />
                </div>
                {/* علم الدولة - أعلى يسار الصورة */}
                <div className="absolute -top-1 -right-1 z-20">
                  <CountryFlagImage
                    nationality={profile.nationality}
                    size="sm"
                    showTooltip={true}
                    className="border-2 border-white rounded-full shadow-lg"
                  />
                </div>
              </div>
              <div className="flex-1 text-center sm:text-right w-full">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 text-center sm:text-right">
                    {profile.first_name} {profile.last_name}
                  </h1>
                  <VerificationBadge
                    isVerified={profile.verified || false}
                    size="md"
                    className="mx-auto sm:mx-0"
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 lg:gap-6 text-slate-600 mb-4">
                  {profile.age && (
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm sm:text-base">{profile.age} {t('publicProfile.values.yearsOld')}</span>
                    </div>
                  )}
                  {profile.city && (
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm sm:text-base truncate">{profile.city}</span>
                    </div>
                  )}
                  {profile.gender && (
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm sm:text-base">{profile.gender === 'male' ? t('publicProfile.values.male') : t('publicProfile.values.female')}</span>
                    </div>
                  )}
                </div>
                {profile.created_at && (
                  <p className={`text-xs sm:text-sm text-slate-500 text-center ${isRTL ? 'sm:text-right' : 'sm:text-left'}`}>
                    {t('publicProfile.values.memberSince')} {new Date(profile.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      calendar: 'gregory'
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Grid - محسن للاستجابة */}
          <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-3 gap-6 sm:gap-8">
            {/* Main Profile Information - يأخذ مساحة أكبر */}
            <div className="lg:col-span-3 xl:col-span-2 space-y-6 sm:space-y-8 order-1">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-lg border border-white/20 p-4 sm:p-6 lg:p-8">

                {/* Bio Section */}
                {profile.bio && (
                  <div className="mb-6 sm:mb-8">
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
                      <Book className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 flex-shrink-0" />
                      <span className="truncate">{t('publicProfile.sections.bio')}</span>
                    </h3>
                    <p className="text-sm sm:text-base text-slate-700 leading-relaxed bg-slate-50 p-3 sm:p-4 rounded-xl">
                      {profile.bio}
                    </p>
                  </div>
                )}

                {/* Looking For Section */}
                {profile.looking_for && (
                  <div className="mb-6 sm:mb-8">
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
                      <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 flex-shrink-0" />
                      <span className="truncate">{t('publicProfile.sections.lookingFor')}</span>
                    </h3>
                    <p className="text-sm sm:text-base text-slate-700 leading-relaxed bg-slate-50 p-3 sm:p-4 rounded-xl">
                      {profile.looking_for}
                    </p>
                  </div>
                )}

                {/* Basic Information */}
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 flex-shrink-0" />
                    <span className="truncate">{t('publicProfile.sections.basicInfo')}</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {profile.marital_status && (
                      <div className="bg-slate-50 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Heart className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="font-medium text-slate-700 text-sm sm:text-base truncate">{t('publicProfile.fields.maritalStatus')}</span>
                        </div>
                        <p className="text-slate-600 text-sm sm:text-base">{getMaritalStatusText(profile.marital_status)}</p>
                      </div>
                    )}

                    {profile.marriage_type && (
                      <div className="bg-slate-50 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="font-medium text-slate-700 text-sm sm:text-base truncate">{t('publicProfile.fields.marriageType')}</span>
                        </div>
                        <p className="text-slate-600 text-sm sm:text-base">{getMarriageTypeText(profile.marriage_type)}</p>
                      </div>
                    )}

                    {profile.children_count !== undefined && profile.children_count !== null && (
                      <div className="bg-slate-50 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="font-medium text-slate-700 text-sm sm:text-base truncate">{t('publicProfile.fields.childrenCount')}</span>
                        </div>
                        <p className="text-slate-600 text-sm sm:text-base">{profile.children_count}</p>
                      </div>
                    )}

                    {profile.nationality && (
                      <div className="bg-slate-50 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="font-medium text-slate-700 text-sm sm:text-base truncate">{t('publicProfile.fields.nationality')}</span>
                        </div>
                        <p className="text-slate-600 text-sm sm:text-base">{getNationalityText(profile.nationality)}</p>
                      </div>
                    )}

                    {profile.residence_location && (
                      <div className="bg-slate-50 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Home className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="font-medium text-slate-700 text-sm sm:text-base truncate">{t('publicProfile.fields.residenceLocation')}</span>
                        </div>
                        <p className="text-slate-600 text-sm sm:text-base">{getResidenceLocationText(profile.residence_location)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar - محسن للاستجابة */}
            <div className="lg:col-span-1 xl:col-span-1 space-y-6 sm:space-y-8 order-2">

              {/* Religious Information */}
              {(profile.religious_commitment || profile.religiosity_level || profile.prayer_commitment || profile.smoking || profile.beard || profile.hijab) && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 p-4 sm:p-5">
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 flex-shrink-0" />
                    <span className="truncate">{t('publicProfile.sections.religiousInfo')}</span>
                  </h3>
                  <div className="space-y-3 sm:space-y-4">
                    {profile.religious_commitment && (
                      <div>
                        <span className="font-medium text-slate-700 block mb-1 text-sm sm:text-base">{t('publicProfile.fields.commitmentLevel')}</span>
                        <p className="text-slate-600 text-sm sm:text-base">{getReligiousCommitmentText(profile.religious_commitment)}</p>
                      </div>
                    )}

                    {profile.religiosity_level && (
                      <div>
                        <span className="font-medium text-slate-700 block mb-1">{t('publicProfile.fields.religiosityLevel')}</span>
                        <p className="text-slate-600">{getReligiosityLevelText(profile.religiosity_level)}</p>
                      </div>
                    )}

                    {profile.prayer_commitment && (
                      <div>
                        <span className="font-medium text-slate-700 block mb-1">{t('publicProfile.fields.prayerCommitment')}</span>
                        <p className="text-slate-600">{getPrayerCommitmentText(profile.prayer_commitment)}</p>
                      </div>
                    )}

                    {profile.smoking && (
                      <div>
                        <span className="font-medium text-slate-700 block mb-1">{t('publicProfile.fields.smoking')}</span>
                        <p className="text-slate-600">{profile.smoking === 'yes' ? t('publicProfile.values.yes') : t('publicProfile.values.no')}</p>
                      </div>
                    )}

                    {profile.gender === 'male' && profile.beard && (
                      <div>
                        <span className="font-medium text-slate-700 block mb-1">{t('publicProfile.fields.beard')}</span>
                        <p className="text-slate-600">{profile.beard === 'yes' ? t('publicProfile.values.yes') : t('publicProfile.values.no')}</p>
                      </div>
                    )}

                    {profile.gender === 'female' && profile.hijab && (
                      <div>
                        <span className="font-medium text-slate-700 block mb-1">{t('publicProfile.fields.hijab')}</span>
                        <p className="text-slate-600">{getHijabText(profile.hijab)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Education & Work */}
              {(profile.education || profile.profession || profile.education_level || profile.work_field || profile.job_title) && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 p-4 sm:p-5">
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 flex-shrink-0" />
                    <span className="truncate">{t('publicProfile.sections.educationWork')}</span>
                  </h3>
                  <div className="space-y-4">
                    {profile.education && (
                      <div>
                        <span className="font-medium text-slate-700 block mb-1">{t('publicProfile.fields.education')}</span>
                        <p className="text-slate-600">{profile.education}</p>
                      </div>
                    )}

                    {profile.education_level && (
                      <div>
                        <span className="font-medium text-slate-700 block mb-1">{t('publicProfile.fields.educationLevel')}</span>
                        <p className="text-slate-600">{getEducationLevelText(profile.education_level)}</p>
                      </div>
                    )}

                    {profile.profession && (
                      <div>
                        <span className="font-medium text-slate-700 block mb-1">{t('publicProfile.fields.profession')}</span>
                        <p className="text-slate-600">{profile.profession}</p>
                      </div>
                    )}

                    {profile.work_field && (
                      <div>
                        <span className="font-medium text-slate-700 block mb-1">{t('publicProfile.fields.workField')}</span>
                        <p className="text-slate-600">{profile.work_field}</p>
                      </div>
                    )}

                    {profile.job_title && (
                      <div>
                        <span className="font-medium text-slate-700 block mb-1">{t('publicProfile.fields.jobTitle')}</span>
                        <p className="text-slate-600">{profile.job_title}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Physical Information */}
              {(profile.height || profile.weight || profile.skin_color || profile.body_type) && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 p-4 sm:p-5">
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 flex-shrink-0" />
                    <span className="truncate">{t('publicProfile.sections.physicalInfo')}</span>
                  </h3>
                  <div className="space-y-4">
                    {profile.height && (
                      <div>
                        <span className="font-medium text-slate-700 block mb-1">{t('publicProfile.fields.height')}</span>
                        <p className="text-slate-600">{profile.height} {t('publicProfile.values.cm')}</p>
                      </div>
                    )}

                    {profile.weight && (
                      <div>
                        <span className="font-medium text-slate-700 block mb-1">{t('publicProfile.fields.weight')}</span>
                        <p className="text-slate-600">{profile.weight} {t('publicProfile.values.kg')}</p>
                      </div>
                    )}

                    {profile.skin_color && (
                      <div>
                        <span className="font-medium text-slate-700 block mb-1">{t('publicProfile.fields.skinColor')}</span>
                        <p className="text-slate-600">{getSkinColorText(profile.skin_color)}</p>
                      </div>
                    )}

                    {profile.body_type && (
                      <div>
                        <span className="font-medium text-slate-700 block mb-1">{t('publicProfile.fields.bodyType')}</span>
                        <p className="text-slate-600">{getBodyTypeText(profile.body_type)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Financial & Health */}
              {(profile.financial_status || profile.monthly_income || profile.health_status) && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-white/20 p-4 sm:p-5">
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 flex-shrink-0" />
                    <span className="truncate">{t('publicProfile.sections.financialHealth')}</span>
                  </h3>
                  <div className="space-y-4">
                    {profile.financial_status && (
                      <div>
                        <span className="font-medium text-slate-700 block mb-1">{t('publicProfile.fields.financialStatus')}</span>
                        <p className="text-slate-600">{getFinancialStatusText(profile.financial_status)}</p>
                      </div>
                    )}

                    {profile.monthly_income && (
                      <div>
                        <span className="font-medium text-slate-700 block mb-1">{t('publicProfile.fields.monthlyIncome')}</span>
                        <p className="text-slate-600">{getMonthlyIncomeText(profile.monthly_income)}</p>
                      </div>
                    )}

                    {profile.health_status && (
                      <div>
                        <span className="font-medium text-slate-700 block mb-1">{t('publicProfile.fields.healthStatus')}</span>
                        <p className="text-slate-600">{getHealthStatusText(profile.health_status)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* نافذة تأكيد الحظر/فك الحظر */}
      <ConfirmModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        onConfirm={handleBlockUser}
        title={t(isUserBlocked ? 'publicProfile.unblock.title' : 'publicProfile.block.title')}
        message={t(isUserBlocked ? 'publicProfile.unblock.message' : 'publicProfile.block.message', { name: `${profile?.first_name} ${profile?.last_name}` })}
        type={isUserBlocked ? "info" : "warning"}
        confirmText={t(isUserBlocked ? 'publicProfile.unblock.confirmButton' : 'publicProfile.block.confirmButton')}
        cancelText={t(isUserBlocked ? 'publicProfile.unblock.cancelButton' : 'publicProfile.block.cancelButton')}
        isLoading={isBlocking}
      />

      {/* نافذة الإبلاغ */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Flag className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {t('publicProfile.report.title')}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {t('publicProfile.report.subtitle', { name: `${profile?.first_name} ${profile?.last_name}` })}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* سبب الإبلاغ */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('publicProfile.report.reasonLabel')}
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="">{t('publicProfile.report.selectReason')}</option>
                    <option value="inappropriate_behavior">{t('publicProfile.report.reasons.inappropriateBehavior')}</option>
                    <option value="fake_profile">{t('publicProfile.report.reasons.fakeProfile')}</option>
                    <option value="harassment">{t('publicProfile.report.reasons.harassment')}</option>
                    <option value="spam">{t('publicProfile.report.reasons.spam')}</option>
                    <option value="inappropriate_content">{t('publicProfile.report.reasons.inappropriateContent')}</option>
                    <option value="scam_attempt">{t('publicProfile.report.reasons.scamAttempt')}</option>
                    <option value="underage">{t('publicProfile.report.reasons.underage')}</option>
                    <option value="married_person">{t('publicProfile.report.reasons.marriedPerson')}</option>
                    <option value="other">{t('publicProfile.report.reasons.other')}</option>
                  </select>
                </div>

                {/* وصف تفصيلي */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('publicProfile.report.descriptionLabel')}
                  </label>
                  <textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder={t('publicProfile.report.descriptionPlaceholder')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    rows={4}
                    required
                    minLength={10}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {t('publicProfile.report.descriptionHint')}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setReportReason('');
                    setReportDescription('');
                  }}
                  className="flex-1 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  disabled={isReporting}
                >
                  {t('publicProfile.report.cancelButton')}
                </button>
                <button
                  onClick={handleReportUser}
                  disabled={!reportReason.trim() || reportDescription.trim().length < 10 || isReporting}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isReporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {t('publicProfile.report.submitting')}
                    </>
                  ) : (
                    t('publicProfile.report.submitButton')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicProfilePage;
