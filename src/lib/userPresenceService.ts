import { supabase } from './supabase';

/**
 * خدمة إدارة حالة المستخدمين وحالة الكتابة
 * User Presence and Typing Status Service
 */

// تعريف الواجهات
interface UserPresenceStatus {
  status: 'online' | 'offline' | 'away';
  lastSeenMinutesAgo: number;
  isOnline: boolean;
}

interface TypingStatus {
  isTyping: boolean;
  conversationId: string;
  userId: string;
}

class UserPresenceService {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private currentUserId: string | null = null;

  /**
   * بدء تتبع حالة المستخدم
   */
  async startPresenceTracking(userId: string): Promise<void> {
    this.currentUserId = userId;
    
    // تحديث حالة المستخدم إلى متصل
    await this.updateUserOnlineStatus(userId, 'online');
    
    // بدء heartbeat كل 30 ثانية لتحديث آخر نشاط
    this.heartbeatInterval = setInterval(async () => {
      await this.updateUserLastSeen(userId);
    }, 30000);

    // تحديث الحالة عند إغلاق النافذة
    window.addEventListener('beforeunload', () => {
      this.stopPresenceTracking();
    });

    // تحديث الحالة عند فقدان التركيز (المستخدم غادر التطبيق)
    document.addEventListener('visibilitychange', async () => {
      if (document.hidden) {
        await this.updateUserOnlineStatus(userId, 'away');
      } else {
        await this.updateUserOnlineStatus(userId, 'online');
        await this.updateUserLastSeen(userId);
      }
    });
  }

  /**
   * إيقاف تتبع حالة المستخدم
   */
  async stopPresenceTracking(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // تنظيف جميع timeouts الكتابة
    this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.typingTimeouts.clear();

    if (this.currentUserId) {
      await this.updateUserOnlineStatus(this.currentUserId, 'offline');
      this.currentUserId = null;
    }
  }

  /**
   * تحديث آخر نشاط للمستخدم
   */
  async updateUserLastSeen(userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_user_last_seen', {
        user_id: userId
      });

      if (error) {
        console.error('Error updating user last seen:', error);
      }
    } catch (error) {
      console.error('Error updating user last seen:', error);
    }
  }

  /**
   * تحديث حالة الاتصال للمستخدم
   */
  async updateUserOnlineStatus(userId: string, status: 'online' | 'offline' | 'away'): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_user_online_status', {
        user_id: userId,
        new_status: status
      });

      if (error) {
        console.error('Error updating user online status:', error);
      }
    } catch (error) {
      console.error('Error updating user online status:', error);
    }
  }

  /**
   * الحصول على حالة نشاط المستخدم
   */
  async getUserPresenceStatus(userId: string): Promise<UserPresenceStatus | null> {
    try {
      const { data, error } = await supabase.rpc('get_user_activity_status', {
        user_id: userId
      });

      if (error) {
        console.error('Error getting user presence status:', error);
        return null;
      }

      if (data && data.length > 0) {
        const result = data[0];
        return {
          status: result.status,
          lastSeenMinutesAgo: result.last_seen_minutes_ago,
          isOnline: result.is_online
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting user presence status:', error);
      return null;
    }
  }

  /**
   * تحديث حالة الكتابة في المحادثة
   */
  async updateTypingStatus(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_typing_status', {
        conversation_id: conversationId,
        user_id: userId,
        is_typing: isTyping
      });

      if (error) {
        console.error('Error updating typing status:', error);
        return;
      }

      // إذا بدأ المستخدم في الكتابة، قم بإعداد timeout لإيقاف الكتابة تلقائياً بعد 3 ثوان
      const timeoutKey = `${conversationId}-${userId}`;
      
      if (isTyping) {
        // إلغاء timeout السابق إن وجد
        if (this.typingTimeouts.has(timeoutKey)) {
          clearTimeout(this.typingTimeouts.get(timeoutKey)!);
        }

        // إعداد timeout جديد
        const timeout = setTimeout(async () => {
          await this.updateTypingStatus(conversationId, userId, false);
          this.typingTimeouts.delete(timeoutKey);
        }, 3000);

        this.typingTimeouts.set(timeoutKey, timeout);
      } else {
        // إلغاء timeout عند إيقاف الكتابة يدوياً
        if (this.typingTimeouts.has(timeoutKey)) {
          clearTimeout(this.typingTimeouts.get(timeoutKey)!);
          this.typingTimeouts.delete(timeoutKey);
        }
      }
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }

  /**
   * تنظيف حالات الكتابة المنتهية الصلاحية
   */
  async cleanupExpiredTypingStatus(): Promise<void> {
    try {
      const { error } = await supabase.rpc('cleanup_expired_typing_status');

      if (error) {
        console.error('Error cleaning up expired typing status:', error);
      }
    } catch (error) {
      console.error('Error cleaning up expired typing status:', error);
    }
  }

  /**
   * تنسيق نص حالة المستخدم للعرض
   */
  formatUserStatus(presence: UserPresenceStatus, t: (key: string, options?: any) => string): string {
    if (presence.isOnline) {
      return t('messages.userStatus.online'); // "نشط الآن"
    }

    const minutes = presence.lastSeenMinutesAgo;
    
    if (minutes < 1) {
      return t('messages.userStatus.justNow'); // "نشط منذ لحظات"
    } else if (minutes < 60) {
      return t('messages.userStatus.minutesAgo', { count: minutes }); // "نشط منذ {count} دقيقة"
    } else if (minutes < 1440) { // أقل من 24 ساعة
      const hours = Math.floor(minutes / 60);
      return t('messages.userStatus.hoursAgo', { count: hours }); // "نشط منذ {count} ساعة"
    } else {
      const days = Math.floor(minutes / 1440);
      return t('messages.userStatus.daysAgo', { count: days }); // "نشط منذ {count} يوم"
    }
  }

  /**
   * الاشتراك في تحديثات حالة الكتابة للمحادثة
   */
  subscribeToTypingUpdates(conversationId: string, callback: (data: any) => void) {
    const subscription = supabase
      .channel(`typing-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        },
        callback
      )
      .subscribe();

    return subscription;
  }

  /**
   * الاشتراك في تحديثات حالة المستخدم
   */
  subscribeToPresenceUpdates(userId: string, callback: (data: any) => void) {
    const subscription = supabase
      .channel(`presence-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`
        },
        callback
      )
      .subscribe();

    return subscription;
  }
}

// إنشاء instance واحد للخدمة
const userPresenceService = new UserPresenceService();

// تصدير جميع المكونات
export {
  UserPresenceService,
  userPresenceService,
  type UserPresenceStatus,
  type TypingStatus
};
