import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './ToastContainer';
import LikesService from '../lib/likesService';
import { profileImageService } from '../lib/profileImageService';
import type { ProfileImage } from '../lib/profileImageService';
import VerificationBadge from './VerificationBadge';
import {
  Heart,
  Clock,
  Check,
  X,
  Calendar,
  MapPin,
  GraduationCap,
  Shield,
  Loader2,
  User
} from 'lucide-react';

const LikesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { userProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const [receivedLikes, setReceivedLikes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileImages, setProfileImages] = useState<{ [userId: string]: ProfileImage | null }>({});

  // Check if current language is RTL
  const isRTL = i18n.language === 'ar';



  useEffect(() => {
    if (userProfile?.id) {
      loadReceivedLikes();

      // Auto refresh every 30 seconds
      const interval = setInterval(() => {
        loadReceivedLikes();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [userProfile]);

  const loadReceivedLikes = async () => {
    if (!userProfile?.id) return;

    setIsLoading(true);
    try {
      const { data } = await LikesService.getReceivedLikes(userProfile.id);
      setReceivedLikes(data || []);

      // Load profile images for users
      if (data && data.length > 0) {
        loadProfileImages(data);
      }
    } catch (error) {
      console.error('Error loading received likes:', error);
      showError(
        t('likes.errors.loadingError'),
        t('likes.errors.loadingErrorDesc')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfileImages = async (likes: any[]) => {
    const imagePromises = likes.map(async (like) => {
      if (like.liker?.id) {
        try {
          const image = await profileImageService.getUserPrimaryImage(like.liker.id);
          return { userId: like.liker.id, image };
        } catch (error) {
          console.error(`Error loading profile image for user ${like.liker.id}:`, error);
          return { userId: like.liker.id, image: null };
        }
      }
      return null;
    });

    const results = await Promise.all(imagePromises);
    const imageMap: { [userId: string]: ProfileImage | null } = {};

    results.forEach((result) => {
      if (result) {
        imageMap[result.userId] = result.image;
      }
    });

    setProfileImages(imageMap);
  };

  const getProfileImageUrl = (userId: string): string | null => {
    const image = profileImages[userId];
    if (image?.file_path) {
      return image.file_path;
    }
    return null;
  };

  const handleLikeResponse = async (likeId: string, response: 'accepted' | 'rejected') => {
    try {
      // Immediate UI update before sending request
      setReceivedLikes(prevLikes =>
        prevLikes.map(like =>
          like.id === likeId
            ? { ...like, status: response, isProcessing: true }
            : like
        )
      );

      const { success } = await LikesService.respondToLike(likeId, response);

      if (success) {
        // Final UI update
        setReceivedLikes(prevLikes =>
          prevLikes.map(like =>
            like.id === likeId
              ? { ...like, status: response, isProcessing: false }
              : like
          )
        );

        // Show success message
        if (response === 'accepted') {
          showSuccess(
            t('likes.actions.acceptSuccess'),
            t('likes.actions.acceptSuccess'),
            3000
          );
        } else {
          showSuccess(
            t('likes.actions.rejectSuccess'),
            t('likes.actions.rejectSuccess'),
            2000
          );
        }
      } else {
        // On failure, restore original state
        setReceivedLikes(prevLikes =>
          prevLikes.map(like =>
            like.id === likeId
              ? { ...like, status: 'pending', isProcessing: false }
              : like
          )
        );
        showError(
          t('likes.actions.responseError'),
          t('likes.actions.responseError')
        );
      }
    } catch (error) {
      console.error('Error responding to like:', error);
      // On error, restore original state
      setReceivedLikes(prevLikes =>
        prevLikes.map(like =>
          like.id === likeId
            ? { ...like, status: 'pending', isProcessing: false }
            : like
        )
      );
      showError(
        t('likes.errors.unexpectedError'),
        t('likes.errors.unexpectedErrorDesc')
      );
    }
  };

  // Auto update every 30 seconds

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return t('likes.page.timeAgo.minutes');
    if (diffInHours < 24) {
      return i18n.language === 'ar'
        ? t('likes.page.timeAgo.hours', { count: diffInHours })
        : diffInHours === 1
          ? t('likes.page.timeAgo.hours', { count: diffInHours })
          : t('likes.page.timeAgo.hours_plural', { count: diffInHours });
    }
    const diffInDays = Math.floor(diffInHours / 24);
    return i18n.language === 'ar'
      ? t('likes.page.timeAgo.days', { count: diffInDays })
      : diffInDays === 1
        ? t('likes.page.timeAgo.days', { count: diffInDays })
        : t('likes.page.timeAgo.days_plural', { count: diffInDays });
  };

  // Like categorization functions removed for simplified experience

  const handleViewProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  // Display all likes without filtering




  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 sm:w-12 sm:h-12 text-primary-600 animate-spin mx-auto mb-3 sm:mb-4" />
          <p className="text-sm sm:text-base text-slate-600">{t('likes.page.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        @media (max-width: 375px) {
          .text-xs { font-size: 0.65rem; }
          .text-sm { font-size: 0.75rem; }
          .p-3 { padding: 0.5rem; }
          .gap-3 { gap: 0.5rem; }
          .rounded-xl { border-radius: 0.75rem; }
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 mb-2 flex items-center gap-2 sm:gap-3 ${isRTL ? 'flex-row' : 'flex-row'}`}>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Heart className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="truncate">{t('likes.page.title')}</span>
              </h1>
              <p className={`text-sm sm:text-base text-slate-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t('likes.page.subtitle')}</p>
            </div>


          </div>

        </div>



        {/* Received Likes Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 mb-6 sm:mb-8">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row' : 'flex-row'}`}>
              <h2 className={`text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-3 ${isRTL ? 'flex-row' : 'flex-row'}`}>
                <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-pink-500" />
                {t('likes.page.sectionTitle')}
              </h2>
              <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {receivedLikes.length} {t('likes.page.count')}
              </span>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-3 sm:space-y-4">
                {receivedLikes.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Heart className="w-12 h-12 sm:w-16 sm:h-16 text-slate-400 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-2">{t('likes.page.noLikes')}</h3>
                    <p className="text-sm sm:text-base text-slate-600">{t('likes.page.noLikesDesc')}</p>
                  </div>
                ) : (
                  receivedLikes.map((like: any) => (
                    like && like.liker ? (
                    <div key={like.id} className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 hover:shadow-md transition-shadow">
                      <div className={`flex items-start justify-between gap-3 ${isRTL ? 'flex-row' : 'flex-row'}`}>
                        <div className={`flex items-start gap-3 sm:gap-4 flex-1 min-w-0 ${isRTL ? 'flex-row' : 'flex-row'}`}>
                          <div
                            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full cursor-pointer hover:scale-105 transition-transform flex-shrink-0 overflow-hidden border-2 border-white shadow-lg"
                            onClick={() => handleViewProfile(like.liker?.id)}
                            title={t('likes.page.viewProfile')}
                          >
                            {getProfileImageUrl(like.liker?.id) ? (
                              <img
                                src={getProfileImageUrl(like.liker?.id)!}
                                alt={`${like.liker?.first_name || t('likes.page.userInfo.defaultUser')} ${like.liker?.last_name || ''}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // في حالة فشل تحميل الصورة، اعرض الأيقونة الافتراضية
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.className = "w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition-transform flex-shrink-0";
                                    parent.innerHTML = '<svg class="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center">
                                <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className={`flex items-center gap-2 mb-2 flex-wrap ${isRTL ? 'justify-start' : 'justify-start'}`}>
                              <h3
                                className={`text-base sm:text-lg font-semibold text-slate-800 cursor-pointer hover:text-primary-600 transition-colors truncate ${isRTL ? 'text-right' : 'text-left'}`}
                                onClick={() => handleViewProfile(like.liker?.id)}
                                title={t('likes.page.viewProfile')}
                              >
                                {like.liker?.first_name || t('likes.page.userInfo.defaultUser')} {like.liker?.last_name || t('likes.page.userInfo.notAvailable')}
                              </h3>
                              <VerificationBadge
                                isVerified={like.liker?.verified || false}
                                size="sm"
                              />
                            </div>

                            <div className={`flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600 mb-3 ${isRTL ? 'justify-start' : 'justify-start'}`}>
                              <div className={`flex items-center gap-1 ${isRTL ? 'flex-row' : 'flex-row'}`}>
                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span>{like.liker?.age || t('likes.page.userInfo.notSpecified')} {t('likes.page.userInfo.yearsOld')}</span>
                              </div>
                              <div className={`flex items-center gap-1 ${isRTL ? 'flex-row' : 'flex-row'}`}>
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="truncate max-w-[100px] sm:max-w-none">{like.liker?.city || t('likes.page.userInfo.notSpecified')}</span>
                              </div>
                              <div className={`flex items-center gap-1 ${isRTL ? 'flex-row' : 'flex-row'}`}>
                                <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="truncate max-w-[80px] sm:max-w-none">{like.liker.education || t('likes.page.userInfo.notSpecified')}</span>
                              </div>
                            </div>

                            {like.message && (
                              <div className="bg-slate-50 rounded-lg p-2 sm:p-3 mb-3">
                                <p className={`text-slate-700 text-xs sm:text-sm break-words ${isRTL ? 'text-right' : 'text-left'}`}>{like.message}</p>
                              </div>
                            )}

                            <div className={`flex items-center gap-2 text-xs text-slate-500 mb-3 sm:mb-0 ${isRTL ? 'justify-start' : 'justify-start'}`}>
                              <Clock className="w-3 h-3" />
                              <span>{formatTimeAgo(like.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        <div className={`flex flex-col sm:flex-row items-center gap-2 flex-shrink-0 ${isRTL ? 'sm:flex-row-reverse' : 'sm:flex-row'}`}>
                          {like.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleLikeResponse(like.id, 'rejected')}
                                disabled={like.isProcessing}
                                className={`w-8 h-8 sm:w-10 sm:h-10 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center transition-colors group ${
                                  like.isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                title={t('likes.page.rejectLike')}
                              >
                                {like.isProcessing ? (
                                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 animate-spin" />
                                ) : (
                                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 group-hover:scale-110 transition-transform" />
                                )}
                              </button>
                              <button
                                onClick={() => handleLikeResponse(like.id, 'accepted')}
                                disabled={like.isProcessing}
                                className={`w-8 h-8 sm:w-10 sm:h-10 bg-green-100 hover:bg-green-200 rounded-full flex items-center justify-center transition-colors group ${
                                  like.isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                title={t('likes.page.acceptLike')}
                              >
                                {like.isProcessing ? (
                                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 group-hover:scale-110 transition-transform" />
                                )}
                              </button>
                            </>
                          ) : (
                            <div className={`px-3 py-1 rounded-full text-xs font-medium animate-pulse ${
                              like.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {like.status === 'accepted' ? t('likes.page.accepted') : t('likes.page.rejected')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    ) : null
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LikesPage;
