import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userPresenceService, type UserPresenceStatus } from '../lib/userPresenceService';

/**
 * Hook لإدارة حالة المستخدم وحالة الكتابة
 */
export const useUserPresence = () => {
  const { userProfile } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const initializationRef = useRef(false);

  // بدء تتبع حالة المستخدم
  useEffect(() => {
    if (userProfile?.id && !initializationRef.current) {
      initializationRef.current = true;
      
      const initializePresence = async () => {
        try {
          await userPresenceService.startPresenceTracking(userProfile.id);
          setIsInitialized(true);
          console.log('✅ User presence tracking started for:', userProfile.id);
        } catch (error) {
          console.error('❌ Error starting presence tracking:', error);
        }
      };

      initializePresence();
    }

    // تنظيف عند إلغاء التحميل
    return () => {
      if (initializationRef.current) {
        userPresenceService.stopPresenceTracking();
        initializationRef.current = false;
        setIsInitialized(false);
      }
    };
  }, [userProfile?.id]);

  // تحديث آخر نشاط للمستخدم
  const updateLastSeen = useCallback(async () => {
    if (userProfile?.id && isInitialized) {
      await userPresenceService.updateUserLastSeen(userProfile.id);
    }
  }, [userProfile?.id, isInitialized]);

  // تحديث حالة الاتصال
  const updateOnlineStatus = useCallback(async (status: 'online' | 'offline' | 'away') => {
    if (userProfile?.id && isInitialized) {
      await userPresenceService.updateUserOnlineStatus(userProfile.id, status);
    }
  }, [userProfile?.id, isInitialized]);

  return {
    isInitialized,
    updateLastSeen,
    updateOnlineStatus
  };
};

/**
 * Hook للحصول على حالة مستخدم معين
 */
export const useUserStatus = (userId: string | null) => {
  const [userStatus, setUserStatus] = useState<UserPresenceStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUserStatus = useCallback(async () => {
    if (!userId) {
      setUserStatus(null);
      return;
    }

    setLoading(true);
    try {
      const status = await userPresenceService.getUserPresenceStatus(userId);
      setUserStatus(status);
    } catch (error) {
      console.error('Error fetching user status:', error);
      setUserStatus(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserStatus();
  }, [fetchUserStatus]);

  // تحديث الحالة كل 30 ثانية
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(fetchUserStatus, 30000);
    return () => clearInterval(interval);
  }, [userId, fetchUserStatus]);

  return {
    userStatus,
    loading,
    refetch: fetchUserStatus
  };
};

/**
 * Hook لإدارة حالة الكتابة في المحادثة
 */
export const useTypingStatus = (conversationId: string | null) => {
  const { userProfile } = useAuth();
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionRef = useRef<any>(null);

  // بدء الكتابة
  const startTyping = useCallback(async () => {
    if (!conversationId || !userProfile?.id || isTyping) return;

    setIsTyping(true);
    await userPresenceService.updateTypingStatus(conversationId, userProfile.id, true);

    // إيقاف الكتابة تلقائياً بعد 3 ثوان من عدم النشاط
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(async () => {
      await stopTyping();
    }, 3000);
  }, [conversationId, userProfile?.id, isTyping]);

  // إيقاف الكتابة
  const stopTyping = useCallback(async () => {
    if (!conversationId || !userProfile?.id || !isTyping) return;

    setIsTyping(false);
    await userPresenceService.updateTypingStatus(conversationId, userProfile.id, false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [conversationId, userProfile?.id, isTyping]);

  // الاشتراك في تحديثات حالة الكتابة
  useEffect(() => {
    if (!conversationId || !userProfile?.id) {
      setOtherUserTyping(false);
      return;
    }

    // إلغاء الاشتراك السابق
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // اشتراك جديد
    subscriptionRef.current = userPresenceService.subscribeToTypingUpdates(
      conversationId,
      (payload) => {
        if (payload.new) {
          const { user1_id, user2_id, user1_typing, user2_typing } = payload.new;
          
          // تحديد المستخدم الآخر وحالة الكتابة الخاصة به
          if (userProfile.id === user1_id) {
            setOtherUserTyping(user2_typing || false);
          } else if (userProfile.id === user2_id) {
            setOtherUserTyping(user1_typing || false);
          }
        }
      }
    );

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [conversationId, userProfile?.id]);

  // تنظيف عند إلغاء التحميل
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping && conversationId && userProfile?.id) {
        userPresenceService.updateTypingStatus(conversationId, userProfile.id, false);
      }
    };
  }, []);

  return {
    isTyping,
    otherUserTyping,
    startTyping,
    stopTyping
  };
};

/**
 * Hook لتنسيق نص حالة المستخدم
 */
export const useUserStatusText = () => {
  const formatUserStatus = useCallback((
    presence: UserPresenceStatus | null,
    t: (key: string, options?: any) => string
  ): string => {
    if (!presence) {
      return t('messages.member'); // "عضو في الموقع"
    }

    return userPresenceService.formatUserStatus(presence, t);
  }, []);

  return { formatUserStatus };
};

/**
 * Hook لتتبع حالة عدة مستخدمين في قائمة المحادثات
 */
export const useMultipleUserStatus = (userIds: string[]) => {
  const [userStatuses, setUserStatuses] = useState<Record<string, UserPresenceStatus | null>>({});
  const [loading, setLoading] = useState(false);

  const fetchUserStatuses = useCallback(async () => {
    if (userIds.length === 0) {
      setUserStatuses({});
      return;
    }

    setLoading(true);
    try {
      const statuses: Record<string, UserPresenceStatus | null> = {};

      // جلب حالة كل مستخدم
      await Promise.all(
        userIds.map(async (userId) => {
          try {
            const status = await userPresenceService.getUserPresenceStatus(userId);
            statuses[userId] = status;
          } catch (error) {
            console.error(`Error fetching status for user ${userId}:`, error);
            statuses[userId] = null;
          }
        })
      );

      setUserStatuses(statuses);
    } catch (error) {
      console.error('Error fetching multiple user statuses:', error);
    } finally {
      setLoading(false);
    }
  }, [userIds]);

  useEffect(() => {
    fetchUserStatuses();
  }, [fetchUserStatuses]);

  // تحديث الحالات كل 30 ثانية
  useEffect(() => {
    if (userIds.length === 0) return;

    const interval = setInterval(fetchUserStatuses, 30000);
    return () => clearInterval(interval);
  }, [userIds, fetchUserStatuses]);

  return {
    userStatuses,
    loading,
    refetch: fetchUserStatuses
  };
};
