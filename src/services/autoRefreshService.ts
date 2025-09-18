import React from 'react';
import { supabase } from '../lib/supabase';

export interface RefreshableData {
  users: any[];
  stats: {
    totalUsers: number;
    activeUsers: number;
    blockedUsers: number;
    pendingReports: number;
    verifiedUsers: number;
    newUsersToday: number;
  };
  reports: any[];
  adminActions: any[];
}

class AutoRefreshService {
  private refreshCallbacks: Map<string, () => void> = new Map();
  private isInitialized = false;
  private refreshInterval: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private lastRefreshTime = 0;
  private readonly MIN_REFRESH_INTERVAL = 5000; // 5 ثوانٍ على الأقل بين التحديثات

  // تسجيل callback للتحديث
  registerRefreshCallback(key: string, callback: () => void) {
    // فحص إذا كان مسجل بالفعل لتجنب التسجيل المتكرر
    if (this.refreshCallbacks.has(key)) {
      console.log(`⏭️ Callback already registered: ${key}`);
      return;
    }

    this.refreshCallbacks.set(key, callback);
    console.log(`📝 Registered refresh callback: ${key}`);
  }

  // إلغاء تسجيل callback
  unregisterRefreshCallback(key: string) {
    if (this.refreshCallbacks.has(key)) {
      this.refreshCallbacks.delete(key);
      console.log(`🗑️ Unregistered refresh callback: ${key}`);
    } else {
      console.log(`⏭️ Callback not found for unregistration: ${key}`);
    }
  }

