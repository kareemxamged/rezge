import { supabase } from './supabase';
import { separateAdminAuth } from './separateAdminAuth';
import { createClient } from '@supabase/supabase-js';

// إنشاء client إداري منفصل مع service role key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sbtzngewizgeqzfbhfjy.supabase.co';
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Admin Service Configuration:');
console.log('- Supabase URL:', supabaseUrl);
console.log('- Service Key Available:', !!supabaseServiceKey);
console.log('- Service Key Length:', supabaseServiceKey?.length || 0);

// استخدام service key إذا كان متوفراً، وإلا استخدام العادي
const adminSupabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) : supabase;

console.log('✅ Admin Supabase Client Created:', adminSupabase ? 'Success' : 'Failed');

// خدمة إدارة المستخدمين للنظام الإداري الجديد
class SeparateAdminUsersService {
  
  // التحقق من صلاحيات المشرف
  private async checkAdminPermissions(action: string): Promise<boolean> {
    const adminAccount = separateAdminAuth.getCurrentAccount();
    if (!adminAccount) {
      throw new Error('غير مصرح لك بهذا الإجراء');
    }

    if (!adminAccount.is_active) {
      throw new Error('حسابك غير نشط');
    }

    // السوبر أدمن له جميع الصلاحيات
    if (adminAccount.is_super_admin) {
      return true;
    }

    // يمكن إضافة منطق صلاحيات أكثر تفصيلاً هنا
    console.log(`✅ Admin ${adminAccount.username} authorized for action: ${action}`);
    return true;
  }

  // تسجيل النشاط الإداري
  private async logAdminActivity(action: string, description: string, targetId?: string) {
    try {
      const adminAccount = separateAdminAuth.getCurrentAccount();
      if (adminAccount) {
        await separateAdminAuth.logActivity(
          adminAccount.id,
          action,
          description,
          'user',
          targetId
        );
      }
    } catch (error) {
      console.error('❌ Error logging admin activity:', error);
    }
  }

