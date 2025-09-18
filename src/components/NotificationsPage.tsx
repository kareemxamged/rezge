import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificationService, type Notification } from '../lib/notificationService';
import {
  Bell,
  Heart,
  MessageCircle,
  Star,
  Eye,
  X,
  ArrowLeft
} from 'lucide-react';

const NotificationsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // دالة مساعدة لترجمة محتوى الإشعارات
  const translateNotificationContent = (text: string, fromUser?: any) => {
    const userName = fromUser?.name || t('common.unknown');

    // إذا كان النص يبدأ بـ notifications. فهو مفتاح ترجمة
    if (text && text.startsWith && text.startsWith('notifications.')) {
      return t(text, { name: userName });
    }

    // إذا كان النص عربي مباشر، نحوله لمفتاح ترجمة مناسب
    const textMappings: { [key: string]: string } = {
      'رسالة جديدة': 'notifications.content.message.title',
      'أرسل لك دينا أحمد رسالة جديدة': 'notifications.content.message.message',
      'قراءة الرسالة': 'notifications.content.message.actionText',
      'إعجاب جديد': 'notifications.content.like.title',
      'أعجب يوسف أحمد بملفك الشخصي': 'notifications.content.like.message',
      'أعجب أحمد محمد بملفك الشخصي': 'notifications.content.like.message',
      'عرض الملف الشخصي': 'notifications.content.like.actionText',
      'مشاهدة جديدة للملف الشخصي': 'notifications.content.profileView.title',
      'شاهد KARIM AMGAD ملفك الشخصي': 'notifications.content.profileView.message',
      'شاهد Ashraf Hamdy ملفك الشخصي': 'notifications.content.profileView.message',
      'شاهد حسن المنصوري ملفك الشخصي': 'notifications.content.profileView.message',
      // إشعارات البلاغات - جميع الاحتمالات
      'تم قبول بلاغك': 'notifications.content.reportAccepted.title',
      'تم مراجعة بلاغك': 'notifications.content.reportRejected.title',
      'تم استلام بلاغك': 'notifications.content.reportReceived.title',
      'تم رفض البلاغ': 'notifications.content.reportRejected.title',
      'تم قبول البلاغ': 'notifications.content.reportAccepted.title',
      'تم رفض بلاغك': 'notifications.content.reportRejected.title',
      'عرض تفاصيل البلاغ': 'notifications.content.reportAccepted.actionText',
      // رسائل البلاغات المفصلة
      'تم استلام بلاغك وجاري مراجعته الآن. سنقوم بإشعارك بالنتيجة قريباً.': 'notifications.content.reportReceived.message',
      'تم قبول بلاغك وسيتم اتخاذ الإجراء المناسب في أقرب وقت. شكراً لك على مساعدتنا في تحسين المجتمع.': 'notifications.content.reportAccepted.message',
      'تم مراجعة بلاغك وقررنا عدم اتخاذ إجراء في هذا الوقت. شكراً لك على اهتمامك بسلامة المجتمع.': 'notifications.content.reportRejected.message',
      // رسائل إضافية للبلاغات
      'تم مراجعة بلاغك وقبوله من قبل فريق الإشراف. سنقوم باتخاذ الإجراءات المناسبة.': 'notifications.content.reportAccepted.message',
      'شكراً لك على تقديم البلاغ. تم استلام بلاغك وجاري مراجعته من قبل فريق الإشراف.': 'notifications.content.reportReceived.message',
      // إشعارات التوثيق
      'تم توثيق حسابك بنجاح': 'notifications.content.verificationApproved.title',
      'تم رفض طلب التوثيق': 'notifications.content.verificationRejected.title',
      'إعادة تقديم الطلب': 'notifications.content.verificationRejected.actionText',
      'إعادة المحاولة': 'notifications.retry',
      'عرض التفاصيل': 'notifications.viewDetails',
      // محتوى إشعارات التوثيق
      'تهانينا! تم توثيق هويتك الشخصية بنجاح. يمكنك الآن الاستفادة من جميع مميزات الموقع.': 'notifications.content.verificationApproved.message',
      'تم رفض طلب توثيق هويتك. يرجى المحاولة مرة أخرى.': 'notifications.content.verificationRejected.message'
    };

    // البحث عن مطابقة مباشرة
    if (textMappings[text]) {
      return t(textMappings[text], { name: userName });
    }

    // البحث عن مطابقة جزئية للرسائل الديناميكية
    if (text.includes('أرسل لك') && text.includes('رسالة جديدة')) {
      return t('notifications.content.message.message', { name: userName });
    }

    if (text.includes('أعجب') && text.includes('بملفك الشخصي')) {
      return t('notifications.content.like.message', { name: userName });
    }

    if (text.includes('شاهد') && text.includes('ملفك الشخصي')) {
      return t('notifications.content.profileView.message', { name: userName });
    }

    // البحث عن مطابقات جزئية للبلاغات
    if (text.includes('تم قبول') && text.includes('بلاغ')) {
      return t('notifications.content.reportAccepted.title');
    }

    if (text.includes('تم رفض') && text.includes('بلاغ')) {
      return t('notifications.content.reportRejected.title');
    }

    if (text.includes('تم استلام') && text.includes('بلاغ')) {
      return t('notifications.content.reportReceived.title');
    }

    if (text.includes('تم مراجعة') && text.includes('بلاغ')) {
      return t('notifications.content.reportRejected.title');
    }

    // إشعارات البلاغات
    if (text.includes('تم مراجعة بلاغك وقبوله')) {
      return t('notifications.content.reportAccepted.message');
    }

    if (text.includes('سنقوم باتخاذ الإجراءات المناسبة تجاه المستخدم المبلغ عنه')) {
      return t('notifications.content.reportAccepted.fullMessage');
    }

    if (text.includes('تم مراجعة بلاغك من قبل فريق الإشراف')) {
      const reason = text.split('السبب: ')[1] || '';
      return t('notifications.content.reportRejected.message', { reason });
    }

    if (text.includes('بعد المراجعة الدقيقة، تقرر عدم اتخاذ إجراء')) {
      const reason = text.split('السبب: ')[1] || '';
      return t('notifications.content.reportRejected.fullMessage', { reason });
    }

    if (text.includes('شكراً لك على تقديم البلاغ')) {
      return t('notifications.content.reportReceived.message');
    }

    if (text.includes('سنقوم بإشعارك بالنتيجة في أقرب وقت ممكن')) {
      return t('notifications.content.reportReceived.fullMessage');
    }

    // إشعارات التوثيق
    if (text.includes('تهانينا! تم توثيق هويتك الشخصية بنجاح')) {
      return t('notifications.content.verificationApproved.message');
    }

    if (text.includes('توثيق هويتك الشخصية بنجاح')) {
      return t('notifications.content.verificationApproved.message');
    }

    if (text.includes('تم رفض طلب توثيق هويتك')) {
      const reason = text.split('السبب: ')[1] || '';
      return t('notifications.content.verificationRejected.message', { reason });
    }

    if (text.includes('رفض طلب توثيق') || (text.includes('توثيق') && text.includes('رفض'))) {
      return t('notifications.content.verificationRejected.message');
    }

    // إذا لم نجد مطابقة، نعيد النص كما هو
    return text;
  };
  const { userProfile } = useAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'profile_view' | 'like' | 'message' | 'match'>('all');

  useEffect(() => {
    loadNotifications();
  }, [userProfile]);

  useEffect(() => {
    applyFilter();
  }, [notifications, filter]);

  const loadNotifications = async () => {
    if (!userProfile?.id) return;

    setIsLoading(true);
    try {
      // جلب جميع الإشعارات مع التنبيهات
      const userNotifications = await notificationService.getAllNotificationsWithAlerts(userProfile.id, 50);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilter = () => {
    let filtered = notifications;
    
    switch (filter) {
      case 'unread':
        filtered = notifications.filter(n => !n.isRead);
        break;
      case 'profile_view':
      case 'like':
      case 'message':
      case 'match':
        filtered = notifications.filter(n => n.type === filter);
        break;
      default:
        filtered = notifications;
    }
    
    setFilteredNotifications(filtered);
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

  const handleMarkAllAsRead = async () => {
    if (!userProfile?.id) return;

    await notificationService.markAllAsRead(userProfile.id);
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, isRead: true }))
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

  const getNotificationIcon = (type: Notification['type'], alertType?: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-pink-600" fill="currentColor" />;
      case 'message':
        return <MessageCircle className="w-5 h-5 text-green-600" />;
      case 'match':
        return <Star className="w-5 h-5 text-yellow-600" fill="currentColor" />;
      case 'profile_view':
        return <Eye className="w-5 h-5 text-blue-600" />;
      case 'alert':
        // أيقونات مختلفة حسب نوع التنبيه
        switch (alertType) {
          case 'warning':
            return <Bell className="w-5 h-5 text-yellow-600" />;
          case 'error':
            return <Bell className="w-5 h-5 text-red-600" />;
          case 'success':
            return <Bell className="w-5 h-5 text-green-600" />;
          case 'announcement':
            return <Bell className="w-5 h-5 text-purple-600" />;
          default:
            return <Bell className="w-5 h-5 text-blue-600" />;
        }
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };



  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return t('notifications.page.timeAgo.now');
    if (diffInMinutes < 60) return t('notifications.page.timeAgo.minutesAgo', { count: diffInMinutes });

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return t('notifications.page.timeAgo.hoursAgo', { count: diffInHours });

    const diffInDays = Math.floor(diffInHours / 24);
    return t('notifications.page.timeAgo.daysAgo', { count: diffInDays });
  };

  const filterOptions = [
    { value: 'all', label: t('notifications.page.filters.all'), count: notifications.length },
    { value: 'unread', label: t('notifications.page.filters.unread'), count: notifications.filter(n => !n.isRead).length },
    { value: 'profile_view', label: t('notifications.page.filters.profileView'), count: notifications.filter(n => n.type === 'profile_view').length },
    { value: 'like', label: t('notifications.page.filters.like'), count: notifications.filter(n => n.type === 'like').length },
    { value: 'message', label: t('notifications.page.filters.message'), count: notifications.filter(n => n.type === 'message').length },
    { value: 'match', label: t('notifications.page.filters.match'), count: notifications.filter(n => n.type === 'match').length },
    { value: 'verification', label: t('notifications.page.filters.verification'), count: notifications.filter(n => n.type === 'verification').length },
    { value: 'system', label: t('notifications.page.filters.system'), count: notifications.filter(n => n.type === 'system' || n.type === 'warning').length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-gray-900">{t('notifications.page.title')}</h1>
              <p className="text-gray-500 text-sm mt-1">
                {t('notifications.page.newNotifications', { count: notifications.filter(n => !n.isRead).length })}
              </p>
            </div>

            {notifications.filter(n => !n.isRead).length > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {t('notifications.page.markAllAsRead')}
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === option.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {option.label}
              {option.count > 0 && (
                <span className={`${i18n.language === 'ar' ? 'mr-2' : 'ml-2'} px-2 py-0.5 rounded-full text-xs ${
                  filter === option.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {option.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">{t('notifications.page.loading')}</p>
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-xl p-5 border transition-all duration-200 hover:shadow-md hover:border-gray-300 cursor-pointer ${
                  !notification.isRead
                    ? i18n.language === 'ar'
                      ? 'border-r-4 border-r-blue-500 shadow-sm'
                      : 'border-l-4 border-l-blue-500 shadow-sm'
                    : 'border-gray-200'
                }`}
                onClick={() => {
                  if (notification.actionUrl) {
                    handleNotificationAction(notification);
                  } else if (!notification.isRead) {
                    handleMarkAsRead(notification.id);
                  }
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      notification.type === 'like' ? 'bg-pink-100' :
                      notification.type === 'message' ? 'bg-green-100' :
                      notification.type === 'profile_view' ? 'bg-blue-100' :
                      notification.type === 'match' ? 'bg-yellow-100' :
                      notification.type === 'alert' ? (
                        notification.alertType === 'warning' ? 'bg-yellow-100' :
                        notification.alertType === 'error' ? 'bg-red-100' :
                        notification.alertType === 'success' ? 'bg-green-100' :
                        notification.alertType === 'announcement' ? 'bg-purple-100' :
                        'bg-blue-100'
                      ) :
                      'bg-gray-100'
                    }`}>
                      {getNotificationIcon(notification.type, notification.alertType)}
                    </div>
                    {!notification.isRead && (
                      <div className={`absolute -top-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white ${i18n.language === 'ar' ? '-left-1' : '-right-1'}`}></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 mb-1">
                          {translateNotificationContent(notification.title, notification.fromUser)}
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {translateNotificationContent(notification.message, notification.fromUser)}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissNotification(notification.id);
                        }}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors p-1.5 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{formatTimeAgo(notification.timestamp)}</span>
                        {notification.fromUser && notification.fromUser.city && (
                          <span>• {notification.fromUser.city}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors"
                          >
                            {t('notifications.markAsRead')}
                          </button>
                        )}

                        {notification.actionUrl && notification.actionText && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotificationAction(notification);
                            }}
                            className="text-xs bg-blue-600 text-white px-4 py-1.5 rounded-full hover:bg-blue-700 transition-colors font-medium"
                          >
                            {translateNotificationContent(notification.actionText || '', notification.fromUser)}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'all' ? t('notifications.page.noNotificationsAtAll') : t('notifications.page.noNotificationsInCategory')}
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                {filter === 'all'
                  ? t('notifications.page.noNotificationsAtAllDesc')
                  : t('notifications.page.noNotificationsCategoryDesc')
                }
              </p>
              {filter === 'all' && (
                <button
                  onClick={() => navigate('/search')}
                  className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {t('notifications.page.startSearching')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
