import { supabase } from './supabase';
import { alertsService } from './alertsService';
import { notificationEmailService } from './notificationEmailService';
import i18n from '../i18n';

// دالة مساعدة للترجمة
const t = (key: string, options?: any) => {
  return i18n.t(key, options);
};

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
  alertType?: 'info' | 'warning' | 'error' | 'success' | 'announcement';
  priority?: number;
}

class NotificationService {
  /**
   * جلب الإشعارات للمستخدم من قاعدة البيانات
   */
  async getUserNotifications(userId: string, limit: number = 20): Promise<Notification[]> {
    try {
      // جلب الإشعارات من قاعدة البيانات
      const { data: dbNotifications, error } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          title,
          message,
          action_url,
          action_text,
          is_read,
          created_at,
          from_user:from_user_id(
            id,
            first_name,
            last_name,
            city,
            age
          )
        `)
        .eq('user_id', userId)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching notifications from database:', error);
        // في حالة فشل جلب الإشعارات من قاعدة البيانات، نستخدم الطريقة القديمة
        return this.getLegacyNotifications(userId, limit);
      }

      console.log('Fetched notifications from database:', dbNotifications?.length || 0);

      const notifications: Notification[] = [];

      if (dbNotifications) {
        for (const notification of dbNotifications) {
          notifications.push({
            id: notification.id,
            type: notification.type as Notification['type'],
            title: notification.title,
            message: notification.message,
            timestamp: notification.created_at,
            isRead: notification.is_read,
            actionUrl: notification.action_url,
            actionText: notification.action_text,
            fromUser: notification.from_user ? {
              id: (notification.from_user as any).id,
              first_name: (notification.from_user as any).first_name,
              last_name: (notification.from_user as any).last_name,
              name: `${(notification.from_user as any).first_name} ${(notification.from_user as any).last_name}`,
              city: (notification.from_user as any).city,
              age: (notification.from_user as any).age
            } : undefined
          });
        }
      }

      return notifications;

    } catch (error) {
      console.error('Error fetching notifications:', error);
      // في حالة حدوث خطأ، نستخدم الطريقة القديمة
      return this.getLegacyNotifications(userId, limit);
    }
  }

  /**
   * جلب الإشعارات بالطريقة القديمة (احتياطي)
   */
  private async getLegacyNotifications(userId: string, limit: number = 20): Promise<Notification[]> {
    try {
      const notifications: Notification[] = [];

      // جلب مشاهدات الملف الشخصي الحديثة
      const { data: recentViews } = await supabase
        .from('profile_views')
        .select('id, created_at, viewer_id')
        .eq('viewed_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentViews) {
        for (const view of recentViews) {
          const { data: viewer } = await supabase
            .from('users')
            .select('id, first_name, last_name, city, age')
            .eq('id', view.viewer_id)
            .single();

          if (viewer) {
            notifications.push({
              id: `view_${view.id}`,
              type: 'profile_view',
              title: 'notifications.content.profileView.title',
              message: 'notifications.content.profileView.message',
              timestamp: view.created_at,
              isRead: this.isNotificationRead(`view_${view.id}`),
              actionUrl: `/profile/${viewer.id}`,
              actionText: 'notifications.content.profileView.actionText',
              fromUser: {
                id: viewer.id,
                name: `${viewer.first_name} ${viewer.last_name}`,
                city: viewer.city,
                age: viewer.age
              }
            });
          }
        }
      }

      // جلب الإعجابات الحديثة
      const { data: recentLikes } = await supabase
        .from('user_likes')
        .select('id, created_at, liker_id')
        .eq('liked_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentLikes) {
        for (const like of recentLikes) {
          const { data: liker } = await supabase
            .from('users')
            .select('id, first_name, last_name, city, age')
            .eq('id', like.liker_id)
            .single();

          if (liker) {
            notifications.push({
              id: `like_${like.id}`,
              type: 'like',
              title: 'notifications.content.like.title',
              message: 'notifications.content.like.message',
              timestamp: like.created_at,
              isRead: this.isNotificationRead(`like_${like.id}`),
              actionUrl: `/profile/${liker.id}`,
              actionText: 'notifications.content.like.actionText',
              fromUser: {
                id: liker.id,
                name: `${liker.first_name} ${liker.last_name}`,
                city: liker.city,
                age: liker.age
              }
            });
          }
        }
      }

      // جلب الرسائل الحديثة (مؤقت - يمكن تحسينه لاحقاً)
      try {
        const { data: recentMessages } = await supabase
          .from('messages')
          .select('id, created_at, sender_id, content')
          .eq('receiver_id', userId)
          .order('created_at', { ascending: false })
          .limit(3);

        if (recentMessages) {
          for (const message of recentMessages) {
            const { data: sender } = await supabase
              .from('users')
              .select('id, first_name, last_name, city, age')
              .eq('id', message.sender_id)
              .single();

            if (sender) {
              notifications.push({
                id: `message_${message.id}`,
                type: 'message',
                title: 'notifications.content.message.title',
                message: 'notifications.content.message.message',
                timestamp: message.created_at,
                isRead: this.isNotificationRead(`message_${message.id}`),
                actionUrl: `/messages`,
                actionText: 'notifications.content.message.actionText',
                fromUser: {
                  id: sender.id,
                  name: `${sender.first_name} ${sender.last_name}`,
                  city: sender.city,
                  age: sender.age
                }
              });
            }
          }
        }
      } catch (error) {
        console.warn('Messages table not found or error fetching messages:', error);
      }

      // ترتيب الإشعارات حسب التاريخ
      notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return notifications.slice(0, limit);

    } catch (error) {
      console.error('Error fetching legacy notifications:', error);
      return [];
    }
  }



  /**
   * وضع علامة مقروء على إشعار
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      // محاولة تحديث قاعدة البيانات أولاً
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.warn('Failed to update notification in database, using localStorage:', error);
        // في حالة فشل قاعدة البيانات، نستخدم localStorage
        const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');
        if (!readNotifications.includes(notificationId)) {
          readNotifications.push(notificationId);
          localStorage.setItem('readNotifications', JSON.stringify(readNotifications));
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // استخدام localStorage كبديل
      const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');
      if (!readNotifications.includes(notificationId)) {
        readNotifications.push(notificationId);
        localStorage.setItem('readNotifications', JSON.stringify(readNotifications));
      }
    }
  }

  /**
   * التحقق من حالة القراءة (للإشعارات القديمة)
   */
  isNotificationRead(notificationId: string): boolean {
    const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');
    return readNotifications.includes(notificationId);
  }

  /**
   * حذف إشعار
   */
  async dismissNotification(notificationId: string): Promise<void> {
    try {
      // محاولة تحديث قاعدة البيانات أولاً
      const { error } = await supabase
        .from('notifications')
        .update({ is_dismissed: true })
        .eq('id', notificationId);

      if (error) {
        console.warn('Failed to dismiss notification in database, using localStorage:', error);
        // في حالة فشل قاعدة البيانات، نستخدم localStorage
        const dismissedNotifications = JSON.parse(localStorage.getItem('dismissedNotifications') || '[]');
        if (!dismissedNotifications.includes(notificationId)) {
          dismissedNotifications.push(notificationId);
          localStorage.setItem('dismissedNotifications', JSON.stringify(dismissedNotifications));
        }
      }
    } catch (error) {
      console.error('Error dismissing notification:', error);
      // استخدام localStorage كبديل
      const dismissedNotifications = JSON.parse(localStorage.getItem('dismissedNotifications') || '[]');
      if (!dismissedNotifications.includes(notificationId)) {
        dismissedNotifications.push(notificationId);
        localStorage.setItem('dismissedNotifications', JSON.stringify(dismissedNotifications));
      }
    }
  }

  /**
   * التحقق من حالة الحذف (للإشعارات القديمة)
   */
  isNotificationDismissed(notificationId: string): boolean {
    const dismissedNotifications = JSON.parse(localStorage.getItem('dismissedNotifications') || '[]');
    return dismissedNotifications.includes(notificationId);
  }

  /**
   * وضع علامة مقروء على جميع الإشعارات
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  /**
   * جلب التنبيهات كإشعارات للمستخدم
   */
  async getAlertsAsNotifications(userId: string): Promise<Notification[]> {
    try {
      // جلب التنبيهات النشطة للمستخدم
      const { data: alerts, error } = await supabase
        .rpc('get_active_alerts_for_user', { p_user_id: userId });

      if (error) {
        console.error('Error fetching alerts as notifications:', error);
        return [];
      }

      // تحويل التنبيهات إلى إشعارات
      const alertNotifications: Notification[] = (alerts || []).map((alert: any) => ({
        id: `alert_${alert.id}`, // تم تغيير من alert.alert_id إلى alert.id
        type: 'alert' as const,
        title: alert.title,
        message: alert.content,
        timestamp: alert.created_at,
        isRead: alert.is_viewed,
        alertType: alert.alert_type,
        priority: alert.priority,
        fromUser: {
          id: 'system',
          name: alert.created_by_name || 'إدارة المنصة'
        }
      }));

      return alertNotifications;
    } catch (error) {
      console.error('Error in getAlertsAsNotifications:', error);
      return [];
    }
  }

  /**
   * جلب جميع الإشعارات مع التنبيهات
   */
  async getAllNotificationsWithAlerts(userId: string, limit: number = 20): Promise<Notification[]> {
    try {
      // جلب الإشعارات العادية
      const regularNotifications = await this.getUserNotifications(userId, limit);

      // جلب التنبيهات كإشعارات
      const alertNotifications = await this.getAlertsAsNotifications(userId);

      // دمج الإشعارات وترتيبها حسب التاريخ
      const allNotifications = [...regularNotifications, ...alertNotifications];
      allNotifications.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return allNotifications.slice(0, limit);
    } catch (error) {
      console.error('Error in getAllNotificationsWithAlerts:', error);
      return [];
    }
  }

  /**
   * إرسال إشعار بخصوص البلاغات
   */
  async sendReportNotification(
    userId: string,
    type: 'report_received' | 'report_accepted' | 'report_rejected',
    reportId: string,
    additionalData?: any
  ): Promise<void> {
    try {
      // التحقق من وجود reportId
      if (!reportId || reportId.trim() === '') {
        console.error('Error: reportId is empty or undefined');
        throw new Error('معرف البلاغ مطلوب لإرسال الإشعار');
      }
      let title = '';
      let message = '';
      let actionUrl = '';

      switch (type) {
        case 'report_received':
          title = 'notifications.content.reportReceived.title';
          message = 'notifications.content.reportReceived.message';
          actionUrl = `/report/${reportId}`;
          break;
        case 'report_accepted':
          title = 'notifications.content.reportAccepted.title';
          message = 'notifications.content.reportAccepted.message';
          actionUrl = `/report/${reportId}`;
          break;
        case 'report_rejected':
          title = 'notifications.content.reportRejected.title';
          message = 'notifications.content.reportRejected.message';
          actionUrl = `/report/${reportId}`;
          break;
      }

      // إنشاء الإشعار باستخدام الدالة الآمنة
      const { error } = await supabase.rpc('create_system_notification', {
        p_user_id: userId,
        p_type: 'system',
        p_title: title,
        p_message: message,
        p_action_url: actionUrl,
        p_action_text: 'notifications.viewDetails'
      });

      if (error) {
        console.error('Error creating report notification:', error);
        throw error;
      }

      console.log(`Report notification sent to user ${userId} for report ${reportId}`);
    } catch (error) {
      console.error('Error sending report notification:', error);
      throw error;
    }
  }

  /**
   * إرسال إشعار بريدي تلقائي عند إنشاء إشعار جديد
   */
  async sendEmailNotificationForNewNotification(notification: Notification): Promise<void> {
    try {
      // جلب بيانات المستخدم المستقبل للإشعار
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', notification.fromUser?.id || '')
        .single();

      if (userError || !user) {
        console.log('لا يمكن جلب بيانات المستخدم لإرسال الإشعار البريدي');
        return;
      }

      const userName = `${user.first_name} ${user.last_name}`.trim();
      const userEmail = user.email;

      if (!userEmail) {
        console.log('لا يوجد بريد إلكتروني للمستخدم');
        return;
      }

      // إرسال الإشعار البريدي حسب نوع الإشعار
      switch (notification.type) {
        case 'profile_view':
          if (notification.fromUser) {
            await notificationEmailService.sendProfileViewNotification(
              userEmail,
              userName,
              notification.fromUser.name,
              notification.fromUser.city,
              notification.fromUser.age
            );
          }
          break;

        case 'like':
          if (notification.fromUser) {
            await notificationEmailService.sendLikeNotification(
              userEmail,
              userName,
              notification.fromUser.name,
              notification.fromUser.city,
              notification.fromUser.age
            );
          }
          break;

        case 'message':
          if (notification.fromUser) {
            await notificationEmailService.sendNewMessageNotification(
              userEmail,
              userName,
              notification.fromUser.name,
              notification.fromUser.city,
              notification.fromUser.age
            );
          }
          break;

        case 'match':
          if (notification.fromUser) {
            await notificationEmailService.sendMatchNotification(
              userEmail,
              userName,
              notification.fromUser.name,
              notification.fromUser.city,
              notification.fromUser.age
            );
          }
          break;

        case 'system':
          await notificationEmailService.sendSystemNotification(
            userEmail,
            userName,
            notification.title,
            notification.message,
            notification.actionUrl
          );
          break;

        case 'alert':
          await notificationEmailService.sendAlertNotification(
            userEmail,
            userName,
            notification.title,
            notification.message,
            notification.alertType || 'info',
            notification.actionUrl
          );
          break;

        default:
          console.log(`نوع إشعار غير مدعوم للإشعارات البريدية: ${notification.type}`);
      }

      console.log(`تم إرسال إشعار بريدي من نوع ${notification.type} إلى ${userEmail}`);
    } catch (error) {
      console.error('خطأ في إرسال الإشعار البريدي التلقائي:', error);
    }
  }

  /**
   * إرسال تنبيه popup + إشعار للبلاغات
   */
  async sendReportAlertAndNotification(
    userId: string,
    type: 'report_received' | 'report_accepted' | 'report_rejected',
    reportId: string,
    additionalData?: any
  ): Promise<void> {
    try {
      // التحقق من وجود reportId
      if (!reportId || reportId.trim() === '') {
        console.error('Error: reportId is empty or undefined');
        throw new Error('معرف البلاغ مطلوب لإرسال الإشعار');
      }
      let alertTitle = '';
      let alertContent = '';
      let alertType: 'info' | 'warning' | 'error' | 'success' | 'announcement' = 'info';

      switch (type) {
        case 'report_received':
          alertTitle = t('notifications.content.reportReceived.title');
          alertContent = t('notifications.content.reportReceived.fullMessage');
          alertType = 'info';
          break;
        case 'report_accepted':
          alertTitle = t('notifications.content.reportAccepted.title');
          alertContent = t('notifications.content.reportAccepted.fullMessage');
          alertType = 'success';
          break;
        case 'report_rejected':
          alertTitle = t('notifications.content.reportRejected.title');
          alertContent = t('notifications.content.reportRejected.fullMessage', { reason: additionalData?.admin_reason || '' });
          alertType = 'info';
          break;
      }

      // إرسال التنبيه popup
      await alertsService.createAlert({
        title: alertTitle,
        content: alertContent,
        alert_type: alertType,
        priority: 4, // أولوية عالية للبلاغات
        show_as_popup: true,
        auto_dismiss_after: 15, // 15 ثانية
        target_all_users: false,
        target_user_ids: [userId],
        target_user_roles: [],
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // ينتهي خلال 24 ساعة
        metadata: {
          report_id: reportId,
          notification_type: type,
          action_url: `/report/${reportId}`,
          action_text: t('notifications.viewDetails'),
          ...additionalData
        }
      });

      // إرسال الإشعار العادي أيضاً
      await this.sendReportNotification(userId, type, reportId, additionalData);

      console.log(`Report alert and notification sent to user ${userId} for report ${reportId}`);
    } catch (error) {
      console.error('Error sending report alert and notification:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