  // حظر مستخدم
  async blockUser(userId: string, reason: string, duration?: number): Promise<void> {
    try {
      await this.checkAdminPermissions('block_user');

      console.log('🔒 Blocking user:', userId);
      console.log('🔧 Using admin client:', adminSupabase === supabase ? 'Regular Client' : 'Service Role Client');

      // محاولة استخدام admin client أولاً
      let updateError: any = null;

      try {
        const { error } = await adminSupabase
          .from('users')
          .update({
            is_ban_active: true,
            block_reason: reason,
            blocked_at: new Date().toISOString(),
            ban_expires_at: duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString() : null,
            ban_type: duration ? 'temporary' : 'permanent',
            ban_duration: duration ? `${duration} days` : 'permanent',
            status: 'banned', // استخدام 'banned' بدلاً من 'blocked'
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        updateError = error;
      } catch (networkError) {
        console.error('❌ Network error with admin client:', networkError);

        // محاولة استخدام العميل العادي كـ fallback
        console.log('🔄 Trying fallback with regular client...');
        const { error } = await supabase
          .from('users')
          .update({
            is_ban_active: true,
            block_reason: reason,
            blocked_at: new Date().toISOString(),
            ban_expires_at: duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString() : null,
            ban_type: duration ? 'temporary' : 'permanent',
            ban_duration: duration ? `${duration} days` : 'permanent',
            status: 'banned', // استخدام 'banned' بدلاً من 'blocked'
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        updateError = error;
      }

      if (updateError) {
        console.error('❌ Error updating user:', updateError);
        throw new Error('فشل في حظر المستخدم');
      }

      // تسجيل النشاط
      await this.logAdminActivity('block_user', `حظر المستخدم: ${reason}`, userId);

      console.log('✅ User blocked successfully');
    } catch (error) {
      console.error('❌ Error blocking user:', error);
      throw error;
    }
  }

  // إلغاء حظر مستخدم
  async unblockUser(userId: string): Promise<void> {
    try {
      await this.checkAdminPermissions('unblock_user');

      console.log('🔓 Unblocking user:', userId);

      // محاولة استخدام admin client أولاً
      let updateError: any = null;

      try {
        const { error } = await adminSupabase
          .from('users')
          .update({
            is_ban_active: false,
            block_reason: null,
            blocked_at: null,
            ban_expires_at: null,
            ban_type: null,
            ban_duration: null,
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        updateError = error;
      } catch (networkError) {
        console.error('❌ Network error with admin client:', networkError);

        // محاولة استخدام العميل العادي كـ fallback
        console.log('🔄 Trying fallback with regular client...');
        const { error } = await supabase
          .from('users')
          .update({
            is_ban_active: false,
            block_reason: null,
            blocked_at: null,
            ban_expires_at: null,
            ban_type: null,
            ban_duration: null,
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        updateError = error;
      }

      if (updateError) {
        console.error('❌ Error updating user:', updateError);
        throw new Error('فشل في إلغاء حظر المستخدم');
      }

      await this.logAdminActivity('unblock_user', 'إلغاء حظر المستخدم', userId);

      console.log('✅ User unblocked successfully');
    } catch (error) {
      console.error('❌ Error unblocking user:', error);
      throw error;
    }
  }

  // تحديث معلومات المستخدم
  async updateUser(userId: string, updates: any): Promise<void> {
    try {
      await this.checkAdminPermissions('update_user');

      console.log('📝 Updating user:', userId, updates);

      const { error: updateError } = await adminSupabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Error updating user:', updateError);
        throw new Error('فشل في تحديث بيانات المستخدم');
      }

      await this.logAdminActivity('update_user', 'تحديث بيانات المستخدم', userId);

      console.log('✅ User updated successfully');
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }

  // حذف مستخدم
  async deleteUser(userId: string): Promise<void> {
    try {
      await this.checkAdminPermissions('delete_user');

      console.log('🗑️ Deleting user:', userId);

      // حذف المستخدم (soft delete)
      const { error: deleteError } = await adminSupabase
        .from('users')
        .update({
          deleted_at: new Date().toISOString(),
          status: 'inactive', // استخدام 'inactive' بدلاً من 'deleted'
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (deleteError) {
        console.error('❌ Error deleting user:', deleteError);
        throw new Error('فشل في حذف المستخدم');
      }

      await this.logAdminActivity('delete_user', 'حذف المستخدم', userId);

      console.log('✅ User deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
  }

  // الحصول على قائمة المستخدمين
  async getUsers(page: number = 1, limit: number = 20, filters?: any): Promise<any> {
    try {
      await this.checkAdminPermissions('view_users');

      console.log('📋 Fetching users list...');

      // جلب قائمة معرفات حسابات الإدارة باستخدام دالة آمنة
      const { data: adminUserIds } = await adminSupabase
        .rpc('get_admin_user_ids');

      const adminIds = adminUserIds?.map(admin => admin.user_id).filter(Boolean) || [];

      let query = adminSupabase
        .from('users')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // استبعاد حسابات الإدارة من القائمة إذا وجدت
      if (adminIds.length > 0) {
        query = query.not('id', 'in', `(${adminIds.join(',')})`);
      }

      // تطبيق الفلاتر
      if (filters?.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      if (filters?.is_blocked !== undefined) {
        query = query.eq('is_ban_active', filters.is_blocked);
      }

      if (filters?.is_verified !== undefined) {
        query = query.eq('verified', filters.is_verified);
      }

      // تطبيق التصفح
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Error fetching users:', error);
        throw new Error('فشل في جلب قائمة المستخدمين');
      }

      console.log(`✅ Fetched ${data?.length || 0} users`);

      return {
        users: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      console.error('❌ Error getting users:', error);
      throw error;
    }
  }

  // الحصول على إحصائيات المستخدمين
  async getUsersStats(): Promise<any> {
    try {
      await this.checkAdminPermissions('view_stats');

      console.log('📊 Fetching users statistics...');

      const { data: stats, error } = await adminSupabase
        .rpc('get_users_statistics');

      if (error) {
        console.error('❌ Error fetching stats:', error);
        // إرجاع إحصائيات افتراضية في حالة الخطأ
        return {
          total_users: 0,
          active_users: 0,
          blocked_users: 0,
          verified_users: 0,
          new_users_today: 0,
          new_users_this_week: 0,
          new_users_this_month: 0
        };
      }

      console.log('✅ Users statistics fetched successfully');
      return stats || {};
    } catch (error) {
      console.error('❌ Error getting users stats:', error);
      throw error;
    }
  }

  // تحديث معلومات التواصل
  async updateContactInfo(userId: string, contactInfo: any): Promise<void> {
    try {
      await this.checkAdminPermissions('update_contact');

      console.log('📞 Updating contact info for user:', userId);

      const { error: updateError } = await adminSupabase
        .from('users')
        .update({
          email: contactInfo.email,
          phone: contactInfo.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Error updating contact info:', updateError);
        throw new Error('فشل في تحديث معلومات التواصل');
      }

      await this.logAdminActivity('update_contact', 'تحديث معلومات التواصل', userId);

      console.log('✅ Contact info updated successfully');
    } catch (error) {
      console.error('❌ Error updating contact info:', error);
      throw error;
    }
  }
}

export const separateAdminUsersService = new SeparateAdminUsersService();
