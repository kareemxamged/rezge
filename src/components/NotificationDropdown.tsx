import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, X, Eye, EyeOff, Clock, User, Heart, MessageCircle, Shield, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { notificationService } from '../lib/notificationService';
import { useAuth } from '../contexts/AuthContext';

interface Notification {
  id: string;
  type: 'like' | 'message' | 'match' | 'profile_view' | 'verification' | 'system' | 'warning';
  title: string;
  message: string;
  action_url?: string;
  action_text?: string;
  is_read: boolean;
  created_at: string;
  from_user?: {
    id: string;
    first_name: string;
    last_name: string;
    city: string;
    age: number;
  };
}

const NotificationDropdown: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'left' | 'right'>('right');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // جلب الإشعارات عند فتح القائمة
  useEffect(() => {
    if (isOpen && userProfile?.id) {
      fetchNotifications();
    }
  }, [isOpen, userProfile?.id]);

  // جلب عدد الإشعارات غير المقروءة عند تحميل المكون
  useEffect(() => {
    if (userProfile?.id) {
      fetchUnreadCount();
    }
  }, [userProfile?.id]);

  // حساب موضع النافذة المنبثقة
  const calculateDropdownPosition = () => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const dropdownWidth = 384; // عرض النافذة (w-96 = 384px)

    // إذا كانت اللغة عربية، نفضل الجهة اليمنى
    if (i18n.language === 'ar') {
      // تحقق من وجود مساحة كافية على اليمين
      if (buttonRect.right >= dropdownWidth) {
        setDropdownPosition('right');
      } else {
        setDropdownPosition('left');
      }
    } else {
      // للإنجليزية، نفضل الجهة اليسرى
      if (buttonRect.left + dropdownWidth <= windowWidth) {
        setDropdownPosition('left');
      } else {
        setDropdownPosition('right');
      }
    }
  };

  // حساب الموضع عند فتح النافذة
  useEffect(() => {
    if (isOpen) {
      calculateDropdownPosition();
    }
  }, [isOpen, i18n.language]);

  const fetchNotifications = async () => {
    if (!userProfile?.id) return;
    
    setLoading(true);
    try {
      const fetchedNotifications = await notificationService.getUserNotifications(userProfile.id, 5);
      setNotifications(fetchedNotifications);
      
      // حساب عدد الإشعارات غير المقروءة
      const unread = fetchedNotifications.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!userProfile?.id) return;
    
    try {
      const allNotifications = await notificationService.getUserNotifications(userProfile.id, 50);
      const unread = allNotifications.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      await notificationService.dismissNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // تقليل العدد إذا كان الإشعار غير مقروء
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'message':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'match':
        return <Heart className="w-4 h-4 text-pink-500" />;
      case 'profile_view':
        return <Eye className="w-4 h-4 text-green-500" />;
      case 'verification':
      case 'verification_approved':
        return <Shield className="w-4 h-4 text-green-500" />;
      case 'verification_rejected':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'report_accepted':
        return <Shield className="w-4 h-4 text-green-500" />;
      case 'report_rejected':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'report_received':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'system':
        return <Bell className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  // دالة ترجمة النصوص الثابتة
  const translateText = (text: string, fromUser?: any) => {
    if (!text) return text;

    // تسجيل للتشخيص (يمكن إزالته لاحقاً)
    if ((text.includes('بلاغ') || text.includes('توثيق')) && !text.startsWith('notifications.')) {
      console.log('Translating notification text:', text);
    }

    const textMappings: { [key: string]: string } = {
      // إشعارات البلاغات - جميع الاحتمالات
      'تم قبول بلاغك': 'notifications.content.reportAccepted.title',
      'تم مراجعة بلاغك': 'notifications.content.reportRejected.title',
      'تم استلام بلاغك': 'notifications.content.reportReceived.title',
      'تم رفض البلاغ': 'notifications.content.reportRejected.title',
      'تم قبول البلاغ': 'notifications.content.reportAccepted.title',
      'تم رفض بلاغك': 'notifications.content.reportRejected.title',
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
      'إعادة المحاولة': 'notifications.retry',
      'عرض التفاصيل': 'notifications.viewDetails',
      // محتوى إشعارات التوثيق
      'تهانينا! تم توثيق هويتك الشخصية بنجاح. يمكنك الآن الاستفادة من جميع مميزات الموقع.': 'notifications.content.verificationApproved.message',
      'تم رفض طلب توثيق هويتك. يرجى المحاولة مرة أخرى.': 'notifications.content.verificationRejected.message',
      // نصوص إضافية للتوثيق
      'تم رفض طلب توثيق هويتك.': 'notifications.content.verificationRejected.message'
    };

    // البحث عن مطابقة مباشرة
    if (textMappings[text]) {
      return t(textMappings[text]);
    }

    // إذا كان النص مفتاح ترجمة (يبدأ بـ notifications.)
    if (text.startsWith('notifications.')) {
      // إذا كان هناك مستخدم مرسل، استخدم اسمه في الترجمة
      if (fromUser && (text.includes('like') || text.includes('profileView') || text.includes('message') || text.includes('match'))) {
        const userName = `${fromUser.first_name} ${fromUser.last_name}`;
        return t(text, { name: userName });
      }
      return t(text);
    }

    // معالجة النصوص القديمة التي تحتوي على {{name}}
    if (text.includes('{{name}}') && fromUser) {
      const userName = `${fromUser.first_name} ${fromUser.last_name}`;
      return text.replace(/\{\{name\}\}/g, userName);
    }

    // معالجة النصوص القديمة بأنماط مختلفة
    if (fromUser) {
      const userName = `${fromUser.first_name} ${fromUser.last_name}`;

      // أنماط مختلفة للنصوص القديمة
      const patterns = [
        { pattern: /أعجب .* بملفك/, replacement: `أعجب ${userName} بملفك الشخصي` },
        { pattern: /شاهد .* ملفك/, replacement: `شاهد ${userName} ملفك الشخصي` },
        { pattern: /أرسل .* رسالة/, replacement: `أرسل ${userName} رسالة جديدة` },
        { pattern: /مطابقة جديدة مع .*/, replacement: `مبروك! لديك مطابقة جديدة مع ${userName}` }
      ];

      for (const { pattern, replacement } of patterns) {
        if (pattern.test(text)) {
          return replacement;
        }
      }
    }

    // معالجة النصوص التي تحتوي على متغيرات
    if (text.includes('{{reason}}')) {
      // استخراج السبب من النص
      const reason = text.match(/السبب:\s*(.+)/)?.[1] || '';

      if (text.includes('تم مراجعة بلاغك من قبل فريق الإشراف')) {
        return t('notifications.content.reportRejected.message', { reason });
      }

      if (text.includes('تم رفض طلب توثيق هويتك')) {
        return t('notifications.content.verificationRejected.message', { reason });
      }

      // للإشعارات التي تحتوي على {{reason}} بدون سبب واضح، نستخدم الرسالة البسيطة
      if (text.includes('توثيق')) {
        return t('notifications.content.verificationRejected.message');
      }

      if (text.includes('بلاغ')) {
        return t('notifications.content.reportRejected.message');
      }

      // إذا كان النص يحتوي على {{reason}} ولكن لا يوجد سبب فعلي، نزيل المتغير
      return text.replace('{{reason}}', '').trim();
    }

    // البحث عن مطابقات جزئية للنصوص الديناميكية
    if (text.includes('أرسل لك') && text.includes('رسالة جديدة')) {
      const userName = text.match(/أرسل لك (.+?) رسالة/)?.[1] || '';
      return t('notifications.content.message.message', { name: userName });
    }

    if (text.includes('أعجب') && text.includes('بملفك الشخصي')) {
      const userName = text.match(/أعجب (.+?) بملفك/)?.[1] || '';
      return t('notifications.content.like.message', { name: userName });
    }

    if (text.includes('شاهد') && text.includes('ملفك الشخصي')) {
      const userName = text.match(/شاهد (.+?) ملفك/)?.[1] || '';
      return t('notifications.content.profileView.message', { name: userName });
    }

    // البحث عن مطابقات جزئية للبلاغات - العناوين
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

    // البحث عن مطابقات جزئية للبلاغات - المحتوى
    if (text.includes('تم مراجعة بلاغك وقبوله من قبل فريق الإشراف')) {
      return t('notifications.content.reportAccepted.message');
    }

    if (text.includes('تم مراجعة بلاغك وقررنا عدم اتخاذ إجراء')) {
      return t('notifications.content.reportRejected.message');
    }

    if (text.includes('شكراً لك على تقديم البلاغ')) {
      return t('notifications.content.reportReceived.message');
    }

    if (text.includes('تم استلام بلاغك وجاري مراجعته')) {
      return t('notifications.content.reportReceived.message');
    }

    if (text.includes('سيتم اتخاذ الإجراء المناسب')) {
      return t('notifications.content.reportAccepted.message');
    }

    if (text.includes('شكراً لك على اهتمامك بسلامة المجتمع')) {
      return t('notifications.content.reportRejected.message');
    }

    // معالجة النصوص الطويلة للبلاغات
    if (text.includes('تم قبول بلاغك وسيتم اتخاذ الإجراء المناسب في أقرب وقت')) {
      return t('notifications.content.reportAccepted.message');
    }

    if (text.includes('تم مراجعة بلاغك من قبل فريق الإشراف') && text.includes('عدم اتخاذ إجراء')) {
      return t('notifications.content.reportRejected.message');
    }

    if (text.includes('سنقوم بإشعارك بالنتيجة في أقرب وقت ممكن')) {
      return t('notifications.content.reportReceived.message');
    }

    // مطابقات لمحتوى إشعارات التوثيق
    if (text.includes('تهانينا! تم توثيق هويتك الشخصية بنجاح')) {
      return t('notifications.content.verificationApproved.message');
    }

    if (text.includes('تم رفض طلب توثيق هويتك')) {
      return t('notifications.content.verificationRejected.message');
    }

    if (text.includes('توثيق هويتك الشخصية بنجاح')) {
      return t('notifications.content.verificationApproved.message');
    }

    if (text.includes('رفض طلب توثيق') || (text.includes('توثيق') && text.includes('رفض'))) {
      return t('notifications.content.verificationRejected.message');
    }

    // مطابقات أكثر مرونة للمحتوى
    if (text.includes('مراجعة') && text.includes('بلاغ') && text.includes('قبول')) {
      return t('notifications.content.reportAccepted.message');
    }

    if (text.includes('مراجعة') && text.includes('بلاغ') && text.includes('عدم اتخاذ')) {
      return t('notifications.content.reportRejected.message');
    }

    if (text.includes('استلام') && text.includes('بلاغ') && text.includes('مراجعة')) {
      return t('notifications.content.reportReceived.message');
    }

    // مطابقات للكلمات المفتاحية
    if (text.includes('فريق الإشراف') && text.includes('بلاغ')) {
      if (text.includes('قبول') || text.includes('اتخاذ الإجراء')) {
        return t('notifications.content.reportAccepted.message');
      } else if (text.includes('عدم اتخاذ') || text.includes('رفض')) {
        return t('notifications.content.reportRejected.message');
      } else {
        return t('notifications.content.reportReceived.message');
      }
    }

    // محاولة أخيرة للمطابقة بناءً على الكلمات المفتاحية
    if (text.includes('بلاغ')) {
      if (text.includes('قبول') || text.includes('موافق')) {
        return t('notifications.content.reportAccepted.message');
      } else if (text.includes('رفض') || text.includes('عدم')) {
        return t('notifications.content.reportRejected.message');
      } else if (text.includes('استلام') || text.includes('تقديم')) {
        return t('notifications.content.reportReceived.message');
      }
    }

    // مطابقة احتياطية لإشعارات التوثيق
    if (text.includes('توثيق')) {
      if (text.includes('بنجاح') || text.includes('تهانينا')) {
        return t('notifications.content.verificationApproved.message');
      } else if (text.includes('رفض') || text.includes('فشل')) {
        return t('notifications.content.verificationRejected.message');
      }
    }

    // إذا لم توجد مطابقة، إرجاع النص الأصلي
    return text;
  };

  const formatTimeAgo = (dateString: string) => {
    // التحقق من صحة التاريخ
    if (!dateString) return t('notifications.justNow');

    const date = new Date(dateString);

    // التحقق من أن التاريخ صحيح
    if (isNaN(date.getTime())) {
      // محاولة تحويل التاريخ بطرق مختلفة
      const fallbackDate = new Date(dateString.replace(/[-]/g, '/'));
      if (isNaN(fallbackDate.getTime())) {
        return t('notifications.justNow'); // إذا فشل التحويل، نعرض "الآن"
      }
      return formatValidDate(fallbackDate);
    }

    return formatValidDate(date);
  };

  const formatValidDate = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return t('notifications.justNow');
    if (diffInMinutes < 60) return t('notifications.minutesAgo', { count: diffInMinutes });

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return t('notifications.hoursAgo', { count: diffInHours });

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return t('notifications.daysAgo', { count: diffInDays });

    // عرض التاريخ الميلادي دائماً
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* أيقونة الإشعارات */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-primary-600 hover:bg-slate-50 rounded-lg transition-colors duration-200"
        aria-label={t('notifications.title')}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* القائمة المنبثقة */}
      {isOpen && (
        <div className={`
          fixed inset-x-8 top-14 max-h-[65vh] flex flex-col w-auto
          sm:inset-x-auto sm:top-16 sm:max-h-[70vh] sm:w-64 sm:mx-auto sm:left-1/2 sm:transform sm:-translate-x-1/2
          md:absolute md:top-full md:mt-2 md:max-h-80 md:w-[28rem] md:transform-none md:translate-x-0 md:mx-0
          lg:w-[30rem]
          bg-white rounded-xl shadow-lg border border-slate-200 z-50
          ${dropdownPosition === 'right' ? 'md:right-0 md:left-auto' : 'md:left-0 md:right-auto'}
        `}>
          {/* رأس القائمة */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800">
              {t('notifications.title')}
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* محتوى القائمة */}
          <div className="flex-1 overflow-y-auto min-h-0 max-h-40 sm:max-h-48 md:max-h-64 lg:max-h-72 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center p-8 text-slate-500">
                <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>{t('notifications.empty')}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 sm:p-4 hover:bg-slate-50 transition-colors ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* أيقونة نوع الإشعار */}
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* محتوى الإشعار */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-slate-800 mb-1">
                              {translateText(notification.title, notification.fromUser)}
                            </h4>
                            <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                              {translateText(notification.message, notification.fromUser)}
                            </p>
                            
                            {/* معلومات المرسل */}
                            {notification.fromUser && (
                              <div className="flex items-center gap-1 text-xs text-slate-500 mb-1 sm:mb-2">
                                <User className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">
                                  {notification.fromUser.first_name} {notification.fromUser.last_name}
                                  <span className="hidden sm:inline">
                                    {notification.fromUser.city && ` - ${notification.fromUser.city}`}
                                    {notification.fromUser.age && ` - ${notification.fromUser.age} سنة`}
                                  </span>
                                </span>
                              </div>
                            )}

                            {/* وقت الإشعار */}
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              <span>{formatTimeAgo(notification.created_at)}</span>
                            </div>
                          </div>

                          {/* أزرار التحكم */}
                          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                            {!notification.is_read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                                title={t('notifications.markAsRead')}
                              >
                                <EyeOff className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => dismissNotification(notification.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                              title={t('notifications.dismiss')}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* رابط العمل */}
                        {notification.action_url && notification.action_text && (
                          <Link
                            to={notification.action_url}
                            onClick={() => {
                              if (!notification.is_read) {
                                markAsRead(notification.id);
                              }
                              setIsOpen(false);
                            }}
                            className="inline-block mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            {translateText(notification.action_text)}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* تذييل القائمة */}
          {notifications.length > 0 && (
            <div className="p-2 sm:p-3 border-t border-slate-100 flex-shrink-0">
              <Link
                to="/notifications"
                onClick={() => setIsOpen(false)}
                className="block w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-2 rounded-lg hover:bg-primary-50 transition-colors"
              >
                {t('notifications.viewAll')}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
