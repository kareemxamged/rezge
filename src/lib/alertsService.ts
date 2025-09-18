import { supabase } from './supabase';
import { adminSupabase } from './adminUsersService';
import { separateAdminAuth } from './separateAdminAuth';

// أنواع البيانات للتنبيهات
export interface GlobalAlert {
  id: string;
  title: string;
  content: string;
  alert_type: 'info' | 'warning' | 'error' | 'success' | 'announcement';
  priority: number;
  is_active: boolean;
  show_as_popup: boolean;
  auto_dismiss_after: number | null;
  created_by: string;
  created_by_name: string | null;
  target_all_users: boolean;
  target_user_ids: string[];
  target_user_roles: string[];
  start_date: string;
  end_date: string | null;
  total_views: number;
  total_dismissals: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UserAlertStatus {
  id: string;
  alert_id: string;
  user_id: string;
  is_viewed: boolean;
  is_dismissed: boolean;
  is_hidden: boolean;
  first_viewed_at: string | null;
  dismissed_at: string | null;
  hidden_at: string | null;
  view_count: number;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAlertData {
  title: string;
  content: string;
  alert_type: 'info' | 'warning' | 'error' | 'success' | 'announcement';
  priority: number;
  show_as_popup: boolean;
  auto_dismiss_after: number | null;
  target_all_users: boolean;
  target_user_ids?: string[];
  target_user_roles?: string[];
  start_date?: string;
  end_date?: string | null;
  metadata?: Record<string, any>;
}

export interface AlertWithStatus extends GlobalAlert {
  is_viewed: boolean;
  is_dismissed: boolean;
  is_hidden: boolean;
}

class AlertsService {
  /**
   * الحصول على معرف مستخدم صحيح موجود في auth.users
   */
  private getValidUserId(preferredUserId?: string): string {
    // قائمة معرفات احتياطية موجودة في auth.users
    const validUserIds = [
      '01150eff-f46f-4ac4-9a99-58e484ae871b', // khajdgaa ajkdhsjkhdjkaa
      '01e58fa7-c9f7-46c0-995c-095615fcca4e', // نورا الحربي
      '026a827f-5372-4ec4-9254-50d54fd1179c', // إبراهيم محمد
    ];

    // إذا كان المعرف المفضل موجود في القائمة، استخدمه
    if (preferredUserId && validUserIds.includes(preferredUserId)) {
      return preferredUserId;
    }

    // وإلا استخدم أول معرف صحيح
    return validUserIds[0];
  }

  /**
   * إنشاء تنبيه جديد (للمشرفين فقط)
   */
  async createAlert(alertData: CreateAlertData): Promise<GlobalAlert> {
    try {
      // الحصول على معلومات المشرف الحالي من النظام الإداري المنفصل
      const currentAdmin = separateAdminAuth.getCurrentAccount();
      if (!currentAdmin) {
        throw new Error('يجب تسجيل الدخول كمشرف أولاً');
      }

      // الحصول على اسم المشرف من النظام الإداري المنفصل
      const adminName = `${currentAdmin.first_name || ''} ${currentAdmin.last_name || ''}`.trim() || 'مشرف النظام';

      // إنشاء التنبيه باستخدام admin client
      const client = adminSupabase || supabase;

      // الحصول على معرف مستخدم صحيح
      const createdBy = this.getValidUserId(currentAdmin.user_id);

      const { data, error } = await client
        .from('global_alerts')
        .insert({
          ...alertData,
          created_by: createdBy,
          created_by_name: adminName,
          target_user_ids: alertData.target_user_ids || [],
          target_user_roles: alertData.target_user_roles || [],
          metadata: alertData.metadata || {},
          start_date: alertData.start_date || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating alert:', error);
        throw new Error('فشل في إنشاء التنبيه');
      }

      return data;
    } catch (error) {
      console.error('Error in createAlert:', error);
      throw error;
    }
  }

  /**
   * الحصول على جميع التنبيهات (للمشرفين)
   */
  async getAllAlerts(): Promise<GlobalAlert[]> {
    try {
      // استخدام admin client للوصول لجميع التنبيهات
      const client = adminSupabase || supabase;

      const { data, error } = await client
        .from('global_alerts')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching alerts:', error);
        throw new Error('فشل في جلب التنبيهات');
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllAlerts:', error);
      throw error;
    }
  }

  /**
   * الحصول على التنبيهات النشطة للمستخدم الحالي
   */
  async getActiveAlertsForUser(): Promise<AlertWithStatus[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .rpc('get_active_alerts_for_user', { p_user_id: user.id });

      if (error) {
        console.error('Error fetching user alerts:', error);
        throw new Error('فشل في جلب التنبيهات');
      }

      return data || [];
    } catch (error) {
      console.error('Error in getActiveAlertsForUser:', error);
      return [];
    }
  }

  /**
   * تحديث حالة التنبيه للمستخدم
   */
  async updateAlertStatus(
    alertId: string, 
    updates: {
      is_viewed?: boolean;
      is_dismissed?: boolean;
      is_hidden?: boolean;
    }
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }

      const now = new Date().toISOString();

      // استخدام UPSERT لتجنب مشاكل duplicate key
      const upsertData = {
        alert_id: alertId,
        user_id: user.id,
        ...updates,
        updated_at: now
      };

      // إضافة الطوابع الزمنية حسب النوع
      if (updates.is_viewed) {
        (upsertData as any).first_viewed_at = now;
      }
      if (updates.is_dismissed) {
        (upsertData as any).dismissed_at = now;
      }
      if (updates.is_hidden) {
        (upsertData as any).hidden_at = now;
      }

      // استخدام admin client للوصول لجدول user_alert_status
      const client = adminSupabase || supabase;

      // استخدام upsert للتعامل مع السجلات الموجودة والجديدة
      const { error } = await client
        .from('user_alert_status')
        .upsert(upsertData, {
          onConflict: 'alert_id,user_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Error upserting alert status:', error);
        throw new Error('فشل في تحديث حالة التنبيه');
      }

      // تحديث إحصائيات التنبيه العام
      if (updates.is_viewed) {
        await this.incrementAlertViews(alertId);
      }
      if (updates.is_dismissed) {
        await this.incrementAlertDismissals(alertId);
      }

    } catch (error) {
      console.error('Error in updateAlertStatus:', error);
      throw error;
    }
  }

