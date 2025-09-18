import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Heart, MessageCircle, Star, Eye, Gift, Info, X } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'profile_view' | 'like' | 'message' | 'match' | 'system' | 'alert';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  actionText?: string;
  fromUser?: {
    id: string;
    name: string;
    city?: string;
    age?: number;
  };
}

interface NotificationCardProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onAction: (notification: Notification) => void;
  onViewAll?: () => void;
  className?: string;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  notifications,
  onMarkAsRead,
  onDismiss,
  onAction,
  onViewAll,
  className = ''
}) => {
  const { t, i18n } = useTranslation();

  // دالة مساعدة لترجمة محتوى الإشعارات
  const translateNotificationContent = (text: string, fromUser?: any) => {
    // إذا كان النص يبدأ بـ notifications. فهو مفتاح ترجمة
    if (text && text.startsWith && text.startsWith('notifications.')) {
      const userName = fromUser?.name || t('common.unknown');
      return t(text, { name: userName });
    }
    return text;
  };
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-pink-600" fill="currentColor" />;
      case 'message':
        return <MessageCircle className="w-4 h-4 text-green-600" />;
      case 'match':
        return <Star className="w-4 h-4 text-yellow-600" fill="currentColor" />;
      case 'profile_view':
        return <Eye className="w-4 h-4 text-blue-600" />;
      case 'system':
        return <Info className="w-4 h-4 text-gray-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };



  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return t('common.now', 'Now');
    if (diffInMinutes < 60) return t('common.minutesAgo', '{{count}} minutes ago', { count: diffInMinutes });

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return t('common.hoursAgo', '{{count}} hours ago', { count: diffInHours });

    const diffInDays = Math.floor(diffInHours / 24);
    return t('common.daysAgo', '{{count}} days ago', { count: diffInDays });
  };

  if (notifications.length === 0) {
    return (
      <div className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 ${className}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-slate-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">{t('notifications.title', 'Notifications')}</h3>
        </div>

        <div className="text-center py-8">
          <Gift className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">{t('notifications.noNotifications', 'No new notifications')}</p>
          <p className="text-slate-400 text-sm">{t('notifications.noNotificationsDesc', 'They will appear here when someone interacts with you')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl p-6 border border-gray-200 ${className}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Bell className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{t('notifications.title', 'Notifications')}</h3>
        </div>

        <div className="flex items-center gap-3">
          {notifications.filter(n => !n.isRead).length > 0 && (
            <span className="bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full font-medium">
              {notifications.filter(n => !n.isRead).length}
            </span>
          )}
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              {t('notifications.viewAll', 'View All')}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-sm hover:border-gray-300 cursor-pointer ${
              !notification.isRead
                ? i18n.language === 'ar'
                  ? 'border-r-4 border-r-blue-500 bg-blue-50/30'
                  : 'border-l-4 border-l-blue-500 bg-blue-50/30'
                : 'border-gray-200 bg-white'
            }`}
            onClick={() => {
              if (notification.actionUrl) {
                onAction(notification);
              } else if (!notification.isRead) {
                onMarkAsRead(notification.id);
              }
            }}
          >
            <div className="flex items-start gap-3">
              <div className="relative">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  notification.type === 'like' ? 'bg-pink-100' :
                  notification.type === 'message' ? 'bg-green-100' :
                  notification.type === 'profile_view' ? 'bg-blue-100' :
                  notification.type === 'match' ? 'bg-yellow-100' :
                  'bg-gray-100'
                }`}>
                  {getNotificationIcon(notification.type)}
                </div>
                {!notification.isRead && (
                  <div className={`absolute -top-0.5 w-2.5 h-2.5 bg-blue-600 rounded-full border border-white ${i18n.language === 'ar' ? '-left-0.5' : '-right-0.5'}`}></div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                      {translateNotificationContent(notification.title, notification.fromUser)}
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                      {translateNotificationContent(notification.message, notification.fromUser)}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(notification.id);
                    }}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors p-1 rounded-full ml-2"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
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
                          onMarkAsRead(notification.id);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
                      >
                        {t('notifications.markAsRead', 'Mark as read')}
                      </button>
                    )}

                    {notification.actionUrl && notification.actionText && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAction(notification);
                        }}
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors font-medium"
                      >
                        {translateNotificationContent(notification.actionText || '', notification.fromUser)}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">{t('notifications.noNotifications', 'No new notifications')}</p>
            <p className="text-gray-500 text-xs">{t('notifications.noNotificationsDesc', 'Notifications will appear here when new activity occurs')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCard;
