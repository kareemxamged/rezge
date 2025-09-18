import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService, type DashboardStats, type RecentActivity } from '../lib/dashboardService';
import { notificationService, type Notification } from '../lib/notificationService';
import NotificationCard from './dashboard/NotificationCard';
import {
  Heart,
  MessageCircle,
  Eye,
  Star,
  Users,
  Calendar,
  Bell,
  Settings,
  Shield,

  MapPin,
  Loader2,
  CheckCircle,
  AlertCircle,
  Zap,
  RefreshCw,
  ArrowUpRight,
  Award
} from 'lucide-react';

const DashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    profileViews: 0,
    likes: 0,
    matches: 0,
    messages: 0,
    profileCompletion: 0,
    lastActive: '',
    responseRate: 0,
    newMatches: 0,
    unreadMessages: 0
  });
  const [_recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [suggestedMatches, setSuggestedMatches] = useState<any[]>([]);
  const [profileTips, setProfileTips] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile?.id) {
      loadDashboardData();
    }
  }, [userProfile]);

  const loadDashboardData = async () => {
    if (!userProfile?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // استخدام الخدمة الجديدة لجلب جميع البيانات
      const comprehensiveStats = await dashboardService.getComprehensiveStats(userProfile.id);

      setStats(comprehensiveStats.userStats);
      setRecentActivity(comprehensiveStats.recentActivity);
      setSuggestedMatches(comprehensiveStats.suggestedMatches);
      setProfileTips(comprehensiveStats.profileTips || []);

      // جلب الإشعارات
      const userNotifications = await notificationService.getUserNotifications(userProfile.id, 10);
      setNotifications(userNotifications);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('حدث خطأ في تحميل بيانات لوحة التحكم. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const handleRefreshData = async () => {
    if (userProfile?.id) {
      await loadDashboardData();
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const handleDismissNotification = async (notificationId: string) => {
    await notificationService.dismissNotification(notificationId);
    setNotifications(prev =>
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  const handleNotificationAction = (notification: Notification) => {
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    handleMarkAsRead(notification.id);
  };





  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">خطأ في تحميل البيانات</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={handleRefreshData}
            className="bg-primary-600 text-white px-6 py-3 rounded-xl hover:bg-primary-700 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">
                {t('dashboard.welcome', { name: userProfile?.first_name })}
              </h1>
              <p className="text-slate-600 text-sm">
                {t('dashboard.overview')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshData}
                disabled={isLoading}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                title={t('dashboard.refresh')}
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => navigate('/security')}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title={t('dashboard.settings')}
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">{error}</span>
            </div>
            <button
              onClick={handleRefreshData}
              className="mt-2 text-red-600 hover:text-red-700 text-sm font-medium"
            >
              {t('dashboard.retry')}
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Profile Views Card */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-xs font-medium">+12%</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.profileViews.toLocaleString()}</h3>
            <p className="text-gray-600 text-sm">{t('dashboard.stats.profileViewsDesc')}</p>
            <div className="mt-3 text-xs text-gray-500">{t('dashboard.stats.profileViewsLast30Days')}</div>
          </div>

          {/* Likes Card */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-pink-600" />
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-xs font-medium">+8%</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.likes.toLocaleString()}</h3>
            <p className="text-gray-600 text-sm">{t('dashboard.stats.likesReceivedDesc')}</p>
            <div className="mt-3 text-xs text-gray-500">{t('dashboard.stats.likesTotal')}</div>
          </div>

          {/* Matches Card */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-xs font-medium">+{stats.newMatches}</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.matches.toLocaleString()}</h3>
            <p className="text-gray-600 text-sm">{t('dashboard.stats.activeMatchesDesc')}</p>
            <div className="mt-3 text-xs text-gray-500">{t('dashboard.stats.newThisWeek', { count: stats.newMatches })}</div>
          </div>

          {/* Messages Card */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-green-600" />
              </div>
              {stats.unreadMessages > 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <Bell className="w-4 h-4" />
                  <span className="text-xs font-medium">{stats.unreadMessages}</span>
                </div>
              )}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.messages.toLocaleString()}</h3>
            <p className="text-gray-600 text-sm">{t('dashboard.stats.messagesDesc')}</p>
            <div className="mt-3 text-xs text-gray-500">
              {stats.unreadMessages > 0 ? t('dashboard.stats.unreadMessages', { count: stats.unreadMessages }) : t('dashboard.stats.allMessagesRead')}
            </div>
          </div>

          {/* Response Rate Card */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.responseRate}%</h3>
            <p className="text-gray-600 text-sm">{t('dashboard.stats.responseRate')}</p>
            <div className="mt-3 text-xs text-gray-500">
              {stats.responseRate >= 80 ? t('dashboard.stats.excellent') : stats.responseRate >= 60 ? t('dashboard.stats.good') : t('dashboard.stats.needsImprovement')}
            </div>
          </div>
        </div>



        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Profile Completion & Tips */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900">{t('dashboard.profileCompletion.title')}</h3>
                <p className="text-slate-600 text-sm">{t('dashboard.profileCompletion.completed', { percentage: stats.profileCompletion })}</p>
              </div>
            </div>

            <div className="mb-4">
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats.profileCompletion}%` }}
                ></div>
              </div>
            </div>

            {profileTips.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-700 mb-2">{t('dashboard.profileCompletion.improvementTips')}</h4>
                {profileTips.slice(0, 2).map((tip, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm text-slate-600">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>{t(tip)}</span>
                  </div>
                ))}
                {profileTips.length > 2 && (
                  <button
                    onClick={() => navigate('/profile')}
                    className="text-emerald-600 text-sm font-medium hover:text-emerald-700"
                  >
                    {t('dashboard.profileCompletion.viewMore')}
                  </button>
                )}
              </div>
            )}

            <button
              onClick={() => navigate('/profile')}
              className="w-full mt-4 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              {t('dashboard.profileCompletion.improveProfile')}
            </button>
          </div>

          {/* Notifications */}
          <div className="lg:col-span-2">
            <NotificationCard
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onDismiss={handleDismissNotification}
              onAction={handleNotificationAction}
              onViewAll={() => navigate('/notifications')}
            />
          </div>
        </div>



        {/* Suggested Matches */}
        <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800">{t('dashboard.suggestedMatches.title')}</h2>
                <button
                  onClick={() => navigate('/matches')}
                  className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  {t('dashboard.suggestedMatches.viewAll')}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {suggestedMatches.slice(0, 3).map((match, index) => (
                  <div
                    key={index}
                    className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors cursor-pointer hover:shadow-md transform hover:-translate-y-1"
                    onClick={() => handleViewProfile(match.id)}
                    title={t('dashboard.suggestedMatches.viewProfile')}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-full flex items-center justify-center">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div className={i18n.language === 'ar' ? 'text-right' : 'text-left'}>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm font-bold text-slate-700">
                            {t('dashboard.suggestedMatches.compatibilityScore', { score: match.compatibilityScore || 0 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <h3 className="font-semibold text-slate-800 mb-1 hover:text-primary-600 transition-colors">
                      {match.first_name || t('dashboard.suggestedMatches.notSpecified')} {match.last_name || ''}
                    </h3>

                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                      <MapPin className="w-3 h-3" />
                      <span>{match.city || t('dashboard.suggestedMatches.notSpecified')}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-3 h-3" />
                      <span>{match.age || t('dashboard.suggestedMatches.notSpecified')} {match.age ? t('dashboard.suggestedMatches.years') : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {(!suggestedMatches || suggestedMatches.length === 0) && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">{t('dashboard.suggestedMatches.noMatches')}</p>
                  <p className="text-sm text-slate-500 mt-1">{t('dashboard.suggestedMatches.noMatchesDesc')}</p>
                </div>
              )}
            </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <button
            onClick={() => navigate('/search')}
            className={`group bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
              <Users className="w-6 h-6 text-white" />
            </div>
            <p className="font-semibold text-white text-lg mb-1">{t('dashboard.quickActions.search.title')}</p>
            <p className="text-blue-100 text-sm">{t('dashboard.quickActions.search.subtitle')}</p>
          </button>

          <button
            onClick={() => navigate('/messages')}
            className={`group bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${i18n.language === 'ar' ? 'text-right' : 'text-left'} relative`}
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <p className="font-semibold text-white text-lg mb-1">{t('dashboard.quickActions.messages.title')}</p>
            <p className="text-green-100 text-sm">{t('dashboard.quickActions.messages.subtitle')}</p>
            {stats.unreadMessages > 0 && (
              <div className={`absolute -top-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white ${i18n.language === 'ar' ? '-left-2' : '-right-2'}`}>
                <span className="text-white text-xs font-bold">{stats.unreadMessages}</span>
              </div>
            )}
          </button>

          <button
            onClick={() => navigate('/matches')}
            className={`group bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-6 text-white hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
              <Star className="w-6 h-6 text-white" />
            </div>
            <p className="font-semibold text-white text-lg mb-1">{t('dashboard.quickActions.matches.title')}</p>
            <p className="text-yellow-100 text-sm">{t('dashboard.quickActions.matches.subtitle', { count: stats.matches })}</p>
          </button>

          <button
            onClick={() => navigate('/likes')}
            className={`group bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-6 text-white hover:from-pink-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <p className="font-semibold text-white text-lg mb-1">{t('dashboard.quickActions.likes.title')}</p>
            <p className="text-pink-100 text-sm">{t('dashboard.quickActions.likes.subtitle', { count: stats.likes })}</p>
          </button>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
