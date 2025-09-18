import { supabase } from './supabase';
import { adminSupabase } from './adminUsersService';

// أنواع البيانات للنظام الإداري
export interface AdminRole {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminPermission {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

export interface AdminUser {
  id: string;
  user_id: string;
  role_id: string;
  is_active: boolean;
  is_super_admin: boolean;
  last_login_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  role?: AdminRole;
  permissions?: AdminPermission[];
  user_profile?: {
    email: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
  };
}

export interface AdminSession {
  id: string;
  admin_user_id: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export interface AdminActivityLog {
  id: string;
  admin_user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

class AdminAuthService {
  // التحقق من كون المستخدم مشرف
  async isAdminUser(userId?: string): Promise<boolean> {
    try {
      const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!currentUserId) return false;

      // استخدام admin client إذا كان متوفراً لتجنب مشاكل RLS
      const client = adminSupabase || supabase;

      // استخدام دالة آمنة للتحقق من كون المستخدم مشرف
      const { data: adminUserIds } = await client
        .rpc('get_admin_user_ids');

      const isAdmin = adminUserIds?.some(admin => admin.user_id === currentUserId);
      return isAdmin || false;
    } catch (error) {
      console.error('Error checking admin user:', error);
      return false;
    }
  }

  // الحصول على بيانات المشرف الحالي
  async getCurrentAdminUser(): Promise<AdminUser | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // التحقق من كون المستخدم مشرف أولاً
      const isAdmin = await this.isAdminUser(user.id);
      if (!isAdmin) return null;

      // استعلام للحصول على بيانات المستخدم الإداري مع الدور باستخدام service client
      const client = adminSupabase || supabase;
      const { data: adminData, error: adminError } = await client
        .from('admin_users')
        .select(`
          *,
          role:admin_roles(*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (adminError) {
        console.error('Error fetching admin user:', adminError);
        return null;
      }

      // استعلام منفصل للحصول على بيانات المستخدم من جدول users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email, first_name, last_name, profile_image_url')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user profile:', userError);
        return null;
      }

      // الحصول على الصلاحيات
      const permissions = await this.getAdminPermissions(adminData.id);

      return {
        ...adminData,
        user_profile: userData,
        permissions
      };
    } catch (error) {
      console.error('Error getting current admin user:', error);
      return null;
    }
  }

  // الحصول على صلاحيات المشرف
  async getAdminPermissions(adminUserId: string): Promise<AdminPermission[]> {
    try {
      const { data, error } = await supabase
        .from('admin_role_permissions')
        .select(`
          permission:admin_permissions(*)
        `)
        .eq('role_id', (
          await supabase
            .from('admin_users')
            .select('role_id')
            .eq('id', adminUserId)
            .single()
        ).data?.role_id);

      if (error) {
        console.error('Error fetching admin permissions:', error);
        return [];
      }

      return (data.map(item => item.permission).filter(Boolean) as unknown) as AdminPermission[];
    } catch (error) {
      console.error('Error getting admin permissions:', error);
      return [];
    }
  }

  // التحقق من صلاحية معينة
  async hasPermission(permissionCode: string, userId?: string): Promise<boolean> {
    try {
      const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!currentUserId) return false;

      // التحقق من كون المستخدم super admin
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('is_super_admin, role_id')
        .eq('user_id', currentUserId)
        .eq('is_active', true)
        .single();

      if (!adminUser) return false;
      if (adminUser.is_super_admin) return true;

      // التحقق من الصلاحية المحددة
      const { data, error } = await supabase
        .from('admin_role_permissions')
        .select(`
          permission:admin_permissions(code)
        `)
        .eq('role_id', adminUser.role_id);

      if (error) return false;

      return data.some(item => (item.permission as unknown as AdminPermission)?.code === permissionCode);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  // تسجيل نشاط إداري
  async logActivity(
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: any
  ): Promise<void> {
    try {
      const adminUser = await this.getCurrentAdminUser();
      if (!adminUser) return;

      await supabase
        .from('admin_activity_logs')
        .insert({
          admin_user_id: adminUser.id,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          details,
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent
        });
    } catch (error) {
      console.error('Error logging admin activity:', error);
    }
  }

  // الحصول على عنوان IP للعميل
  private async getClientIP(): Promise<string | null> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return null;
    }
  }

  // إنشاء جلسة إدارية
  async createAdminSession(adminUserId: string): Promise<AdminSession | null> {
    try {
      const sessionToken = this.generateSessionToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 ساعة

      const { data, error } = await supabase
        .from('admin_sessions')
        .insert({
          admin_user_id: adminUserId,
          session_token: sessionToken,
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating admin session:', error);
        return null;
      }

      // حفظ الجلسة في localStorage
      localStorage.setItem('admin_session_token', sessionToken);
      
      return data;
    } catch (error) {
      console.error('Error creating admin session:', error);
      return null;
    }
  }

  // التحقق من صحة الجلسة الإدارية
  async validateAdminSession(sessionToken?: string): Promise<boolean> {
    try {
      const token = sessionToken || localStorage.getItem('admin_session_token');
      if (!token) return false;

      const { data, error } = await supabase
        .from('admin_sessions')
        .select('expires_at, is_active')
        .eq('session_token', token)
        .eq('is_active', true)
        .single();

      if (error || !data) return false;

      const now = new Date();
      const expiresAt = new Date(data.expires_at);
      
      if (now > expiresAt) {
        // انتهت صلاحية الجلسة
        await this.invalidateAdminSession(token);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating admin session:', error);
      return false;
    }
  }

  // إلغاء الجلسة الإدارية
  async invalidateAdminSession(sessionToken?: string): Promise<void> {
    try {
      const token = sessionToken || localStorage.getItem('admin_session_token');
      if (!token) return;

      await supabase
        .from('admin_sessions')
        .update({ is_active: false })
        .eq('session_token', token);

      localStorage.removeItem('admin_session_token');
    } catch (error) {
      console.error('Error invalidating admin session:', error);
    }
  }

  // توليد رمز جلسة عشوائي
  private generateSessionToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // تحديث آخر تسجيل دخول
  async updateLastLogin(adminUserId: string): Promise<void> {
    try {
      await supabase
        .from('admin_users')
        .update({ 
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', adminUserId);
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }
}

export const adminAuthService = new AdminAuthService();