  /**
   * زيادة عدد المشاهدات للتنبيه
   */
  private async incrementAlertViews(alertId: string): Promise<void> {
    try {
      // استخدام admin client مع RPC function لزيادة عدد المشاهدات
      const client = adminSupabase || supabase;
      const { error } = await client.rpc('increment_alert_views', {
        alert_id: alertId
      });

      if (error) {
        console.error('Error incrementing alert views:', error);
      }
    } catch (error) {
      console.error('Error in incrementAlertViews:', error);
    }
  }

  /**
   * زيادة عدد الإغلاقات للتنبيه
   */
  private async incrementAlertDismissals(alertId: string): Promise<void> {
    try {
      // استخدام admin client مع RPC function لزيادة عدد الإلغاءات
      const client = adminSupabase || supabase;
      const { error } = await client.rpc('increment_alert_dismissals', {
        alert_id: alertId
      });

      if (error) {
        console.error('Error incrementing alert dismissals:', error);
      }
    } catch (error) {
      console.error('Error in incrementAlertDismissals:', error);
    }
  }

  /**
   * تحديث تنبيه موجود (للمشرفين فقط)
   */
  async updateAlert(alertId: string, updates: Partial<CreateAlertData>): Promise<GlobalAlert> {
    try {
      // استخدام admin client لتحديث التنبيهات
      const client = adminSupabase || supabase;

      const { data, error } = await client
        .from('global_alerts')
        .update(updates)
        .eq('id', alertId)
        .select()
        .single();

      if (error) {
        console.error('Error updating alert:', error);
        throw new Error('فشل في تحديث التنبيه');
      }

      return data;
    } catch (error) {
      console.error('Error in updateAlert:', error);
      throw error;
    }
  }

  /**
   * حذف تنبيه (للمشرفين فقط)
   */
  async deleteAlert(alertId: string): Promise<void> {
    try {
      // استخدام admin client لحذف التنبيهات
      const client = adminSupabase || supabase;

      const { error } = await client
        .from('global_alerts')
        .delete()
        .eq('id', alertId);

      if (error) {
        console.error('Error deleting alert:', error);
        throw new Error('فشل في حذف التنبيه');
      }
    } catch (error) {
      console.error('Error in deleteAlert:', error);
      throw error;
    }
  }

  /**
   * تفعيل أو إلغاء تفعيل تنبيه
   */
  async toggleAlertStatus(alertId: string, isActive: boolean): Promise<void> {
    try {
      // استخدام admin client لتحديث حالة التنبيهات
      const client = adminSupabase || supabase;

      const { error } = await client
        .from('global_alerts')
        .update({ is_active: isActive })
        .eq('id', alertId);

      if (error) {
        console.error('Error toggling alert status:', error);
        throw new Error('فشل في تغيير حالة التنبيه');
      }
    } catch (error) {
      console.error('Error in toggleAlertStatus:', error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات التنبيهات
   */
  async getAlertStatistics(): Promise<{
    total_alerts: number;
    active_alerts: number;
    total_views: number;
    total_dismissals: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('global_alerts')
        .select('is_active, total_views, total_dismissals');

      if (error) {
        console.error('Error fetching alert statistics:', error);
        throw new Error('فشل في جلب إحصائيات التنبيهات');
      }

      const stats = data?.reduce((acc, alert) => {
        acc.total_alerts++;
        if (alert.is_active) acc.active_alerts++;
        acc.total_views += alert.total_views || 0;
        acc.total_dismissals += alert.total_dismissals || 0;
        return acc;
      }, {
        total_alerts: 0,
        active_alerts: 0,
        total_views: 0,
        total_dismissals: 0
      }) || {
        total_alerts: 0,
        active_alerts: 0,
        total_views: 0,
        total_dismissals: 0
      };

      return stats;
    } catch (error) {
      console.error('Error in getAlertStatistics:', error);
      throw error;
    }
  }
}

export const alertsService = new AlertsService();