  // تحديث جميع البيانات المسجلة
  async refreshAll() {
    // منع التحديث المتكرر
    const now = Date.now();
    if (this.isRefreshing || (now - this.lastRefreshTime) < this.MIN_REFRESH_INTERVAL) {
      console.log('⏭️ Skipping refresh - too frequent or already running');
      return;
    }

    this.isRefreshing = true;
    this.lastRefreshTime = now;

    try {
      console.log('🔄 Auto-refreshing all registered data...');

      for (const [key, callback] of this.refreshCallbacks) {
        try {
          if (typeof callback === 'function') {
            await callback();
            console.log(`✅ Refreshed: ${key}`);
          }
        } catch (error) {
          console.error(`❌ Error refreshing ${key}:`, error);
        }
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  // تحديث بيانات محددة
  async refreshSpecific(key: string) {
    const callback = this.refreshCallbacks.get(key);
    if (callback) {
      try {
        await callback();
        console.log(`✅ Refreshed specific: ${key}`);
      } catch (error) {
        console.error(`❌ Error refreshing ${key}:`, error);
      }
    }
  }

  // جلب إحصائيات محدثة
  async fetchFreshStats(): Promise<RefreshableData['stats']> {
    try {
      const [
        totalUsersResult,
        activeUsersResult,
        blockedUsersResult,
        pendingReportsResult,
        verifiedUsersResult,
        newUsersTodayResult
      ] = await Promise.all([
        // إجمالي المستخدمين
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true }),
        
        // المستخدمون النشطون
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        
        // المستخدمون المحظورون
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'banned'),
        
        // البلاغات المعلقة
        supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        
        // المستخدمون المحققون
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('verified', true),
        
        // المستخدمون الجدد اليوم
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date().toISOString().split('T')[0])
      ]);

      return {
        totalUsers: totalUsersResult.count || 0,
        activeUsers: activeUsersResult.count || 0,
        blockedUsers: blockedUsersResult.count || 0,
        pendingReports: pendingReportsResult.count || 0,
        verifiedUsers: verifiedUsersResult.count || 0,
        newUsersToday: newUsersTodayResult.count || 0
      };
    } catch (error) {
      console.error('❌ Error fetching fresh stats:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        blockedUsers: 0,
        pendingReports: 0,
        verifiedUsers: 0,
        newUsersToday: 0
      };
    }
  }

  // جلب قائمة مستخدمين محدثة (متوافقة مع adminUsersService)
  async fetchFreshUsers(
    page: number = 1,
    limit: number = 10,
    filters?: any
  ): Promise<{ users: any[]; total: number; totalPages: number }> {
    try {
      // أولاً، جلب قائمة معرفات حسابات الإدارة باستخدام دالة آمنة
      const { data: adminUserIds, error: adminError } = await supabase
        .rpc('get_admin_user_ids');

      if (adminError) {
        console.error('Error fetching admin user IDs:', adminError);
      }

      const adminIds = adminUserIds?.map(admin => admin.user_id).filter(Boolean) || [];

      let query = supabase
        .from('users')
        .select('*', { count: 'exact' });

      // استبعاد حسابات الإدارة من القائمة إذا وجدت
      if (adminIds.length > 0) {
        query = query.not('id', 'in', `(${adminIds.join(',')})`);
      }

      // تطبيق الفلاتر
      if (filters?.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      if (filters?.gender && filters.gender !== 'all') {
        query = query.eq('gender', filters.gender);
      }

      if (filters?.verified !== undefined) {
        query = query.eq('verified', filters.verified);
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.nationality) {
        query = query.eq('nationality', filters.nationality);
      }

      if (filters?.city) {
        query = query.eq('city', filters.city);
      }

      // فلتر البلاغات
      if (filters?.hasReports) {
        const { data: reportedUserIds } = await supabase
          .from('reports')
          .select('reported_user_id')
          .eq('status', 'pending');

        const reportedIds = reportedUserIds?.map(r => r.reported_user_id).filter(Boolean) || [];
        if (reportedIds.length > 0) {
          query = query.in('id', reportedIds);
        } else {
          // إذا لم توجد بلاغات، إرجاع نتيجة فارغة
          return { users: [], total: 0, totalPages: 0 };
        }
      }

      // فلتر التاريخ
      if (filters?.date_range && filters.date_range !== 'all') {
        const now = new Date();
        let startDate: Date;

        switch (filters.date_range) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = new Date(0);
        }

        query = query.gte('created_at', startDate.toISOString());
      }

      // ترتيب وتصفح
      const offset = (page - 1) * limit;
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Error fetching fresh users:', error);
        return { users: [], total: 0, totalPages: 0 };
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        users: data || [],
        total,
        totalPages
      };
    } catch (error) {
      console.error('❌ Error in fetchFreshUsers:', error);
      return { users: [], total: 0, totalPages: 0 };
    }
  }

  // جلب بلاغات محدثة
  async fetchFreshReports(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          reporter:users!reports_reporter_id_fkey(id, first_name, last_name, email),
          reported_user:users!reports_reported_user_id_fkey(id, first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching fresh reports:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in fetchFreshReports:', error);
      return [];
    }
  }

  // بدء التحديث التلقائي الدوري (كخيار احتياطي)
  startPeriodicRefresh(intervalMs: number = 30000) {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(() => {
      this.refreshAll();
    }, intervalMs);

    console.log(`⏰ Started periodic refresh every ${intervalMs}ms`);
  }

  // إيقاف التحديث الدوري
  stopPeriodicRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('⏹️ Stopped periodic refresh');
    }
  }

  // تنظيف الموارد
  cleanup() {
    this.stopPeriodicRefresh();
    this.refreshCallbacks.clear();
    console.log('🧹 Auto refresh service cleaned up');
  }
}

// إنشاء instance واحد للخدمة
export const autoRefreshService = new AutoRefreshService();

// Hook لاستخدام التحديث التلقائي
export const useAutoRefresh = (key: string, refreshFunction: () => void) => {
  // استخدام useCallback لضمان استقرار الدوال
  const register = React.useCallback(() => {
    autoRefreshService.registerRefreshCallback(key, refreshFunction);
  }, [key, refreshFunction]);

  const unregister = React.useCallback(() => {
    autoRefreshService.unregisterRefreshCallback(key);
  }, [key]);

  const refreshNow = React.useCallback(() => {
    autoRefreshService.refreshSpecific(key);
  }, [key]);

  return {
    register,
    unregister,
    refreshNow
  };
};

export default autoRefreshService;
