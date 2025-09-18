import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './ToastContainer';
import MatchingService, { type MatchResult } from '../lib/matchingService';
import LikesService from '../lib/likesService';
import { profileImageService } from '../lib/profileImageService';
import { messageService } from '../lib/supabase';
import type { ProfileImage } from '../lib/profileImageService';
import VerificationBadge from './VerificationBadge';
import {
  Heart,
  X,
  MapPin,
  GraduationCap,
  Calendar,
  Star,
  MessageCircle,
  Loader2,
  RefreshCw,
  Filter,
  Eye,
  User,
  Info,
  TrendingUp,
  CheckCircle
} from 'lucide-react';

const MatchesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useToast();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [likedMatches, setLikedMatches] = useState<string[]>([]);
  const [passedMatches, setPassedMatches] = useState<string[]>([]);
  const [profileImages, setProfileImages] = useState<{ [userId: string]: ProfileImage | null }>({});
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  // Check if current language is RTL
  const isRTL = i18n.language === 'ar';

  // Advanced search filters
  const [filters, setFilters] = useState({
    ageRange: { min: 18, max: 50 },
    cities: [] as string[],
    educationLevels: [] as string[],
    religiousCommitment: [] as string[],
    minCompatibilityScore: 50
  });

  // Load matches when page loads
  useEffect(() => {
    if (userProfile?.id) {
      loadMatches();
    }
  }, [userProfile]);

  // Support keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (matches.length === 0 || isLoadingAction) return;

      switch (event.key) {
        case ' ': // Space for like
          event.preventDefault();
          handleLike();
          break;
        case 'Escape': // ESC for pass
          event.preventDefault();
          handlePass();
          break;
        case 'ArrowRight': // Right arrow for next match
        case 'ArrowLeft': // Left arrow for next match
          event.preventDefault();
          nextMatch();
          break;
        case 'Enter': // Enter to view profile
          event.preventDefault();
          if (matches[currentMatchIndex]) {
            handleViewProfile(matches[currentMatchIndex].user.id);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [matches, currentMatchIndex, isLoadingAction]);

  const loadMatches = async () => {
    if (!userProfile?.id) return;

    setIsLoading(true);
    try {
      // Apply filters
      const preferences = {
        ageRange: filters.ageRange,
        educationImportance: 'medium' as const,
        religiousImportance: 'high' as const,
        locationImportance: 'medium' as const
      };

      const { data, error } = await MatchingService.findMatches(userProfile.id, 20, preferences);
      if (error) {
        console.error('Error loading matches:', error);
        showError(
          t('matches.errors.loadingError'),
          t('matches.errors.loadingErrorDesc'),
          5000
        );
      } else {
        // Apply local filters
        const filteredData = applyLocalFilters(data);
        setMatches(filteredData);
        setCurrentMatchIndex(0);

        // Load profile images for matches
        if (filteredData && filteredData.length > 0) {
          loadProfileImages(filteredData);
        }

        if (filteredData.length === 0) {
          showWarning(
            t('matches.errors.noMatches'),
            t('matches.errors.noMatchesDesc'),
            6000
          );
        } else {
          showSuccess(
            t('matches.success.matchesFound'),
            t('matches.success.matchesFoundDesc', { count: filteredData.length }),
            3000
          );
        }
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      showError(
        'خطأ غير متوقع',
        'حدث خطأ غير متوقع. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.',
        5000
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Apply local filters
  const applyLocalFilters = (data: MatchResult[]): MatchResult[] => {
    return data.filter(match => {
      // Compatibility score filter
      if (match.compatibilityScore < filters.minCompatibilityScore) {
        return false;
      }

      // Cities filter
      if (filters.cities.length > 0 && !filters.cities.includes(match.user.city || '')) {
        return false;
      }

      // Education level filter
      if (filters.educationLevels.length > 0) {
        const userEducation = match.user.education || '';
        const hasMatchingEducation = filters.educationLevels.some(level =>
          userEducation.toLowerCase().includes(level.toLowerCase())
        );
        if (!hasMatchingEducation) {
          return false;
        }
      }

      // Religious commitment filter
      if (filters.religiousCommitment.length > 0 &&
          !filters.religiousCommitment.includes(match.user.religious_commitment || '')) {
        return false;
      }

      return true;
    });
  };

  // Load profile images for matches
  const loadProfileImages = async (matchResults: MatchResult[]) => {
    const imagePromises = matchResults.map(async (match) => {
      try {
        const image = await profileImageService.getUserPrimaryImage(match.user.id);
        return { userId: match.user.id, image };
      } catch (error) {
        console.error(`Error loading profile image for user ${match.user.id}:`, error);
        return { userId: match.user.id, image: null };
      }
    });

    const results = await Promise.all(imagePromises);
    const imageMap: { [userId: string]: ProfileImage | null } = {};

    results.forEach((result) => {
      imageMap[result.userId] = result.image;
    });

    setProfileImages(imageMap);
  };

  // Get profile image URL
  const getProfileImageUrl = (userId: string): string | null => {
    const image = profileImages[userId];
    if (image?.file_path) {
      return image.file_path;
    }
    return null;
  };

  // Handle like action
  const handleLike = async () => {
    const currentMatch = matches[currentMatchIndex];
    if (!currentMatch || !userProfile?.id || isLoadingAction) return;

    setIsLoadingAction(true);
    try {
      // إرسال إعجاب عبر LikesService
      const { success, isMatch } = await LikesService.sendLike(
        userProfile.id,
        currentMatch.user.id,
        'like'
      );

      if (success) {
        // إضافة إلى قائمة الإعجابات
        setLikedMatches(prev => [...prev, currentMatch.user.id]);

        // حفظ المطابقة في قاعدة البيانات
        const saveResult = await MatchingService.saveMatch(
          userProfile.id,
          currentMatch.user.id,
          currentMatch.compatibilityScore,
          isMatch ? 'mutual_like' : 'suggested'
        );

        if (!saveResult.success) {
          console.warn('Failed to save match:', saveResult.error);
          // لا نعرض خطأ للمستخدم لأن الإعجاب تم إرساله بنجاح
        }

        // Show success message
        if (isMatch) {
          showSuccess(
            t('matches.success.mutualMatch'),
            t('matches.success.mutualMatchDesc', { name: currentMatch.user.first_name }),
            6000
          );
        } else {
          showSuccess(
            t('matches.success.likeSent'),
            t('matches.success.likeSentDesc', { name: currentMatch.user.first_name }),
            3000
          );
        }
      } else {
        showError(
          t('matches.errors.sendingError'),
          t('matches.errors.sendingErrorDesc'),
          4000
        );
      }
    } catch (error) {
      console.error('Error sending like:', error);
      showError(
        t('matches.errors.sendingError'),
        t('matches.errors.sendingErrorDesc'),
        4000
      );
    } finally {
      setIsLoadingAction(false);
    }

    // الانتقال للمطابقة التالية
    nextMatch();
  };

  // Handle pass action
  const handlePass = () => {
    const currentMatch = matches[currentMatchIndex];
    if (!currentMatch || isLoadingAction) return;

    setPassedMatches(prev => [...prev, currentMatch.user.id]);

    // Show confirmation message
    showWarning(
      t('matches.success.passed'),
      t('matches.success.passedDesc', { name: currentMatch.user.first_name }),
      2000
    );

    nextMatch();
  };

  // Move to next match
  const nextMatch = () => {
    if (currentMatchIndex < matches.length - 1) {
      setCurrentMatchIndex(prev => prev + 1);
    } else {
      // Load more matches but keep the current position
      loadMoreMatches();
    }
  };

  // Load more matches without resetting the index
  const loadMoreMatches = async () => {
    if (!userProfile?.id || isLoading) return;

    setIsLoading(true);
    try {
      const preferences = {
        minAge: 18,
        maxAge: 50,
        location: userProfile.location || '',
        education: userProfile.education_level || '',
        religiousLevel: userProfile.religious_level || ''
      };

      const { data, error } = await MatchingService.findMatches(userProfile.id, 20, preferences);
      if (error) {
        console.error('Error loading more matches:', error);
        showError(
          t('matches.errors.loadingError'),
          t('matches.errors.loadingErrorDesc'),
          5000
        );
      } else {
        // Apply local filters
        const filteredData = applyLocalFilters(data);

        if (filteredData && filteredData.length > 0) {
          // Add new matches to existing ones
          setMatches(prev => [...prev, ...filteredData]);

          // Load profile images for new matches
          loadProfileImages(filteredData);

          // Move to the first new match
          setCurrentMatchIndex(matches.length);

          showSuccess(
            t('matches.success.moreMatchesLoaded'),
            t('matches.success.moreMatchesLoadedDesc', { count: filteredData.length }),
            3000
          );
        } else {
          showWarning(
            t('matches.errors.noMoreMatches'),
            t('matches.errors.noMoreMatchesDesc'),
            4000
          );
        }
      }
    } catch (error) {
      console.error('Error loading more matches:', error);
      showError(
        t('matches.errors.loadingError'),
        t('matches.errors.loadingErrorDesc'),
        5000
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Get compatibility score color
  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  // Get compatibility level text
  const getCompatibilityText = (score: number) => {
    if (score >= 80) return t('matches.compatibility.excellent');
    if (score >= 60) return t('matches.compatibility.good');
    if (score >= 40) return t('matches.compatibility.average');
    return t('matches.compatibility.poor');
  };

  // Translate compatibility reasons
  const translateReason = (reason: string): string => {
    // Create a mapping of common Arabic reasons to translation keys
    const reasonMap: { [key: string]: string } = {
      '🎯 عمر متطابق تماماً': 'ageMatch',
      '🏠 نفس المدينة - سهولة اللقاء': 'sameCity',
      '📚 نفس مستوى التعليم': 'sameEducation',
      '🕌 نفس الالتزام الديني': 'sameReligion',
      '💼 اهتمامات مشتركة': 'similarInterests',
      '🎯 أهداف متوافقة': 'compatibleGoals',
      '🎓 مستوى تعليمي متطابق': 'educationMatch',
      '🎯 عمر متقارب': 'closeAge',
      '🏠 موقع قريب': 'nearbyLocation',
      '💎 قيم مشتركة': 'sharedValues',
      '🌟 خلفية متشابهة': 'similarBackground'
    };

    const key = reasonMap[reason];
    if (key) {
      return t(`matches.compatibility.reasonsExamples.${key}`);
    }

    // If no mapping found, return the original reason
    return reason;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">{t('matches.page.loading')}</p>
        </div>
      </div>
    );
  }

  const handleViewProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  // Handle message action
  const handleSendMessage = async () => {
    if (!userProfile?.id || !currentMatch || isLoadingAction) return;

    setIsLoadingAction(true);
    try {
      // Create or get conversation
      const { error } = await messageService.createConversation(
        userProfile.id,
        currentMatch.user.id
      );

      if (error) {
        console.error('Error creating conversation:', error);

        // Show appropriate error message
        const errorMessage = typeof error === 'string' ? error : error.message || 'Unknown error';
        if (errorMessage.includes('لا يسمح بالرسائل') || errorMessage.includes('does not allow messages')) {
          showWarning(
            t('messages.errors.messagesDisabled'),
            t('messages.errors.messagesDisabledDesc'),
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
      setIsLoadingAction(false);
    }
  };

  const currentMatch = matches[currentMatchIndex];

  if (!currentMatch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center max-w-md mx-auto p-8">
          <Heart className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className={`text-2xl font-bold text-slate-800 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t('matches.page.noMatches')}</h2>
          <p className={`text-slate-600 mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('matches.page.noMatchesDesc')}
          </p>
          <button
            onClick={loadMatches}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors mx-auto"
          >
            <RefreshCw className="w-5 h-5" />
            {t('matches.page.refreshMatches')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Floating Action Buttons */}
      <div className="fixed top-4 right-4 z-20 flex gap-2">
        <button
          onClick={() => setShowFilters(true)}
          className="w-12 h-12 bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg rounded-full flex items-center justify-center transition-all hover:scale-105"
          title={t('matches.filters.title')}
        >
          <Filter className="w-5 h-5 text-slate-700" />
        </button>
        <button
          onClick={loadMatches}
          className="w-12 h-12 bg-primary-600 hover:bg-primary-700 shadow-lg rounded-full flex items-center justify-center transition-all hover:scale-105"
          title="تحديث"
        >
          <RefreshCw className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Filters Popup */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Filter className="w-6 h-6" />
                  {t('matches.filters.title')}
                </h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Age Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    {t('matches.filters.age', { min: filters.ageRange.min, max: filters.ageRange.max })}
                  </label>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-slate-500">{t('matches.filters.ageMin', { min: filters.ageRange.min })}</span>
                      <input
                        type="range"
                        min="18"
                        max="60"
                        value={filters.ageRange.min}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          ageRange: { ...prev.ageRange, min: parseInt(e.target.value) }
                        }))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">{t('matches.filters.ageMax', { max: filters.ageRange.max })}</span>
                      <input
                        type="range"
                        min="18"
                        max="60"
                        value={filters.ageRange.max}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          ageRange: { ...prev.ageRange, max: parseInt(e.target.value) }
                        }))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Compatibility Score Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    {t('matches.filters.minCompatibility', { score: filters.minCompatibilityScore })}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.minCompatibilityScore}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      minCompatibilityScore: parseInt(e.target.value)
                    }))}
                    className="w-full"
                  />
                </div>

                {/* Religious Commitment Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    {t('matches.filters.religiousCommitment')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['very_religious', 'religious', 'high', 'medium', 'moderate'].map(level => (
                      <label key={level} className="flex items-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.religiousCommitment.includes(level)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters(prev => ({
                                ...prev,
                                religiousCommitment: [...prev.religiousCommitment, level]
                              }));
                            } else {
                              setFilters(prev => ({
                                ...prev,
                                religiousCommitment: prev.religiousCommitment.filter(l => l !== level)
                              }));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-slate-700">
                          {t(`matches.filters.religiousLevels.${level}`)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
                <button
                  onClick={() => {
                    setFilters({
                      ageRange: { min: 18, max: 50 },
                      cities: [],
                      educationLevels: [],
                      religiousCommitment: [],
                      minCompatibilityScore: 50
                    });
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                  {t('matches.filters.resetFilters')}
                </button>
                <button
                  onClick={() => {
                    loadMatches();
                    setShowFilters(false);
                  }}
                  className="px-8 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium"
                >
                  {t('matches.filters.applyFilters')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Match Progress & Stats */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Progress */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">
                  {t('matches.page.matchCounter', { current: currentMatchIndex + 1, total: matches.length })}
                </span>
                <span className="text-sm text-slate-600">
                  {Math.round(((currentMatchIndex + 1) / matches.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-primary-600 to-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentMatchIndex + 1) / matches.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-green-600">
                <Heart className="w-4 h-4" />
                <span>{likedMatches.length}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-500">
                <X className="w-4 h-4" />
                <span>{passedMatches.length}</span>
              </div>
              <div className="flex items-center gap-1 text-primary-600">
                <TrendingUp className="w-4 h-4" />
                <span>{t('matches.page.remaining', { count: matches.length - currentMatchIndex - 1 })}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          {(likedMatches.length > 0 || passedMatches.length > 0) && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="text-center text-sm text-slate-600">
                {t('matches.page.likeRate', { rate: Math.round((likedMatches.length / (likedMatches.length + passedMatches.length)) * 100) })}
                {likedMatches.length >= 3 && (
                  <span className="text-green-600 mr-2">
                    {t('matches.page.goodChoices')}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Match Card */}
        <div className="max-w-md mx-auto px-4 py-2">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              {/* Profile Header */}
            <div className="bg-gradient-to-r from-primary-600 to-emerald-600 p-4 text-white text-center">
              <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden border-3 border-white/30 shadow-lg">
                {getProfileImageUrl(currentMatch.user.id) ? (
                  <img
                    src={getProfileImageUrl(currentMatch.user.id)!}
                    alt={`${currentMatch.user.first_name} ${currentMatch.user.last_name}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // {t('matches.userInfo.imageLoadError')}
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.className = "w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2";
                        parent.innerHTML = '<svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-white/20 flex items-center justify-center">
                    <User className="w-10 h-10 text-white" />
                  </div>
                )}
              </div>
              <h2 className="text-xl font-bold mb-1 flex items-center justify-center gap-2">
                <span>{currentMatch.user.first_name} {currentMatch.user.last_name}</span>
                <VerificationBadge
                  isVerified={currentMatch.user.verified || false}
                  size="sm"
                />
              </h2>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{currentMatch.user.age} {t('matches.userInfo.yearsOld')}</span>
              </div>

              {/* Compatibility Score */}
              <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${getCompatibilityColor(currentMatch.compatibilityScore)}`}>
                <Star className="w-4 h-4" />
                <span className="font-bold">{currentMatch.compatibilityScore}%</span>
                <span className="text-sm">{getCompatibilityText(currentMatch.compatibilityScore)}</span>
              </div>
            </div>

            {/* Profile Details */}
            <div className="p-3 space-y-2">
              {/* Basic Info Row */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-slate-50 rounded-lg p-2 flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <span className="text-slate-700 truncate font-medium">{currentMatch.user.city}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 flex items-center gap-1">
                  <GraduationCap className="w-4 h-4 text-green-500" />
                  <span className="text-slate-700 truncate font-medium">{currentMatch.user.education}</span>
                </div>
              </div>

              {/* Bio - Enhanced */}
              {currentMatch.user.bio && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-2 border border-blue-100">
                  <div className="flex items-start gap-1 mb-1">
                    <User className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-medium text-blue-700">{t('matches.userInfo.personalBio')}</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>{currentMatch.user.bio}</p>
                </div>
              )}

              {/* Match Reasons - Enhanced */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-1 text-sm flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {t('matches.compatibility.reasons')}
                </h3>
                <div className="flex flex-wrap gap-1">
                  {currentMatch.matchReason.slice(0, 3).map((reason, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gradient-to-r from-primary-100 to-primary-50 text-primary-700 rounded-full text-sm border border-primary-200 shadow-sm"
                    >
                      {translateReason(reason)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Compatibility Breakdown - Enhanced */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-2 text-sm flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {t('matches.compatibility.details')}
                </h3>
                <div className="bg-slate-50 rounded-lg p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-slate-600 text-sm">{t('matches.compatibility.age')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-10 bg-slate-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${currentMatch.compatibilityFactors.age * 100}%` }}
                        />
                      </div>
                      <span className="text-slate-800 font-medium text-sm min-w-[30px]">{Math.round(currentMatch.compatibilityFactors.age * 100)}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-slate-600 text-sm">{t('matches.compatibility.location')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-10 bg-slate-200 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${currentMatch.compatibilityFactors.location * 100}%` }}
                        />
                      </div>
                      <span className="text-slate-800 font-medium text-sm min-w-[30px]">{Math.round(currentMatch.compatibilityFactors.location * 100)}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-slate-600 text-sm">{t('matches.compatibility.education')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-10 bg-slate-200 rounded-full h-1.5">
                        <div
                          className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${currentMatch.compatibilityFactors.education * 100}%` }}
                        />
                      </div>
                      <span className="text-slate-800 font-medium text-sm min-w-[30px]">{Math.round(currentMatch.compatibilityFactors.education * 100)}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      <span className="text-slate-600 text-sm">{t('matches.compatibility.religion')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-10 bg-slate-200 rounded-full h-1.5">
                        <div
                          className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${currentMatch.compatibilityFactors.religiousCommitment * 100}%` }}
                        />
                      </div>
                      <span className="text-slate-800 font-medium text-sm min-w-[30px]">{Math.round(currentMatch.compatibilityFactors.religiousCommitment * 100)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-3 pt-2">
              <div className="grid grid-cols-4 gap-3">
                {/* Pass Button */}
                <div className="text-center">
                  <button
                    onClick={handlePass}
                    disabled={isLoadingAction}
                    className="w-12 h-12 bg-white hover:bg-slate-50 disabled:bg-slate-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-all hover:scale-105 disabled:hover:scale-100 shadow-md hover:shadow-lg border border-slate-200 group mx-auto mb-2"
                  >
                    <X className="w-5 h-5 text-slate-500 group-hover:text-slate-700 group-disabled:text-slate-300" />
                  </button>
                  <span className="text-sm text-slate-600 block">{t('matches.actions.pass')}</span>
                </div>

                {/* View Profile Button */}
                <div className="text-center">
                  <button
                    onClick={() => handleViewProfile(currentMatch.user.id)}
                    disabled={isLoadingAction}
                    className="w-12 h-12 bg-white hover:bg-blue-50 disabled:bg-slate-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-all hover:scale-105 disabled:hover:scale-100 shadow-md hover:shadow-lg border border-blue-200 group mx-auto mb-2"
                  >
                    <Eye className="w-5 h-5 text-blue-500 group-hover:text-blue-600 group-disabled:text-slate-300" />
                  </button>
                  <span className="text-sm text-blue-600 block">{t('matches.actions.view')}</span>
                </div>

                {/* Like Button */}
                <div className="text-center">
                  <button
                    onClick={handleLike}
                    disabled={isLoadingAction}
                    className="w-14 h-14 bg-white hover:bg-pink-50 disabled:bg-slate-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-all hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-xl border-2 border-pink-200 hover:border-pink-300 mx-auto mb-2"
                  >
                    {isLoadingAction ? (
                      <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
                    ) : (
                      <Heart className="w-6 h-6 text-pink-500" />
                    )}
                  </button>
                  <span className="text-sm text-pink-600 font-semibold block">{t('matches.actions.like')}</span>
                </div>

                {/* Message Button */}
                <div className="text-center">
                  {currentMatch.user.allow_messages ? (
                    <button
                      onClick={handleSendMessage}
                      disabled={isLoadingAction}
                      className="w-12 h-12 bg-white hover:bg-green-50 disabled:bg-slate-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-all hover:scale-105 disabled:hover:scale-100 shadow-md hover:shadow-lg border border-green-200 group mx-auto mb-2"
                    >
                      {isLoadingAction ? (
                        <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                      ) : (
                        <MessageCircle className="w-5 h-5 text-green-500 group-hover:text-green-600 group-disabled:text-slate-300" />
                      )}
                    </button>
                  ) : (
                    <button
                      className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-200 mx-auto mb-2 opacity-40 cursor-not-allowed"
                      disabled
                      title={t('messages.errors.messagesDisabled')}
                    >
                      <MessageCircle className="w-5 h-5 text-slate-400" />
                    </button>
                  )}
                  <span className={`text-sm block ${currentMatch.user.allow_messages ? 'text-green-600' : 'text-slate-400'}`}>
                    {t('matches.actions.message')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tips Section at Bottom */}
      <div className="max-w-md mx-auto px-4 pb-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-200">
          <div className="text-center">
            <Info className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <h3 className={`font-semibold text-blue-800 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>{t('matches.tips.title')}</h3>
            <div className={`text-sm text-blue-700 space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p>{t('matches.tips.readProfile')}</p>
              <p>{t('matches.tips.payAttention')}</p>
              <p>{t('matches.tips.useFilters')}</p>
              <p>{t('matches.tips.beHonest')}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className={`text-sm text-blue-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('matches.actions.keyboardShortcuts')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchesPage;
