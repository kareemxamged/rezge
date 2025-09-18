import { supabase } from './supabase';
import { notificationEmailService } from './notificationEmailService';

/**
 * خدمة مراقبة الإشعارات الجديدة وإرسال الإشعارات البريدية التلقائية
 */
class NotificationEmailWatcher {
  private isWatching = false;
  private subscription: any = null;

  /**
   * بدء مراقبة الإشعارات الجديدة
   */
  startWatching(): void {
    if (this.isWatching) {
      console.log('مراقب الإشعارات البريدية يعمل بالفعل');
      return;
    }

    console.log('🔄 بدء مراقبة الإشعارات الجديدة لإرسال الإشعارات البريدية...');

    // مراقبة الإشعارات الجديدة في قاعدة البيانات
    this.subscription = supabase
      .channel('notifications_email_watcher')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          console.log('📧 إشعار جديد تم إنشاؤه:', payload.new);
          this.handleNewNotification(payload.new);
        }
      )
      .subscribe();

    this.isWatching = true;
    console.log('✅ تم بدء مراقبة الإشعارات البريدية بنجاح');
  }

  /**
   * إيقاف مراقبة الإشعارات
   */
  stopWatching(): void {
    if (!this.isWatching) {
      console.log('مراقب الإشعارات البريدية غير نشط');
      return;
    }

    if (this.subscription) {
      supabase.removeChannel(this.subscription);
      this.subscription = null;
    }

    this.isWatching = false;
    console.log('⏹️ تم إيقاف مراقبة الإشعارات البريدية');
  }

  /**
   * معالجة الإشعار الجديد وإرسال الإشعار البريدي
   */
  private async handleNewNotification(notification: any): Promise<void> {
    try {
      console.log(`📨 معالجة إشعار جديد من نوع: ${notification.type}`);

      // تجاهل إشعارات التوثيق والبلاغات (تم إعدادها مسبقاً)
      if (this.shouldSkipNotification(notification.type)) {
        console.log(`⏭️ تخطي إشعار من نوع: ${notification.type} (تم إعداده مسبقاً)`);
        return;
      }

      // جلب بيانات المستخدم المستقبل للإشعار
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', notification.user_id)
        .single();

      if (userError || !user) {
        console.error('❌ خطأ في جلب بيانات المستخدم:', userError);
        return;
      }

      const userName = `${user.first_name} ${user.last_name}`.trim();
      const userEmail = user.email;

      if (!userEmail) {
        console.log('⚠️ لا يوجد بريد إلكتروني للمستخدم');
        return;
      }

      // جلب بيانات المستخدم المرسل (إذا وجد)
      let fromUserData = null;
      if (notification.from_user_id) {
        const { data: fromUser, error: fromUserError } = await supabase
          .from('users')
          .select('first_name, last_name, city, age')
          .eq('id', notification.from_user_id)
          .single();

        if (!fromUserError && fromUser) {
          fromUserData = {
            name: `${fromUser.first_name} ${fromUser.last_name}`.trim(),
            city: fromUser.city,
            age: fromUser.age
          };
        }
      }

      // إرسال الإشعار البريدي حسب نوع الإشعار
      await this.sendEmailNotificationByType(
        notification.type,
        userEmail,
        userName,
        notification,
        fromUserData
      );

      console.log(`✅ تم إرسال إشعار بريدي من نوع ${notification.type} إلى ${userEmail}`);
    } catch (error) {
      console.error('❌ خطأ في معالجة الإشعار الجديد:', error);
    }
  }

  /**
   * تحديد ما إذا كان يجب تخطي الإشعار
   */
  private shouldSkipNotification(notificationType: string): boolean {
    // تخطي إشعارات التوثيق والبلاغات (تم إعدادها مسبقاً)
    const skipTypes = [
      'verification_approved',
      'verification_rejected', 
      'report_received',
      'report_accepted',
      'report_rejected'
    ];

    return skipTypes.includes(notificationType);
  }

  /**
   * إرسال الإشعار البريدي حسب النوع
   */
  private async sendEmailNotificationByType(
    type: string,
    userEmail: string,
    userName: string,
    notification: any,
    fromUserData?: any
  ): Promise<void> {
    try {
      switch (type) {
        case 'profile_view':
          if (fromUserData) {
            await notificationEmailService.sendProfileViewNotification(
              userEmail,
              userName,
              fromUserData.name,
              fromUserData.city,
              fromUserData.age
            );
          }
          break;

        case 'like':
          if (fromUserData) {
            await notificationEmailService.sendLikeNotification(
              userEmail,
              userName,
              fromUserData.name,
              fromUserData.city,
              fromUserData.age
            );
          }
          break;

        case 'message':
          if (fromUserData) {
            await notificationEmailService.sendNewMessageNotification(
              userEmail,
              userName,
              fromUserData.name,
              fromUserData.city,
              fromUserData.age
            );
          }
          break;

        case 'match':
          if (fromUserData) {
            await notificationEmailService.sendMatchNotification(
              userEmail,
              userName,
              fromUserData.name,
              fromUserData.city,
              fromUserData.age
            );
          }
          break;

        case 'system':
          await notificationEmailService.sendSystemNotification(
            userEmail,
            userName,
            notification.title,
            notification.message,
            notification.action_url
          );
          break;

        default:
          // للأنواع الأخرى، استخدم الإشعار النظامي العام
          await notificationEmailService.sendSystemNotification(
            userEmail,
            userName,
            notification.title,
            notification.message,
            notification.action_url
          );
          break;
      }
    } catch (error) {
      console.error(`❌ خطأ في إرسال إشعار بريدي من نوع ${type}:`, error);
    }
  }

  /**
   * إرسال إشعار بريدي لإشعار موجود (للاختبار)
   */
  async sendEmailForExistingNotification(notificationId: string): Promise<boolean> {
    try {
      // جلب الإشعار مع بيانات المستخدمين
      const { data: notification, error } = await supabase
        .from('notifications')
        .select(`
          *,
          user:user_id(email, first_name, last_name),
          from_user:from_user_id(first_name, last_name, city, age)
        `)
        .eq('id', notificationId)
        .single();

      if (error || !notification) {
        console.error('❌ خطأ في جلب الإشعار:', error);
        return false;
      }

      const userName = `${notification.user.first_name} ${notification.user.last_name}`.trim();
      const userEmail = notification.user.email;

      if (!userEmail) {
        console.log('⚠️ لا يوجد بريد إلكتروني للمستخدم');
        return false;
      }

      let fromUserData = null;
      if (notification.from_user) {
        fromUserData = {
          name: `${notification.from_user.first_name} ${notification.from_user.last_name}`.trim(),
          city: notification.from_user.city,
          age: notification.from_user.age
        };
      }

      await this.sendEmailNotificationByType(
        notification.type,
        userEmail,
        userName,
        notification,
        fromUserData
      );

      console.log(`✅ تم إرسال إشعار بريدي للإشعار ${notificationId}`);
      return true;
    } catch (error) {
      console.error('❌ خطأ في إرسال إشعار بريدي للإشعار الموجود:', error);
      return false;
    }
  }

  /**
   * الحصول على حالة المراقبة
   */
  isWatchingActive(): boolean {
    return this.isWatching;
  }
}

export const notificationEmailWatcher = new NotificationEmailWatcher();
