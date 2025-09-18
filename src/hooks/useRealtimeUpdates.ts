import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeUpdatesOptions {
  table: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  filter?: string;
  enabled?: boolean;
}

export const useRealtimeUpdates = ({
  table,
  onInsert,
  onUpdate,
  onDelete,
  filter,
  enabled = true
}: UseRealtimeUpdatesOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);

  const subscribe = useCallback(() => {
    if (!enabled || isSubscribedRef.current) return;

    try {
      // إنشاء قناة فريدة لكل جدول
      const channelName = `${table}_changes_${Date.now()}`;
      channelRef.current = supabase.channel(channelName);

      // إعداد المستمعين للتغييرات
      let subscription = channelRef.current.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filter
        },
        (payload) => {
          console.log(`🔄 Real-time update for ${table}:`, payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload);
              break;
            case 'UPDATE':
              onUpdate?.(payload);
              break;
            case 'DELETE':
              onDelete?.(payload);
              break;
          }
        }
      );

      // الاشتراك في القناة
      channelRef.current.subscribe((status) => {
        console.log(`📡 Subscription status for ${table}:`, status);
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
        }
      });

    } catch (error) {
      console.error(`❌ Error subscribing to ${table} changes:`, error);
    }
  }, [table, onInsert, onUpdate, onDelete, filter, enabled]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current && isSubscribedRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
        console.log(`🔌 Unsubscribed from ${table} changes`);
      } catch (error) {
        console.error(`❌ Error unsubscribing from ${table}:`, error);
      }
    }
  }, [table]);

  useEffect(() => {
    if (enabled) {
      subscribe();
    } else {
      unsubscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [subscribe, unsubscribe, enabled]);

  return {
    subscribe,
    unsubscribe,
    isSubscribed: isSubscribedRef.current
  };
};

// Hook مخصص لإدارة المستخدمين مع التحديث التلقائي
export const useUsersRealtimeUpdates = (
  onDataChange: () => void,
  enabled: boolean = true
) => {
  // استخدام useRef لتجنب إعادة الاشتراك عند تغيير الدالة
  const onDataChangeRef = useRef(onDataChange);

  // تحديث المرجع عند تغيير الدالة
  useEffect(() => {
    onDataChangeRef.current = onDataChange;
  });

  const handleUserChange = useCallback((payload: any) => {
    // تحديث البيانات بشكل سلس دون loading
    if (typeof onDataChangeRef.current === 'function') {
      setTimeout(() => {
        try {
          onDataChangeRef.current();
        } catch (error) {
          console.error('❌ Error in onDataChange callback:', error);
        }
      }, 100); // تأخير بسيط لضمان اكتمال العملية في قاعدة البيانات
    }
  }, []); // مصفوفة فارغة لأن الدالة مستقرة الآن

  // مراقبة تغييرات جدول المستخدمين
  const usersUpdates = useRealtimeUpdates({
    table: 'users',
    onInsert: handleUserChange,
    onUpdate: handleUserChange,
    onDelete: handleUserChange,
    enabled
  });

  // مراقبة تغييرات جدول البلاغات
  const reportsUpdates = useRealtimeUpdates({
    table: 'reports',
    onInsert: handleUserChange,
    onUpdate: handleUserChange,
    onDelete: handleUserChange,
    enabled
  });

  // مراقبة تغييرات جدول الإجراءات الإدارية
  const adminActionsUpdates = useRealtimeUpdates({
    table: 'admin_actions',
    onInsert: handleUserChange,
    onUpdate: handleUserChange,
    onDelete: handleUserChange,
    enabled
  });

  return {
    usersUpdates,
    reportsUpdates,
    adminActionsUpdates
  };
};

// Hook للإحصائيات مع التحديث التلقائي
export const useStatsRealtimeUpdates = (
  onStatsChange: () => void,
  enabled: boolean = true
) => {
  // استخدام useRef لتجنب إعادة الاشتراك عند تغيير الدالة
  const onStatsChangeRef = useRef(onStatsChange);

  // تحديث المرجع عند تغيير الدالة
  useEffect(() => {
    onStatsChangeRef.current = onStatsChange;
  });

  const handleStatsChange = useCallback((payload: any) => {
    // تحديث الإحصائيات بشكل سلس
    if (typeof onStatsChangeRef.current === 'function') {
      setTimeout(() => {
        try {
          onStatsChangeRef.current();
        } catch (error) {
          console.error('❌ Error in onStatsChange callback:', error);
        }
      }, 150);
    }
  }, []); // مصفوفة فارغة لأن الدالة مستقرة الآن

  return useRealtimeUpdates({
    table: 'users',
    onInsert: handleStatsChange,
    onUpdate: handleStatsChange,
    onDelete: handleStatsChange,
    enabled
  });
};

export default useRealtimeUpdates;
